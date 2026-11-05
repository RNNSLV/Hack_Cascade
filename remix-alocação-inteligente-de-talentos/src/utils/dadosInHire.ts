/**
 * Representação fiel do schema PostgreSQL "InHire" fornecido para o Hackathon VINT Global + INBEC.
 * Inclui as tabelas: dominios, skills, colaboradores, colaborador_skills, alocacoes, planejamentos,
 * talentos, talento_skills e o mock da API externa (Workana API).
 */

export type OrigemCandidato = 'SGBD Interno' | 'InHire' | 'Workana API';

export type NivelConhecimento = 'BASICO' | 'INTERMEDIARIO' | 'AVANCADO';

export interface Dominio {
  id: number;
  tipo_dominio: 'CARGO' | 'SENIORIDADE' | 'MODALIDADE' | 'AREA_TECNOLOGIA' | 'NIVEL_CONHECIMENTO' | 'VINCULO';
  valor_dominio: string;
  descricao: string;
}

export interface Skill {
  id: number;
  nome_skill: string;
  id_area_tecnologia: number;
  nome_area_tecnologia: string;
  status: boolean;
  deletado: boolean;
}

export interface PlanejamentoMensal {
  mes: 'Jan' | 'Fev' | 'Mar' | 'Abr' | 'Mai' | 'Jun' | 'Jul' | 'Ago' | 'Set' | 'Out' | 'Nov' | 'Dez';
  numero_mes: number;
  ano: number;
  total_alocado: number; // 0 a 100
  disponibilidade: number; // 100 - total_alocado
  projeto_atual?: string;
}

export interface HabilidadeProfissional {
  id_skill: number;
  nome_skill: string;
  id_area_tecnologia: number;
  nome_area_tecnologia: string;
  nivel_conhecimento: NivelConhecimento;
}

export interface ColaboradorInterno {
  id: number;
  nome_abreviado: string;
  cargo: string;
  id_cargo: number;
  senioridade: 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista';
  id_senioridade: number;
  modalidade: 'Remoto' | 'Híbrido' | 'Presencial';
  setor: string;
  data_admissao: string;
  skills: HabilidadeProfissional[];
  planejamentos: PlanejamentoMensal[];
  status: boolean;
  deletado: boolean;
}

export interface TalentoInHire {
  id: number;
  nome_abreviado: string;
  cargo: string;
  id_cargo: number;
  senioridade: 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista';
  id_senioridade: number;
  modalidade: 'Remoto' | 'Híbrido' | 'Presencial';
  disponibilidade_informada_percentual: number;
  prazo_inicio_dias: number;
  pretensao_mensal_brl: number;
  skills: HabilidadeProfissional[];
  status: boolean;
  criado_em: string;
}

export interface FreelancerWorkana {
  id_externo: string;
  nome_profissional: string;
  titulo_perfil: string;
  senioridade: 'Júnior' | 'Pleno' | 'Sênior' | 'Especialista';
  id_senioridade: number;
  disponibilidade_percentual: number;
  horas_semanais_livres: number;
  prazo_inicio_dias: number;
  valor_hora_brl: number;
  avaliacao_plataforma: number;
  projetos_concluidos: number;
  skills: HabilidadeProfissional[];
}

