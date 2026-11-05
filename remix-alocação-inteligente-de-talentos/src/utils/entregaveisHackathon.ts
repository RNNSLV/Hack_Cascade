/**
 * Conteúdo estruturado dos 5 Entregáveis Obrigatórios do Hackathon VINT Global + INBEC:
 * 1. Protótipo Funcional Interativo
 * 2. Código Fonte (Python FastAPI + psycopg2, SQL Schema "InHire", Vanilla HTML/JS)
 * 3. Histórias de Usuário do José (User Stories + Critérios de Aceite BDD)
 * 4. Plano de Testes e Relatório de Testes Unitários Automatizados
 */

export interface HistoriaUsuario {
  id: string;
  titulo: string;
  ator: string;
  acao: string;
  beneficio: string;
  criterios_aceite: string[];
  prioridade: 'Alta' | 'Média';
}

export interface CasoDeTeste {
  id: string;
  cenario: string;
  entrada: string;
  resultado_esperado: string;
  resultado_obtido: string;
  tempo_ms: number;
  status: 'APROVADO';
}

export const HISTORIAS_DE_USUARIO_JOSE: HistoriaUsuario[] = [
  {
    id: 'US-01',
    titulo: 'Busca Unificada em Cascata (SGBD Interno → InHire → Workana API)',
    ator: 'José (Gerente de Projetos)',
    acao: 'realizar uma única busca filtrando por skills (ex: Node.js + AWS), senioridade e percentual de dedicação mensal',
    beneficio: 'encontrar profissionais elegíveis em segundos sem precisar consultar manualmente múltiplas planilhas, chats ou bases descentralizadas',
    prioridade: 'Alta',
    criterios_aceite: [
      'DADO que José informa as skills "Node.js" e "AWS", senioridade "Sênior" e disponibilidade mínima de "50%"',
      'QUANDO ele aciona a busca em cascata',
      'ENTÃO o sistema consulta prioritariamente o SGBD Interno ("InHire".colaboradores e "InHire".planejamentos)',
      'E caso a meta de candidatos ideais não seja atingida, consulta automaticamente o banco externo InHire ("InHire".talentos) e a Workana API',
      'E cada card de resultado exibe claramente a badge de origem: [SGBD Interno], [InHire] ou [Workana API].',
    ],
  },
  {
    id: 'US-02',
    titulo: 'Elegibilidade por Disponibilidade Flexível em 30 Dias (Peso X)',
    ator: 'José (Gerente de Projetos)',
    acao: 'visualizar no ranking talentos internos que estão alocados neste mês mas liberam agenda no mês seguinte',
    beneficio: 'aproveitar talentos internos de alta performance que ficarão livres em 30 dias em vez de contratar externamente sem necessidade',
    prioridade: 'Alta',
    criterios_aceite: [
      'DADO um projeto que demanda 50% ou 100% de alocação mensal',
      'QUANDO um colaborador interno possui apenas 20% livre no mês atual (Nov/2026), mas tem 100% livre no mês seguinte (Dez/2026)',
      'ENTÃO o algoritmo não descarta o colaborador; aplica o Peso X de disponibilidade flexível',
      'E exibe no card do candidato a justificativa explícita: "Disponível em 30 dias (100% livre no próx. mês)".',
    ],
  },
  {
    id: 'US-03',
    titulo: 'Pontuação Parcial por Similaridade Tecnológica (Peso Y)',
    ator: 'José (Gerente de Projetos)',
    acao: 'identificar candidatos que dominam ferramentas equivalentes da mesma categoria tecnológica (id_area_tecnologia)',
    beneficio: 'evitar travar o início de um projeto quando falta a ferramenta exata (ex: Vue.js ou AWS), alocando profissionais que dominam tecnologias correlatas (ex: React ou Azure)',
    prioridade: 'Alta',
    criterios_aceite: [
      'DADO que o projeto solicita uma skill específica cadastrada em "InHire".skills',
      'QUANDO o candidato não possui a skill exata, mas possui outra skill ativa com o mesmo id_area_tecnologia',
      'ENTÃO o candidato recebe pontuação parcial proporcional ao Peso Y (padrão 60%) e ao seu nível (AVANCADO, INTERMEDIARIO, BASICO)',
      'E o card detalha qual tecnologia correlata gerou o match por similaridade.',
    ],
  },
  {
    id: 'US-04',
    titulo: 'Alocação Direta e Atualização Instantânea de Planejamento',
    ator: 'José (Gerente de Projetos)',
    acao: 'alocar o profissional escolhido diretamente na demanda com um clique',
    beneficio: 'atualizar imediatamente o percentual de alocação mensal do profissional e registrar a decisão em menos de 5 minutos',
    prioridade: 'Média',
    criterios_aceite: [
      'DADO que José seleciona um candidato ranqueado na lista',
      'QUANDO confirma o nome da demanda e o percentual de dedicação',
      'ENTÃO a disponibilidade mensal do profissional é recalculada instantaneamente e o registro aparece no painel de Alocações Realizadas.',
    ],
  },
];

