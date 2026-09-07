# Cognis

> Conhecimento que não escapa.

**Cognis** é uma plataforma de estudos adaptativa com IA. Ela decompõe qualquer
assunto em conceitos com pré-requisitos, monta a ordem correta de estudo e
ajusta a prática ao seu nível em tempo real — combinando revisão espaçada,
análise de erros e 7 técnicas de retenção.

- **Gratuito** — sem cartão, sem anúncios, sem venda de dados.
- **Browser-first** — roda inteiro no navegador, sem instalação.
- **i18n** — interface em português (pt-BR) e inglês.
- **Seus dados são seus** — exportação completa em JSON.

[Landing pública](https://cognis.vercel.app/) · [Começar](https://cognis.vercel.app/start)

## Como funciona

1. **Descreva o tema.** Diga o assunto e o objetivo (ex.: "dominar Sistemas
   Distribuídos para entrevista").
2. **A IA decompõe.** Você recebe os conceitos organizados em um grafo de
   dependências — o que vem antes, o que vem depois, e por onde começar. Tudo
   editável: renomear, adicionar/remover conceitos, ajustar pré-requisitos e
   regenerar a decomposição.
3. **Pratique e evolua.** Cada conceito gera sessões adaptativas que mudam de
   dificuldade e técnica conforme seus acertos e erros. A revisão espaçada traz
   de volta os conceitos fracos no momento certo.

## Recursos

- Decomposição automática de qualquer tema (grafo de dependências)
- Sessões adaptativas com **7 técnicas de retenção**: exemplo resolvido,
  prática ativa, aplicação, transferência, variação, compressão e explicação
- Revisão espaçada com fila inteligente
- Análise de erros por tipo (conceitual, procedimental, descuido, etc.)
- Níveis de conhecimento: `UNKNOWN → EXPOSED → UNDERSTOOD → APPLIED → TRANSFERRED → CONSOLIDATED`
- Metas semanais, linha do tempo de confiança por conceito e gráfico de domínio
- Edição manual de conceitos e pré-requisitos
- Exportação de dados em JSON

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy, SQLite |
| IA | API compatível com OpenAI (Groq, `groq/compound-mini`) |

```
cognis/
├── backend/                  # FastAPI
│   ├── app/
│   │   ├── api/              # Rotas + schemas
│   │   ├── core/             # Config, banco
│   │   ├── models/           # Modelos SQLAlchemy
│   │   └── services/         # IA, motor de sessão
│   ├── .env.example
│   └── pyproject.toml
├── frontend/                 # React SPA
│   ├── public/               # SEO: robots, sitemap, llms.txt, fallback 404
│   ├── src/
│   │   ├── pages/            # Landing, Home, Session, Knowledge, History…
│   │   ├── lib/              # Cliente de API, i18n
│   │   └── types/            # Tipos TypeScript
│   ├── vercel.json
│   └── package.json
├── run.sh / run.fish         # Sobe backend + frontend
└── .env.example
```

## Quick start

```bash
# Pré-requisitos: Python (uv), Node.js, acesso a uma API OpenAI-compatible

cp backend/.env.example backend/.env   # coloque sua chave de IA em AI_API_KEY

./run.sh    # ou: ./run.fish
```

| Serviço | URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

Também dá para rodar em separado:

```bash
# Backend
cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (outro terminal; faz proxy /api → localhost:8000)
cd frontend && npm install && npm run dev
```

## Deploy

O frontend está preparado para **Vercel** (`vercel.json` com SPA rewrite, cache
de assets e headers de segurança). Os arquivos de SEO em `frontend/public/`
(robots, sitemap, `llms.txt`, manifest PWA, fallback 404) são servidos
automaticamente.

> ⚠️ Antes de publicar: troque o domínio padrão `https://cognis.vercel.app` e o
> placeholder `YOUR-BACKEND-URL.onrender.com` de `/api` no `vercel.json` pela
> URL real do backend. Detalhes em [`frontend/README.md`](frontend/README.md).

## Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Segurança

Encontrou uma vulnerabilidade? Veja [SECURITY.md](SECURITY.md) antes de abrir
uma issue.

## Licença

[MIT](LICENSE)