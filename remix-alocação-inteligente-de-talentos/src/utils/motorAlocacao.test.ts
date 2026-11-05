import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATALOGO_SKILLS,
  COLABORADORES_INTERNOS_INICIAIS,
  TALENTOS_INHIRE_INICIAIS,
  simularChamadaWorkanaApi,
} from './dadosInHire';
import {
  PESOS_PADRAO,
  calcularScoreDisponibilidadeFlexivel,
  calcularScoreSenioridade,
  calcularScoreSkillsComSimilaridade,
  executarBuscaEmCascata,
} from './motorAlocacao';

test('Regra 1: Similaridade de Skills (Peso Y) atribui pontuação parcial para ferramentas da mesma categoria tecnológica', () => {
  // Candidato domina React (AVANCADO, id_area_tecnologia=101), projeto pede Vue.js (id_area_tecnologia=101)
  const skillsCandidato = [
    {
      id_skill: 30,
      nome_skill: 'React',
      id_area_tecnologia: 101,
      nome_area_tecnologia: 'Frontend Web & UI',
      nivel_conhecimento: 'AVANCADO' as const,
    },
  ];

  const resultadoComSimilaridade = calcularScoreSkillsComSimilaridade(
    ['Vue.js'],
    skillsCandidato,
    CATALOGO_SKILLS,
    0.60,
    true
  );

  assert.equal(resultadoComSimilaridade.exatas, 0);
  assert.equal(resultadoComSimilaridade.similares, 1);
  assert.equal(resultadoComSimilaridade.score_skills, 60);
  assert.equal(resultadoComSimilaridade.avaliacoes[0].status_match, 'SIMILAR');
  assert.equal(resultadoComSimilaridade.avaliacoes[0].skill_correspondente, 'React');

  // Se desativar similaridade, pontuação deve ser 0
  const resultadoSemSimilaridade = calcularScoreSkillsComSimilaridade(
    ['Vue.js'],
    skillsCandidato,
    CATALOGO_SKILLS,
    0.60,
    false
  );
  assert.equal(resultadoSemSimilaridade.score_skills, 0);

  // Não deve reutilizar TypeScript como substituta de Vue.js se TypeScript já foi pedida separadamente
  const apenasTypeScript = [
    {
      id_skill: 33,
      nome_skill: 'TypeScript',
      id_area_tecnologia: 101,
      nome_area_tecnologia: 'Frontend Web & UI',
      nivel_conhecimento: 'AVANCADO' as const,
    },
  ];
  const resultadoSemDuplicidade = calcularScoreSkillsComSimilaridade(
    ['Vue.js', 'TypeScript'],
    apenasTypeScript,
    CATALOGO_SKILLS,
    0.60,
    true
  );
  assert.equal(resultadoSemDuplicidade.exatas, 1);
  assert.equal(resultadoSemDuplicidade.similares, 0);
  assert.equal(resultadoSemDuplicidade.score_skills, 50);
});

test('Regra 2: Disponibilidade Flexível (Peso X) mantém elegível talento que libera agenda em 30 dias', () => {
  // Projeto exige 50% de alocação; profissional tem apenas 20% livre agora, mas 100% livre no próximo mês (30 dias)
  const avaliacao = calcularScoreDisponibilidadeFlexivel(20, 100, 73, 50, 0.78, true);

  assert.equal(avaliacao.elegivel, true);
  assert.equal(avaliacao.disponivel_em_30_dias, true);
  assert.ok(avaliacao.score_disponibilidade >= 78 && avaliacao.score_disponibilidade <= 92);
  assert.ok(avaliacao.motivo_disponibilidade.includes('Disponível em 30 dias'));
});

test('Regra 3: Cálculo de Senioridade privilegia nível exato e aplica desconto gradual para níveis adjacentes', () => {
  const exato = calcularScoreSenioridade(3, 3); // Sênior == Sênior
  const acima = calcularScoreSenioridade(3, 4); // Especialista > Sênior
  const abaixo = calcularScoreSenioridade(3, 2); // Pleno < Sênior

  assert.equal(exato.score, 100);
  assert.equal(acima.score, 95);
  assert.equal(abaixo.score, 65);
});

test('Regra 4: Caso do José (Dev Sênior Node.js + AWS com 50% de disponibilidade) ordena corretamente e identifica badges', () => {
  const resultado = executarBuscaEmCascata(
    {
      skills_requeridas: ['Node.js', 'AWS'],
      disponibilidade_minima: 50,
      id_senioridade_desejada: 3, // Sênior
      duracao_meses: 3,
      incluir_similaridade: true,
      incluir_disponibilidade_flexivel: true,
      meta_candidatos_ideais: 3,
      forcar_todas_camadas: true,
    },
    COLABORADORES_INTERNOS_INICIAIS,
    TALENTOS_INHIRE_INICIAIS,
    simularChamadaWorkanaApi(),
    PESOS_PADRAO
  );

  assert.ok(resultado.candidatos.length >= 5);

  // O primeiro colocado deve ser Rafael M. Oliveira ([SGBD Interno]), pois possui Node.js + AWS avançados e 60% livre imediato
  const primeiro = resultado.candidatos[0];
  assert.equal(primeiro.nome, 'Rafael M. Oliveira');
  assert.equal(primeiro.badge_origem, '[SGBD Interno]');
  assert.ok(primeiro.score_final >= 95);

  // Camila S. Ferreira ([SGBD Interno]) deve estar presente com justificativa de "Disponível em 30 dias"
  const camila = resultado.candidatos.find((c) => c.nome.includes('Camila'));
  assert.ok(camila, 'Camila deve ser elegível pela regra de disponibilidade em 30 dias');
  assert.ok(camila.motivo_principal_ranking.includes('Disponível em 30 dias'));

  // Lucas A. Mendes ([SGBD Interno]) deve estar presente pela regra de similaridade (domina Azure/Docker no lugar de AWS)
  const lucas = resultado.candidatos.find((c) => c.nome.includes('Lucas'));
  assert.ok(lucas, 'Lucas deve ser elegível pela similaridade Cloud (Azure/Docker ≈ AWS)');
  assert.equal(lucas.skills_similares_atendidas, 1);

  // Verifica presença das 3 fontes na cascata
  const origensPresentes = new Set(resultado.candidatos.map((c) => c.badge_origem));
  assert.equal(origensPresentes.has('[SGBD Interno]'), true);
  assert.equal(origensPresentes.has('[InHire]'), true);
  assert.equal(origensPresentes.has('[Workana API]'), true);
});

test('Regra 5: Cascata inteligente interrompe camadas externas quando a meta interna é cumprida e forcar_todas_camadas=false', () => {
  const resultado = executarBuscaEmCascata(
    {
      skills_requeridas: ['Node.js'],
      disponibilidade_minima: 50,
      id_senioridade_desejada: null,
      duracao_meses: 3,
      incluir_similaridade: true,
      incluir_disponibilidade_flexivel: true,
      meta_candidatos_ideais: 1, // Apenas 1 candidato interno já basta
      forcar_todas_camadas: false,
    },
    COLABORADORES_INTERNOS_INICIAIS,
    TALENTOS_INHIRE_INICIAIS,
    simularChamadaWorkanaApi(),
    PESOS_PADRAO
  );

  assert.equal(resultado.etapas_cascata[0].acionada, true);
  assert.equal(resultado.etapas_cascata[1].acionada, false);
  assert.equal(resultado.etapas_cascata[2].acionada, false);
  assert.equal(resultado.resumo.total_inhire, 0);
  assert.equal(resultado.resumo.total_workana, 0);
});