export const DOMINIOS_INHIRE: Dominio[] = [
  // Senioridades
  { id: 1, tipo_dominio: 'SENIORIDADE', valor_dominio: 'JUNIOR', descricao: 'Júnior' },
  { id: 2, tipo_dominio: 'SENIORIDADE', valor_dominio: 'PLENO', descricao: 'Pleno' },
  { id: 3, tipo_dominio: 'SENIORIDADE', valor_dominio: 'SENIOR', descricao: 'Sênior' },
  { id: 4, tipo_dominio: 'SENIORIDADE', valor_dominio: 'ESPECIALISTA', descricao: 'Especialista' },

  // Áreas de Tecnologia (usadas para cálculo algorítmico de Similaridade de Skills)
  { id: 101, tipo_dominio: 'AREA_TECNOLOGIA', valor_dominio: 'FRONTEND', descricao: 'Frontend Web & UI' },
  { id: 102, tipo_dominio: 'AREA_TECNOLOGIA', valor_dominio: 'BACKEND', descricao: 'Backend & Arquitetura de APIs' },
  { id: 103, tipo_dominio: 'AREA_TECNOLOGIA', valor_dominio: 'CLOUD_DEVOPS', descricao: 'Cloud Computing & DevOps' },
  { id: 104, tipo_dominio: 'AREA_TECNOLOGIA', valor_dominio: 'DADOS_DB', descricao: 'Banco de Dados & Engenharia de Dados' },
  { id: 105, tipo_dominio: 'AREA_TECNOLOGIA', valor_dominio: 'MOBILE', descricao: 'Desenvolvimento Mobile' },

  // Cargos
  { id: 201, tipo_dominio: 'CARGO', valor_dominio: 'DEV_BACKEND', descricao: 'Desenvolvedor Backend' },
  { id: 202, tipo_dominio: 'CARGO', valor_dominio: 'DEV_FULLSTACK', descricao: 'Desenvolvedor Full-Stack' },
  { id: 203, tipo_dominio: 'CARGO', valor_dominio: 'DEV_FRONTEND', descricao: 'Desenvolvedor Frontend' },
  { id: 204, tipo_dominio: 'CARGO', valor_dominio: 'ENG_DEVOPS', descricao: 'Engenheiro Cloud / DevOps' },
  { id: 205, tipo_dominio: 'CARGO', valor_dominio: 'ENG_DADOS', descricao: 'Engenheiro de Dados' },
];

export const CATALOGO_SKILLS: Skill[] = [
  // Área 102: Backend & APIs
  { id: 10, nome_skill: 'Node.js', id_area_tecnologia: 102, nome_area_tecnologia: 'Backend & Arquitetura de APIs', status: true, deletado: false },
  { id: 11, nome_skill: 'Python', id_area_tecnologia: 102, nome_area_tecnologia: 'Backend & Arquitetura de APIs', status: true, deletado: false },
  { id: 12, nome_skill: 'Java', id_area_tecnologia: 102, nome_area_tecnologia: 'Backend & Arquitetura de APIs', status: true, deletado: false },
  { id: 13, nome_skill: 'C# / .NET', id_area_tecnologia: 102, nome_area_tecnologia: 'Backend & Arquitetura de APIs', status: true, deletado: false },
  { id: 14, nome_skill: 'Go', id_area_tecnologia: 102, nome_area_tecnologia: 'Backend & Arquitetura de APIs', status: true, deletado: false },

  // Área 103: Cloud & DevOps
  { id: 20, nome_skill: 'AWS', id_area_tecnologia: 103, nome_area_tecnologia: 'Cloud Computing & DevOps', status: true, deletado: false },
  { id: 21, nome_skill: 'Azure', id_area_tecnologia: 103, nome_area_tecnologia: 'Cloud Computing & DevOps', status: true, deletado: false },
  { id: 22, nome_skill: 'Google Cloud (GCP)', id_area_tecnologia: 103, nome_area_tecnologia: 'Cloud Computing & DevOps', status: true, deletado: false },
  { id: 23, nome_skill: 'Docker', id_area_tecnologia: 103, nome_area_tecnologia: 'Cloud Computing & DevOps', status: true, deletado: false },
  { id: 24, nome_skill: 'Kubernetes', id_area_tecnologia: 103, nome_area_tecnologia: 'Cloud Computing & DevOps', status: true, deletado: false },

  // Área 101: Frontend Web & UI
  { id: 30, nome_skill: 'React', id_area_tecnologia: 101, nome_area_tecnologia: 'Frontend Web & UI', status: true, deletado: false },
  { id: 31, nome_skill: 'Vue.js', id_area_tecnologia: 101, nome_area_tecnologia: 'Frontend Web & UI', status: true, deletado: false },
  { id: 32, nome_skill: 'Angular', id_area_tecnologia: 101, nome_area_tecnologia: 'Frontend Web & UI', status: true, deletado: false },
  { id: 33, nome_skill: 'TypeScript', id_area_tecnologia: 101, nome_area_tecnologia: 'Frontend Web & UI', status: true, deletado: false },

  // Área 104: Dados & Banco de Dados
  { id: 40, nome_skill: 'PostgreSQL', id_area_tecnologia: 104, nome_area_tecnologia: 'Banco de Dados & Engenharia de Dados', status: true, deletado: false },
  { id: 41, nome_skill: 'MongoDB', id_area_tecnologia: 104, nome_area_tecnologia: 'Banco de Dados & Engenharia de Dados', status: true, deletado: false },
  { id: 42, nome_skill: 'Redis', id_area_tecnologia: 104, nome_area_tecnologia: 'Banco de Dados & Engenharia de Dados', status: true, deletado: false },

  // Área 105: Mobile
  { id: 50, nome_skill: 'React Native', id_area_tecnologia: 105, nome_area_tecnologia: 'Desenvolvimento Mobile', status: true, deletado: false },
  { id: 51, nome_skill: 'Flutter', id_area_tecnologia: 105, nome_area_tecnologia: 'Desenvolvimento Mobile', status: true, deletado: false },
];

