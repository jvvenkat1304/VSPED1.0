# Implementation Plan: Session Proposal and Booking

## Overview

This plan implements the parent-initiated session proposal and booking flow. It covers database migrations (tables, RLS, indexes, expiry function), four new Deno/TS edge functions, educator profile updates, and six frontend components (proposal bottom sheet, educator inbox, parent proposals view, payment stub, notification feed). Tasks are ordered so that each step builds on the previous — database first, then edge functions, then frontend — with checkpoints to validate each layer before moving on.

## Tasks

- [x] 1. Database migration — new tables, columns, indexes, RLS, and expiry function
  - [x] 1.1 Create `session_proposals` table with all columns, CHECK constraints, and indexes
    - Create migration file `supabase/migrations/20260706000001_session_proposals.sql`
    - Define columns: id, parent_id, child_id, educator_id, sessions_per_week, total_sessions, proposed_rate_inr, notes, status, counter_rate_inr, counter_sessions_per_week, counter_total_sessions, counter_notes, consent_grant_id, payment_id, created_at, responded_at, paid_at, expires_at
    - Add CHECK constraints: sessions_per_week BETWEEN 1 AND 7, total_sessions >= 1, proposed_rate_inr >= 1, status IN enum list, counter field validity, notes length
    - Add indexes: (educator_id, status), (parent_id, status), partial index on (status, expires_at) WHERE status IN ('pending', 'countered')
    - _Requirements: 10.1, 10.3_

  - [x] 1.2 Add RLS policies to `session_proposals`
    - Enable RLS on `session_proposals`
    - Create policy: parents SELECT where parent_id = auth.uid()
    - Create policy: parents INSERT where parent_id = auth.uid()
    - Create policy: educators SELECT where educator_id = auth.uid()
    - Create policy: educators UPDATE where educator_id = auth.uid()
    - _Requirements: 10.2_

  - [x] 1.3 Create `proposal_payments` table with columns, CHECK constraints, indexes, and RLS
    - Create migration file `supabase/migrations/20260706000002_proposal_payments.sql`
    - Define columns: id, proposal_id (FK), parent_id, educator_id, sessions_count, rate_per_session, subtotal_inr, gst_inr, total_inr, status (pending/captured/failed/refunded), razorpay_payment_id, razorpay_order_id, created_at, captured_at
    - Add indexes: (proposal_id), (parent_id, status)
    - Enable RLS; parents SELECT where parent_id = auth.uid(); educators SELECT where educator_id = auth.uid()
    - _Requirements: 7.1, 7.2_

  - [x] 1.4 Create `notifications` table with columns, indexes, and RLS
    - Create migration file `supabase/migrations/20260706000003_notifications.sql`
    - Define columns: id, user_id, type (enum CHECK), title, body, metadata (JSONB), read_at, created_at
    - Add indexes: (user_id, created_at DESC), partial index on (user_id) WHERE read_at IS NULL
    - Enable RLS; users SELECT own notifications; users UPDATE own notifications (mark read)
    - _Requirements: 8.1, 8.2, 8.3, 8.5_

  - [x] 1.5 Add `min_rate_inr` column to `educator_profiles` with constraints and RLS update
    - Create migration file `supabase/migrations/20260706000004_educator_min_rate.sql`
    - ALTER TABLE educator_profiles ADD COLUMN min_rate_inr INTEGER
    - Add CHECK constraints: min_rate_inr > 0, min_rate_inr >= session_rate_inr - 100
    - Create or replace view `educator_profiles_public` excluding min_rate_inr for parent-facing queries
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 10.4, 10.5_

  - [x] 1.6 Add `proposal_id` column to `consent_grants` and relax `expires_at` constraint
    - Create migration file `supabase/migrations/20260706000005_consent_grants_proposal_link.sql`
    - ALTER TABLE consent_grants ADD COLUMN proposal_id UUID REFERENCES session_proposals(id)
    - ALTER COLUMN expires_at DROP NOT NULL
    - Drop old grant_not_expired_at_creation constraint, add relaxed grant_expires_valid CHECK
    - _Requirements: 6.4, 11.5_

  - [x] 1.7 Create `expire_stale_proposals()` function
    - Create migration file `supabase/migrations/20260706000006_expire_stale_proposals.sql`
    - Implement PL/pgSQL function that: updates pending/countered proposals past expires_at to 'expired', inserts notification records for both parties (only newly expired within 5 min window), returns expired count
    - Set as SECURITY DEFINER
    - Add pg_cron schedule (every 5 minutes) or document scheduled edge function invocation
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 2. Checkpoint — Verify database layer
  - Ensure all migrations apply cleanly, RLS policies are correct, and expire function works. Ask the user if questions arise.

