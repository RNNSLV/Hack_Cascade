import React from 'react';
import { CATALOGO_SKILLS, DOMINIOS_INHIRE } from '../utils/dadosInHire';
import { ConfiguracaoPesos, FiltrosBuscaCascata } from '../utils/motorAlocacao';
import { RotateCcw, Search } from 'lucide-react';

interface PainelFiltrosCascataProps {
  filtros: FiltrosBuscaCascata;
  pesos: ConfiguracaoPesos;
  onAtualizarFiltros: (novosFiltros: FiltrosBuscaCascata) => void;
  onAplicarCenarioJose: () => void;
  onAplicarCenarioSimilaridadeFrontend: () => void;
  onAplicarCenarioEscassezCloud: () => void;
  onLimparFiltros: () => void;
  erroValidacao: string | null;
}

export const PainelFiltrosCascata: React.FC<PainelFiltrosCascataProps> = ({
  filtros,
  pesos,
  onAtualizarFiltros,
  onAplicarCenarioJose,
  onAplicarCenarioSimilaridadeFrontend,
  onAplicarCenarioEscassezCloud,
  onLimparFiltros,
  erroValidacao,
}) => {
  const senioridades = DOMINIOS_INHIRE.filter((d) => d.tipo_dominio === 'SENIORIDADE');
  const areasTecnologia = DOMINIOS_INHIRE.filter((d) => d.tipo_dominio === 'AREA_TECNOLOGIA');

  const alternarSkill = (nomeSkill: string) => {
    const jaSelecionada = filtros.skills_requeridas.includes(nomeSkill);
    const novasSkills = jaSelecionada
      ? filtros.skills_requeridas.filter((s) => s !== nomeSkill)
      : [...filtros.skills_requeridas, nomeSkill];

    onAtualizarFiltros({
      ...filtros,
      skills_requeridas: novasSkills,
    });
  };

  const horasMensaisEquivalentes = Math.round((filtros.disponibilidade_minima / 100) * 160);

  return (
    <aside
      aria-label="Filtros de Busca e Alocação"
      className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-5"
    >
      {/* Presets Rápidos Compactos */}
      <div className="space-y-2 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900">Cenários Rápidos</h2>
          <button
            type="button"
            onClick={onLimparFiltros}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            Resetar
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={onAplicarCenarioJose}
            className="text-left px-3 py-2 rounded-lg bg-slate-100/80 hover:bg-slate-200/70 transition-colors flex items-center justify-between gap-2"
          >
            <span className="text-xs font-semibold text-slate-900 truncate">
              1. Caso do José (Node.js + AWS)
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-500 shrink-0">Sênior · 50%</span>
          </button>
          <button
            type="button"
            onClick={onAplicarCenarioSimilaridadeFrontend}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between gap-2"
          >
            <span className="text-xs font-medium text-slate-700 truncate">
              2. Similaridade + 30 Dias (Vue + TS)
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">Sênior · 80%</span>
          </button>
          <button
            type="button"
            onClick={onAplicarCenarioEscassezCloud}
            className="text-left px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between gap-2"
          >
            <span className="text-xs font-medium text-slate-700 truncate">
              3. Cascata Externa (K8s + Go + AWS)
            </span>
            <span className="text-[11px] font-mono-tabular text-slate-400 shrink-0">Espec. · 100%</span>
          </button>
        </div>
      </div>

      {/* Busca Textual */}
      <div className="space-y-1.5">
        <label htmlFor="campo-busca-profissional" className="block text-xs font-semibold text-slate-800">
          Buscar Profissional ou Cargo
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="campo-busca-profissional"
            type="text"
            value={filtros.termo_busca ?? ''}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                termo_busca: e.target.value,
              })
            }
            placeholder="Nome, cargo ou skill..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Seletor de Tecnologias */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">
            Tecnologias ({filtros.skills_requeridas.length})
          </span>
          {filtros.skills_requeridas.length > 0 && (
            <button
              type="button"
              onClick={() => onAtualizarFiltros({ ...filtros, skills_requeridas: [] })}
              className="text-xs text-slate-500 hover:text-slate-900 whitespace-nowrap shrink-0"
            >
              Limpar
            </button>
          )}
        </div>

        {erroValidacao && (
          <div
            role="alert"
            className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium"
          >
            {erroValidacao}
          </div>
        )}

        <div className="space-y-2.5">
          {areasTecnologia.map((area) => {
            const skillsDaArea = CATALOGO_SKILLS.filter(
              (s) => s.id_area_tecnologia === area.id
            );
            return (
              <div key={area.id} className="space-y-1">
                <div className="text-[11px] font-medium text-slate-400">
                  {area.descricao}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skillsDaArea.map((skill) => {
                    const ativa = filtros.skills_requeridas.includes(skill.nome_skill);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        aria-pressed={ativa}
                        onClick={() => alternarSkill(skill.nome_skill)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                          ativa
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
                        }`}
                      >
                        {skill.nome_skill}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slider de Disponibilidade */}
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <label htmlFor="slider-disponibilidade" className="text-xs font-semibold text-slate-800">
            Disponibilidade Mínima
          </label>
          <span className="text-xs font-bold font-mono-tabular text-slate-900">
            {filtros.disponibilidade_minima}% ({horasMensaisEquivalentes}h/mês)
          </span>
        </div>
        <input
          id="slider-disponibilidade"
          type="range"
          min={10}
          max={100}
          step={10}
          value={filtros.disponibilidade_minima}
          onChange={(e) =>
            onAtualizarFiltros({
              ...filtros,
              disponibilidade_minima: Number(e.target.value),
            })
          }
          className="w-full accent-slate-900 cursor-pointer"
        />
      </div>

      {/* Senioridade e Janela */}
      <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100">
        <div>
          <label htmlFor="select-senioridade" className="block text-xs font-semibold text-slate-800 mb-1">
            Senioridade
          </label>
          <select
            id="select-senioridade"
            value={filtros.id_senioridade_desejada ?? ''}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                id_senioridade_desejada: e.target.value ? Number(e.target.value) : null,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="">Qualquer Nível</option>
            {senioridades.map((sen) => (
              <option key={sen.id} value={sen.id}>
                {sen.descricao}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="select-duracao" className="block text-xs font-semibold text-slate-800 mb-1">
            Período
          </label>
          <select
            id="select-duracao"
            value={filtros.duracao_meses}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                duracao_meses: Number(e.target.value),
              })
            }
            className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50/60 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value={1}>1 mês</option>
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
          </select>
        </div>
      </div>

      {/* Regras Algorítmicas Concisas */}
      <div className="space-y-2 pt-4 border-t border-slate-100">
        <div className="text-xs font-semibold text-slate-800">
          Regras de Elegibilidade
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.incluir_disponibilidade_flexivel}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                incluir_disponibilidade_flexivel: e.target.checked,
              })
            }
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-xs text-slate-600">
            Livre em 30 dias (Peso X: <span className="font-mono-tabular font-medium text-slate-800">{Math.round(pesos.fator_disponibilidade_futura * 100)}%</span>)
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.incluir_similaridade}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                incluir_similaridade: e.target.checked,
              })
            }
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-xs text-slate-600">
            Skills similares (Peso Y: <span className="font-mono-tabular font-medium text-slate-800">{Math.round(pesos.fator_similaridade_skill * 100)}%</span>)
          </span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filtros.forcar_todas_camadas}
            onChange={(e) =>
              onAtualizarFiltros({
                ...filtros,
                forcar_todas_camadas: e.target.checked,
              })
            }
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
          />
          <span className="text-xs text-slate-600">
            Exibir as 3 fontes simultaneamente
          </span>
        </label>
      </div>
    </aside>
  );
};
