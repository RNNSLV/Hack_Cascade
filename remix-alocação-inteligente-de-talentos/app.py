"""
InHire Cascade — Motor Algorítmico de Busca e Alocação de Talentos
Desenvolvido para o Hackathon VINT Global + Faculdade INBEC (A Busca do José)

RESTRIÇÃO TÉCNICA:
- Zero uso de Inteligência Artificial em tempo de execução.
- Lógica 100% determinística baseada em regras de negócio, pesos matemáticos (Pesos X e Y)
  e estratégia de busca em cascata (Fallback Strategy):
    1º SGBD Interno (PostgreSQL Schema "InHire": tabelas colaboradores, colaborador_skills, planejamentos, alocacoes)
    2º Banco Externo InHire (PostgreSQL Schema "InHire": tabelas talentos, talento_skills)
    3º API Externa de Freelancers (Simulação Workana API)
"""

import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(
    title="InHire Cascade API — Alocação Inteligente de Talentos",
    description="API de busca em cascata e ranking algorítmico ponderado para alocação de profissionais em projetos.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================================================
# CONFIGURAÇÃO DE CONEXÃO COM POSTGRESQL LOCAL (Schema "InHire")
# =============================================================================
DB_CONFIG = {
    "host": os.environ.get("PGHOST", "127.0.0.1"),
    "port": int(os.environ.get("PGPORT", 5432)),
    "dbname": os.environ.get("PGDATABASE", "hackathon"),
    "user": os.environ.get("PGUSER", "hackathon"),
    "password": os.environ.get("PGPASSWORD", "hackathon"),
    "options": "-c search_path=InHire,public",
}


def obter_conexao_postgresql():
    """
    Estabelece conexão com o banco PostgreSQL local (localhost:5432) no schema "InHire".
    """
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)


# =============================================================================
# MODELOS DE ENTRADA E CONFIGURAÇÃO DE PESOS ALGORÍTMICOS
# =============================================================================
class ConfiguracaoPesos(BaseModel):
    peso_skills: float = Field(0.50, description="Peso das habilidades técnicas no score final (50%)")
    peso_disponibilidade: float = Field(0.35, description="Peso da disponibilidade no score final (35%)")
    peso_senioridade: float = Field(0.15, description="Peso da senioridade no score final (15%)")
    fator_disponibilidade_futura_x: float = Field(
        0.78, description="Peso X: Fator para talento que fica disponível em 30 dias (próximo mês)"
    )
    fator_similaridade_skill_y: float = Field(
        0.60, description="Peso Y: Fator para skill da mesma categoria tecnológica (id_area_tecnologia)"
    )


class RequisicaoBuscaCascata(BaseModel):
    skills_requeridas: List[str] = Field(default=["Node.js", "AWS"])
    disponibilidade_minima: int = Field(default=50, ge=0, le=100)
    id_senioridade_desejada: Optional[int] = Field(default=3, description="1=Júnior, 2=Pleno, 3=Sênior, 4=Especialista")
    ano_referencia: int = Field(default=2026)
    mes_referencia: int = Field(default=11)
    duracao_meses: int = Field(default=3, ge=1, le=12)
    meta_candidatos_ideais: int = Field(default=3, ge=1, le=20)
    incluir_similaridade: bool = Field(default=True)
    incluir_disponibilidade_flexivel: bool = Field(default=True)
    forcar_todas_camadas: bool = Field(default=True)
    pesos: ConfiguracaoPesos = Field(default_factory=ConfiguracaoPesos)


