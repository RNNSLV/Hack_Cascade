Este guia foi concebido para ser lido por avaliadores técnicos, garantindo que eles consigam testar o projeto em poucos minutos e sem erros de configuração.

```markdown
# Cascade — Alocação Inteligente de Talentos

Solução algorítmica e determinística para o desafio "A Busca do José" (Hackathon VINT Global + INBEC). O sistema cruza disponibilidade futura (Peso X) e similaridade tecnológica (Peso Y) através de uma estratégia de fallback em cascata (SGBD Interno ➔ Banco Externo ➔ API Workana).

**Nota Técnica:** Este projeto possui uma arquitetura 100% algorítmica em tempo de execução, garantindo cálculos exatos de *match* sem alucinações de Inteligência Artificial.

---

## 🏗️ Arquitetura do Projeto
O projeto está dividido num monorepo com três camadas independentes:
* **Base de Dados:** PostgreSQL 18 (Conteinerizado via Docker Compose)
* **Motor Algorítmico (Backend):** Python 3.10+ com FastAPI e psycopg2
* **Interface Gráfica (Frontend):** React + Vite (Conteinerizado via `node:26-slim`)

---

## 🚀 Guia de Execução (Passo a Passo)

### Passo 1: Subir e Injetar a Base de Dados
A base de dados já inclui o ficheiro `db/01-hackathon.sql` que será injetado automaticamente ao subir o contentor.
1. Abra um terminal na pasta `hackathon-vintglobal`.
2. Inicie o contentor em segundo plano:
   ```bash
   docker compose up -d

```

3. O PostgreSQL ficará operacional na porta `5432`.

### Passo 2: Iniciar o Backend Python

O motor de cálculo corre localmente e faz as consultas ao PostgreSQL no Docker.

1. Abra um terminal na pasta onde se encontra o ficheiro `app.py`.
2. Instale as bibliotecas necessárias:
```bash
pip install fastapi uvicorn psycopg2 pydantic

```


3. Inicie o servidor da API:
```bash
python -m uvicorn app:app --reload --port 8000

```



> **Atenção:** O código tenta aceder à base de dados com a palavra-passe `hackathon` por predefinição. Se o seu ambiente utilizar outra credencial, basta criar um ficheiro `.env` nesta mesma pasta contendo `PGPASSWORD=sua_palavra_passe`.

### Passo 3: Iniciar o Frontend React (Via Docker)

Para evitar problemas de versão do Node.js no seu sistema, o frontend é executado dentro de um contentor isolado.

1. Abra um novo terminal na pasta `remix` (onde está guardado o `package.json`).
2. Suba o ambiente interativo do Node e mapeie a pasta local:
```bash
docker run -it --rm -p 3000:3000 -v "${PWD}:/app" -w /app node:26-slim sh

```


3. Assim que o terminal do contentor abrir (indicado pelo símbolo `#`), instale as dependências e inicie o servidor:
```bash
npm install
npm run dev

```


Basta abrir o navegador e aceder a **`http://localhost:3000`**. Pode utilizar o botão "Carregar Caso do José" no canto superior direito para preencher automaticamente os filtros do desafio principal.

```

Com o `.env` protegido, as pastas organizadas, os caminhos isolados no Docker e este `README.md` documentado, o seu repositório está oficialmente com nível de produção e pronto para o `git push`. Existe mais algum detalhe que queira afinar antes de submeter o projeto à banca?

```