- [x] 3. Edge function — `create-proposal`
  - [x] 3.1 Create `supabase/functions/create-proposal/index.ts` and `deno.json`
    - Use pinned import `https://esm.sh/@supabase/supabase-js@2.49.1`
    - Implement POST handler with auth validation (Bearer token)
    - Parse request body: child_id, educator_id, sessions_per_week, total_sessions, proposed_rate_inr, notes
    - Validate required fields; return 400 with field list if missing
    - Validate ranges: sessions_per_week 1-7, total_sessions >= 1, proposed_rate_inr >= 1, notes <= 500 chars
    - Verify child belongs to authenticated parent (query children table); return 403 if not
    - Verify educator eligibility: verification_status IN ('provisionally_verified', 'verified') AND subscription_status = 'active'; return 422 if not
    - Fetch educator's min_rate_inr via service_role; reject with 403 if proposed_rate < min_rate_inr
    - Insert session_proposals record: status = 'pending', expires_at = NOW() + 72h
    - Insert notification for educator (type: 'proposal_received')
    - Return 201 with proposal_id, status, total_cost, gst_amount, grand_total, expires_at
    - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 8.1_

  - [ ]* 3.2 Write property test: Rate constraint validation (Property 1)
    - **Property 1: Rate Constraint Validation**
    - Generate random (session_rate_inr, min_rate_inr, proposed_rate_inr) triples
    - Verify: if proposed_rate < min_rate_inr → rejected; if proposed_rate >= min_rate_inr → accepted
    - Use fast-check library
    - **Validates: Requirements 1.2, 1.3, 1.6, 2.3, 2.4**

  - [ ]* 3.3 Write property test: Cost calculation correctness (Property 3)
    - **Property 3: Cost Calculation Correctness**
    - Generate random (total_sessions, rate_per_session) pairs
    - Verify: subtotal = total_sessions × rate, gst = round(subtotal × 0.18), grand_total = subtotal + gst
    - **Validates: Requirements 2.5, 2.6, 7.2**

  - [ ]* 3.4 Write property test: New proposals start as pending (Property 4)
    - **Property 4: New Proposals Start as Pending**
    - Generate random valid proposal inputs, call create function logic
    - Verify: resulting record has status = 'pending', expires_at = created_at + 72h
    - **Validates: Requirements 2.8**

  - [ ]* 3.5 Write property test: Child ownership enforcement (Property 5)
    - **Property 5: Child Ownership Enforcement**
    - Generate random (auth_uid, child.parent_id) pairs
    - Verify: mismatch → 403 rejected; match → proceeds
    - **Validates: Requirements 2.9**

  - [ ]* 3.6 Write property test: Educator eligibility gate (Property 6)
    - **Property 6: Educator Eligibility Gate**
    - Generate random educator verification/subscription states
    - Verify: only ('provisionally_verified'|'verified') AND 'active' → accepted; all other combos → 422
    - **Validates: Requirements 2.10**

- [x] 4. Edge function — `respond-proposal`
  - [x] 4.1 Create `supabase/functions/respond-proposal/index.ts` and `deno.json`
    - Use pinned import `https://esm.sh/@supabase/supabase-js@2.49.1`
    - Implement POST handler with auth validation
    - Parse: proposal_id, action (accept/reject/counter), counter fields, rejection_reason
    - Fetch proposal where educator_id = auth.uid() AND status = 'pending'; return 403 if not authorized, 400 if wrong state
    - For "accept": update status → 'accepted', set responded_at, create consent_grant (auto-consent with scope ['progress', 'session_notes'], expires_at = NULL, proposal_id linked), create proposal_payment record (pending, with correct subtotal/gst/total), insert notification for parent
    - For "reject": update status → 'rejected', set responded_at, store rejection_reason, insert notification for parent
    - For "counter": validate counter fields present and counter_rate >= min_rate_inr; update status → 'countered', store counter fields, set responded_at, reset expires_at = NOW() + 72h, insert notification for parent
    - Return 200 with proposal_id, new_status, consent_grant_id (if accept), payment_id (if accept)
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 8.2_

  - [ ]* 4.2 Write property test: Valid state transitions from pending (Property 8)
    - **Property 8: Valid State Transitions from Pending**
    - Generate random educator actions on pending proposals
    - Verify: accept → 'accepted' with responded_at; reject → 'rejected' with responded_at; counter → 'countered' with all counter fields and responded_at set
    - **Validates: Requirements 4.2, 4.3, 4.4**

  - [ ]* 4.3 Write property test: State guards prevent invalid actions (Property 9)
    - **Property 9: State Guards Prevent Invalid Actions**
    - Generate proposals in various non-pending states, attempt educator respond
    - Verify: all rejected with 400
    - **Validates: Requirements 4.6, 5.4**

  - [ ]* 4.4 Write property test: Authorization enforcement (Property 10)
    - **Property 10: Authorization Enforcement**
    - Generate random (auth_uid, proposal.educator_id) pairs
    - Verify: mismatch → rejected; match → proceeds
    - **Validates: Requirements 4.7, 5.5**

  - [ ]* 4.5 Write property test: Auto-consent on acceptance (Property 12)
    - **Property 12: Auto-Consent on Acceptance**
    - Generate proposals that reach 'accepted'
    - Verify: consent_grant created with correct grantee_id, child_id, parent_id, expires_at = NULL, scope = ['progress', 'session_notes'], proposal_id linked
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]* 4.6 Write property test: Payment record on acceptance (Property 15)
    - **Property 15: Payment Record on Acceptance**
    - Generate accepted proposals, verify payment record with correct amounts
    - Verify: subtotal = sessions × rate, gst = round(subtotal × 0.18), total = subtotal + gst, status = 'pending'
    - **Validates: Requirements 7.1**

  - [ ]* 4.7 Write property test: No consent or payment on terminal states (Property 14)
    - **Property 14: No Consent or Payment on Terminal States**
    - Generate proposals reaching rejected/withdrawn/expired
    - Verify: no consent_grant or payment record linked
    - **Validates: Requirements 6.7, 9.4**

