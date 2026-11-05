# InHire Cascade — Alocação Inteligente de Talentos (Hackathon VINT Global + INBEC)

Solução de busca em cascata (**Fallback Strategy**) e alocação algorítmica ponderada de talentos desenvolvida para resolver o problema de negócio **"A Busca do José: Como Alocar o Talento Certo na Hora Certa?"**.

> **Restrição Arquitetural Cumprida:** A aplicação **NÃO utiliza Inteligência Artificial em tempo de execução**. Toda a lógica de filtragem, cálculo de disponibilidade futura, similaridade tecnológica e ordenação baseia-se estritamente em algoritmos determinísticos, regras de negócio e cálculos de pesos matemáticos.

---

## 1. Visão Geral e Estratégia em Cascata (Fallback Strategy)

O gerente de projetos **José** precisa alocar profissionais rapidamente (ex.: *1 Desenvolvedor Sênior com Node.js & AWS e 50% de disponibilidade mensal para um projeto estratégico de 3 meses*). O sistema realiza a busca unificada obedecendo exatamente à ordem de prioridade e custo:

1. **`[SGBD Interno]` (1ª Camada — Equipe Interna):**
   Consulta os colaboradores atuais da empresa no schema `"InHire"` (`colaboradores`, `colaborador_skills`, `alocacoes`, `planejamentos`) utilizando as funções nativas `"InHire".disponibilidade_mensal` e `"InHire".disponibilidade_periodo`.
2. **`[InHire]` (2ª Camada — Banco de Candidatos Externo):**
   Caso a meta de candidatos ideais (`score_final >= 80%`) não seja integralmente suprida pela equipe interna, o algoritmo aciona automaticamente o banco de talentos mapeados (`"InHire".talentos` e `"InHire".talento_skills`).
3. **`[Workana API]` (3ª Camada — API Externa de Freelancers):**
   Se ainda houver necessidade de preenchimento imediato, o sistema consome o endpoint simulado da API de freelancers verificados (`simularChamadaWorkanaApi()`), trazendo especialistas com disponibilidade imediata sob demanda.

---

## 2. Regras do Algoritmo de Ranking (Pesos X e Y)

Cada candidato recebe um **Score Final de Match (0% a 100%)** calculado pela fórmula determinística:

$$\text{Score Final} = (\text{Score Skills} \times P_{\text{skills}}) + (\text{Score Disponibilidade} \times P_{\text{disp}}) + (\text{Score Senioridade} \times P_{\text{sen}})$$

Onde os pesos padrão configuráveis são:
- **$P_{\text{skills}} = 50\%$** (Domínio técnico das tecnologias solicitadas)
- **$P_{\text{disp}} = 35\%$** (Disponibilidade imediata ou flexível na janela do projeto)
- **$P_{\text{sen}} = 15\%$** (Aderência à senioridade exigida pela vaga)

### Regra de Disponibilidade Flexível (Peso X = 0.78 padrão)
- Se o projeto exige `50%` (ou `100%`) de alocação e o candidato possui essa disponibilidade já no mês atual, recebe **100 pontos** em disponibilidade.
- Se o candidato está alocado no mês atual (ex.: apenas `20%` livre em Nov/2026), mas seu planejamento em `"InHire".planejamentos` indica liberação no próximo mês (`100%` livre em Dez/2026), ele **permanece elegível**, recebe pontuação ponderada pelo **Peso X** e exibe o motivo claro: **`Disponível em 30 dias (100% livre no próx. mês)`**.

### Regra de Similaridade de Skills (Peso Y = 0.60 padrão)
- As habilidades na tabela `"InHire".skills` possuem a chave estrangeira `id_area_tecnologia` vinculada a `"InHire".dominios` (`FRONTEND`, `BACKEND`, `CLOUD_DEVOPS`, `DADOS_DB`, `MOBILE`).
- Se o candidato não possui a ferramenta exata solicitada (ex.: projeto pede `Vue.js` ou `AWS`), mas domina outra tecnologia da mesma categoria (ex.: domina `React` na área Frontend, ou `Azure`/`Docker` na área Cloud & DevOps), ele recebe pontuação parcial equivalente ao **Peso Y** multiplicado pelo seu nível de proficiência (`AVANCADO`, `INTERMEDIARIO`, `BASICO`).

---

## 3. Estrutura do Banco de Dados PostgreSQL (`localhost:5432`, Schema `"InHire"`)

O sistema foi construído sobre o dump oficial do PostgreSQL 17/18 (`schema "InHire"`):

| Tabela / Função no Schema `"InHire"` | Papel na Busca em Cascata |
| :--- | :--- |
| `"InHire".colaboradores` | Cadastro de profissionais internos ativos (`id_cargo`, `id_senioridade`, `id_modalidade`). |
| `"InHire".colaborador_skills` | Vínculo de habilidades internas e nível (`BASICO`, `INTERMEDIARIO`, `AVANCADO`). |
| `"InHire".alocacoes` & `"InHire".planejamentos` | Percentual de alocação mês a mês (`Jan`..`Dez`, `ano`, `porcentagem`). |
| `"InHire".talentos` & `"InHire".talento_skills` | Base externa InHire com `disponibilidade_informada_percentual` e skills associadas. |
| `"InHire".skills` & `"InHire".dominios` | Catálogo de tecnologias agrupadas por `id_area_tecnologia` para cálculo de similaridade. |
| `"InHire".disponibilidade_mensal(ano, mes)` | Stored Function PL/pgSQL que retorna o total alocado e a `%` livre de cada colaborador. |
| `"InHire".disponibilidade_periodo(...)` | Stored Function PL/pgSQL que consolida a disponibilidade média, mínima e máxima na janela de meses. |

---

## 4. Como Executar o Projeto

### Opção A: Aplicação Web Completa Interativa (Node.js / Express + React / TypeScript)
```bash
npm install
npm run dev
# Acesse http://localhost:3000
```

Para executar a suíte de testes unitários automatizados do motor algorítmico:
```bash
npx --yes tsx --test src/utils/motorAlocacao.test.ts
```

### Opção B: Backend Python (FastAPI + `psycopg2`) + Protótipo Vanilla HTML/JS
1. Certifique-se de que o PostgreSQL local está rodando em `localhost:5432` com o dump importado:
   ```bash
   psql -h localhost -p 5432 -U postgres -d postgres -f dump_inhire.sql
   ```
2. Instale as dependências Python e inicie o servidor FastAPI:
   ```bash
   pip install fastapi uvicorn psycopg2-binary pydantic
   python app.py
   ```
3. Abra o arquivo `public/prototipo_vanilla.html` diretamente no navegador (ou acesse a aba **"Código & Entregáveis"** na interface principal na porta `3000`).