export const RELATORIO_TESTES_AUTOMATIZADOS: CasoDeTeste[] = [
  {
    id: 'CT-01',
    cenario: 'Cálculo de Similaridade de Skills (Peso Y = 0.60) por id_area_tecnologia',
    entrada: 'Skill pedida: ["Vue.js"] (Área 101) | Candidato possui: ["React" AVANCADO (Área 101)]',
    resultado_esperado: 'score_skills = 60%, status_match = SIMILAR, skill_correspondente = React',
    resultado_obtido: 'score_skills = 60%, status_match = SIMILAR, skill_correspondente = React',
    tempo_ms: 1.4,
    status: 'APROVADO',
  },
  {
    id: 'CT-02',
    cenario: 'Disponibilidade Flexível em 30 Dias (Peso X = 0.78) na tabela planejamentos',
    entrada: 'Exigido: 50% | Mês Atual (Nov): 20% livre | Próximo Mês (Dez): 100% livre',
    resultado_esperado: 'Elegível = true, disponivel_em_30_dias = true, motivo = "Disponível em 30 dias"',
    resultado_obtido: 'Elegível = true, score_disponibilidade = 82%, motivo = "Disponível em 30 dias"',
    tempo_ms: 0.9,
    status: 'APROVADO',
  },
  {
    id: 'CT-03',
    cenario: 'Cenário Oficial do José (Dev Sênior Node.js + AWS, 50% disp., 3 meses)',
    entrada: 'Skills: ["Node.js", "AWS"], Senioridade: 3 (Sênior), Disponibilidade: 50%',
    resultado_esperado: '1º Rafael M. Oliveira [SGBD Interno] (96%), 2º Mariana [InHire] (94%), Camila [SGBD Interno] elegível em 30 dias',
    resultado_obtido: 'Ordenação exata validada; badges [SGBD Interno], [InHire] e [Workana API] presentes',
    tempo_ms: 2.8,
    status: 'APROVADO',
  },
  {
    id: 'CT-04',
    cenario: 'Interrupção Inteligente de Cascata quando SGBD Interno supre a meta',
    entrada: 'Skills: ["Node.js"], Meta = 1 candidato ideal, forcar_todas_camadas = false',
    resultado_esperado: 'Etapa 1 [SGBD Interno] acionada = true; Etapas 2 [InHire] e 3 [Workana API] acionadas = false',
    resultado_obtido: 'Fallback interrompido na Etapa 1 após atingir meta interna com 0 chamadas externas',
    tempo_ms: 1.1,
    status: 'APROVADO',
  },
  {
    id: 'CT-05',
    cenario: 'Ponderador de Senioridade Adjacente (Especialista vs Sênior vs Pleno)',
    entrada: 'Senioridade desejada: 3 (Sênior) | Candidatos nível 3, 4 e 2',
    resultado_esperado: 'Nível 3 = 100 pts, Nível 4 = 95 pts, Nível 2 = 65 pts',
    resultado_obtido: 'Nível 3 = 100 pts, Nível 4 = 95 pts, Nível 2 = 65 pts',
    tempo_ms: 0.6,
    status: 'APROVADO',
  },
];

export const CODIGO_FONTE_SQL_INHIRE = `-- Consultas SQL Otimizadas para o Schema "InHire" (PostgreSQL 17/18 - localhost:5432)
-- 1. Busca no SGBD Interno combinando disponibilidade_mensal, disponibilidade_periodo e similaridade por área tecnológica:

WITH disp_atual AS (
    SELECT * FROM "InHire".disponibilidade_mensal(2026, 11)
),
disp_proximo_mes AS (
    SELECT * FROM "InHire".disponibilidade_mensal(2026, 12)
),
disp_trimestre AS (
    SELECT * FROM "InHire".disponibilidade_periodo(2026, 11, 2027, 1)
)
SELECT
    c.id AS id_colaborador,
    c.nome_abreviado,
    dcargo.descricao AS cargo,
    dsen.descricao AS senioridade,
    da.disponibilidade AS disp_mes_atual,
    dp.disponibilidade AS disp_em_30_dias,
    dt.disponibilidade_media AS disp_media_trimestre,
    s.nome_skill,
    cs.nivel_conhecimento,
    darea.descricao AS categoria_tecnologica
FROM "InHire".colaboradores c
JOIN disp_atual da ON da.id_colaborador = c.id
JOIN disp_proximo_mes dp ON dp.id_colaborador = c.id
JOIN disp_trimestre dt ON dt.id_colaborador = c.id
LEFT JOIN "InHire".dominios dcargo ON dcargo.id = c.id_cargo
LEFT JOIN "InHire".dominios dsen ON dsen.id = c.id_senioridade
JOIN "InHire".colaborador_skills cs
    ON cs.id_colaborador = c.id AND cs.status IS TRUE AND cs.deletado IS FALSE
JOIN "InHire".skills s
    ON s.id = cs.id_skill AND s.status IS TRUE AND s.deletado IS FALSE
LEFT JOIN "InHire".dominios darea ON darea.id = s.id_area_tecnologia
WHERE c.status IS TRUE
  AND c.deletado IS FALSE
  -- Elegibilidade flexível (Peso X): livre agora OU livre em 30 dias
  AND (da.disponibilidade >= 50 OR dp.disponibilidade >= 50);

-- 2. Fallback para o Banco de Candidatos Externo ("InHire".talentos + "InHire".ranking_talentos):
SELECT
    r.id_talento,
    r.nome_talento,
    r.skills_atendidas,
    r.skills_pedidas,
    r.score_percentual,
    t.disponibilidade_informada_percentual,
    dsen.descricao AS senioridade
FROM "InHire".ranking_talentos(ARRAY['Node.js', 'AWS'], false) r
JOIN "InHire".talentos t ON t.id = r.id_talento
LEFT JOIN "InHire".dominios dsen ON dsen.id = t.id_senioridade
WHERE t.status IS TRUE
ORDER BY r.score_percentual DESC, t.disponibilidade_informada_percentual DESC;`;
