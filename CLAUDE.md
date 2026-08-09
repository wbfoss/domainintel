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
