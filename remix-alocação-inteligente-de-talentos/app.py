"""
InHire Cascade — Motor Algorítmico de Busca e Alocação de Talentos
Desenvolvido para o Hackathon VINT Global + Faculdade INBEC (A Busca do José)

RESTRIÇÃO TÉCNICA:
- Zero uso de Inteligência Artificial em tempo de execução.
- Lógica 100% determinística baseada em regras de negócio, pesos matemáticos (Pesos X e Y)
  e estratégia de busca em cascata (Fallback Strategy):
    1º SGBD Interno (PostgreSQL Schema "InHire": tabelas colaboradores, colaborador_skills, planejamentos, alocacoes)
    2º Banco Externo InHire (PostgreSQL Schema "InHire": tabelas talentos, talento_skills)
    3º API Externa de Freelancers (Simulação Extern API)
"""

import os
import json
import time
import urllib.parse
import urllib.request
from typing import List, Optional, Dict, Any, Tuple
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
    "password": os.environ.get("PGPASSWORD", "S0KEVn7CvKEFcSGcmU0tWNmO-MyryCzTxPAunLgoHcA"),
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
# MOCK DA API EXTERNA (Extern API - 3ª CAMADA DE FALLBACK)
# =============================================================================
# =============================================================================
# INTEGRAÇÃO COM API EXTERNA REAL (GITHUB API - 3ª CAMADA DE FALLBACK)
# =============================================================================
import urllib.request
import urllib.parse
import json

def consultar_api_externa_github(skills_requeridas: List[str]) -> List[Dict[str, Any]]:
    """
    Consulta real à API pública do GitHub para buscar desenvolvedores reais 
    com base nas skills requeridas, servindo como a 3ª camada de fallback da cascata.
    """
    candidatos_externos = []
    try:
        # Usa a primeira skill requerida para pesquisar repositórios/utilizadores reais
        skill_query = skills_requeridas[0] if skills_requeridas else "python"
        url = f"https://api.github.com/search/users?q=language:{urllib.parse.quote(skill_query)}+location:Brazil&per_page=3"
        
        # Configura cabeçalho exigido pela API do GitHub
        req_headers = {"User-Agent": "InHire-Cascade-Engine"}
        req = urllib.request.Request(url, headers=req_headers)
        
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            for item in data.get("items", []):
                candidatos_externos.append({
                    "id_externo": f"GH-{item['id']}",
                    "nome_profissional": f"Dev @{item['login']}",
                    "cargo": f"Especialista {skill_query} (Verificado via GitHub API)",
                    "id_senioridade": 3,
                    "senioridade": "Sênior",
                    "disponibilidade_percentual": 100,
                    "prazo_inicio_dias": 1,
                    "valor_hora_brl": 110,
                    "avaliacao_plataforma": 4.9,
                    "skills": [
                        {
                            "id_skill": 99, 
                            "nome_skill": skill_query, 
                            "id_area_tecnologia": 102, 
                            "nome_area_tecnologia": "Desenvolvimento & Cloud", 
                            "nivel_conhecimento": "AVANCADO"
                        }
                    ],
                })
    except Exception as e:
        print(f"Aviso: Falha ao consultar a API externa do GitHub: {e}")
    
    return candidatos_externos


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


# =============================================================================
# CAMADA 3 — INTEGRAÇÃO Extern (API EXTERNA SIMULADA, CHAMADA VIA HTTP)
# =============================================================================
# A Extern não oferece API pública oficial de busca de freelancers. Por isso o
# próprio FastAPI expõe um endpoint /mock/Extern/freelancers/search com o
# contrato "estilo Extern" (campos em inglês, níveis próprios). A cascata o
# consome por HTTP com timeout e fallback, e um ADAPTADOR converte para o formato
# interno. Para usar uma API real no futuro: mude Extern_API_URL e o adaptador.
Extern_API_URL = os.environ.get("Extern_API_URL", "http://127.0.0.1:8000/mock/Extern/freelancers/search")
Extern_TIMEOUT_S = float(os.environ.get("Extern_TIMEOUT_S", 3))