function montarSkill(idSkill: number, nivel: NivelConhecimento): HabilidadeProfissional {
  const encontrada = CATALOGO_SKILLS.find((s) => s.id === idSkill);
  if (!encontrada) {
    throw new Error(`Skill ID ${idSkill} não encontrada no catálogo.`);
  }
  return {
    id_skill: encontrada.id,
    nome_skill: encontrada.nome_skill,
    id_area_tecnologia: encontrada.id_area_tecnologia,
    nome_area_tecnologia: encontrada.nome_area_tecnologia,
    nivel_conhecimento: nivel,
  };
}

/**
 * 1ª Camada da Cascata: SGBD Interno ("InHire".colaboradores + colaborador_skills + planejamentos)
 */
export const COLABORADORES_INTERNOS_INICIAIS: ColaboradorInterno[] = [
  {
    id: 1001,
    nome_abreviado: 'Rafael M. Oliveira',
    cargo: 'Desenvolvedor Full-Stack',
    id_cargo: 202,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Remoto',
    setor: 'Engenharia Digital',
    data_admissao: '2022-03-14',
    skills: [
      montarSkill(10, 'AVANCADO'), // Node.js
      montarSkill(20, 'AVANCADO'), // AWS
      montarSkill(33, 'AVANCADO'), // TypeScript
      montarSkill(40, 'INTERMEDIARIO'), // PostgreSQL
    ],
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 40, disponibilidade: 60, projeto_atual: 'Portal Financeiro B2B' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 40, disponibilidade: 60, projeto_atual: 'Portal Financeiro B2B' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 20, disponibilidade: 80, projeto_atual: 'Sustentação Portal' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1002,
    nome_abreviado: 'Camila S. Ferreira',
    cargo: 'Desenvolvedor Backend',
    id_cargo: 201,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Híbrido',
    setor: 'Plataforma & Core',
    data_admissao: '2021-08-02',
    skills: [
      montarSkill(10, 'AVANCADO'), // Node.js
      montarSkill(20, 'AVANCADO'), // AWS
      montarSkill(23, 'AVANCADO'), // Docker
      montarSkill(40, 'AVANCADO'), // PostgreSQL
    ],
    // Demonstra a regra de Disponibilidade Flexível (Peso X):
    // Está com 80% alocado em Nov/2026 (apenas 20% livre agora), mas fica 100% livre em 30 dias (Dez/2026 e Jan/2027)
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 80, disponibilidade: 20, projeto_atual: 'Migração Core Bancário (Fase Final)' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Livre (Fim de Contrato)' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Livre' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1003,
    nome_abreviado: 'Lucas A. Mendes',
    cargo: 'Desenvolvedor Backend',
    id_cargo: 201,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Remoto',
    setor: 'Arquitetura Cloud',
    data_admissao: '2023-01-10',
    // Demonstra Similaridade de Skills (Peso Y):
    // Tem Node.js exato, mas não tem AWS — porém domina Azure e Docker (mesma categoria Cloud & DevOps)
    skills: [
      montarSkill(10, 'AVANCADO'), // Node.js
      montarSkill(21, 'AVANCADO'), // Azure (mesma área de AWS)
      montarSkill(23, 'INTERMEDIARIO'), // Docker (mesma área de AWS)
      montarSkill(41, 'INTERMEDIARIO'), // MongoDB
    ],
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 30, disponibilidade: 70, projeto_atual: 'API Gateway Interno' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 30, disponibilidade: 70, projeto_atual: 'API Gateway Interno' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 30, disponibilidade: 70, projeto_atual: 'API Gateway Interno' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1004,
    nome_abreviado: 'Beatriz R. Costa',
    cargo: 'Desenvolvedor Frontend',
    id_cargo: 203,
    senioridade: 'Pleno',
    id_senioridade: 2,
    modalidade: 'Remoto',
    setor: 'Produtos Digitais',
    data_admissao: '2023-06-19',
    // Demonstra Similaridade Frontend: domina React e TypeScript (quando o projeto pede Vue.js ou Angular)
    skills: [
      montarSkill(30, 'AVANCADO'), // React
      montarSkill(33, 'AVANCADO'), // TypeScript
      montarSkill(10, 'BASICO'),   // Node.js
    ],
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Disponível no Banco Interno' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Disponível no Banco Interno' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Disponível no Banco Interno' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1005,
    nome_abreviado: 'Thiago V. Nascimento',
    cargo: 'Engenheiro Cloud / DevOps',
    id_cargo: 204,
    senioridade: 'Especialista',
    id_senioridade: 4,
    modalidade: 'Remoto',
    setor: 'SRE & Cloud',
    data_admissao: '2020-11-05',
    skills: [
      montarSkill(20, 'AVANCADO'), // AWS
      montarSkill(24, 'AVANCADO'), // Kubernetes
      montarSkill(23, 'AVANCADO'), // Docker
      montarSkill(11, 'INTERMEDIARIO'), // Python (mesma categoria Backend que Node.js)
    ],
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 50, disponibilidade: 50, projeto_atual: 'Malha Kubernetes Multi-Região' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 20, disponibilidade: 80, projeto_atual: 'Malha Kubernetes Multi-Região' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Livre' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1006,
    nome_abreviado: 'Fernanda L. Albuquerque',
    cargo: 'Desenvolvedor Full-Stack',
    id_cargo: 202,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Híbrido',
    setor: 'Canais Digitais',
    data_admissao: '2022-09-12',
    skills: [
      montarSkill(30, 'AVANCADO'), // React
      montarSkill(31, 'INTERMEDIARIO'), // Vue.js
      montarSkill(33, 'AVANCADO'), // TypeScript
      montarSkill(10, 'INTERMEDIARIO'), // Node.js
    ],
    // 100% alocada em Nov, mas libera 100% em Dez (30 dias)
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 100, disponibilidade: 0, projeto_atual: 'App SuperBanco (Entrega Nov)' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Livre em 30 dias' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 0, disponibilidade: 100, projeto_atual: 'Livre' },
    ],
    status: true,
    deletado: false,
  },
  {
    id: 1007,
    nome_abreviado: 'Gabriel P. Rocha',
    cargo: 'Engenheiro de Dados',
    id_cargo: 205,
    senioridade: 'Pleno',
    id_senioridade: 2,
    modalidade: 'Remoto',
    setor: 'Data & Analytics',
    data_admissao: '2024-02-01',
    skills: [
      montarSkill(11, 'AVANCADO'), // Python
      montarSkill(40, 'AVANCADO'), // PostgreSQL
      montarSkill(20, 'INTERMEDIARIO'), // AWS
      montarSkill(42, 'BASICO'), // Redis
    ],
    planejamentos: [
      { mes: 'Nov', numero_mes: 11, ano: 2026, total_alocado: 20, disponibilidade: 80, projeto_atual: 'Data Lake Corporativo' },
      { mes: 'Dez', numero_mes: 12, ano: 2026, total_alocado: 20, disponibilidade: 80, projeto_atual: 'Data Lake Corporativo' },
      { mes: 'Jan', numero_mes: 1, ano: 2027, total_alocado: 20, disponibilidade: 80, projeto_atual: 'Data Lake Corporativo' },
    ],
    status: true,
    deletado: false,
  },
];