- [x] 5. Edge function — `respond-counter`
  - [x] 5.1 Create `supabase/functions/respond-counter/index.ts` and `deno.json`
    - Use pinned import `https://esm.sh/@supabase/supabase-js@2.49.1`
    - Implement POST handler with auth validation
    - Parse: proposal_id, action (accept/withdraw)
    - Fetch proposal where parent_id = auth.uid() AND status = 'countered'; return 403 if not authorized, 400 if wrong state
    - For "accept": update status → 'parent_accepted', set effective values to counter values, create consent_grant (same as accept in respond-proposal), create proposal_payment record, insert notification for educator
    - For "withdraw": update status → 'withdrawn', insert notification for educator
    - Return 200 with proposal_id, new_status, consent_grant_id (if accept), payment_id (if accept)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 7.1, 8.3_

  - [ ]* 5.2 Write property test: Parent counter-response transitions (Property 11)
    - **Property 11: Parent Counter-Response Transitions**
    - Generate countered proposals with random counter values, apply parent accept/withdraw
    - Verify: accept → 'parent_accepted' with effective = counter values; withdraw → 'withdrawn' with no consent/payment
    - **Validates: Requirements 5.2, 5.3**

- [x] 6. Edge function — `get-proposals`
  - [x] 6.1 Create `supabase/functions/get-proposals/index.ts` and `deno.json`
    - Use pinned import `https://esm.sh/@supabase/supabase-js@2.49.1`
    - Implement GET handler with auth validation
    - Parse query params: role (parent|educator), status (comma-separated filter)
    - For parent role: query proposals where parent_id = auth.uid(), join educator name
    - For educator role: query proposals where educator_id = auth.uid(), join parent name; NEVER include child_name unless consent_grant is active (child-data-privacy rule)
    - Order by created_at DESC
    - Include payment_status from joined proposal_payments
    - Return 200 with proposals array; NEVER include min_rate_inr in response
    - _Requirements: 4.1, 10.2, 15.4_

  - [ ]* 6.2 Write property test: Minimum rate never exposed to parents (Property 2)
    - **Property 2: Minimum Rate Never Exposed to Parents**
    - Generate random get-proposals responses for parent role
    - Verify: response payload never contains 'min_rate_inr' field or value
    - **Validates: Requirements 1.5, 10.5**

  - [ ]* 6.3 Write property test: Proposal display ordering (Property 23)
    - **Property 23: Proposal Display Ordering**
    - Generate random sets of proposals with various created_at timestamps
    - Verify: returned array is ordered by created_at DESC
    - **Validates: Requirements 4.1, 15.4**

  - [ ]* 6.4 Write property test: RLS proposal visibility (Property 20)
    - **Property 20: RLS Proposal Visibility**
    - Generate random user IDs querying proposals
    - Verify: only proposals where user is parent_id or educator_id are returned
    - **Validates: Requirements 10.2**

- [x] 7. Checkpoint — Verify backend edge functions
  - Ensure all edge functions deploy, handle auth correctly, enforce validation, and return correct responses. Ask the user if questions arise.

