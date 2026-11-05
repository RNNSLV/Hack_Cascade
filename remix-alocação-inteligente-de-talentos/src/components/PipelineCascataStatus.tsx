import React from 'react';
import { EtapaCascataLog } from '../utils/motorAlocacao';
import { ArrowRight } from 'lucide-react';

interface PipelineCascataStatusProps {
  etapas: any[];
  filtroOrigemAtivo: string;
  onSelecionarFiltroOrigem: (origem: string) => void;
  resumo: {
    total_encontrados: number;
    melhor_match_percentual: number;
    total_sgbd_interno?: number;
    total_inhire?: number; // <--- Adicione esta linha
    total_workana?: number;
  };
}

export const PipelineCascataStatus: React.FC<PipelineCascataStatusProps> = ({
  etapas,
  filtroOrigemAtivo,
  onSelecionarFiltroOrigem,
  resumo,
}) => {
  return (
    <section
      aria-label="Rastreamento da Estratégia de Busca em Cascata"
      className="bg-white border border-slate-200/80 rounded-xl px-5 py-4 space-y-3.5"
    >
      {/* Linha Superior: Fluxo de Fallback em 1 linha limpa + Filtro de Origem */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-slate-900 mr-1">Ordem de Fallback:</span>
          {etapas.map((etapa, idx) => (
            <React.Fragment key={etapa.ordem}>
              <div
                title={etapa.motivo_transicao}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono-tabular ${
                  etapa.acionada
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'bg-slate-50 text-slate-400'
                }`}
              >
                <span>{etapa.ordem}º {etapa.badge}</span>
                <span className="text-slate-400">·</span>
                <span className="font-normal text-slate-600">
                  {etapa.candidatos_elegiveis} elegíveis
                </span>
              </div>
              {idx < 2 && <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Filtro Rápido por Fonte */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-lg self-start xl:self-auto">
          <button
            type="button"
            onClick={() => onSelecionarFiltroOrigem('TODAS')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filtroOrigemAtivo === 'TODAS'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({resumo.total_encontrados})
          </button>
          <button
            type="button"
            onClick={() => onSelecionarFiltroOrigem('SGBD Interno')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filtroOrigemAtivo === 'SGBD Interno'
                ? 'bg-white text-emerald-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            [SGBD Interno] ({resumo.total_sgbd_interno})
          </button>
          <button
            type="button"
            onClick={() => onSelecionarFiltroOrigem('InHire')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filtroOrigemAtivo === 'InHire'
                ? 'bg-white text-blue-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            [InHire] ({resumo.total_inhire})
          </button>
          <button
            type="button"
            onClick={() => onSelecionarFiltroOrigem('Workana API')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              filtroOrigemAtivo === 'Workana API'
                ? 'bg-white text-amber-800 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            [Workana API] ({resumo.total_workana})
          </button>
        </div>
      </div>
    </section>
  );
};