/**
 * 2ª Camada da Cascata: Banco Externo InHire ("InHire".talentos + talento_skills)
 */
export const TALENTOS_INHIRE_INICIAIS: TalentoInHire[] = [
  {
    id: 2001,
    nome_abreviado: 'Mariana G. Azevedo',
    cargo: 'Desenvolvedor Backend',
    id_cargo: 201,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Remoto',
    disponibilidade_informada_percentual: 100,
    prazo_inicio_dias: 7,
    pretensao_mensal_brl: 14500,
    skills: [
      montarSkill(10, 'AVANCADO'), // Node.js
      montarSkill(20, 'AVANCADO'), // AWS
      montarSkill(40, 'AVANCADO'), // PostgreSQL
      montarSkill(23, 'INTERMEDIARIO'), // Docker
    ],
    status: true,
    criado_em: '2026-10-18T14:20:00Z',
  },
  {
    id: 2002,
    nome_abreviado: 'Eduardo K. Martins',
    cargo: 'Desenvolvedor Frontend',
    id_cargo: 203,
    senioridade: 'Sênior',
    id_senioridade: 3,
    modalidade: 'Remoto',
    disponibilidade_informada_percentual: 100,
    prazo_inicio_dias: 5,
    pretensao_mensal_brl: 13800,
    skills: [
      montarSkill(31, 'AVANCADO'), // Vue.js
      montarSkill(30, 'AVANCADO'), // React
      montarSkill(33, 'AVANCADO'), // TypeScript
      montarSkill(10, 'INTERMEDIARIO'), // Node.js
    ],
    status: true,
    criado_em: '2026-10-22T09:15:00Z',
  },
  {
    id: 2003,
    nome_abreviado: 'Henrique B. Duarte',
    cargo: 'Desenvolvedor Full-Stack',
    id_cargo: 202,
    senioridade: 'Pleno',
    id_senioridade: 2,
    modalidade: 'Híbrido',
    disponibilidade_informada_percentual: 80,
    prazo_inicio_dias: 15,
    pretensao_mensal_brl: 10200,
    skills: [
      montarSkill(10, 'AVANCADO'), // Node.js
      montarSkill(22, 'INTERMEDIARIO'), // GCP (similar à AWS)
      montarSkill(30, 'AVANCADO'), // React
      montarSkill(41, 'INTERMEDIARIO'), // MongoDB
    ],
    status: true,
    criado_em: '2026-10-25T11:30:00Z',
  },
  {
    id: 2004,
    nome_abreviado: 'Patrícia N. Cavalcanti',
    cargo: 'Engenheiro Cloud / DevOps',
    id_cargo: 204,
    senioridade: 'Especialista',
    id_senioridade: 4,
    modalidade: 'Remoto',
    disponibilidade_informada_percentual: 60,
    prazo_inicio_dias: 10,
    pretensao_mensal_brl: 17500,
    skills: [
      montarSkill(20, 'AVANCADO'), // AWS
      montarSkill(24, 'AVANCADO'), // Kubernetes
      montarSkill(23, 'AVANCADO'), // Docker
      montarSkill(14, 'INTERMEDIARIO'), // Go
    ],
    status: true,
    criado_em: '2026-10-26T16:45:00Z',
  },
];