# =============================================================================
# QUERIES SQL PARA O SCHEMA "InHire" (POSTGRESQL)
# =============================================================================
SQL_BUSCA_COLABORADORES_INTERNOS = """
WITH disp_atual AS (
    SELECT * FROM "InHire".disponibilidade_mensal(%(ano_atual)s, %(mes_atual)s)
),
disp_proximo_mes AS (
    SELECT * FROM "InHire".disponibilidade_mensal(%(ano_prox)s, %(mes_prox)s)
),
disp_janela AS (
    SELECT * FROM "InHire".disponibilidade_periodo(%(ano_atual)s, %(mes_atual)s, %(ano_fim)s, %(mes_fim)s)
)
SELECT
    c.id AS id_colaborador,
    c.nome_abreviado,
    c.id_cargo,
    dcargo.descricao AS cargo_descricao,
    c.id_senioridade,
    dsen.descricao AS senioridade_descricao,
    dmod.descricao AS modalidade_descricao,
    da.disponibilidade AS disponibilidade_mes_atual,
    dp.disponibilidade AS disponibilidade_proximo_mes,
    dj.disponibilidade_media AS disponibilidade_media_periodo,
    COALESCE(
        json_agg(
             json_build_object(
                'id_skill', s.id,
                'nome_skill', s.nome_skill,
                'id_area_tecnologia', s.id_area_tecnologia,
                'nome_area_tecnologia', darea.descricao,
                'nivel_conhecimento', cs.nivel_conhecimento
            )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
    ) AS skills
FROM "InHire".colaboradores c
JOIN disp_atual da ON da.id_colaborador = c.id
JOIN disp_proximo_mes dp ON dp.id_colaborador = c.id
JOIN disp_janela dj ON dj.id_colaborador = c.id
LEFT JOIN "InHire".dominios dcargo ON dcargo.id = c.id_cargo
LEFT JOIN "InHire".dominios dsen ON dsen.id = c.id_senioridade
LEFT JOIN "InHire".dominios dmod ON dmod.id = c.id_modalidade
LEFT JOIN "InHire".colaborador_skills cs
    ON cs.id_colaborador = c.id AND cs.status IS TRUE AND cs.deletado IS FALSE
LEFT JOIN "InHire".skills s
    ON s.id = cs.id_skill AND s.status IS TRUE AND s.deletado IS FALSE
LEFT JOIN "InHire".dominios darea ON darea.id = s.id_area_tecnologia
WHERE c.status IS TRUE AND c.deletado IS FALSE
GROUP BY
    c.id, c.nome_abreviado, c.id_cargo, dcargo.descricao,
    c.id_senioridade, dsen.descricao, dmod.descricao,
    da.disponibilidade, dp.disponibilidade, dj.disponibilidade_media;
"""

SQL_BUSCA_TALENTOS_INHIRE = """
SELECT
    t.id AS id_talento,
    t.nome_abreviado,
    t.id_cargo,
    dcargo.descricao AS cargo_descricao,
    t.id_senioridade,
    dsen.descricao AS senioridade_descricao,
    dmod.descricao AS modalidade_descricao,
    COALESCE(t.disponibilidade_informada_percentual, 100) AS disponibilidade_percentual,
    COALESCE(
        json_agg(
            json_build_object(
                'id_skill', s.id,
                'nome_skill', s.nome_skill,
                'id_area_tecnologia', s.id_area_tecnologia,
                'nome_area_tecnologia', darea.descricao,
                'nivel_conhecimento', COALESCE(dnivel.valor_dominio, 'AVANCADO')
            )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'::json
    ) AS skills
FROM "InHire".talentos t
LEFT JOIN "InHire".dominios dcargo ON dcargo.id = t.id_cargo
LEFT JOIN "InHire".dominios dsen ON dsen.id = t.id_senioridade
LEFT JOIN "InHire".dominios dmod ON dmod.id = t.id_modalidade
LEFT JOIN "InHire".talento_skills ts ON ts.id_talento = t.id
LEFT JOIN "InHire".skills s ON s.id = ts.id_skill AND s.status IS TRUE AND s.deletado IS FALSE
LEFT JOIN "InHire".dominios darea ON darea.id = s.id_area_tecnologia
LEFT JOIN "InHire".dominios dnivel ON dnivel.id = ts.id_nivel_conhecimento
WHERE t.status IS TRUE
GROUP BY
    t.id, t.nome_abreviado, t.id_cargo, dcargo.descricao,
    t.id_senioridade, dsen.descricao, dmod.descricao,
    t.disponibilidade_informada_percentual;
"""


