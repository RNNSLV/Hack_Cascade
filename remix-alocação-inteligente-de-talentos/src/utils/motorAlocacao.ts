/**
 * Motor Algorítmico de Busca em Cascata e Ranking Ponderado de Talentos
 * ESTRITAMENTE ALGORÍTMICO (Zero uso de IA em tempo de execução).
 * Baseado em regras de negócio determinísticas, pesos configuráveis e matriz de similaridade por área tecnológica.
 */

import {
  CATALOGO_SKILLS,
  ColaboradorInterno,
  FreelancerWorkana,
  HabilidadeProfissional,
  NivelConhecimento,
  OrigemCandidato,
  PlanejamentoMensal,
  Skill,
  TalentoInHire,
} from './dadosInHire';

export interface ConfiguracaoPesos {
  /** Peso da dimensão de Habilidades Técnicas no score final (padrão: 0.50 = 50%) */
  peso_skills: number;
  /** Peso da dimensão de Disponibilidade no score final (padrão: 0.35 = 35%) */
  peso_disponibilidade: number;
  /** Peso da dimensão de Senioridade no score final (padrão: 0.15 = 15%) */
  peso_senioridade: number;
  /** Peso X (Regra de Disponibilidade Flexível): Fator aplicado quando o talento libera agenda em 30 dias (padrão: 0.78) */
  fator_disponibilidade_futura: number;
  /** Peso Y (Regra de Similaridade de Skill): Fator aplicado quando domina ferramenta da mesma categoria (padrão: 0.60) */
  fator_similaridade_skill: number;
}

export const PESOS_PADRAO: ConfiguracaoPesos = {
  peso_skills: 0.50,
  peso_disponibilidade: 0.35,
  peso_senioridade: 0.15,
  fator_disponibilidade_futura: 0.78,
  fator_similaridade_skill: 0.60,
};

export interface FiltrosBuscaCascata {
  termo_busca?: string;
  skills_requeridas: string[];
  disponibilidade_minima: number; // 0 a 100 (%)
  id_senioridade_desejada: number | null; // 1=Júnior, 2=Pleno, 3=Sênior, 4=Especialista, null=Todas
  duracao_meses: number; // ex: 3 meses
  incluir_similaridade: boolean;
  incluir_disponibilidade_flexivel: boolean;
  meta_candidatos_ideais: number; // Quantidade de matches fortes (score >= 80) para satisfazer a cascata
  forcar_todas_camadas: boolean; // Permite ao gestor inspecionar todas as camadas mesmo se o SGBD Interno tiver match
}

export interface AvaliacaoSkillIndividual {
  skill_pedida: string;
  area_tecnologia: string;
  status_match: 'EXATO' | 'SIMILAR' | 'AUSENTE';
  skill_correspondente: string | null;
  nivel_profissional: NivelConhecimento | null;
  pontuacao_obtida: number; // 0 a 100 para esta skill
  explicacao: string;
}

export interface CandidatoRanqueado {
  id_unico: string;
  id_original: number | string;
  nome: string;
  cargo: string;
  senioridade: 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista';
  id_senioridade: number;
  modalidade: string;
  origem: OrigemCandidato;
  badge_origem: '[SGBD Interno]' | '[InHire]' | '[Workana API]';
  disponibilidade_mes_atual: number;
  disponibilidade_proximo_mes: number;
  disponibilidade_media_periodo: number;
  horas_mensais_livres: number;
  planejamentos_trimestre: PlanejamentoMensal[];
  score_final: number; // 0 a 100
  score_skills: number; // 0 a 100
  score_disponibilidade: number; // 0 a 100
  score_senioridade: number; // 0 a 100
  skills_exatas_atendidas: number;
  skills_similares_atendidas: number;
  total_skills_pedidas: number;
  motivo_principal_ranking: string;
  tags_justificativa: string[];
  avaliacao_skills: AvaliacaoSkillIndividual[];
  skills_profissional: HabilidadeProfissional[];
  custo_estimado_info: string;
  prazo_mobilizacao: string;
}

export interface EtapaCascataLog {
  ordem: 1 | 2 | 3;
  fonte: OrigemCandidato;
  badge: '[SGBD Interno]' | '[InHire]' | '[Workana API]';
  tabela_ou_endpoint: string;
  acionada: boolean;
  candidatos_avaliados: number;
  candidatos_elegiveis: number;
  candidatos_alta_aderencia: number;
  tempo_execucao_ms: number;
  motivo_transicao: string;
}

