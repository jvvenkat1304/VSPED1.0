# IMMUTABLE RULE: Child Data Privacy & Consent Model

This rule applies at ALL times — during development, deployment, testing, and any future changes. It CANNOT be overridden, relaxed, or worked around without explicit written approval from Karan.

---

## Core Principle

**All child data is encrypted and invisible to everyone except the parent, within their own app session.**

No person, role, system, or admin — including platform owners — can view, access, export, or process any child's personal data without explicit, time-bound, parent-granted consent.

---

## Rules (non-negotiable)

### 1. Default State: Locked
- All child PII (name, age, gender, progress records, session notes, assessment results, game data) is encrypted at rest.
- By default, NO ONE can see it — not educators, not school teachers, not admins, not platform operators.
- Only the parent sees their own child's data in their own app.

### 2. Access Requires a Consent Request
- Any third party (educator, therapist, teacher, clinician) who needs child data must **submit a formal request** through the app.
- The request MUST specify:
  - **Who** is requesting (their identity + role)
  - **Why** they need it (stated purpose — e.g., "to plan therapy sessions")
  - **How long** they need it (duration — hourly, daily, for the course duration, etc.)
- The parent receives this request as a notification.

### 3. Parent Grants or Modifies
- The parent can:
  - **Accept** the request as-is
  - **Propose changes** (e.g., shorten the duration, restrict scope)
  - **Reject** the request entirely
- Until the parent explicitly accepts, NO data is visible to the requester.

### 4. Access is Time-Bound
- Consent has an expiry (`consent_expires_at`).
- When the time expires, access is **automatically revoked** — no manual action needed.
- The system enforces this at the database level (RLS checks `consent_expires_at > NOW()`).

### 5. Access is Revocable at Any Time
- Even before expiry, the parent can revoke consent instantly.
- Revocation takes effect immediately — the educator/requester loses access mid-session if needed.

### 6. Platform Operators Have NO Bypass
- There is no "admin override" for child data.
- Platform operators (Karan, Venkat, any future employee) can see:
  - Aggregate statistics (anonymised, no individual identification)
  - System logs (workflow execution, error traces — with Child IDs as opaque UUIDs, never names/details)
- They CANNOT: view individual child records, session notes, assessment results, or any PII.
- The only exception: a formal legal order (court/regulatory demand), handled case-by-case with legal counsel.

### 7. Data Processors Must Comply
- Any third-party service (Supabase, VideoSDK, MSG91, AWS) that touches child data must comply with these same rules.
- We are responsible for ensuring they do (DPDP Act Section 8).

### 8. Audit Trail
- Every consent grant, modification, revocation, and data access is logged.
- Logs include: who accessed what, when, for how long, under which consent grant.
- These logs are retained for compliance and breach investigation.

---

## Implementation Enforcement

- **Database:** RLS policies enforce consent checks on every query touching child data. No query can return child PII without an active, unexpired consent record.
- **API/Edge Functions:** Every function that returns child data checks consent validity before responding.
- **Frontend:** Child data fields are never rendered unless the viewing user has active consent (enforced server-side, not just UI-hidden).
- **Future development:** Any new feature, table, or API that touches child data MUST go through this consent check. No exceptions. If a developer (human or AI) proposes a shortcut that bypasses consent, it is rejected.

---

## Applies To

- All environments: development, staging, production
- All future features: games, assessments, NeuroBridge, school integration (V2), any new modules
- All sessions: this steering file is always included in context

---

**Last updated:** July 4, 2026
**Authority:** Karan Karthik Palukuri (primary decision-maker)
**Legal basis:** India DPDP Act 2023, Section 9 (Children's Data)
