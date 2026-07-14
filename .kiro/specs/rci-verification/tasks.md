# Implementation Plan: RCI Verification System

## Overview

Implements the multi-stage RCI credential verification pipeline for V-SPED. Work is organized as: database migration → pure validation logic → edge function updates → admin endpoint → frontend updates → integration wiring.

All edge functions use Deno/TypeScript with `https://esm.sh/@supabase/supabase-js@2.49.1` pinned imports. Frontend is React Native + Expo (TypeScript).

## Tasks

- [x] 1. Database migration for verification system
  - [x] 1.1 Create migration file `supabase/migrations/20260706000001_rci_verification_system.sql`
    - Add `verification_status` TEXT column with CHECK constraint and DEFAULT 'pending'
    - Add `self_attestation_at` TIMESTAMPTZ column
    - Add `attestation_text` TEXT column
    - Add `rejection_reason` TEXT column
    - Add `verified_by` UUID column referencing auth.users(id)
    - Add `audit_notes` TEXT column
    - Create `verification_audit_log` table (id, educator_id, previous_status, new_status, changed_at, actor_id, actor_type, reason, ip_address, metadata JSONB)
    - Add RLS on verification_audit_log: no user policies (service_role only), no UPDATE/DELETE policies (append-only)
    - Update `educator_profiles_public_browse` RLS policy to use `verification_status IN ('provisionally_verified', 'verified') AND subscription_status = 'active'`
    - Backfill existing rows: set `verification_status = 'verified'` where `is_verified = TRUE`, else `'pending'`
    - Use idempotent `IF NOT EXISTS` / `DO $$ BEGIN ... END $$` pattern consistent with existing migrations
    - _Requirements: 9.1, 9.2, 9.7, 5.2_

- [x] 2. Implement CRR format validator (pure function)
  - [x] 2.1 Create `supabase/functions/_shared/crr-validator.ts`
    - Export `validateCrrFormat(crrNumber: string): ValidationResult` interface
    - Implement category code recognition for all 14 RCI categories: SE, AST, CP, RP, PO, SHT, CBR, RCA, MRT, RSW, RPMR, OMS, HEMT, RET
    - Implement pattern matching: alphanumeric 4-20 chars, at least one letter + one digit, recognized category prefix
    - Implement normalization: trim whitespace, convert to uppercase
    - Return descriptive errors with `errorComponent` field indicating which part failed (prefix, category, digits, length, format)
    - Export `ATTESTATION_TEXT` constant with the legal declaration text
    - Export `VALID_CATEGORY_CODES` array
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 2.2 Write property tests for CRR format validator
    - **Property 1: CRR Format Validation Correctness**
    - Use fast-check to generate random strings (valid patterns and arbitrary strings)
    - Verify: valid patterns → valid:true + normalized output is uppercase/trimmed
    - Verify: invalid patterns → valid:false + errorComponent references the failing part
    - Verify: normalization is idempotent (normalize(normalize(x)) === normalize(x))
    - Minimum 100 iterations
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ]* 2.3 Write unit tests for category code recognition
    - Test all 14 category codes produce valid results
    - Test unknown category codes produce `errorComponent: 'category'`
    - _Requirements: 1.3_

- [x] 3. Update `verify-rci` edge function
  - [x] 3.1 Rewrite `supabase/functions/verify-rci/index.ts` with new verification logic
    - Import `validateCrrFormat` and `ATTESTATION_TEXT` from `../_shared/crr-validator.ts`
    - Add rate limiting: call `check_rate_limit(user.id, 'verify_rci', 3, 60)` — return 429 if blocked
    - Check if educator is already rejected → return 403 generic error (no details leaked)
    - Check if already provisionally_verified/verified → return success with current status
    - Validate `attestation_accepted === true` from request body → return 400 if missing/false
    - Call `validateCrrFormat(profile.rci_number)` → return 400 with descriptive error if invalid
    - Check uniqueness: query `educator_profiles` for same normalized CRR on different user → return 409 if duplicate
    - Update profile: set `verification_status = 'provisionally_verified'`, `is_verified = true`, `self_attestation_at = NOW()`, `attestation_text = ATTESTATION_TEXT`
    - Insert into `verification_audit_log`: educator_id, 'pending', 'provisionally_verified', user.id, 'educator', null, request IP
    - Return success response with new status
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.2, 5.1, 7.3, 8.1, 8.2, 8.3, 9.3, 9.4, 9.6_

  - [ ]* 3.2 Write property tests for state transition logic
    - **Property 3: State Machine Transition Validity**
    - Generate all (current_status, target_action) combinations
    - Verify only allowed transitions succeed; others return error
    - Verify rejection requires non-empty reason
    - Minimum 100 iterations
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 7.1**

  - [ ]* 3.3 Write property test for attestation gate
    - **Property 4: Attestation Gate**
    - Generate random valid CRR numbers with attestation_accepted = true/false
    - Verify: false → status stays pending, true + valid CRR → status advances
    - Verify: attestation text, timestamp, and user_id are all stored when accepted
    - Minimum 100 iterations
    - **Validates: Requirements 2.2, 2.4**

- [x] 4. Update `create-educator-profile` edge function
  - [x] 4.1 Modify `supabase/functions/create-educator-profile/index.ts`
    - Add `verification_status: 'pending'` to the upsert payload
    - Ensure `is_verified` remains `false` on creation (existing behavior)
    - Update the response to include `verification_status` field
    - _Requirements: 3.1, 9.5_

- [x] 5. Checkpoint - Verify backend logic
  - Ensure all edge functions deploy without errors
  - Ensure migration applies cleanly
  - Ask the user if questions arise

