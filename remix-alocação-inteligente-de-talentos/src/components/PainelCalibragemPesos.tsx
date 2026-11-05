import React from 'react';
import { ConfiguracaoPesos, PESOS_PADRAO } from '../utils/motorAlocacao';
import { RotateCcw, Sliders } from 'lucide-react';

interface PainelCalibragemPesosProps {
  pesos: ConfiguracaoPesos;
  onAtualizarPesos: (novosPesos: ConfiguracaoPesos) => void;
}

export const PainelCalibragemPesos: React.FC<PainelCalibragemPesosProps> = ({
  pesos,
  onAtualizarPesos,
}) => {
  return (
    <section
      aria-label="Calibragem dos Pesos do Algoritmo de Ranking"
      className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Matriz Matemática de Pesos do Ranking (Zero IA em Runtime)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Ajuste os pesos da equação determinística e observe o recálculo instantâneo do score de todos os candidatos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onAtualizarPesos(PESOS_PADRAO)}
          className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Restaurar Pesos Padrão
        </button>
      </div>

      {/* Equação Visual */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono-tabular text-xs text-slate-800 space-y-1">
        <div className="font-bold text-slate-900">Fórmula Algorítmica Aplicada a Cada Candidato:</div>
        <div>
          Score_Final = (Score_Skills × <strong className="text-blue-700">{Math.round(pesos.peso_skills * 100)}%</strong>) + (Score_Disponibilidade × <strong className="text-emerald-700">{Math.round(pesos.peso_disponibilidade * 100)}%</strong>) + (Score_Senioridade × <strong className="text-amber-700">{Math.round(pesos.peso_senioridade * 100)}%</strong>)
        </div>
        <div className="text-slate-600 pt-1">
          Onde: <strong className="text-slate-900">Peso X (Disponibilidade em 30 dias)</strong> = {Math.round(pesos.fator_disponibilidade_futura * 100)}% · <strong className="text-slate-900">Peso Y (Similaridade por Categoria Tecnológica)</strong> = {Math.round(pesos.fator_similaridade_skill * 100)}%
        </div>
      </div>

      {/* Sliders dos Pesos X e Y e Pesos Globais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Regras Especiais do Problema (Pesos X e Y)</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <label htmlFor="slider-peso-x" className="text-slate-800">
                Peso X — Disponibilidade Flexível (Livre em 30 dias)
              </label>
              <span className="font-mono-tabular text-blue-700">
                {Math.round(pesos.fator_disponibilidade_futura * 100)}%
              </span>
            </div>
            <input
              id="slider-peso-x"
              type="range"
              min={0.4}
              max={0.95}
              step={0.02}
              value={pesos.fator_disponibilidade_futura}
              onChange={(e) =>
                onAtualizarPesos({
                  ...pesos,
                  fator_disponibilidade_futura: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-slate-500">
              Define a nota base de disponibilidade atribuída ao profissional que está alocado este mês, mas tem 100% de agenda livre no próximo mês.
            </p>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex justify-between text-xs font-semibold">
              <label htmlFor="slider-peso-y" className="text-slate-800">
                Peso Y — Similaridade de Skill (Mesma Categoria)
              </label>
              <span className="font-mono-tabular text-blue-700">
                {Math.round(pesos.fator_similaridade_skill * 100)}%
              </span>
            </div>
            <input
              id="slider-peso-y"
              type="range"
              min={0.3}
              max={0.9}
              step={0.05}
              value={pesos.fator_similaridade_skill}
              onChange={(e) =>
                onAtualizarPesos({
                  ...pesos,
                  fator_similaridade_skill: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-slate-500">
              Define o percentual de pontuação quando o candidato não domina a ferramenta exata (ex: Vue.js ou AWS), mas domina outra da mesma <code className="font-mono-tabular">id_area_tecnologia</code> (ex: React ou Azure).
            </p>
          </div>
        </div>

        <div className="space-y-4 border border-slate-200 rounded-xl p-4">
          <div className="text-sm font-bold text-slate-900">
            Composição do Score Global (P_skills, P_disp, P_sen)
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <label htmlFor="slider-peso-skills" className="text-slate-800">
                Peso da Aderência de Skills
              </label>
              <span className="font-mono-tabular text-slate-900">
                {Math.round(pesos.peso_skills * 100)}%
              </span>
            </div>
            <input
              id="slider-peso-skills"
              type="range"
              min={0.2}
              max={0.8}
              step={0.05}
              value={pesos.peso_skills}
              onChange={(e) =>
                onAtualizarPesos({
                  ...pesos,
                  peso_skills: Number(e.target.value),
                })
              }
              className="w-full accent-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <label htmlFor="slider-peso-disp" className="text-slate-800">
                Peso da Disponibilidade Mensal
              </label>
              <span className="font-mono-tabular text-slate-900">
                {Math.round(pesos.peso_disponibilidade * 100)}%
              </span>
            </div>
            <input
              id="slider-peso-disp"
              type="range"
              min={0.1}
              max={0.7}
              step={0.05}
              value={pesos.peso_disponibilidade}
              onChange={(e) =>
                onAtualizarPesos({
                  ...pesos,
                  peso_disponibilidade: Number(e.target.value),
                })
              }
              className="w-full accent-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <label htmlFor="slider-peso-sen" className="text-slate-800">
                Peso da Senioridade
              </label>
              <span className="font-mono-tabular text-slate-900">
                {Math.round(pesos.peso_senioridade * 100)}%
              </span>
            </div>
            <input
              id="slider-peso-sen"
              type="range"
              min={0.05}
              max={0.4}
              step={0.05}
              value={pesos.peso_senioridade}
              onChange={(e) =>
                onAtualizarPesos({
                  ...pesos,
                  peso_senioridade: Number(e.target.value),
                })
              }
              className="w-full accent-slate-900"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
