# Project guidelines for AI agents

## Commits
- **Do not add AI attribution to commits.** No `Co-Authored-By: Claude ...` (or
  any AI/agent) trailers, and no "Generated with Claude Code" lines in commit
  messages. Write commit messages as the human author.
- The same applies to PR descriptions: no AI-attribution footers.

## Stack
- Next.js 16 (App Router) + React 19, Tailwind CSS. Deployed on Vercel.
- Turbopack is the default bundler (`next dev` / `next build`).
- The request-interception file is `proxy.js` (Next 16 renamed `middleware` →
  `proxy`); it sets the security headers / CSP and runs on the Node.js runtime.
- `/api/lookup` depends on Node core modules (`dns`, `tls`, `net`) — keep it on
  the `nodejs` runtime.

## Environment
- hCaptcha is enforced only when `HCAPTCHA_SECRET_KEY` is set (server) and
  `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` is set (client). Both are configured in Vercel
  for all environments; locally the CAPTCHA is skipped so the tool still works.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