/**
 * 3ª Camada da Cascata: Simulação de API Externa (Workana API)
 */
export function simularChamadaWorkanaApi(): FreelancerWorkana[] {
  return [
    {
      id_externo: 'WK-9081',
      nome_profissional: 'Diego T. Vasconcelos',
      titulo_perfil: 'Arquiteto Node.js & AWS Serverless | Freelancer Top 1%',
      senioridade: 'Sênior',
      id_senioridade: 3,
      disponibilidade_percentual: 100,
      horas_semanais_livres: 40,
      prazo_inicio_dias: 2,
      valor_hora_brl: 115,
      avaliacao_plataforma: 4.95,
      projetos_concluidos: 42,
      skills: [
        montarSkill(10, 'AVANCADO'), // Node.js
        montarSkill(20, 'AVANCADO'), // AWS
        montarSkill(33, 'AVANCADO'), // TypeScript
        montarSkill(23, 'AVANCADO'), // Docker
        montarSkill(40, 'INTERMEDIARIO'), // PostgreSQL
      ],
    },
    {
      id_externo: 'WK-9082',
      nome_profissional: 'Larissa M. Peixoto',
      titulo_perfil: 'Especialista Frontend Vue.js, React & Design Systems',
      senioridade: 'Sênior',
      id_senioridade: 3,
      disponibilidade_percentual: 75,
      horas_semanais_livres: 30,
      prazo_inicio_dias: 3,
      valor_hora_brl: 98,
      avaliacao_plataforma: 4.88,
      projetos_concluidos: 31,
      skills: [
        montarSkill(31, 'AVANCADO'), // Vue.js
        montarSkill(32, 'AVANCADO'), // Angular
        montarSkill(30, 'AVANCADO'), // React
        montarSkill(33, 'AVANCADO'), // TypeScript
      ],
    },
    {
      id_externo: 'WK-9083',
      nome_profissional: 'André F. Montenegro',
      titulo_perfil: 'Engenheiro Backend Python, Go, Kubernetes & Cloud',
      senioridade: 'Especialista',
      id_senioridade: 4,
      disponibilidade_percentual: 100,
      horas_semanais_livres: 40,
      prazo_inicio_dias: 1,
      valor_hora_brl: 135,
      avaliacao_plataforma: 5.0,
      projetos_concluidos: 58,
      skills: [
        montarSkill(11, 'AVANCADO'), // Python
        montarSkill(14, 'AVANCADO'), // Go
        montarSkill(24, 'AVANCADO'), // Kubernetes
        montarSkill(20, 'AVANCADO'), // AWS
        montarSkill(40, 'AVANCADO'), // PostgreSQL
      ],
    },
    {
      id_externo: 'WK-9084',
      nome_profissional: 'Juliana C. Barreto',
      titulo_perfil: 'Desenvolvedora Mobile & Full-Stack (React Native, Flutter, Node.js)',
      senioridade: 'Pleno',
      id_senioridade: 2,
      disponibilidade_percentual: 100,
      horas_semanais_livres: 40,
      prazo_inicio_dias: 2,
      valor_hora_brl: 85,
      avaliacao_plataforma: 4.82,
      projetos_concluidos: 19,
      skills: [
        montarSkill(50, 'AVANCADO'), // React Native
        montarSkill(51, 'AVANCADO'), // Flutter
        montarSkill(10, 'INTERMEDIARIO'), // Node.js
        montarSkill(30, 'AVANCADO'), // React
      ],
    },
  ];
}