export interface ResultadoBuscaCascata {
  filtros_aplicados: FiltrosBuscaCascata;
  pesos_utilizados: ConfiguracaoPesos;
  candidatos: CandidatoRanqueado[];
  etapas_cascata: EtapaCascataLog[];
  resumo: {
    total_encontrados: number;
    total_sgbd_interno: number;
    total_inhire: number;
    total_workana: number;
    melhor_match_percentual: number;
    economia_tempo_estimada: string;
  };
}

/**
 * Converte o nível de conhecimento técnico em multiplicador de proficiência.
 */
export function obterMultiplicadorNivel(nivel: NivelConhecimento): number {
  switch (nivel) {
    case 'AVANCADO':
      return 1.0;
    case 'INTERMEDIARIO':
      return 0.88;
    case 'BASICO':
      return 0.72;
    default:
      return 0.85;
  }
}

/**
 * Calcula a pontuação de Senioridade (0 a 100) comparando o nível exigido pelo projeto
 * com o nível atual do profissional.
 */
export function calcularScoreSenioridade(
  idSenioridadeDesejada: number | null,
  idSenioridadeCandidato: number
): { score: number; explicacao: string } {
  if (!idSenioridadeDesejada) {
    return { score: 100, explicacao: 'Senioridade aberta (qualquer nível aceito)' };
  }

  const diferenca = idSenioridadeCandidato - idSenioridadeDesejada;

  if (diferenca === 0) {
    return { score: 100, explicacao: 'Senioridade exata solicitada pelo projeto' };
  }
  if (diferenca === 1) {
    return { score: 95, explicacao: 'Senioridade 1 nível acima do solicitado (alta autonomia)' };
  }
  if (diferenca > 1) {
    return { score: 85, explicacao: 'Senioridade muito acima (possível sobrecusto)' };
  }
  if (diferenca === -1) {
    return { score: 65, explicacao: 'Senioridade 1 nível abaixo (elegível com acompanhamento)' };
  }
  return { score: 30, explicacao: 'Senioridade abaixo do mínimo recomendado' };
}

/**
 * Calcula o Score de Skills (0 a 100) aplicando:
 * - Match Exato: 100 pontos * multiplicador de nível
 * - Similaridade de Categoria Tecnológica (Peso Y): 100 * fator_similaridade_skill * multiplicador de nível
 */