- [x] 8. Update educator profile — accept `min_rate_inr`
  - [x] 8.1 Update `create-educator-profile` edge function to accept and store `min_rate_inr`
    - Add `min_rate_inr` to destructured request body
    - If min_rate_inr not provided, default to session_rate_inr value
    - Validate: min_rate_inr > 0 AND min_rate_inr >= session_rate_inr - 100; return 400 if invalid
    - Include min_rate_inr in the upsert payload
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 8.2 Write property test: Default minimum rate equals listed rate (Property 21)
    - **Property 21: Default Minimum Rate Equals Listed Rate**
    - Generate random session_rate_inr values, call profile creation without min_rate
    - Verify: stored min_rate_inr === session_rate_inr
    - **Validates: Requirements 12.2**

  - [x] 8.3 Update `educator-setup.tsx` to include min rate field
    - Add numeric input for "Minimum Acceptable Rate (₹)" in the educator onboarding form
    - Pre-fill with session_rate_inr value; allow editing within ₹100 constraint
    - Display helper text: "The lowest rate you'll accept. Parents won't see this."
    - Submit min_rate_inr alongside existing fields to create-educator-profile
    - Show validation error if min_rate_inr > session_rate_inr or min_rate_inr < session_rate_inr - 100
    - _Requirements: 12.1, 12.3, 12.4_

- [x] 9. Frontend — Proposal bottom sheet on educator profile
  - [x] 9.1 Create `ProposalBottomSheet` component in `mobile/components/ProposalBottomSheet.tsx`
    - Implement bottom sheet / modal with fields: child selector (dropdown if multiple children, hidden if one), sessions per week (stepper 1-7), total sessions (numeric input, min 1), proposed rate (pre-filled with listed rate, editable), notes (optional, max 500 chars)
    - Display real-time cost breakdown: subtotal, GST (18%), grand total
    - Display soft warning when proposed_rate < listed_rate: "This rate is below the listed rate. The educator may counter-propose."
    - Disable submit button until all validations pass (sessions_per_week 1-7, total_sessions >= 1, proposed_rate >= 1)
    - On submit: call create-proposal edge function, show confirmation with consent message
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 2.5, 2.6, 2.11, 3.1, 3.2, 3.3_

  - [x] 9.2 Add "Propose Sessions" button to `educator-profile.tsx`
    - Add button visible only to parent users
    - Disable button if educator verification_status is 'pending' or 'rejected'
    - On tap: open ProposalBottomSheet with educator's listed rate and educator_id
    - _Requirements: 13.1, 13.3_

  - [ ]* 9.3 Write property test: Soft warning determination (Property 7)
    - **Property 7: Soft Warning Determination**
    - Generate random (proposed_rate, listed_rate) pairs
    - Verify: warning shown iff proposed_rate < listed_rate; warning uses only listed_rate
    - **Validates: Requirements 3.1, 3.2, 3.3**

  - [ ]* 9.4 Write property test: Frontend field validation (Property 22)
    - **Property 22: Frontend Field Validation**
    - Generate random form field value combinations
    - Verify: submit enabled iff sessions_per_week in [1,7] AND total_sessions >= 1 AND proposed_rate >= 1
    - **Validates: Requirements 13.5**

- [x] 10. Frontend — Educator proposals inbox
  - [x] 10.1 Create `EducatorProposalsInbox` component in `mobile/components/EducatorProposalsInbox.tsx`
    - Fetch proposals via get-proposals (role=educator)
    - Group proposals: Pending (action required) first, then Countered (awaiting parent), then Historical (accepted, rejected, expired, withdrawn) collapsible
    - For pending proposals: show parent name, sessions_per_week, total_sessions, proposed_rate, notes; action buttons: Accept, Reject, Counter
    - For counter action: show inline form for counter_rate_inr, counter_sessions_per_week, counter_total_sessions, counter_notes
    - NEVER show child name/details unless consent_grant is active (child-data-privacy rule)
    - Call respond-proposal edge function on action
    - _Requirements: 14.1, 14.2, 14.3_

  - [x] 10.2 Integrate proposals inbox into educator dashboard
    - Add "Proposals" tab or section to `mobile/app/dashboard/educator.tsx`
    - Show badge count of pending proposals on the navigation item
    - _Requirements: 14.1, 14.4_

