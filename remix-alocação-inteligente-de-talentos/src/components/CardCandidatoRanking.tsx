import React, { useState } from 'react';
import { CandidatoRanqueado } from '../utils/motorAlocacao';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

interface CardCandidatoRankingProps {
  candidato: CandidatoRanqueado;
  posicao: number;
  jaAlocado: boolean;
  onAbrirModalAlocacao: (candidato: CandidatoRanqueado) => void;
}

export const CardCandidatoRanking: React.FC<CardCandidatoRankingProps> = ({
  candidato,
  posicao,
  jaAlocado,
  onAbrirModalAlocacao,
}) => {
  const [expandido, setExpandido] = useState<boolean>(false);

  const obterEstiloOrigem = (badge: CandidatoRanqueado['badge_origem']) => {
    switch (badge) {
      case '[SGBD Interno]':
        return 'text-emerald-800 bg-emerald-50/80 border-emerald-200/80';
      case '[InHire]':
        return 'text-blue-800 bg-blue-50/80 border-blue-200/80';
      case '[Workana API]':
        return 'text-amber-900 bg-amber-50/80 border-amber-200/80';
    }
  };

  const obterCorScore = (score: number) => {
    if (score >= 85) return 'text-emerald-700';
    if (score >= 70) return 'text-blue-700';
    return 'text-amber-700';
  };

  return (
    <article
      aria-label={`Candidato ${posicao}: ${candidato.nome}`}
      className="bg-white border border-slate-200/80 rounded-xl px-5 py-4 transition-colors hover:border-slate-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Coluna Esquerda: Identificação, Origem, Motivo do Ranking e Skills */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-tabular text-xs font-semibold text-slate-400">
              #{String(posicao).padStart(2, '0')}
            </span>

            <span
              className={`inline-flex items-center px-2 py-0.5 text-xs font-mono-tabular font-semibold border rounded ${obterEstiloOrigem(
                candidato.badge_origem
              )}`}
            >
              {candidato.badge_origem}
            </span>

            <h3 className="text-base font-bold text-slate-900 truncate">
              {candidato.nome}
            </h3>

            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs text-slate-600">
              {candidato.cargo}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-xs font-medium text-slate-700">
              {candidato.senioridade}
            </span>
          </div>

          {/* Motivo do Ranking como linha tipográfica limpa (sem caixa aninhada) */}
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-900">{candidato.motivo_principal_ranking}</span>
            <span className="text-slate-300 mx-1.5" aria-hidden="true">·</span>
            <span className="text-slate-500">{candidato.custo_estimado_info}</span>
          </p>

          {/* Aderência Técnica Concisa */}
          {/* Competências Renderizadas Simplesmente (Limitadas a 5) */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs">
            {candidato.avaliacao_skills && candidato.avaliacao_skills.slice(0, 5).map((av: any, i: number) => (
              <span key={`${av.nome}-${i}`} className="text-slate-700 font-medium">
                • {av.nome} <span className="text-slate-400 font-normal">({av.nivel})</span>
              </span>
            ))}
            {candidato.avaliacao_skills && candidato.avaliacao_skills.length > 5 && (
              <span className="text-slate-500 italic">
                + {candidato.avaliacao_skills.length - 5} outras...
              </span>
            )}
          </div>
        </div>

        {/* Coluna Direita: Score Match (%) e Botões de Ação */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2.5 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-2xl font-extrabold font-mono-tabular tracking-tight ${obterCorScore(candidato.score_final)}`}>
              {candidato.score_final}%
            </span>
            <span className="text-xs text-slate-400 font-medium">Match</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpandido(!expandido)}
              aria-expanded={expandido}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
            >
              <span>{expandido ? 'Ocultar' : 'Detalhes'}</span>
              {expandido ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => onAbrirModalAlocacao(candidato)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                jaAlocado
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {jaAlocado ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Alocado</span>
                </>
              ) : (
                <span>Alocar Profissional</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Gaveta de Detalhes (Aberta sob demanda pelo usuário) */}
      {expandido && (
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-semibold text-slate-800">Disponibilidade Trimestral</span>
              <span className="font-mono-tabular">
                Skills {candidato.score_skills}% · Disp {candidato.score_disponibilidade}% · Sen {candidato.score_senioridade}%
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              {candidato.planejamentos_trimestre.map((plan, idx) => (
                <div key={`${plan.mes}-${plan.ano}-${idx}`} className="space-y-1">
                  <div className="flex justify-between font-mono-tabular text-[11px]">
                    <span className="font-semibold text-slate-700">{plan.mes}/{plan.ano}</span>
                    <span className="text-slate-900 font-bold">{plan.disponibilidade}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        plan.disponibilidade >= 50 ? 'bg-emerald-600' : plan.disponibilidade > 0 ? 'bg-amber-500' : 'bg-slate-300'
                      }`}
                      style={{ width: `${plan.disponibilidade}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="font-semibold text-slate-800">
              Todas as Tecnologias do Profissional
            </div>
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-slate-600 pt-0.5">
              {candidato.skills_profissional.map((sk, i) => (
                <React.Fragment key={sk.id_skill}>
                  <span>
                    <strong className="text-slate-800 font-medium">{sk.nome_skill}</strong>{' '}
                    <span className="text-[11px] font-mono-tabular text-slate-400">({sk.nivel_conhecimento})</span>
                  </span>
                  {i < candidato.skills_profissional.length - 1 && (
                    <span className="text-slate-300" aria-hidden="true">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