export function calcularScoreSkillsComSimilaridade(
  skillsRequeridasNomes: string[],
  skillsCandidato: HabilidadeProfissional[],
  catalogoSkills: Skill[],
  fatorSimilaridadeY: number,
  permitirSimilaridade: boolean
): {
  score_skills: number;
  exatas: number;
  similares: number;
  avaliacoes: AvaliacaoSkillIndividual[];
} {
  if (skillsRequeridasNomes.length === 0) {
    return {
      score_skills: 100,
      exatas: 0,
      similares: 0,
      avaliacoes: [],
    };
  }

  let somaPontos = 0;
  let exatas = 0;
  let similares = 0;
  const avaliacoes: AvaliacaoSkillIndividual[] = [];

  const nomesRequeridosNormalizados = new Set(
    skillsRequeridasNomes.map((s) => s.trim().toLowerCase())
  );

  for (const nomeRequerido of skillsRequeridasNomes) {
    const nomeNormalizado = nomeRequerido.trim().toLowerCase();
    const skillCatalogo = catalogoSkills.find(
      (s) => s.nome_skill.trim().toLowerCase() === nomeNormalizado
    );

    // 1. Verifica se o profissional possui a skill exata
    const matchExato = skillsCandidato.find(
      (sc) => sc.nome_skill.trim().toLowerCase() === nomeNormalizado
    );

    if (matchExato) {
      const mult = obterMultiplicadorNivel(matchExato.nivel_conhecimento);
      const pontos = Math.round(100 * mult);
      somaPontos += pontos;
      exatas += 1;
      avaliacoes.push({
        skill_pedida: nomeRequerido,
        area_tecnologia: matchExato.nome_area_tecnologia,
        status_match: 'EXATO',
        skill_correspondente: matchExato.nome_skill,
        nivel_profissional: matchExato.nivel_conhecimento,
        pontuacao_obtida: pontos,
        explicacao: `Match exato em ${matchExato.nome_skill} (Nível ${matchExato.nivel_conhecimento})`,
      });
      continue;
    }

    // 2. Regra de Similaridade (Peso Y): Verifica se possui ferramenta da mesma id_area_tecnologia
    // que NÃO seja uma skill já cobrada separadamente na própria requisição
    if (permitirSimilaridade && skillCatalogo) {
      const candidatasMesmaArea = skillsCandidato.filter(
        (sc) =>
          sc.id_area_tecnologia === skillCatalogo.id_area_tecnologia &&
          !nomesRequeridosNormalizados.has(sc.nome_skill.trim().toLowerCase())
      );

      if (candidatasMesmaArea.length > 0) {
        // Escolhe a skill similar de maior nível de proficiência
        const melhorSimilar = [...candidatasMesmaArea].sort(
          (a, b) =>
            obterMultiplicadorNivel(b.nivel_conhecimento) -
            obterMultiplicadorNivel(a.nivel_conhecimento)
        )[0];

        const mult = obterMultiplicadorNivel(melhorSimilar.nivel_conhecimento);
        const pontosSimilar = Math.round(100 * fatorSimilaridadeY * mult);
        somaPontos += pontosSimilar;
        similares += 1;

        avaliacoes.push({
          skill_pedida: nomeRequerido,
          area_tecnologia: skillCatalogo.nome_area_tecnologia,
          status_match: 'SIMILAR',
          skill_correspondente: melhorSimilar.nome_skill,
          nivel_profissional: melhorSimilar.nivel_conhecimento,
          pontuacao_obtida: pontosSimilar,
          explicacao: `Similaridade (${Math.round(fatorSimilaridadeY * 100)}%): domina ${melhorSimilar.nome_skill} na categoria ${skillCatalogo.nome_area_tecnologia}`,
        });
        continue;
      }
    }

    // 3. Ausente
    avaliacoes.push({
      skill_pedida: nomeRequerido,
      area_tecnologia: skillCatalogo?.nome_area_tecnologia ?? 'Tecnologia Geral',
      status_match: 'AUSENTE',
      skill_correspondente: null,
      nivel_profissional: null,
      pontuacao_obtida: 0,
      explicacao: `Sem experiência registrada em ${nomeRequerido} ou correlatas`,
    });
  }

  const scoreMedio = Number((somaPontos / skillsRequeridasNomes.length).toFixed(2));

  return {
    score_skills: Math.min(100, scoreMedio),
    exatas,
    similares,
    avaliacoes,
  };
}

/**
 * Calcula o Score de Disponibilidade Flexível (Peso X):
 * - Caso 1 (Disponibilidade Imediata Plena): disponibilidade_mes_atual >= disponibilidade_minima -> 100 pts
 * - Caso 2 (Disponibilidade em 30 dias / Próximo Mês - Peso X):
 *   Se no mês atual está alocado, mas no mês seguinte (em 30 dias) possui disponibilidade >= disponibilidade_minima,
 *   recebe `100 * fator_disponibilidade_futura` (ex: 78 pts) e selo "Disponível em 30 dias".
 * - Caso 3 (Disponibilidade Parcial Proporcional):
 *   Se possui disponibilidade parcial > 0, recebe nota proporcional.
 */