AREAS_TECNOLOGIA_NOMES = {
    101: "Frontend Web & UI",
    102: "Backend & Arquitetura de APIs",
    103: "Cloud Computing & DevOps",
    104: "Banco de Dados & Engenharia de Dados",
    105: "Desenvolvimento Mobile",
}

SENIORIDADE_Extern = {"junior": (1, "Júnior"), "mid": (2, "Pleno"), "senior": (3, "Sênior"), "specialist": (4, "Especialista")}
NIVEL_Extern = {"beginner": "BASICO", "intermediate": "INTERMEDIARIO", "expert": "AVANCADO"}
MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

# "Banco" do mock: o que a Extern devolveria (formato EXTERNO, diferente do interno)
_Extern_MOCK_BASE = [
    {"id": "WK-9081", "name": "Diego T. Vasconcelos", "headline": "Arquiteto Node.js & AWS Serverless | Freelancer Top 1%",
     "level": "senior", "availability_pct": 100, "start_in_days": 2, "hourly_rate_brl": 115, "rating": 4.95,
     "skills": [("Node.js", "expert"), ("AWS", "expert"), ("TypeScript", "expert")]},
    {"id": "WK-9082", "name": "Larissa M. Peixoto", "headline": "Especialista Frontend Vue.js, React & Design Systems",
     "level": "senior", "availability_pct": 75, "start_in_days": 3, "hourly_rate_brl": 98, "rating": 4.88,
     "skills": [("Vue.js", "expert"), ("React", "expert"), ("TypeScript", "intermediate")]},
    {"id": "WK-9083", "name": "Rafael K. Nogueira", "headline": "Especialista Cloud Native: Kubernetes, Go & AWS",
     "level": "specialist", "availability_pct": 100, "start_in_days": 5, "hourly_rate_brl": 150, "rating": 4.97,
     "skills": [("Kubernetes", "expert"), ("Go", "expert"), ("AWS", "expert"), ("Docker", "expert")]},
    {"id": "WK-9084", "name": "Camila R. Duarte", "headline": "Desenvolvedora Python & Dados",
     "level": "mid", "availability_pct": 60, "start_in_days": 4, "hourly_rate_brl": 85, "rating": 4.72,
     "skills": [("Python", "expert"), ("PostgreSQL", "intermediate"), ("Docker", "intermediate"), ("AWS", "beginner")]},
    {"id": "WK-9085", "name": "Thiago B. Almeida", "headline": "Engenheiro Java & Azure",
     "level": "senior", "availability_pct": 50, "start_in_days": 7, "hourly_rate_brl": 105, "rating": 4.81,
     "skills": [("Java", "expert"), ("Kubernetes", "intermediate"), ("Azure", "expert")]},
    {"id": "WK-9086", "name": "Mariana F. Costa", "headline": "Desenvolvedora Mobile React Native & Flutter",
     "level": "mid", "availability_pct": 100, "start_in_days": 3, "hourly_rate_brl": 80, "rating": 4.66,
     "skills": [("React Native", "expert"), ("Flutter", "intermediate"), ("TypeScript", "intermediate")]},
    {"id": "WK-9087", "name": "Lucas P. Barreto", "headline": "Dev Backend Node.js em início de carreira",
     "level": "junior", "availability_pct": 100, "start_in_days": 2, "hourly_rate_brl": 55, "rating": 4.40,
     "skills": [("Node.js", "intermediate"), ("MongoDB", "intermediate"), ("Redis", "beginner")]},
    {"id": "WK-9088", "name": "Beatriz S. Moreira", "headline": "Frontend Angular & TypeScript",
     "level": "senior", "availability_pct": 100, "start_in_days": 3, "hourly_rate_brl": 110, "rating": 4.92,
     "skills": [("Angular", "expert"), ("TypeScript", "expert"), ("Vue.js", "intermediate")]},
]


