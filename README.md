# V-SPED 1.0

**V-SPED** (Vathsalya Special Education Platform) is a marketplace and tools platform for Vathsalya Child Neuro and Nurture Center, connecting parents of children with special needs to private educators, schools, and therapeutic resources.

**Last updated:** July 2, 2026

---

## Project Overview

Three-pronged business model:
- **B2C** — Parents book private therapy/education sessions with verified special educators
- **B2B2C** — Special educators run their practice via a marketplace with a token economy
- **B2B** — Schools license the platform for institutional use (classrooms, students, games)

**Connected product:** NeuroBridge — interactive educational games (integrated into V-SPED) and an assessment engine (separate connected entity, architecture TBD).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Flutter/Dart (ejected from FlutterFlow; Kiro-maintained) |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, RLS) |
| SMS / OTP | MSG91 (via Supabase Send SMS Auth Hook) |
| Payments | Razorpay (not yet integrated) |
| Video sessions | VideoSDK (not yet integrated) |
| Edge Functions | Deno / TypeScript |
| Repo | GitHub — jvvenkat1304/VSPED1.0 |

---

## Repository Structure

```
VSPED1.0/
├── supabase/
│   ├── functions/
│   │   ├── send-otp/          # Triggers Supabase phone OTP
│   │   ├── verify-otp/        # Verifies OTP, returns session + role
│   │   ├── create-pin/        # Hashes and stores 4-digit PIN (SHA-256)
│   │   ├── verify-pin/        # Verifies PIN with 3-strike lockout
│   │   └── send-sms-hook/     # Send SMS Auth Hook → delivers OTP via MSG91
│   ├── migrations/
│   │   └── 20260616000001_ensure_pin_columns.sql
│   └── config.toml
├── docs/
│   ├── auth-test-results.md        # E2E test results for all auth functions
│   ├── business-logic-questions.md # Pending management decisions (blockers)
│   ├── flutterflow-auth-wiring.md  # API Library specs for FlutterFlow
│   ├── test-auth.ps1               # Interactive E2E auth test script
│   ├── test-verify-pin.ps1         # Focused verify-pin role check script
│   ├── diag-send-otp.ps1           # send-otp diagnostic script
│   └── archive/                    # Legacy handoff docs (June 13–14)
├── .kiro/hooks/                    # Kiro agent hooks (auto-update handoff log)
├── .gitignore
├── handoff_Kiro_IDE_June14.md      # Master project handoff & development log
└── README.md
```

---

## Authentication System (Complete)

Phone OTP + 4-digit PIN. No OAuth.

**Flow:**
1. User enters phone → `send-otp` → Supabase triggers `send-sms-hook` → MSG91 delivers OTP
2. User enters OTP → `verify-otp` → returns `session_token`, `user_id`, `is_new_user`, `role`
3. First-time user → `create-pin` (stores SHA-256 hash)
4. Returning user → `verify-pin` (3-strike lockout, role from `public.users`)
5. Route to dashboard by role

**Roles:** `parent`, `special_educator`, `school_admin`, `school_teacher`, `admin`, `manufacturer`

---

## Database

26 tables, 60+ RLS policies, 12 triggers, 50+ indexes. All migrations applied.

Supabase Project: `fedpulmkxjqoaxlanqhg` (region: ap-south-1 Mumbai)

---

## Current Status (July 2, 2026)

| Area | Status |
|------|--------|
| Database + RLS | ✅ Complete |
| Auth backend (all 5 edge functions) | ✅ Complete & tested |
| Frontend (Flutter) | 🔄 Not started — awaiting FlutterFlow code export + brand assets |
| Business logic backend | ⏳ Blocked — management decisions pending (see `docs/business-logic-questions.md`) |
| Payments (Razorpay) | ⏳ Deferred |
| Video (VideoSDK) | ⏳ Deferred |
| NeuroBridge games | ⏳ Pending integration |
| NeuroBridge assessments | ⏳ Architecture TBD (separate entity) |

---

## For New Sessions

Read **`handoff_Kiro_IDE_June14.md`** first — it contains the complete project context, all decisions made, reference data, credentials locations, and the ordered next-steps list. Do not rely on this README alone.

---

## Secrets

All secrets live in **Supabase project secrets** (never in this repo):
- `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` — SMS delivery
- `SEND_SMS_HOOK_SECRET` — authenticates Supabase → send-sms-hook calls
- `SUPABASE_SERVICE_ROLE_KEY` — used inside edge functions only

The legacy anon key (`eyJ...`) is safe to use in the Flutter app (client-side). Never commit the service_role key or hook secret.