- [x] 11. Frontend — Parent proposals view
  - [x] 11.1 Create `ParentProposalsView` component in `mobile/components/ParentProposalsView.tsx`
    - Fetch proposals via get-proposals (role=parent)
    - Display proposals chronologically (most recent first) with status indicators: pending (yellow/accent), accepted (green/success), rejected (red/warning), countered (blue/secondary), expired (grey/textLight)
    - For countered proposals: show original terms vs counter terms side-by-side, Accept and Withdraw buttons
    - For accepted/parent_accepted with pending payment: show "Complete Payment" button
    - Call respond-counter edge function on Accept/Withdraw
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 11.2 Integrate parent proposals view into parent dashboard
    - Add "My Proposals" section accessible from `mobile/app/dashboard/parent.tsx`
    - _Requirements: 15.1_

- [x] 12. Frontend — Payment stub (immediate capture for MVP)
  - [x] 12.1 Create `PaymentPrompt` component in `mobile/components/PaymentPrompt.tsx`
    - Display in classroom tab for accepted proposals with pending payment
    - Show breakdown: sessions count, rate per session, subtotal, GST (18%), grand total
    - "Pay Now" button triggers immediate capture (MVP stub): call proposal_payments update to set status = 'captured', update proposal to status = 'paid', set paid_at
    - Show success confirmation and notification to educator
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

  - [ ]* 12.2 Write property test: Payment capture transitions proposal to paid (Property 16)
    - **Property 16: Payment Capture Transitions Proposal to Paid**
    - Generate proposals with pending payments, trigger capture
    - Verify: payment status → 'captured', proposal status → 'paid', paid_at set
    - **Validates: Requirements 7.4**

- [x] 13. Frontend — Notification feed
  - [x] 13.1 Create `NotificationFeed` component in `mobile/components/NotificationFeed.tsx`
    - Query notifications table for current user ordered by created_at DESC
    - Display: title, body, timestamp, read/unread indicator
    - Tap notification: navigate to relevant proposal (using metadata.proposal_id)
    - Mark notification as read on tap (update read_at)
    - _Requirements: 8.5_

  - [x] 13.2 Add notification feed access to app navigation
    - Add notification bell icon to main layout or dashboard header
    - Show unread badge count
    - _Requirements: 8.5_

- [x] 14. Expiry function integration
  - [x] 14.1 Create scheduled edge function or pg_cron invocation for `expire_stale_proposals()`
    - If using scheduled edge function: create `supabase/functions/expire-proposals/index.ts` that calls the DB function via service_role
    - Configure to run every 5 minutes
    - Verify: only pending/countered proposals past expires_at are expired; notifications created for both parties
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 14.2 Write property test: Proposal expiry after 72 hours (Property 19)
    - **Property 19: Proposal Expiry After 72 Hours**
    - Generate proposals with various ages and states, run expiry function
    - Verify: only (pending|countered) with expires_at <= NOW() transition to 'expired'; others unaffected
    - **Validates: Requirements 9.1, 9.2**

- [x] 15. Checkpoint — Verify frontend renders and interactions
  - Ensure all frontend components render correctly, form validations work, bottom sheet opens from educator profile, educator inbox shows proposals grouped correctly, parent view shows statuses, and payment stub captures immediately. Ask the user if questions arise.

- [x] 16. Backward compatibility verification
  - [x] 16.1 Verify existing `propose-session` and `respond-session` edge functions still work
    - Run existing educator-initiated session flow end-to-end
    - Confirm no schema changes break existing functionality
    - Confirm sessions table and its RLS are untouched
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 17. Final checkpoint — Full flow verification
  - Ensure the complete proposal lifecycle works: create proposal → educator accepts → auto-consent created → payment captured → proposal marked paid → notifications delivered at each step. Also verify counter-proposal flow and expiry flow. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based test sub-tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each architectural layer
- Property tests validate universal correctness properties from the design document using fast-check
- Unit tests validate specific examples and edge cases
- The child-data-privacy steering rule is enforced: educators NEVER see child data until consent_grant is active
- All edge functions use the pinned import `https://esm.sh/@supabase/supabase-js@2.49.1` consistent with existing functions
- The payment flow is stubbed for MVP (immediate capture) — Razorpay integration is deferred

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.4"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.5"] },
    { "id": 2, "tasks": ["1.6", "1.7"] },
    { "id": 3, "tasks": ["3.1", "8.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "8.2", "8.3"] },
    { "id": 5, "tasks": ["4.1", "5.1", "6.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4", "4.5", "4.6", "4.7", "5.2", "6.2", "6.3", "6.4"] },
    { "id": 7, "tasks": ["9.1", "10.1", "11.1", "13.1", "14.1"] },
    { "id": 8, "tasks": ["9.2", "9.3", "9.4", "10.2", "11.2", "12.1", "13.2", "14.2"] },
    { "id": 9, "tasks": ["12.2", "16.1"] }
  ]
}
```
