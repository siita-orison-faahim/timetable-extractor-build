## 2026-07-16 - Hardening the Next.js Config with Security Headers
**Vulnerability:** Weak default response headers exposing the application to clickjacking, mime sniffing, and cross-site scripting (XSS) risks.
**Learning:** Adding robust HTTP response headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy) in `next.config.ts` ensures that the browser enforces modern security controls globally without requiring heavy custom backend middleware.
**Prevention:** Always implement defense-in-depth headers on Next.js client/API responses.