# =============================================================================
# MOCK DA API EXTERNA (WORKANA API - 3ª CAMADA DE FALLBACK)
# =============================================================================
def simular_chamada_workana_api() -> List[Dict[str, Any]]:
    """
    Simula uma chamada HTTP GET para a API externa do Workana retornando um JSON
    de profissionais freelancers verificados com disponibilidade imediata.
    """
    return [
        {
            "id_externo": "WK-9081",
            "nome_profissional": "Diego T. Vasconcelos",
            "cargo": "Arquiteto Node.js & AWS Serverless | Freelancer Top 1%",
            "id_senioridade": 3,
            "senioridade": "Sênior",
            "disponibilidade_percentual": 100,
            "prazo_inicio_dias": 2,
            "valor_hora_brl": 115,
            "avaliacao_plataforma": 4.95,
            "skills": [
                {"id_skill": 10, "nome_skill": "Node.js", "id_area_tecnologia": 102, "nome_area_tecnologia": "Backend & Arquitetura de APIs", "nivel_conhecimento": "AVANCADO"},
                {"id_skill": 20, "nome_skill": "AWS", "id_area_tecnologia": 103, "nome_area_tecnologia": "Cloud Computing & DevOps", "nivel_conhecimento": "AVANCADO"},
                {"id_skill": 33, "nome_skill": "TypeScript", "id_area_tecnologia": 101, "nome_area_tecnologia": "Frontend Web & UI", "nivel_conhecimento": "AVANCADO"},
            ],
        },
        {
            "id_externo": "WK-9082",
            "nome_profissional": "Larissa M. Peixoto",
            "cargo": "Especialista Frontend Vue.js, React & Design Systems",
            "id_senioridade": 3,
            "senioridade": "Sênior",
            "disponibilidade_percentual": 75,
            "prazo_inicio_dias": 3,
            "valor_hora_brl": 98,
            "avaliacao_plataforma": 4.88,
            "skills": [
                {"id_skill": 31, "nome_skill": "Vue.js", "id_area_tecnologia": 101, "nome_area_tecnologia": "Frontend Web & UI", "nivel_conhecimento": "AVANCADO"},
                {"id_skill": 30, "nome_skill": "React", "id_area_tecnologia": 101, "nome_area_tecnologia": "Frontend Web & UI", "nivel_conhecimento": "AVANCADO"},
            ],
        },
    ]


# =============================================================================
# FUNÇÕES DE CÁLCULO DE SCORE E RANKING ALGORÍTMICO (PESOS X e Y)
# =============================================================================
MAPA_AREAS_SKILLS = {
    "node.js": 102, "python": 102, "java": 102, "c# / .net": 102, "go": 102,
    "aws": 103, "azure": 103, "google cloud (gcp)": 103, "docker": 103, "kubernetes": 103,
    "react": 101, "vue.js": 101, "angular": 101, "typescript": 101,
    "postgresql": 104, "mongodb": 104, "redis": 104,
    "react native": 105, "flutter": 105,
}

MULTIPLICADORES_NIVEL = {
    "AVANCADO": 1.00,
    "INTERMEDIARIO": 0.88,
    "BASICO": 0.72,
}


