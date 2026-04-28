---
description: >
  Full OWASP Top 10 security audit of specified files or the current diff.
  Outputs severity-rated findings. Asks user before applying auth/security fixes.
---

## Security Audit — ${input:files}

---

### Step 1 — Load skills

```
list_skills
```

Pick: `ai-prompt-engineering-safety-review` (if AI prompts involved), `sql-code-review`, `dotnet-best-practices`.

---

### Step 2 — Audit scope

Files to audit: `${input:files}` (or current diff if blank).

Read each file and check against every item below.

---

### Step 3 — OWASP Top 10 Checklist

#### A01 — Broken Access Control

- [ ] Every Angular route has a `canActivate` guard
- [ ] Guards check the correct JWT claim (role + permission), not just `isLoggedIn`
- [ ] API controllers have `[Authorize]` + policy check on every action
- [ ] No client-side role check used as the sole security gate

#### A02 — Cryptographic Failures

- [ ] No hardcoded secrets, passwords, connection strings, or API keys in source
- [ ] Passwords hashed with bcrypt / ASP.NET Core Identity (not MD5/SHA1)
- [ ] Sensitive data not stored in `localStorage` (use `sessionStorage` or HTTP-only cookies)
- [ ] HTTPS enforced — no HTTP-only endpoints

#### A03 — Injection

- [ ] No raw SQL strings — EF Core parameterized queries only
- [ ] No `innerHTML` binding with unsanitized user data
- [ ] No `bypassSecurityTrustHtml/Url/Script` without documented justification
- [ ] Angular template expressions do not call `eval`-like functions

#### A04 — Insecure Design

- [ ] Business logic enforced server-side, not just client-side
- [ ] Bulk actions (delete all, mass update) require confirmation + authorization check

#### A05 — Security Misconfiguration

- [ ] CORS policy is not `*` on sensitive endpoints
- [ ] Error responses do not leak stack traces or internal file paths to the client
- [ ] No debug endpoints or dev-only routes reachable in production builds
- [ ] HTTP security headers present (X-Content-Type-Options, X-Frame-Options)

#### A06 — Vulnerable Components

- [ ] `npm audit` result checked — no Critical/High CVEs in direct dependencies
- [ ] No deprecated packages with known vulnerabilities

#### A07 — Authentication Failures

- [ ] JWT tokens have an expiry (`exp` claim); refresh handled server-side
- [ ] No JWT secret committed to repo
- [ ] Account lockout / rate limiting on login endpoint
- [ ] Session invalidated on logout (token blacklist or short expiry + refresh revocation)

#### A08 — Software Integrity Failures

- [ ] No `npm install` from untrusted or private-registry-less sources
- [ ] `package-lock.json` committed and used in CI

#### A09 — Logging & Monitoring Failures

- [ ] Login success/failure logged (with user ID, not password)
- [ ] No sensitive data (passwords, tokens, PII) in log output
- [ ] Structured logging used (Serilog / ILogger) — no `Console.WriteLine`

#### A10 — SSRF

- [ ] Any user-supplied URL is validated against an allowlist before server-side fetch

---

### Step 4 — Output findings

For each finding:

```
🔴 [Critical] | 🟡 [High] | 🟠 [Medium] | 🔵 [Low]
OWASP: A0X — <Category>
File: path/to/file (line N)
Issue: <description>
Risk: <what an attacker could do>
Fix: <diff-only>
```

---

### Step 5 — Confirmation before applying

For ALL findings:

> "I found N security issues. Here is a summary:
>
> - 🔴 X Critical
> - 🟡 Y High
> - 🟠 Z Medium
>
> **Shall I apply the fixes? Which severity levels? (Critical only / All / Review each)**"

Wait for user response before modifying any file.

---

### Step 6 — Verify

```
verify_build
```

After fixes are applied and build passes:
`Task Completion: 100%`