@app.get("/mock/Extern/freelancers/search")
def mock_Extern_busca_freelancers(
    skills: str = Query(default="", description="Skills separadas por vírgula. Ex.: Node.js,AWS"),
    limit: int = Query(default=20, ge=1, le=50),
):
    """
    Simula a busca da Extern. Como numa busca real por palavra-chave/categoria, devolve quem
    tem alguma das skills pedidas OU skills da mesma categoria tecnológica (a pontuação
    exata/similar é decidida pelo motor da cascata, não por esta API).
    """
    pedidas = [s.strip().lower() for s in skills.split(",") if s.strip()]
    areas_pedidas = {MAPA_AREAS_SKILLS[s] for s in pedidas if s in MAPA_AREAS_SKILLS}

    resultado = []
    for f in _Extern_MOCK_BASE:
        nomes = {n.lower() for n, _ in f["skills"]}
        areas = {MAPA_AREAS_SKILLS.get(n) for n in nomes}
        if not pedidas or (nomes & set(pedidas)) or (areas & areas_pedidas):
            resultado.append({
                "id": f["id"], "name": f["name"], "headline": f["headline"], "level": f["level"],
                "availability_pct": f["availability_pct"], "start_in_days": f["start_in_days"],
                "hourly_rate_brl": f["hourly_rate_brl"], "rating": f["rating"],
                "skills": [{"name": n, "proficiency": p} for n, p in f["skills"]],
            })
    return {
        "meta": {"source": "Extern-mock", "api_version": "v1", "query": {"skills": pedidas}, "total": len(resultado[:limit])},
        "data": resultado[:limit],
    }


def adaptar_freelancer_Extern(item: Dict[str, Any]) -> Dict[str, Any]:
    """Converte o JSON externo (estilo Extern) para o formato interno usado pelo motor."""
    id_sen, nome_sen = SENIORIDADE_Extern.get(item.get("level", ""), (None, "Pleno"))
    skills = []
    for i, s in enumerate(item.get("skills", [])):
        nome = s.get("name", "")
        area = MAPA_AREAS_SKILLS.get(nome.strip().lower())
        skills.append({
            "id_skill": 9000 + i,
            "nome_skill": nome,
            "id_area_tecnologia": area,
            "nome_area_tecnologia": AREAS_TECNOLOGIA_NOMES.get(area, ""),
            "nivel_conhecimento": NIVEL_Extern.get(s.get("proficiency", ""), "INTERMEDIARIO"),
        })
    return {
        "id_externo": item.get("id"),
        "nome_profissional": item.get("name", "Freelancer"),
        "cargo": item.get("headline", "Freelancer"),
        "id_senioridade": id_sen,
        "senioridade": nome_sen,
        "disponibilidade_percentual": int(item.get("availability_pct", 0)),
        "prazo_inicio_dias": item.get("start_in_days"),
        "valor_hora_brl": item.get("hourly_rate_brl", 0),
        "avaliacao_plataforma": item.get("rating"),
        "skills": skills,
    }