- [x] 6. Create admin verification endpoint
  - [x] 6.1 Create `supabase/functions/admin-verify-educator/index.ts` and `deno.json`
    - Authenticate admin: verify JWT, check `role = 'admin'` in users table
    - Support POST with body: `{ educator_id, action: 'verify'|'reject', reason?, notes? }`
    - Validate state transition: only allowed transitions proceed
    - For `action: 'reject'`: require `reason` field, if reason is `fraudulent_crr` mark as permanent ban
    - Update educator_profiles: `verification_status`, `verified_by`, `rejection_reason`, `audit_notes`, `is_verified`
    - Insert audit log entry with admin user_id, actor_type='admin', IP, reason
    - Support GET for admin queue: return educators with `verification_status = 'provisionally_verified'` ordered by `self_attestation_at ASC`
    - Support query params for filtering: `category`, `city`, `from_date`, `to_date`
    - Paginate with `limit` and `offset` params (default limit=20)
    - _Requirements: 3.3, 3.4, 5.1, 5.3, 5.4, 6.1, 6.2, 6.3, 6.4, 7.2, 9.3_

  - [ ]* 6.2 Write property test for marketplace visibility rules
    - **Property 5: Marketplace Visibility Rules**
    - Generate educators with all combinations of verification_status × subscription_status
    - Verify: visible iff status IN (provisionally_verified, verified) AND subscription = active
    - Minimum 100 iterations
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]* 6.3 Write property test for audit trail completeness
    - **Property 6: Audit Trail Completeness**
    - Perform random valid state transitions
    - Verify: each transition produces exactly one audit log entry with all required fields non-null
    - Verify: rejection entries include reason
    - Minimum 100 iterations
    - **Validates: Requirements 5.1, 5.3, 5.4**

  - [ ]* 6.4 Write property test for admin queue correctness
    - **Property 9: Admin Queue Correctness**
    - Generate educators with mixed statuses, categories, cities, dates
    - Query admin endpoint with various filters
    - Verify: only provisionally_verified returned, in date order, matching applied filters
    - Minimum 100 iterations
    - **Validates: Requirements 6.1, 6.3**

- [x] 7. Checkpoint - Verify admin flow
  - Ensure admin endpoint deploys and responds correctly
  - Ensure audit log entries are created on transitions
  - Ask the user if questions arise

- [x] 8. Update frontend educator onboarding
  - [x] 8.1 Update `mobile/app/onboarding/educator-setup.tsx` verification step
    - Add attestation checkbox UI: show the legal attestation text, require checkbox to be checked before "Verify Now" button is enabled
    - Update `handleVerifyRci` to send `{ attestation_accepted: true }` in request body
    - Handle new response statuses: show appropriate messaging for `provisionally_verified` (success — "Your profile is now visible while we complete manual review")
    - Handle 429 rate limit error: show "Too many attempts" message with retry guidance
    - Handle 409 duplicate error: show "This CRR number is already registered"
    - Handle 403 banned error: show "Your account cannot perform verification"
    - Handle 400 format error: show the specific error message from `errorComponent`
    - Style the attestation section with appropriate legal text formatting (smaller font, bordered container)
    - _Requirements: 2.1, 2.3, 8.2_

- [x] 9. Update frontend marketplace search
  - [x] 9.1 Update `mobile/app/dashboard/search.tsx` with verification badges
    - Replace hardcoded `MOCK_EDUCATORS` with live Supabase query against `educator_profiles` (filtered by RLS automatically)
    - Update the `verifiedBadge` display logic:
      - `verification_status === 'verified'` → show "✓ RCI Verified" badge (green)
      - `verification_status === 'provisionally_verified'` → show "⏳ Verification Pending" badge (amber)
    - Add badge component with appropriate colors from theme
    - Ensure only visible educators (those passing RLS) appear in results
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 10. Final checkpoint - End-to-end verification
  - Ensure the full flow works: create profile → verify RCI with attestation → appears in marketplace
  - Ensure rejected educators are hidden from marketplace
  - Ensure is_verified backward compatibility is maintained
  - Ask the user if questions arise

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1"],
      "description": "Database migration — foundation for all other work"
    },
    {
      "wave": 2,
      "tasks": ["2", "4"],
      "description": "Pure validator function and create-educator-profile update (independent of each other, both depend on migration)"
    },
    {
      "wave": 3,
      "tasks": ["3"],
      "description": "Update verify-rci edge function (depends on validator and migration)"
    },
    {
      "wave": 4,
      "tasks": ["5"],
      "description": "Checkpoint — verify backend logic"
    },
    {
      "wave": 5,
      "tasks": ["6"],
      "description": "Admin verification endpoint (depends on backend checkpoint)"
    },
    {
      "wave": 6,
      "tasks": ["7"],
      "description": "Checkpoint — verify admin flow"
    },
    {
      "wave": 7,
      "tasks": ["8", "9"],
      "description": "Frontend updates (onboarding + marketplace, independent of each other)"
    },
    {
      "wave": 8,
      "tasks": ["10"],
      "description": "Final checkpoint — end-to-end verification"
    }
  ]
}
```

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- All edge functions must use `https://esm.sh/@supabase/supabase-js@2.49.1` pinned import
- The `_shared/` folder pattern allows code reuse between edge functions without duplication
- The child data privacy steering rule does NOT apply to this feature (educator credentials are not child data)
- Property tests use fast-check via `https://esm.sh/fast-check@3.22.0` for Deno compatibility
- Rate limit rule: `verify_rci`, 3 attempts per 60 minutes, keyed by user_id