def calcular_score_skills_e_similaridade(
    skills_requeridas: List[str],
    skills_candidato: List[Dict[str, Any]],
    fator_similaridade_y: float,
    incluir_similaridade: bool,
) -> Dict[str, Any]:
    """
    Calcula o score técnico (0 a 100):
    - Se o candidato possui a skill exata: recebe 100 * multiplicador_nivel.
    - Se não possui a skill exata, mas possui outra ferramenta da mesma id_area_tecnologia
      (ex: sabe React quando o projeto pede Vue.js, ou sabe Azure quando pede AWS):
      recebe pontuação parcial = 100 * fator_similaridade_y * multiplicador_nivel (Peso Y).
    """
    if not skills_requeridas:
        return {"score": 100.0, "exatas": 0, "similares": 0, "justificativas": []}

    soma_pontos = 0.0
    exatas = 0
    similares = 0
    justificativas = []

    for req in skills_requeridas:
        req_norm = req.strip().lower()
        area_requerida = MAPA_AREAS_SKILLS.get(req_norm)

        match_exato = next(
            (s for s in skills_candidato if s["nome_skill"].strip().lower() == req_norm),
            None,
        )
        if match_exato:
            mult = MULTIPLICADORES_NIVEL.get(match_exato.get("nivel_conhecimento", "AVANCADO"), 0.88)
            soma_pontos += 100.0 * mult
            exatas += 1
            justificativas.append(f"Match exato em {match_exato['nome_skill']}")
            continue

        if incluir_similaridade and area_requerida is not None:
            similares_area = [
                s for s in skills_candidato if s.get("id_area_tecnologia") == area_requerida
            ]
            if similares_area:
                melhor_sim = similares_area[0]
                mult = MULTIPLICADORES_NIVEL.get(melhor_sim.get("nivel_conhecimento", "AVANCADO"), 0.88)
                pontos_parciais = 100.0 * fator_similaridade_y * mult
                soma_pontos += pontos_parciais
                similares += 1
                justificativas.append(
                    f"Similaridade (Peso Y={int(fator_similaridade_y*100)}%): domina {melhor_sim['nome_skill']} na mesma categoria de {req}"
                )

    score_medio = round(soma_pontos / len(skills_requeridas), 2)
    return {
        "score": min(100.0, score_medio),
        "exatas": exatas,
        "similares": similares,
        "justificativas": justificativas,
    }


def calcular_score_disponibilidade_flexivel(
    disp_atual: int,
    disp_proximo_mes: int,
    disp_media: float,
    disp_minima_requerida: int,
    fator_disponibilidade_x: float,
    incluir_flexibilidade: bool,
) -> Dict[str, Any]:
    """
    Calcula o score de disponibilidade aplicando o Peso X (Disponibilidade Flexível):
    - Se disp_atual >= disp_minima_requerida: 100 pontos (Disponibilidade imediata).
    - Se disp_atual < disp_minima_requerida, mas disp_proximo_mes >= disp_minima_requerida:
      Elegível com nota ponderada pelo Peso X e selo "Disponível em 30 dias".
    """
    req = max(1, disp_minima_requerida)

    if disp_atual >= disp_minima_requerida:
        return {
            "score": 100.0 if disp_media >= disp_minima_requerida else 94.0,
            "elegivel": True,
            "motivo": f"Disponibilidade imediata de {disp_atual}%",
            "disponivel_30_dias": False,
        }

    if incluir_flexibilidade and disp_proximo_mes >= disp_minima_requerida:
        proporcao_atual = disp_atual / req
        nota_flex = min(92.0, round(100.0 * fator_disponibilidade_x + (proporcao_atual * 10.0), 2))
        return {
            "score": nota_flex,
            "elegivel": True,
            "motivo": f"Disponível em 30 dias ({disp_proximo_mes}% livre no próximo mês)",
            "disponivel_30_dias": True,
        }

    if incluir_flexibilidade and disp_media >= disp_minima_requerida * 0.6:
        return {
            "score": round((disp_media / req) * 70.0, 2),
            "elegivel": True,
            "motivo": f"Disponibilidade parcial média de {int(disp_media)}%",
            "disponivel_30_dias": False,
        }

    return {"score": 0.0, "elegivel": False, "motivo": "Sem disponibilidade suficiente", "disponivel_30_dias": False}


