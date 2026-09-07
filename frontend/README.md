# Cognis — Frontend

Interface (React + TypeScript + Vite + Tailwind) da plataforma de estudos adaptativa **Cognis**, com design neo-brutalista preto e branco e i18n em pt-BR.

## Rotas

| Rota | O que é |
| --- | --- |
| `/` | **Landing page pública** (marketing, indexada) |
| `/start` | Onboarding / criação de usuário |
| `/home` | Painel principal |
| `/topic/:topicId` | Detalhe do tópico (grafo de conceitos) |
| `/session/:sessionId` | Sessão de prática |
| `/knowledge`, `/history`, `/settings` | Progresso, histórico e configurações |

## SEO / arquivos públicos

Os arquivos de SEO ficam em `public/` e são servidos na raiz:

- `robots.txt` — permissões para buscadores e bots de IA (GPTBot, Perplexity, Claude…)
- `sitemap.xml`
- `llms.txt` + `llms-full.txt` — resumo do produto para LLMs
- `manifest.webmanifest` — PWA básico
- `404.html` — fallback de erro (SPA)
- `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `og-image.png`

### ⚠️ Antes de publicar

1. **Trocar o domínio de produção** — o padrão atual é `https://cognis.vercel.app`. Substitua por
   seu domínio real em **todos** estes arquivos:
   - `index.html` (tag `<link rel="canonical">`, metas `og:*` e `twitter:*`, e os 3 blocos `@type` JSON-LD)
   - `public/robots.txt` (linha `Sitemap:`)
   - `public/sitemap.xml`
   - `frontend/.well-known/llms.txt` (URL do domínio)

2. **Apontar o backend** — o `vercel.json` tem um placeholder
   `https://YOUR-BACKEND-URL.onrender.com` na regra de rewrite de `/api/(.*)`. Troque pela URL
   real do backend FastAPI antes do deploy. (Em desenvolvimento local, o vite proxya `/api` → `localhost:8000`.)

## Comandos

```bash
npm install
npm run dev      # dev local com proxy do backend em :8000
npm run build    # type-check + build de produção
npm run preview  # serve a build local
```
