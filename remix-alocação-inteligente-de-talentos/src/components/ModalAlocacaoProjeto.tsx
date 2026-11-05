import React, { useEffect, useState } from 'react';
import { CandidatoRanqueado } from '../utils/motorAlocacao';
import { X, CheckCircle2 } from 'lucide-react';

export interface RegistroAlocacao {
  id_alocacao: string;
  candidato: CandidatoRanqueado;
  nome_demanda: string;
  percentual_alocado: number;
  mes_inicio: string;
  duracao_meses: number;
  horario_registro: string;
}

interface ModalAlocacaoProjetoProps {
  candidato: CandidatoRanqueado | null;
  percentualSugerido: number;
  duracaoSugerida: number;
  onFechar: () => void;
  onConfirmarAlocacao: (dados: {
    candidato: CandidatoRanqueado;
    nome_demanda: string;
    percentual_alocado: number;
    mes_inicio: string;
    duracao_meses: number;
  }) => void;
}

export const ModalAlocacaoProjeto: React.FC<ModalAlocacaoProjetoProps> = ({
  candidato,
  percentualSugerido,
  duracaoSugerida,
  onFechar,
  onConfirmarAlocacao,
}) => {
  const [nomeDemanda, setNomeDemanda] = useState('Projeto Estratégico Q4 — Plataforma Digital');
  const [percentual, setPercentual] = useState(percentualSugerido);
  const [mesInicio, setMesInicio] = useState('Nov/2026 (Imediato)');
  const [duracao, setDuracao] = useState(duracaoSugerida);
  const [erroForm, setErroForm] = useState<string | null>(null);

  useEffect(() => {
    if (candidato) {
      setPercentual(percentualSugerido);
      setDuracao(duracaoSugerida);
      setMesInicio(
        candidato.disponibilidade_mes_atual < percentualSugerido &&
          candidato.disponibilidade_proximo_mes >= percentualSugerido
          ? 'Dez/2026 (Em 30 dias)'
          : 'Nov/2026 (Imediato)'
      );
      setErroForm(null);
    }
  }, [candidato, percentualSugerido, duracaoSugerida]);

  if (!candidato) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeDemanda.trim()) {
      setErroForm('Informe o nome da demanda ou projeto antes de confirmar a alocação.');
      return;
    }
    setErroForm(null);
    onConfirmarAlocacao({
      candidato,
      nome_demanda: nomeDemanda.trim(),
      percentual_alocado: percentual,
      mes_inicio: mesInicio,
      duracao_meses: duracao,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-alocacao"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-xs font-mono-tabular font-bold text-blue-700">
              {candidato.badge_origem} · Match {candidato.score_final}%
            </span>
            <h2 id="titulo-modal-alocacao" className="text-lg font-bold text-slate-900 mt-0.5">
              Confirmar Alocação: {candidato.nome}
            </h2>
            <p className="text-xs text-slate-600">
              {candidato.cargo} · {candidato.senioridade} · {candidato.motivo_principal_ranking}
            </p>
          </div>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar janela de alocação"
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {erroForm && (
            <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
              {erroForm}
            </div>
          )}

          <div>
            <label htmlFor="input-nome-demanda" className="block text-xs font-semibold text-slate-800 mb-1">
              Demanda / Projeto Destino (<code className="font-mono-tabular">"InHire".demandas</code>)
            </label>
            <input
              id="input-nome-demanda"
              type="text"
              value={nomeDemanda}
              onChange={(e) => setNomeDemanda(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="select-mes-inicio" className="block text-xs font-semibold text-slate-800 mb-1">
                Mês de Início
              </label>
              <select
                id="select-mes-inicio"
                value={mesInicio}
                onChange={(e) => setMesInicio(e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg"
              >
                <option value="Nov/2026 (Imediato)">Nov/2026 (Imediato)</option>
                <option value="Dez/2026 (Em 30 dias)">Dez/2026 (Em 30 dias)</option>
                <option value="Jan/2027 (Em 60 dias)">Jan/2027 (Em 60 dias)</option>
              </select>
            </div>

            <div>
              <label htmlFor="input-percentual-alocacao" className="block text-xs font-semibold text-slate-800 mb-1">
                Dedicação Mensal (%)
              </label>
              <input
                id="input-percentual-alocacao"
                type="number"
                min={10}
                max={100}
                step={10}
                value={percentual}
                onChange={(e) => setPercentual(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono-tabular font-bold border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1">
            <div className="font-semibold text-slate-900">Impacto no Planejamento:</div>
            <div>
              • Carga horária alocada: <strong className="font-mono-tabular">{Math.round((percentual / 100) * 160)}h/mês</strong> durante <strong className="font-mono-tabular">{duracao} meses</strong>.
            </div>
            <div>
              • Origem do recurso: <strong className="font-mono-tabular">{candidato.badge_origem}</strong> ({candidato.custo_estimado_info}).
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onFechar}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Efetivar Alocação</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
