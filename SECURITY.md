# Política de segurança

Agradecemos por reportar vulnerabilidades com responsabilidade.

## Como reportar

**Não abra issue pública para vulnerabilidades.** Envie um e-mail para o
mantenedor (`mxlsc@proton.me`) com o assunto `[Cognis Security]`.

Inclua, se possível:

- Descrição da vulnerabilidade e impacto estimado;
- Passos para reproduzir (ambientes, requests, payloads);
- Versão/commit afetado e, se tiver, sugestão de correção.

Você receberá uma resposta o mais breve possível. Relatórios detalhados e não
exploratórios são processados primeiro.

## Escopo

Estes componentes são atendidos por esta política:

- Aplicações em `backend/` e `frontend/`;
- Pipeline de dependências (Python, npm);
- Configuração de deploy (`vercel.json`, `run.sh`/`run.fish`).

Fora de escopo: serviços de terceiros usados pelo projeto (provedores de IA,
ambientes de hosting).

## Práticas de hardening

- Chaves de IA ficam fora do repositório (`backend/.env` é ignorado; use
  `backend/.env.example`).
- Dados locais (`backend/*.db`) não são versionados.
- O frontend aplica headers de segurança (X-Frame-Options, nosniff,
  Referrer-Policy, Permissions-Policy) via `vercel.json`.

## Agradecimentos

Mantenedores reconhecem publicamente pesquisadores que reportam com
responsabilidade, salvo pedido de anonimato.