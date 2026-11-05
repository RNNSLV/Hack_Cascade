/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import {
  COLABORADORES_INTERNOS_INICIAIS,
  ColaboradorInterno,
  TALENTOS_INHIRE_INICIAIS,
  simularChamadaWorkanaApi,
} from './utils/dadosInHire';
import {
  CandidatoRanqueado,
  ConfiguracaoPesos,
  FiltrosBuscaCascata,
  PESOS_PADRAO,
  executarBuscaEmCascata,
} from './utils/motorAlocacao';
import { PainelFiltrosCascata } from './components/PainelFiltrosCascata';
import { PipelineCascataStatus } from './components/PipelineCascataStatus';
import { CardCandidatoRanking } from './components/CardCandidatoRanking';
import { ModalAlocacaoProjeto, RegistroAlocacao } from './components/ModalAlocacaoProjeto';
import { PainelCalibragemPesos } from './components/PainelCalibragemPesos';
import { AbaEntregaveisHackathon } from './components/AbaEntregaveisHackathon';
import { Trash2, UserCheck } from 'lucide-react';

type AbaAtiva = 'busca' | 'pesos' | 'alocacoes' | 'entregaveis';

const FILTROS_CENARIO_JOSE: FiltrosBuscaCascata = {
  termo_busca: '',
  skills_requeridas: ['Node.js', 'AWS'],
  disponibilidade_minima: 50,
  id_senioridade_desejada: 3, // Sênior
  duracao_meses: 3,
  incluir_similaridade: true,
  incluir_disponibilidade_flexivel: true,
  meta_candidatos_ideais: 3,
  forcar_todas_camadas: true,
};

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('busca');
  const [filtros, setFiltros] = useState<FiltrosBuscaCascata>(FILTROS_CENARIO_JOSE);
  const [pesos, setPesos] = useState<ConfiguracaoPesos>(PESOS_PADRAO);
  const [filtroOrigemPainel, setFiltroOrigemPainel] = useState<string>('TODAS');
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);

  // Estado mutável dos colaboradores internos para refletir alocações realizadas na sessão
  const [colaboradoresInternos, setColaboradoresInternos] = useState<ColaboradorInterno[]>(
    COLABORADORES_INTERNOS_INICIAIS
  );
  
