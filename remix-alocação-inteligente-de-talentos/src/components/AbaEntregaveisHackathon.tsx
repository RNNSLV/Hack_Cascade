import React, { useState } from 'react';
import {
  CODIGO_FONTE_SQL_INHIRE,
  HISTORIAS_DE_USUARIO_JOSE,
  RELATORIO_TESTES_AUTOMATIZADOS,
} from '../utils/entregaveisHackathon';
import { Check, Code2, Copy, FileCheck2, FileText, Terminal } from 'lucide-react';

const CODIGO_PYTHON_FASTAPI = `# app.py — Backend Python (FastAPI + psycopg2) conectado ao PostgreSQL local (localhost:5432, Schema "InHire")
# ESTRITAMENTE ALGORÍTMICO (Zero uso de IA em tempo de execução)

import os
from typing import List, Optional, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
from psycopg2.extras import RealDictCursor

app = FastAPI(title="InHire Cascade API — Alocação Algorítmica de Talentos")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB_CONFIG = {
    "host": os.environ.get("PGHOST", "localhost"),
    "port": int(os.environ.get("PGPORT", 5432)),
    "dbname": os.environ.get("PGDATABASE", "postgres"),
    "user": os.environ.get("PGUSER", "hackathon"),
    "password": os.environ.get("PGPASSWORD", "hackathon"),
    "options": "-c search_path=InHire,public",
}

def obter_conexao_postgresql():
    return psycopg2.connect(**DB_CONFIG, cursor_factory=RealDictCursor)

def simular_workana_api() -> List[Dict[str, Any]]:
    """3ª Camada da Cascata: Mock JSON simulando resposta da API do Workana."""
    return [
        {
            "id_externo": "WK-9081",
            "nome": "Diego T. Vasconcelos",
            "cargo": "Arquiteto Node.js & AWS Serverless",
            "senioridade": "Sênior",
            "id_senioridade": 3,
            "disponibilidade": 100,
            "skills": [
                {"nome_skill": "Node.js", "id_area_tecnologia": 102, "nivel": "AVANCADO"},
                {"nome_skill": "AWS", "id_area_tecnologia": 103, "nivel": "AVANCADO"},
            ],
        }
    ]
`;

export const AbaEntregaveisHackathon: React.FC = () => {
  const [subAba, setSubAba] = useState<'python_sql' | 'user_stories' | 'plano_testes'>('python_sql');
  const [copiado, setCopiado] = useState(false);

  const copiarTexto = (texto: string) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <section className="space-y-6">
      {/* Cabeçalho e Seletor de Artefatos do Hackathon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Entregáveis Obrigatórios da Banca (Hackathon VINT Global + INBEC)
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Código-fonte Python/FastAPI + <code className="font-mono-tabular">psycopg2</code>, Consultas SQL no Schema <code className="font-mono-tabular">"InHire"</code>, User Stories do José e Relatório de Testes Unitários.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubAba('python_sql')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              subAba === 'python_sql' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>app.py & SQL "InHire"</span>
          </button>
          <button
            type="button"
            onClick={() => setSubAba('user_stories')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              subAba === 'user_stories' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Histórias de Usuário (José)</span>
          </button>
          <button
            type="button"
            onClick={() => setSubAba('plano_testes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              subAba === 'plano_testes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Plano & Relatório de Testes</span>
          </button>
        </div>
      </div>

      {/* Sub-aba 1: Código Python FastAPI + SQL PostgreSQL */}
      {subAba === 'python_sql' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Backend Python (<code className="font-mono-tabular">app.py</code> com FastAPI + <code className="font-mono-tabular">psycopg2</code>)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => copiarTexto(CODIGO_PYTHON_FASTAPI)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md inline-flex items-center gap-1"
              >
                {copiado ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiado ? 'Copiado' : 'Copiar app.py'}</span>
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono-tabular text-xs overflow-x-auto leading-relaxed max-h-96">
              {CODIGO_PYTHON_FASTAPI}
            </pre>
            <div className="flex items-center justify-between pt-2 text-xs text-slate-600">
              <span>Arquivo completo salvo na raiz do projeto (<code className="font-mono-tabular">/app.py</code>).</span>
              <a
                href="/prototipo_vanilla.html"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-blue-700 hover:underline"
              >
                Abrir Protótipo Vanilla JS Standalone →
              </a>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Consultas SQL no Schema <code className="font-mono-tabular">"InHire"</code> (<code className="font-mono-tabular">localhost:5432</code>)
              </h3>
              <button
                type="button"
                onClick={() => copiarTexto(CODIGO_FONTE_SQL_INHIRE)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md inline-flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar SQL</span>
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-900 text-slate-100 font-mono-tabular text-xs overflow-x-auto leading-relaxed max-h-96">
              {CODIGO_FONTE_SQL_INHIRE}
            </pre>
          </div>
        </div>
      )}

      {/* Sub-aba 2: Histórias de Usuário do José */}
      {subAba === 'user_stories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HISTORIAS_DE_USUARIO_JOSE.map((us) => (
            <article key={us.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono-tabular text-xs font-bold text-blue-700">
                  {us.id} · Prioridade {us.prioridade}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{us.titulo}</h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200/80 rounded-lg p-3">
                <strong>Como</strong> {us.ator}, <strong>quero</strong> {us.acao}, <strong>para</strong> {us.beneficio}.
              </p>
              <div className="space-y-1.5">
                <div className="text-xs font-bold text-slate-800">Critérios de Aceite (BDD):</div>
                <ul className="space-y-1 text-xs text-slate-600">
                  {us.criterios_aceite.map((crit, i) => (
                    <li key={i} className="leading-snug">
                      • {crit}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Sub-aba 3: Plano de Testes e Relatório de Testes Unitários */}
      {subAba === 'plano_testes' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Relatório de Execução de Testes Unitários Automatizados (<code className="font-mono-tabular">node:test</code>)
              </h3>
              <p className="text-xs text-slate-600">
                Validação determinística das regras de negócio, Pesos X e Y e ordem de Fallback da cascata.
              </p>
            </div>
            <div className="text-xs font-mono-tabular font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
              5 / 5 Casos de Teste Aprovados (100% Pass Rate)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 pr-4">ID</th>
                  <th className="py-2.5 px-4">Cenário de Validação</th>
                  <th className="py-2.5 px-4">Entrada de Teste</th>
                  <th className="py-2.5 px-4">Resultado Obtido</th>
                  <th className="py-2.5 px-4 text-right">Tempo</th>
                  <th className="py-2.5 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {RELATORIO_TESTES_AUTOMATIZADOS.map((ct) => (
                  <tr key={ct.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-mono-tabular font-bold text-slate-900">{ct.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{ct.cenario}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono-tabular">{ct.entrada}</td>
                    <td className="py-3 px-4 text-slate-700">{ct.resultado_obtido}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-slate-600">{ct.tempo_ms}ms</td>
                    <td className="py-3 pl-4 text-right font-mono-tabular font-bold text-emerald-700">
                      ✓ {ct.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};