@app.post("/api/busca-cascata")
def endpoint_busca_cascata(req: RequisicaoBuscaCascata):
    candidatos_ranqueados = []
    try:
        conn = obter_conexao_postgresql()
        with conn.cursor() as cur:
            mes_prox = 1 if req.mes_referencia == 12 else req.mes_referencia + 1
            ano_prox = req.ano_referencia + 1 if req.mes_referencia == 12 else req.mes_referencia
            mes_fim = ((req.mes_referencia - 1 + req.duracao_meses - 1) % 12) + 1
            ano_fim = req.ano_referencia + ((req.mes_referencia - 1 + req.duracao_meses - 1) // 12)

            # 1. Consulta colaboradores internos no banco PostgreSQL
            cur.execute(SQL_BUSCA_COLABORADORES_INTERNOS, {
                "ano_atual": req.ano_referencia, "mes_atual": req.mes_referencia,
                "ano_prox": ano_prox, "mes_prox": mes_prox, "ano_fim": ano_fim, "mes_fim": mes_fim,
            })
            colaboradores_db = cur.fetchall()

            # 2. Processa e calcula o score técnico e de disponibilidade de cada profissional
            for colab in colaboradores_db:
                score_sk = calcular_score_skills_e_similaridade(
                    req.skills_requeridas, 
                    colab.get('skills', []) or [], 
                    req.pesos.fator_similaridade_skill_y, 
                    req.incluir_similaridade
                )
                score_dp = calcular_score_disponibilidade_flexivel(
                    colab['disponibilidade_mes_atual'], 
                    colab['disponibilidade_proximo_mes'], 
                    colab['disponibilidade_media_periodo'], 
                    req.disponibilidade_minima, 
                    req.pesos.fator_disponibilidade_futura_x, 
                    req.incluir_disponibilidade_flexivel
                )
                score_se = 100 if colab['id_senioridade'] == req.id_senioridade_desejada else 75
                
                # Fórmula de ponderação do score final
                score_final = (score_sk['score'] * req.pesos.peso_skills) + \
                              (score_dp['score'] * req.pesos.peso_disponibilidade) + \
                              (score_se * req.pesos.peso_senioridade)

                if score_final > 40:
                    lista_skills = colab.get('skills') or []
                    
                    candidatos_ranqueados.append({
                        "id_unico": f"INT-{colab['id_colaborador']}",
                        "id_original": colab['id_colaborador'],
                        "origem": "SGBD Interno",
                        "badge_origem": "[SGBD Interno]",
                        "nome": colab['nome_abreviado'],
                        "cargo": colab.get('cargo_descricao', 'Profissional'),
                        "senioridade": colab.get('senioridade_descricao', 'Sênior'),
                        
                        # Forçamos o tipo inteiro (int) para garantir que o React renderize o número
                        "scoreFinal": int(round(score_final, 0)),
                        "score_final": int(round(score_final, 0)),
                        
                        "motivo": score_dp['motivo'],
                        "disponibilidade_atual": colab.get('disponibilidade_mes_atual', 100),
                        
                        # Enviamos as skills nos dois formatos que a UI pode estar consumindo
                        "skills": [s.get('nome_skill', '') for s in lista_skills],
                        "avaliacao_skills": [
                            {"nome": s.get('nome_skill', ''), "nivel": s.get('nivel_conhecimento', 'Não informado')} 
                            for s in lista_skills
                        ],
                        
                        # Prevenção: preenche um possível campo vazio que gerou os "x" na interface
                        "resumo": "Profissional aderente aos critérios da busca em cascata.",
                        "bio": "Colaborador interno disponível para alocação."
                    })
            
            # Ordena do maior score para o menor
            candidatos_ranqueados.sort(key=lambda x: x['scoreFinal'], reverse=True)
        conn.close()
    except Exception as e:
        return {"status": "erro", "detalhe": str(e)}

    # Retorno estruturado exatamente como o estado do React espera
    return {
        "status": "sucesso",
        "resultados": {
            "candidatos": candidatos_ranqueados,
            "resumo": {
                "total_encontrados": len(candidatos_ranqueados),
                "melhor_match_percentual": int(candidatos_ranqueados[0]['scoreFinal']) if candidatos_ranqueados else 0
            },
            "etapas_cascata": []
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