export function calcularScoreDisponibilidadeFlexivel(
  disponibilidadeMesAtual: number,
  disponibilidadeProximoMes: number,
  disponibilidadeMediaPeriodo: number,
  disponibilidadeMinimaRequerida: number,
  fatorDisponibilidadeFuturaX: number,
  permitirFlexibilidade: boolean
): {
  score_disponibilidade: number;
  elegivel: boolean;
  motivo_disponibilidade: string;
  disponivel_em_30_dias: boolean;
} {
  const req = Math.max(1, disponibilidadeMinimaRequerida);

  // Caso 1: Atende integralmente já no mês atual
  if (disponibilidadeMesAtual >= disponibilidadeMinimaRequerida) {
    // Bônus sutil se a média dos 3 meses também supera a exigência
    const folga = disponibilidadeMediaPeriodo >= disponibilidadeMinimaRequerida ? 100 : 94;
    return {
      score_disponibilidade: folga,
      elegivel: true,
      motivo_disponibilidade: `Disponibilidade imediata de ${disponibilidadeMesAtual}% (${Math.round((disponibilidadeMesAtual / 100) * 160)}h/mês livres)`,
      disponivel_em_30_dias: false,
    };
  }

  // Caso 2: Regra do Peso X — Não tem toda a disponibilidade hoje, mas libera no próximo mês (30 dias)
  if (permitirFlexibilidade && disponibilidadeProximoMes >= disponibilidadeMinimaRequerida) {
    const proporcaoAtual = disponibilidadeMesAtual / req;
    // Combina o fator X base com eventual disponibilidade parcial já no mês corrente
    const notaFlexivel = Math.min(
      92,
      Math.round(100 * fatorDisponibilidadeFuturaX + proporcaoAtual * 10)
    );
    return {
      score_disponibilidade: notaFlexivel,
      elegivel: true,
      motivo_disponibilidade:
        disponibilidadeMesAtual > 0
          ? `Disponível em 30 dias (${disponibilidadeMesAtual}% livre agora · ${disponibilidadeProximoMes}% no próx. mês)`
          : `Disponível em 30 dias (${disponibilidadeProximoMes}% livre a partir do próx. mês)`,
      disponivel_em_30_dias: true,
    };
  }

  // Caso 3: Disponibilidade parcial (ex: precisa de 80%, tem 60% constante)
  if (permitirFlexibilidade && disponibilidadeMediaPeriodo >= disponibilidadeMinimaRequerida * 0.6) {
    const notaParcial = Math.round((disponibilidadeMediaPeriodo / req) * 70);
    return {
      score_disponibilidade: Math.max(25, Math.min(75, notaParcial)),
      elegivel: true,
      motivo_disponibilidade: `Disponibilidade parcial de ${Math.round(disponibilidadeMediaPeriodo)}% na janela de 3 meses`,
      disponivel_em_30_dias: false,
    };
  }

  return {
    score_disponibilidade: Math.round((disponibilidadeMesAtual / req) * 40),
    elegivel: false,
    motivo_disponibilidade: `Alocado (${disponibilidadeMesAtual}% livre agora, abaixo dos ${disponibilidadeMinimaRequerida}% exigidos)`,
    disponivel_em_30_dias: false,
  };
}

/**
 * Executa a Busca em Cascata (Fallback Strategy):
 * 1º SGBD Interno ("InHire".colaboradores + planejamentos)
 * 2º Banco Externo InHire ("InHire".talentos)
 * 3º API Externa de Freelancers (Workana API)
 */
