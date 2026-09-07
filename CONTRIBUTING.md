# Contribuindo para o Cognis

Obrigado por querer contribuir! Todo mundo — bugs, docs, código, ideias — é
bem-vindo. O projeto é novo e priorizamos contribuições pequenas e objetivas.

## Começando

1. Faça um fork do repositório.
2. Crie uma branch a partir de `main`: `git checkout -b nome-descritivo`.
3. Siga os [padrões de código](#padrões-de-código).
4. Abra um Pull Request para `main` descrevendo o que muda e como testar.

## O que ajuda

- **Conserte bugs** — reporte primeiro via issue clara: passo a passo, o que
  espera, o que acontece, impressão de console.
- **Melhore a documentação** — typos, passos confusos, regex de exemplos.
- **Teste** — rode o app, valide fluxos de estudo (criar tópico → sessão →
  revisão) e sinalize o que quebrou.
- **Gatos de lint/type-check** — siga os comandos abaixo.

### Bug

```markdown
**Descrição:** … (o que acontece vs. o que deveria)
**Passo para reproduzir:** …
**Ambiente:** SO / navegador / versão
**Saída de console (se houver):** …
```

### Feature

```markdown
**Problema que resolve:** …
**Comportamento esperado:** …
**Impacto de usabilidade (se houver):** …
```

## Padrões de código

- Não adicione comentários desnecessários; o código deve se explicar.
- **Frontend (React/TS):** type-check obrigatório: `cd frontend && npm run build`
  (roda `tsc -b` + build). Lint: `npm run lint` (oxlint).
- **Backend (Python/FastAPI):** rode `python -m py_compile app/api/routes.py
  app/api/schemas.py app/services/session_engine.py` ao tocar nesses arquivos.
- Respeite a identidade visual: design neo-brutalista preto e branco, bordas
  `2px`, sombras duras, `rounded-sm`. Novas strings de UI entram também em
  `frontend/src/lib/i18n.tsx` (pt e en).
- Mantenha PRs pequenos. Um PR = uma mudança coerente.

## Código de conduta

Contribuições precisam seguir o [Código de Conduta](CODE_OF_CONDUCT.md).