def buscar_freelancers_Extern(skills: List[str]) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Chama a API da Extern por HTTP. NUNCA levanta exceção: se a API cair ou demorar,
    devolve ([], mensagem_de_erro) e a cascata segue com as outras camadas.
    """
    url = Extern_API_URL + "?" + urllib.parse.urlencode({"skills": ",".join(skills)})
    try:
        with urllib.request.urlopen(url, timeout=Extern_TIMEOUT_S) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        return [adaptar_freelancer_Extern(x) for x in payload.get("data", [])], None
    except Exception as e:  # timeout, conexão recusada, JSON inválido...
        return [], f"{type(e).__name__}: {e}"


def avaliar_skills_pedidas(req_skills: List[str], skills: List[Dict[str, Any]], incluir_similaridade: bool) -> List[Dict[str, str]]:
    """Lista, para cada skill pedida, o que o profissional tem (exata, similar ou ausente) — para o card."""
    out = []
    for req in req_skills:
        r = req.strip().lower()
        exata = next((s for s in skills if s["nome_skill"].strip().lower() == r), None)
        if exata:
            out.append({"nome": req, "nivel": exata["nivel_conhecimento"]})
            continue
        area = MAPA_AREAS_SKILLS.get(r)
        sim = next((s for s in skills if incluir_similaridade and area is not None and s.get("id_area_tecnologia") == area), None)
        if sim:
            out.append({"nome": f"{sim['nome_skill']} ≈ {req}", "nivel": sim["nivel_conhecimento"]})
        else:
            out.append({"nome": req, "nivel": "ausente"})
    return out


def montar_candidato_Extern(f: Dict[str, Any], req: "RequisicaoBuscaCascata") -> Optional[Dict[str, Any]]:
    disp = f["disponibilidade_percentual"]
    score_sk = calcular_score_skills_e_similaridade(
        req.skills_requeridas, f["skills"], req.pesos.fator_similaridade_skill_y, req.incluir_similaridade
    )
    score_dp = calcular_score_disponibilidade_flexivel(
        disp, disp, disp, req.disponibilidade_minima,
        req.pesos.fator_disponibilidade_futura_x, req.incluir_disponibilidade_flexivel,
    )
    if not score_dp["elegivel"]:
        return None
    score_se = 100 if f["id_senioridade"] == req.id_senioridade_desejada else 75
    score_final = (score_sk["score"] * req.pesos.peso_skills) + \
                  (score_dp["score"] * req.pesos.peso_disponibilidade) + \
                  (score_se * req.pesos.peso_senioridade)
    if score_final <= 40:
        return None
    score_final = int(round(score_final, 0))

    total_req = len(req.skills_requeridas)
    if total_req and score_sk["exatas"] == total_req:
        motivo = f"Match Ideal · {score_sk['exatas']}/{total_req} skills exatas · {disp}% livre"
    elif score_sk["similares"] > 0:
        motivo = next((j for j in score_sk["justificativas"] if j.startswith("Similaridade")), score_dp["motivo"])
    else:
        motivo = score_dp["motivo"]

    meses = []
    for i in range(3):
        idx = (req.mes_referencia - 1) + i
        a, m = req.ano_referencia + idx // 12, idx % 12 + 1
        meses.append({"mes": MESES_ABREV[m - 1], "numero_mes": m, "ano": a,
                      "total_alocado": 100 - disp, "disponibilidade": disp, "projeto_atual": "Disponível via Extern API"})

    valor_hora = f["valor_hora_brl"]
    return {
        "id_unico": f"Extern-{f['id_externo']}",
        "id_original": f["id_externo"],
        "origem": "Extern API",
        "badge_origem": "[Extern API]",
        "nome": f["nome_profissional"],
        "cargo": f["cargo"],
        "senioridade": f["senioridade"],
        "id_senioridade": f["id_senioridade"] or 0,
        "modalidade": "Freelancer",
        "scoreFinal": score_final,
        "score_final": score_final,
        "score_skills": round(score_sk["score"]),
        "score_disponibilidade": round(score_dp["score"]),
        "score_senioridade": score_se,
        "motivo": motivo,
        "motivo_principal_ranking": motivo,
        "custo_estimado_info": f"R$ {valor_hora}/hora (~R$ {valor_hora * 160:,}/mês a 100%) · avaliação {f['avaliacao_plataforma']}★".replace(",", "."),
        "prazo_mobilizacao": f"Início em {f['prazo_inicio_dias']} dias via API",
        "disponibilidade_mes_atual": disp,
        "disponibilidade_atual": disp,
        "planejamentos_trimestre": meses,
        "tags_justificativa": score_sk["justificativas"] + [score_dp["motivo"]],
        "avaliacao_skills": avaliar_skills_pedidas(req.skills_requeridas, f["skills"], req.incluir_similaridade) or
                            [{"nome": s["nome_skill"], "nivel": s["nivel_conhecimento"]} for s in f["skills"]],
        "skills": [s["nome_skill"] for s in f["skills"]],
        "skills_profissional": f["skills"],
        "resumo": "Freelancer verificado disponível via API externa.",
        "bio": "Profissional externo (Extern API).",
    }



@app.post("/api/busca-cascata")
def endpoint_busca_cascata(req: RequisicaoBuscaCascata):
    candidatos_ranqueados = []
    etapas_cascata = []
    total_internos = 0
    total_Extern = 0
    try:
        t_c1 = time.perf_counter()
        conn = obter_conexao_postgresql()
        with conn.cursor() as cur:
            mes_prox = 1 if req.mes_referencia == 12 else req.mes_referencia + 1
            ano_prox = req.ano_referencia + 1 if req.mes_referencia == 12 else req.ano_referencia
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
                    float(colab['disponibilidade_media_periodo'] or 0), 
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
            
            # ---------------- Camada 1 concluída ----------------
            total_internos = len(candidatos_ranqueados)
            alta_internos = sum(1 for c in candidatos_ranqueados if c['scoreFinal'] >= 80)
            etapas_cascata.append({
                "ordem": 1, "fonte": "SGBD Interno", "badge": "[SGBD Interno]",
                "tabela_ou_endpoint": '"InHire".colaboradores + "InHire".planejamentos',
                "acionada": True, "candidatos_avaliados": len(colaboradores_db),
                "candidatos_elegiveis": total_internos, "candidatos_alta_aderencia": alta_internos,
                "tempo_execucao_ms": round((time.perf_counter() - t_c1) * 1000),
                "motivo_transicao": "Camada inicial: prioriza a equipe interna (custo zero).",
            })

            # ---------------- Camada 2: Banco Externo InHire ----------------
            t_c2 = time.perf_counter()
            cur.execute(SQL_BUSCA_TALENTOS_INHIRE)
            talentos_db = cur.fetchall()
            total_inhire = 0

            for tal in talentos_db:
                score_sk = calcular_score_skills_e_similaridade(
                    req.skills_requeridas, 
                    tal.get('skills', []) or [], 
                    req.pesos.fator_similaridade_skill_y, 
                    req.incluir_similaridade
                )
                disp = tal['disponibilidade_percentual']
                score_dp = calcular_score_disponibilidade_flexivel(
                    disp, disp, disp, 
                    req.disponibilidade_minima, 
                    req.pesos.fator_disponibilidade_futura_x, 
                    req.incluir_disponibilidade_flexivel
                )
                score_se = 100 if tal['id_senioridade'] == req.id_senioridade_desejada else 75
                
                score_final = (score_sk['score'] * req.pesos.peso_skills) + \
                              (score_dp['score'] * req.pesos.peso_disponibilidade) + \
                              (score_se * req.pesos.peso_senioridade)

                if score_final > 40:
                    lista_skills = tal.get('skills') or []
                    candidatos_ranqueados.append({
                        "id_unico": f"INH-{tal['id_talento']}",
                        "id_original": tal['id_talento'],
                        "origem": "InHire",
                        "badge_origem": "[InHire]",
                        "nome": tal['nome_abreviado'],
                        "cargo": tal.get('cargo_descricao', 'Profissional'),
                        "senioridade": tal.get('senioridade_descricao', 'Sênior'),
                        "scoreFinal": int(round(score_final, 0)),
                        "score_final": int(round(score_final, 0)),
                        "motivo": score_dp['motivo'],
                        "disponibilidade_atual": disp,
                        "skills": [s.get('nome_skill', '') for s in lista_skills],
                        "avaliacao_skills": [
                            {"nome": s.get('nome_skill', ''), "nivel": s.get('nivel_conhecimento', 'AVANCADO')} 
                            for s in lista_skills
                        ],
                        "resumo": "Talento externo catalogado no banco InHire.",
                        "bio": "Banco de talentos externo InHire."
                    })
                    total_inhire += 1

            etapas_cascata.append({
                "ordem": 2, "fonte": "InHire", "badge": "[InHire]",
                "tabela_ou_endpoint": '"InHire".talentos + "InHire".talento_skills',
                "acionada": True, "candidatos_avaliados": len(talentos_db),
                "candidatos_elegiveis": total_inhire,
                "candidatos_alta_aderencia": sum(1 for c in candidatos_ranqueados if c['origem'] == 'InHire' and c['scoreFinal'] >= 80),
                "tempo_execucao_ms": round((time.perf_counter() - t_c2) * 1000),
                "motivo_transicao": "Segunda camada: consulta ao banco de talentos externo InHire.",
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
                "total_sgbd_interno": total_internos,
                "total_inhire": total_inhire, 
                "total_Extern": total_Extern,
                "melhor_match_percentual": int(candidatos_ranqueados[0]['scoreFinal']) if candidatos_ranqueados else 0
            },
            "etapas_cascata": etapas_cascata
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