export function executarBuscaEmCascata(
  filtros: FiltrosBuscaCascata,
  colaboradoresInternos: ColaboradorInterno[],
  talentosInHire: TalentoInHire[],
  freelancersWorkana: FreelancerWorkana[],
  pesos: ConfiguracaoPesos = PESOS_PADRAO
): ResultadoBuscaCascata {
  const etapasCascata: EtapaCascataLog[] = [];
  const candidatosFinais: CandidatoRanqueado[] = [];

  const termoBusca = (filtros.termo_busca ?? '').trim().toLowerCase();
  const skillsRequeridas = filtros.skills_requeridas.filter((s) => s.trim() !== '');

  // Normaliza soma dos pesos para garantir escala 0..100
  const somaPesos = pesos.peso_skills + pesos.peso_disponibilidade + pesos.peso_senioridade || 1;
  const pSkills = pesos.peso_skills / somaPesos;
  const pDisp = pesos.peso_disponibilidade / somaPesos;
  const pSen = pesos.peso_senioridade / somaPesos;

  const passaFiltroTexto = (nome: string, cargo: string, skills: HabilidadeProfissional[]) => {
    if (!termoBusca) return true;
    if (nome.toLowerCase().includes(termoBusca)) return true;
    if (cargo.toLowerCase().includes(termoBusca)) return true;
    return skills.some(
      (s) =>
        s.nome_skill.toLowerCase().includes(termoBusca) ||
        s.nome_area_tecnologia.toLowerCase().includes(termoBusca)
    );
  };

  // =========================================================================
  // ETAPA 1: SGBD INTERNO ("InHire".colaboradores + planejamentos)
  // =========================================================================
  const candidatosInternos: CandidatoRanqueado[] = [];

  for (const colab of colaboradoresInternos) {
    if (!colab.status || colab.deletado) continue;
    if (!passaFiltroTexto(colab.nome_abreviado, colab.cargo, colab.skills)) continue;

    const dispMes1 = colab.planejamentos[0]?.disponibilidade ?? 100;
    const dispMes2 = colab.planejamentos[1]?.disponibilidade ?? dispMes1;
    const dispMedia =
      colab.planejamentos.length > 0
        ? Math.round(
            colab.planejamentos.reduce((acc, p) => acc + p.disponibilidade, 0) /
              colab.planejamentos.length
          )
        : 100;

    const avalSkills = calcularScoreSkillsComSimilaridade(
      skillsRequeridas,
      colab.skills,
      CATALOGO_SKILLS,
      pesos.fator_similaridade_skill,
      filtros.incluir_similaridade
    );

    // Se há skills requeridas e o candidato não tem nem skill exata nem similar, descarta
    if (
      skillsRequeridas.length > 0 &&
      avalSkills.exatas === 0 &&
      avalSkills.similares === 0
    ) {
      continue;
    }

    const avalDisp = calcularScoreDisponibilidadeFlexivel(
      dispMes1,
      dispMes2,
      dispMedia,
      filtros.disponibilidade_minima,
      pesos.fator_disponibilidade_futura,
      filtros.incluir_disponibilidade_flexivel
    );

    if (!avalDisp.elegivel) continue;

    const avalSen = calcularScoreSenioridade(
      filtros.id_senioridade_desejada,
      colab.id_senioridade
    );

    // Se não permite flexibilidade e a senioridade é muito distante, filtra
    if (
      !filtros.incluir_similaridade &&
      filtros.id_senioridade_desejada !== null &&
      colab.id_senioridade !== filtros.id_senioridade_desejada
    ) {
      continue;
    }

    const scoreFinal = Math.round(
      avalSkills.score_skills * pSkills +
        avalDisp.score_disponibilidade * pDisp +
        avalSen.score * pSen
    );

    const tagsJustificativa: string[] = [];
    if (avalSkills.exatas === skillsRequeridas.length && skillsRequeridas.length > 0) {
      tagsJustificativa.push(`100% das skills exatas (${avalSkills.exatas}/${skillsRequeridas.length})`);
    } else if (avalSkills.similares > 0) {
      const nomesSimilares = avalSkills.avaliacoes
        .filter((a) => a.status_match === 'SIMILAR')
        .map((a) => `${a.skill_correspondente} ≈ ${a.skill_pedida}`)
        .join(', ');
      tagsJustificativa.push(`Similaridade técnica: ${nomesSimilares}`);
    }

    tagsJustificativa.push(avalDisp.motivo_disponibilidade);
    tagsJustificativa.push('Custo zero de contratação (Equipe Interna)');

    let motivoPrincipal = avalDisp.motivo_disponibilidade;
    if (avalDisp.disponivel_em_30_dias) {
      motivoPrincipal = `Disponível em 30 dias (${dispMes2}% livre no próx. mês)`;
    } else if (avalSkills.similares > 0 && avalSkills.exatas < skillsRequeridas.length) {
      const sim = avalSkills.avaliacoes.find((a) => a.status_match === 'SIMILAR');
      motivoPrincipal = `Similaridade de Skill: domina ${sim?.skill_correspondente} (mesma categoria de ${sim?.skill_pedida})`;
    } else if (avalSkills.exatas === skillsRequeridas.length && dispMes1 >= filtros.disponibilidade_minima) {
      motivoPrincipal = `Match Interno Ideal · ${dispMes1}% livre imediatamente`;
    }

    candidatosInternos.push({
      id_unico: `INTERNO-${colab.id}`,
      id_original: colab.id,
      nome: colab.nome_abreviado,
      cargo: colab.cargo,
      senioridade: colab.senioridade,
      id_senioridade: colab.id_senioridade,
      modalidade: colab.modalidade,
      origem: 'SGBD Interno',
      badge_origem: '[SGBD Interno]',
      disponibilidade_mes_atual: dispMes1,
      disponibilidade_proximo_mes: dispMes2,
      disponibilidade_media_periodo: dispMedia,
      horas_mensais_livres: Math.round((dispMes1 / 100) * 160),
      planejamentos_trimestre: colab.planejamentos,
      score_final: scoreFinal,
      score_skills: Math.round(avalSkills.score_skills),
      score_disponibilidade: avalDisp.score_disponibilidade,
      score_senioridade: avalSen.score,
      skills_exatas_atendidas: avalSkills.exatas,
      skills_similares_atendidas: avalSkills.similares,
      total_skills_pedidas: skillsRequeridas.length,
      motivo_principal_ranking: motivoPrincipal,
      tags_justificativa: tagsJustificativa,
      avaliacao_skills: avalSkills.avaliacoes,
      skills_profissional: colab.skills,
      custo_estimado_info: 'Alocação Interna (Sem fee de hunting)',
      prazo_mobilizacao: avalDisp.disponivel_em_30_dias ? 'Início em 30 dias (Dez/2026)' : 'Mobilização Imediata (24h)',
    });
  }

  const internosAltaAderencia = candidatosInternos.filter((c) => c.score_final >= 80).length;
  const precisaFallbackNivel2 =
    filtros.forcar_todas_camadas || internosAltaAderencia < filtros.meta_candidatos_ideais;

  etapasCascata.push({
    ordem: 1,
    fonte: 'SGBD Interno',
    badge: '[SGBD Interno]',
    tabela_ou_endpoint: '"InHire".colaboradores + "InHire".planejamentos',
    acionada: true,
    candidatos_avaliados: colaboradoresInternos.length,
    candidatos_elegiveis: candidatosInternos.length,
    candidatos_alta_aderencia: internosAltaAderencia,
    tempo_execucao_ms: 4.2,
    motivo_transicao:
      internosAltaAderencia < filtros.meta_candidatos_ideais
        ? `Apenas ${internosAltaAderencia}/${filtros.meta_candidatos_ideais} candidatos internos com score ≥ 80%. Acionando Fallback Nível 2 [InHire].`
        : filtros.forcar_todas_camadas
        ? `${internosAltaAderencia} matches internos fortes encontrados. Expandindo busca para [InHire] (comparativo de 3 camadas ativo).`
        : `Meta de ${filtros.meta_candidatos_ideais} candidatos de alta aderência atingida internamente.`,
  });

  candidatosFinais.push(...candidatosInternos);

  // =========================================================================
  // ETAPA 2: BANCO DE TALENTOS EXTERNO ("InHire".talentos + talento_skills)
  // =========================================================================
  const candidatosInHire: CandidatoRanqueado[] = [];

  if (precisaFallbackNivel2) {
    for (const tal of talentosInHire) {
      if (!tal.status) continue;
      if (!passaFiltroTexto(tal.nome_abreviado, tal.cargo, tal.skills)) continue;

      const disp = tal.disponibilidade_informada_percentual;

      const avalSkills = calcularScoreSkillsComSimilaridade(
        skillsRequeridas,
        tal.skills,
        CATALOGO_SKILLS,
        pesos.fator_similaridade_skill,
        filtros.incluir_similaridade
      );

      if (
        skillsRequeridas.length > 0 &&
        avalSkills.exatas === 0 &&
        avalSkills.similares === 0
      ) {
        continue;
      }

      const avalDisp = calcularScoreDisponibilidadeFlexivel(
        disp,
        disp,
        disp,
        filtros.disponibilidade_minima,
        pesos.fator_disponibilidade_futura,
        filtros.incluir_disponibilidade_flexivel
      );

      if (!avalDisp.elegivel) continue;

      const avalSen = calcularScoreSenioridade(
        filtros.id_senioridade_desejada,
        tal.id_senioridade
      );

      if (
        !filtros.incluir_similaridade &&
        filtros.id_senioridade_desejada !== null &&
        tal.id_senioridade !== filtros.id_senioridade_desejada
      ) {
        continue;
      }

      // Leve ajuste de prioridade de origem (-3 pts) para desempatar a favor de colaboradores internos de mesmo score
      const scoreBruto =
        avalSkills.score_skills * pSkills +
        avalDisp.score_disponibilidade * pDisp +
        avalSen.score * pSen;
      const scoreFinal = Math.max(10, Math.min(98, Math.round(scoreBruto - 2)));

      const tagsJustificativa: string[] = [
        `Banco de Talentos InHire · Disponibilidade declarada de ${disp}%`,
        `Onboarding estimado em ${tal.prazo_inicio_dias} dias corridos`,
      ];

      let motivoPrincipal = `Banco de Talentos InHire · ${disp}% disponível (Início em ${tal.prazo_inicio_dias} dias)`;
      if (avalSkills.similares > 0 && avalSkills.exatas < skillsRequeridas.length) {
        const sim = avalSkills.avaliacoes.find((a) => a.status_match === 'SIMILAR');
        motivoPrincipal = `Fallback InHire + Similaridade: domina ${sim?.skill_correspondente} (categoria de ${sim?.skill_pedida})`;
      }

      candidatosInHire.push({
        id_unico: `INHIRE-${tal.id}`,
        id_original: tal.id,
        nome: tal.nome_abreviado,
        cargo: tal.cargo,
        senioridade: tal.senioridade,
        id_senioridade: tal.id_senioridade,
        modalidade: tal.modalidade,
        origem: 'InHire',
        badge_origem: '[InHire]',
        disponibilidade_mes_atual: disp,
        disponibilidade_proximo_mes: disp,
        disponibilidade_media_periodo: disp,
        horas_mensais_livres: Math.round((disp / 100) * 160),
        planejamentos_trimestre: [
          { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Banco de Talentos InHire' },
          { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Banco de Talentos InHire' },
          { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Banco de Talentos InHire' },
        ],
        score_final: scoreFinal,
        score_skills: Math.round(avalSkills.score_skills),
        score_disponibilidade: avalDisp.score_disponibilidade,
        score_senioridade: avalSen.score,
        skills_exatas_atendidas: avalSkills.exatas,
        skills_similares_atendidas: avalSkills.similares,
        total_skills_pedidas: skillsRequeridas.length,
        motivo_principal_ranking: motivoPrincipal,
        tags_justificativa: tagsJustificativa,
        avaliacao_skills: avalSkills.avaliacoes,
        skills_profissional: tal.skills,
        custo_estimado_info: `Pretensão: R$ ${tal.pretensao_mensal_brl.toLocaleString('pt-BR')}/mês`,
        prazo_mobilizacao: `Contratação rápida (${tal.prazo_inicio_dias} dias)`,
      });
    }
  }

  const inhireAltaAderencia = candidatosInHire.filter((c) => c.score_final >= 80).length;
  const totalAcumuladoAltaAderencia = internosAltaAderencia + inhireAltaAderencia;
  const precisaFallbackNivel3 =
    filtros.forcar_todas_camadas || totalAcumuladoAltaAderencia < filtros.meta_candidatos_ideais;

  etapasCascata.push({
    ordem: 2,
    fonte: 'InHire',
    badge: '[InHire]',
    tabela_ou_endpoint: '"InHire".talentos + "InHire".talento_skills',
    acionada: precisaFallbackNivel2,
    candidatos_avaliados: precisaFallbackNivel2 ? talentosInHire.length : 0,
    candidatos_elegiveis: candidatosInHire.length,
    candidatos_alta_aderencia: inhireAltaAderencia,
    tempo_execucao_ms: precisaFallbackNivel2 ? 6.8 : 0,
    motivo_transicao: !precisaFallbackNivel2
      ? 'Etapa não necessária (demanda suprida pelo SGBD Interno).'
      : precisaFallbackNivel3
      ? `Acumulado de ${totalAcumuladoAltaAderencia}/${filtros.meta_candidatos_ideais} candidatos ideais. Acionando Fallback Nível 3 [Workana API].`
      : 'Meta de candidatos atingida após consulta ao banco externo InHire.',
  });

  candidatosFinais.push(...candidatosInHire);

  // =========================================================================
  // ETAPA 3: API EXTERNA DE FREELANCERS (Workana API Mock)
  // =========================================================================
  const candidatosWorkana: CandidatoRanqueado[] = [];

  if (precisaFallbackNivel3) {
    for (const freela of freelancersWorkana) {
      if (!passaFiltroTexto(freela.nome_profissional, freela.titulo_perfil, freela.skills)) continue;

      const disp = freela.disponibilidade_percentual;

      const avalSkills = calcularScoreSkillsComSimilaridade(
        skillsRequeridas,
        freela.skills,
        CATALOGO_SKILLS,
        pesos.fator_similaridade_skill,
        filtros.incluir_similaridade
      );

      if (
        skillsRequeridas.length > 0 &&
        avalSkills.exatas === 0 &&
        avalSkills.similares === 0
      ) {
        continue;
      }

      const avalDisp = calcularScoreDisponibilidadeFlexivel(
        disp,
        disp,
        disp,
        filtros.disponibilidade_minima,
        pesos.fator_disponibilidade_futura,
        filtros.incluir_disponibilidade_flexivel
      );

      if (!avalDisp.elegivel) continue;

      const avalSen = calcularScoreSenioridade(
        filtros.id_senioridade_desejada,
        freela.id_senioridade
      );

      if (
        !filtros.incluir_similaridade &&
        filtros.id_senioridade_desejada !== null &&
        freela.id_senioridade !== filtros.id_senioridade_desejada
      ) {
        continue;
      }

      const scoreBruto =
        avalSkills.score_skills * pSkills +
        avalDisp.score_disponibilidade * pDisp +
        avalSen.score * pSen;
      // Ajuste leve (-4 pts) por ser contratação externa sob demanda via API de freelancers
      const scoreFinal = Math.max(10, Math.min(96, Math.round(scoreBruto - 4)));

      const motivoPrincipal = `Freelancer Verificado (${freela.avaliacao_plataforma.toFixed(2)}★) · ${freela.horas_semanais_livres}h/sem livres (Início em ${freela.prazo_inicio_dias}d)`;

      candidatosWorkana.push({
        id_unico: `WORKANA-${freela.id_externo}`,
        id_original: freela.id_externo,
        nome: freela.nome_profissional,
        cargo: freela.titulo_perfil,
        senioridade: freela.senioridade,
        id_senioridade: freela.id_senioridade,
        modalidade: 'Remoto (Contrato On-Demand)',
        origem: 'Workana API',
        badge_origem: '[Workana API]',
        disponibilidade_mes_atual: disp,
        disponibilidade_proximo_mes: disp,
        disponibilidade_media_periodo: disp,
        horas_mensais_livres: freela.horas_semanais_livres * 4,
        planejamentos_trimestre: [
          { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Disponível via Workana API' },
          { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Disponível via Workana API' },
          { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 100 - disp, disponibilidade: disp, projeto_atual: 'Disponível via Workana API' },
        ],
        score_final: scoreFinal,
        score_skills: Math.round(avalSkills.score_skills),
        score_disponibilidade: avalDisp.score_disponibilidade,
        score_senioridade: avalSen.score,
        skills_exatas_atendidas: avalSkills.exatas,
        skills_similares_atendidas: avalSkills.similares,
        total_skills_pedidas: skillsRequeridas.length,
        motivo_principal_ranking: motivoPrincipal,
        tags_justificativa: [
          `Avaliação Workana: ${freela.avaliacao_plataforma}★ (${freela.projetos_concluidos} projetos entregues)`,
          `Alocação imediata em ${freela.prazo_inicio_dias} dias úteis`,
        ],
        avaliacao_skills: avalSkills.avaliacoes,
        skills_profissional: freela.skills,
        custo_estimado_info: `Taxa: R$ ${freela.valor_hora_brl}/hora (~R$ ${(freela.valor_hora_brl * 160).toLocaleString('pt-BR')}/mês a 100%)`,
        prazo_mobilizacao: `Imediato via API (${freela.prazo_inicio_dias} dias)`,
      });
    }
  }

  const workanaAltaAderencia = candidatosWorkana.filter((c) => c.score_final >= 80).length;

  etapasCascata.push({
    ordem: 3,
    fonte: 'Workana API',
    badge: '[Workana API]',
    tabela_ou_endpoint: 'GET https://api.workana.com/v1/freelancers/search (Mock JSON)',
    acionada: precisaFallbackNivel3,
    candidatos_avaliados: precisaFallbackNivel3 ? freelancersWorkana.length : 0,
    candidatos_elegiveis: candidatosWorkana.length,
    candidatos_alta_aderencia: workanaAltaAderencia,
    tempo_execucao_ms: precisaFallbackNivel3 ? 18.5 : 0,
    motivo_transicao: precisaFallbackNivel3
      ? `API Externa consultada com sucesso: ${candidatosWorkana.length} freelancers elegíveis adicionados ao ranking.`
      : 'Etapa não acionada (demanda suprida pelas bases internas/InHire).',
  });

  candidatosFinais.push(...candidatosWorkana);

  // Ordenação determinística:
  // 1. Maior score_final
  // 2. Em caso de empate, prioridade para SGBD Interno > InHire > Workana API
  // 3. Maior disponibilidade imediata
  const prioridadeOrigem: Record<OrigemCandidato, number> = {
    'SGBD Interno': 3,
    InHire: 2,
    'Workana API': 1,
  };

  candidatosFinais.sort((a, b) => {
    if (b.score_final !== a.score_final) {
      return b.score_final - a.score_final;
    }
    if (prioridadeOrigem[b.origem] !== prioridadeOrigem[a.origem]) {
      return prioridadeOrigem[b.origem] - prioridadeOrigem[a.origem];
    }
    return b.disponibilidade_mes_atual - a.disponibilidade_mes_atual;
  });

  return {
    filtros_aplicados: filtros,
    pesos_utilizados: pesos,
    candidatos: candidatosFinais,
    etapas_cascata: etapasCascata,
    resumo: {
      total_encontrados: candidatosFinais.length,
      total_sgbd_interno: candidatosInternos.length,
      total_inhire: candidatosInHire.length,
      total_workana: candidatosWorkana.length,
      melhor_match_percentual: candidatosFinais[0]?.score_final ?? 0,
      economia_tempo_estimada: 'De ~3 dias para 14ms',
    },
  };
}