// NOVO ESTADO: Substitui o antigo useMemo do resultadoCascata
  const [resultadoCascata, setResultadoCascata] = useState({
    candidatos: [],
    resumo: { total_encontrados: 0, melhor_match_percentual: 0 },
    etapas_cascata: []
  });

  const [alocacoesRealizadas, setAlocacoesRealizadas] = useState<RegistroAlocacao[]>([]);
  const [candidatoEmAlocacao, setCandidatoEmAlocacao] = useState<CandidatoRanqueado | null>(null);
  const [mensagemConfirmacao, setMensagemConfirmacao] = useState<string | null>(null);

  const freelancersWorkana = useMemo(() => simularChamadaWorkanaApi(), []);

  const buscarCandidatosReais = async () => {
    try {
      const response = await fetch('http://127.0.0.1:8000/api/busca-cascata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filtros)
      });
      const dados = await response.json();
      
      if (dados.status === 'sucesso') {
        setResultadoCascata(dados.resultados); 
      }
    } catch (erro) {
      console.error("Erro na API Python:", erro);
    }
  };

  React.useEffect(() => {
    buscarCandidatosReais();
  }, [filtros, pesos]);

  const candidatosVisiveis = useMemo(() => {
    if (filtroOrigemPainel === 'TODAS') {
      return resultadoCascata.candidatos;
    }
    return resultadoCascata.candidatos.filter((c) => c.origem === filtroOrigemPainel);
  }, [resultadoCascata.candidatos, filtroOrigemPainel]);

  const atualizarFiltrosComValidacao = (novosFiltros: FiltrosBuscaCascata) => {
    if (novosFiltros.skills_requeridas.length === 0 && !novosFiltros.termo_busca?.trim()) {
      setErroValidacao('Selecione ao menos 1 skill técnica ou digite um termo de busca para calcular o match.');
    } else {
      setErroValidacao(null);
    }
    setFiltros(novosFiltros);
  };

  const aplicarCenarioJose = () => {
    setErroValidacao(null);
    setFiltroOrigemPainel('TODAS');
    setFiltros(FILTROS_CENARIO_JOSE);
    setAbaAtiva('busca');
  };

  const aplicarCenarioSimilaridadeFrontend = () => {
    setErroValidacao(null);
    setFiltroOrigemPainel('TODAS');
    setFiltros({
      termo_busca: '',
      skills_requeridas: ['Vue.js', 'TypeScript'],
      disponibilidade_minima: 80,
      id_senioridade_desejada: 3,
      duracao_meses: 3,
      incluir_similaridade: true,
      incluir_disponibilidade_flexivel: true,
      meta_candidatos_ideais: 3,
      forcar_todas_camadas: true,
    });
    setAbaAtiva('busca');
  };

  const aplicarCenarioEscassezCloud = () => {
    setErroValidacao(null);
    setFiltroOrigemPainel('TODAS');
    setFiltros({
      termo_busca: '',
      skills_requeridas: ['Kubernetes', 'Go', 'AWS'],
      disponibilidade_minima: 100,
      id_senioridade_desejada: 4, // Especialista
      duracao_meses: 3,
      incluir_similaridade: true,
      incluir_disponibilidade_flexivel: true,
      meta_candidatos_ideais: 3,
      forcar_todas_camadas: true,
    });
    setAbaAtiva('busca');
  };

  const confirmarAlocacaoProfissional = (dados: {
    candidato: CandidatoRanqueado;
    nome_demanda: string;
    percentual_alocado: number;
    mes_inicio: string;
    duracao_meses: number;
  }) => {
    const novoRegistro: RegistroAlocacao = {
      id_alocacao: `ALOC-${Date.now()}`,
      candidato: dados.candidato,
      nome_demanda: dados.nome_demanda,
      percentual_alocado: dados.percentual_alocado,
      mes_inicio: dados.mes_inicio,
      duracao_meses: dados.duracao_meses,
      horario_registro: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setAlocacoesRealizadas((prev) => [novoRegistro, ...prev]);

    // Se for colaborador interno, atualiza o planejamento mensal em tempo real
    if (dados.candidato.origem === 'SGBD Interno') {
      setColaboradoresInternos((prev) =>
        prev.map((colab) => {
          if (colab.id !== dados.candidato.id_original) return colab;
          const novosPlanejamentos = colab.planejamentos.map((plan, idx) => {
            if (dados.mes_inicio.startsWith('Dez') && idx === 0) return plan;
            const novoTotalAlocado = Math.min(100, plan.total_alocado + dados.percentual_alocado);
            return {
              ...plan,
              total_alocado: novoTotalAlocado,
              disponibilidade: Math.max(0, 100 - novoTotalAlocado),
              projeto_atual: dados.nome_demanda,
            };
          });
          return {
            ...colab,
            planejamentos: novosPlanejamentos,
          };
        })
      );
    }

    setCandidatoEmAlocacao(null);
    setMensagemConfirmacao(
      `${dados.candidato.nome} (${dados.candidato.badge_origem}) alocado com sucesso em "${dados.nome_demanda}" (${dados.percentual_alocado}%).`
    );
  };

  const removerAlocacao = (idAlocacao: string) => {
    setAlocacoesRealizadas((prev) => prev.filter((a) => a.id_alocacao !== idAlocacao));
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zonas estritas separadas por gap-8 */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-8 sticky top-0 z-30">
        {/* Zona 1: Brand Title em 1 linha */}
        <a
          href="#topo"
          onClick={(e) => {
            e.preventDefault();
            setAbaAtiva('busca');
          }}
          className="text-lg font-extrabold tracking-tight text-slate-900 font-display whitespace-nowrap shrink-0"
        >
          Cascade
        </a>

        {/* Zona 2: links de navegação concisos em linha única */}
        <nav aria-label="Navegação Principal" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setAbaAtiva('busca')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              abaAtiva === 'busca' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
            }`}
          >
            Busca em Cascata
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('pesos')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              abaAtiva === 'pesos' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
            }`}
          >
            Pesos do Algoritmo
          </button>
          <button
            type="button"
            onClick={() => setAbaAtiva('alocacoes')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              abaAtiva === 'alocacoes' ? 'border-slate-900 text-slate-900 font-semibold' : 'border-transparent'
            }`}
          >
            Alocações ({alocacoesRealizadas.length})
          </button>
        </nav>

        {/* Zona 3: 1 ação primária */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={aplicarCenarioJose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            Carregar Caso do José
          </button>
        </div>
      </header>

      {/* Navegação Mobile Compacta */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setAbaAtiva('busca')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'busca' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Busca em Cascata
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('pesos')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'pesos' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Pesos X e Y
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('alocacoes')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'alocacoes' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Alocações ({alocacoesRealizadas.length})
        </button>
      </div>

      {/* Navegação Mobile Compacta */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setAbaAtiva('busca')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'busca' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Busca em Cascata
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('pesos')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'pesos' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Pesos X e Y
        </button>
        <button
          type="button"
          onClick={() => setAbaAtiva('alocacoes')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 ${
            abaAtiva === 'alocacoes' ? 'bg-slate-900 text-white' : 'text-slate-600 bg-slate-100'
          }`}
        >
          Alocações ({alocacoesRealizadas.length})
        </button>
      </div>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* Cabeçalho Editorial Limpo (Sem caixas aninhadas) */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
          <div className="space-y-0.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Alocação de Talentos em Cascata
            </h1>
            <p className="text-xs text-slate-500">
              Busca algorítmica unificada no schema <code className="font-mono-tabular text-slate-700">"InHire"</code> · Disponibilidade em 30 dias (Peso X) e Similaridade Técnica (Peso Y)
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600 font-mono-tabular shrink-0">
            <span>
              <strong className="text-slate-900 font-bold">{resultadoCascata.resumo.total_encontrados}</strong> elegíveis
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              Melhor match <strong className="text-emerald-700 font-bold">{resultadoCascata.resumo.melhor_match_percentual}%</strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              <strong className="text-blue-700 font-bold">{alocacoesRealizadas.length}</strong> alocados
            </span>
          </div>
        </section>

        {/* Feedback de Alocação Realizada */}
        {mensagemConfirmacao && (
          <div
            role="status"
            className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl px-4 py-3 text-xs font-medium flex items-center justify-between gap-4"
          >
            <span>✓ {mensagemConfirmacao}</span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setAbaAtiva('alocacoes')}
                className="font-bold underline hover:text-emerald-800"
              >
                Ver Alocações ({alocacoesRealizadas.length})
              </button>
              <button
                type="button"
                onClick={() => setMensagemConfirmacao(null)}
                className="text-emerald-700 hover:text-emerald-950"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* ABA 1: BUSCA EM CASCATA E RANKING */}
        {abaAtiva === 'busca' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Filtros Visíveis */}
            <div className="lg:col-span-4">
              <PainelFiltrosCascata
                filtros={filtros}
                pesos={pesos}
                onAtualizarFiltros={atualizarFiltrosComValidacao}
                onAplicarCenarioJose={aplicarCenarioJose}
                onAplicarCenarioSimilaridadeFrontend={aplicarCenarioSimilaridadeFrontend}
                onAplicarCenarioEscassezCloud={aplicarCenarioEscassezCloud}
                onLimparFiltros={() =>
                  atualizarFiltrosComValidacao({
                    ...FILTROS_CENARIO_JOSE,
                    termo_busca: '',
                    skills_requeridas: [],
                    id_senioridade_desejada: null,
                  })
                }
                erroValidacao={erroValidacao}
              />
            </div>

            {/* Coluna Direita: Pipeline da Cascata + Cards de Resultado */}
            <div className="lg:col-span-8 space-y-5">
              <PipelineCascataStatus
                etapas={resultadoCascata.etapas_cascata}
                filtroOrigemAtivo={filtroOrigemPainel}
                onSelecionarFiltroOrigem={setFiltroOrigemPainel}
                resumo={resultadoCascata.resumo}
              />

              {/* Cabeçalho da Lista de Resultados */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                <div className="text-xs text-slate-600">
                  Exibindo <strong className="font-mono-tabular text-slate-900">{candidatosVisiveis.length}</strong> profissionais ordenados por Score de Match Ponderado
                  {filtros.skills_requeridas.length > 0 && (
                    <>
                      {' '}para <strong className="text-slate-900">{filtros.skills_requeridas.join(' + ')}</strong>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAbaAtiva('pesos')}
                  className="text-xs font-semibold text-blue-700 hover:underline self-start sm:self-auto"
                >
                  Calibrar Pesos X ({Math.round(pesos.fator_disponibilidade_futura * 100)}%) e Y ({Math.round(pesos.fator_similaridade_skill * 100)}%) →
                </button>
              </div>

              {/* Lista de Cards ou Empty State */}
              {candidatosVisiveis.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <h3 className="text-base font-bold text-slate-900">
                    Nenhum profissional encontrado com os filtros restritivos atuais
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Tente habilitar a Similaridade Tecnológica (Peso Y), a Disponibilidade em 30 Dias (Peso X) ou restaurar o cenário padrão do José.
                  </p>
                  <button
                    type="button"
                    onClick={aplicarCenarioJose}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Restaurar Cenário do José (Node.js + AWS)
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidatosVisiveis.map((cand, index) => (
                    <CardCandidatoRanking
                      key={cand.id_unico}
                      candidato={cand}
                      posicao={index + 1}
                      jaAlocado={alocacoesRealizadas.some(
                        (a) => a.candidato.id_unico === cand.id_unico
                      )}
                      onAbrirModalAlocacao={(c) => setCandidatoEmAlocacao(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: MATRIZ DE PESOS E ALGORITMO */}
        {abaAtiva === 'pesos' && (
          <div className="space-y-6">
            <PainelCalibragemPesos pesos={pesos} onAtualizarPesos={setPesos} />

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Simulação em Tempo Real do Ranking com os Pesos Atuais
                </h3>
                <button
                  type="button"
                  onClick={() => setAbaAtiva('busca')}
                  className="text-xs font-semibold text-blue-700 hover:underline"
                >
                  Voltar para tela principal de busca →
                </button>
              </div>
              <div className="space-y-3">
                {resultadoCascata.candidatos.slice(0, 5).map((cand, index) => (
                  <CardCandidatoRanking
                    key={cand.id_unico}
                    candidato={cand}
                    posicao={index + 1}
                    jaAlocado={alocacoesRealizadas.some(
                      (a) => a.candidato.id_unico === cand.id_unico
                    )}
                    onAbrirModalAlocacao={(c) => setCandidatoEmAlocacao(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ABA 3: ALOCAÇÕES REALIZADAS PELO JOSÉ */}
        {abaAtiva === 'alocacoes' && (
          <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Alocações Confirmadas por José (<code className="font-mono-tabular">"InHire".alocacoes</code>)
                </h2>
                <p className="text-xs text-slate-600">
                  Histórico de profissionais alocados nesta sessão e impacto direto na disponibilidade mensal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAbaAtiva('busca')}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg self-start sm:self-auto"
              >
                Buscar Novo Profissional
              </button>
            </div>

            {alocacoesRealizadas.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <UserCheck className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">
                  Nenhuma alocação registrada nesta sessão
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Na aba de Busca em Cascata, clique em "Alocar Profissional" em qualquer card de candidato para registrar a alocação na demanda do José.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {alocacoesRealizadas.map((aloc) => (
                  <div
                    key={aloc.id_alocacao}
                    className="border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular text-xs font-bold text-blue-700">
                          {aloc.candidato.badge_origem}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="font-bold text-slate-900">{aloc.candidato.nome}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-600">{aloc.candidato.cargo}</span>
                      </div>
                      <div className="text-xs text-slate-700">
                        Demanda: <strong>{aloc.nome_demanda}</strong> · Dedicação:{' '}
                        <strong className="font-mono-tabular">{aloc.percentual_alocado}%</strong> · Início:{' '}
                        <strong>{aloc.mes_inicio}</strong> ({aloc.duracao_meses} meses)
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-xs font-mono-tabular text-slate-500">
                        Registrado às {aloc.horario_registro}
                      </span>
                      <button
                        type="button"
                        onClick={() => removerAlocacao(aloc.id_alocacao)}
                        aria-label={`Remover alocação de ${aloc.candidato.nome}`}
                        className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ABA 4: CÓDIGO FONTE (app.py / SQL / User Stories / Testes) */}
      </main>

      {/* Modal de Confirmação de Alocação */}
      <ModalAlocacaoProjeto
        candidato={candidatoEmAlocacao}
        percentualSugerido={filtros.disponibilidade_minima}
        duracaoSugerida={filtros.duracao_meses}
        onFechar={() => setCandidatoEmAlocacao(null)}
        onConfirmarAlocacao={confirmarAlocacaoProfissional}
      />

      {/* Rodapé Corporativo Discreto */}
      <footer className="bg-white border-t border-slate-200 px-6 py-4 mt-auto">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>Cascade · Solução para o Desafio "A Busca do José" (VINT Global + Faculdade INBEC)</span>
          <span>Arquitetura 100% Algorítmica · PostgreSQL Schema "InHire"</span>
        </div>
      </footer>
    </div>
  );
}
