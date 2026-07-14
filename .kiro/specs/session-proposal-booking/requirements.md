# Requirements Document

## Introduction

The Session Proposal and Booking system introduces a parent-initiated booking flow for V-SPED. Currently, the platform supports educator-initiated session proposals (educator proposes a time slot, parent accepts). The new flow inverts this: a parent browses educators, proposes a session package (multiple sessions at a negotiated rate), and the educator accepts, rejects, or counter-proposes. Upon acceptance, data consent is automatically granted (time-bound to the package duration), payment is triggered via Razorpay (stubbed for MVP), and individual sessions are scheduled after payment completes. This system introduces a "session_proposals" concept that sits above individual sessions — a proposal represents a package deal (X sessions with educator Y for child Z at rate R per session).

## Glossary

- **Proposal_System**: The V-SPED subsystem responsible for managing the lifecycle of parent-initiated session proposals, including creation, validation, educator response, consent auto-grant, and payment triggering
- **Session_Proposal**: A package request created by a parent specifying a child, educator, session frequency, total session count, proposed rate, and optional notes
- **Listed_Rate**: The public per-session rate in INR that an educator displays on their profile (`session_rate_inr` column on `educator_profiles`)
- **Minimum_Rate**: The private per-session rate in INR below which an educator will not accept proposals (`min_rate_inr` column on `educator_profiles`); not visible to parents
- **Rate_Flexibility_Window**: The range between the Listed_Rate and Minimum_Rate within which a parent may propose a lower rate; the Minimum_Rate must be no more than ₹100 below the Listed_Rate
- **Proposal_Status**: An enum representing the lifecycle state of a session proposal: `pending`, `accepted`, `rejected`, `countered`, `parent_accepted`, `withdrawn`, `expired`
- **Counter_Proposal**: A response from an educator suggesting a different rate or schedule while declining the original proposal terms
- **Auto_Consent**: The automatic creation of a time-bound `consent_grant` record when an educator accepts a proposal, granting the educator access to the specified child's data for the duration of the session package
- **Payment_Trigger**: The event fired after proposal acceptance that prompts the parent to complete payment before sessions can be scheduled
- **Parent**: A registered V-SPED user with role `parent` who has one or more children in the system
- **Educator**: A registered V-SPED user with role `special_educator` who has a verified profile and active subscription
- **GST**: Goods and Services Tax at 18% applicable to the total package cost in India

## Requirements

### Requirement 1: Educator Rate Configuration

**User Story:** As an educator, I want to set both a public listed rate and a private minimum acceptable rate, so that parents have slight flexibility to propose a lower rate while I maintain a floor price.

#### Acceptance Criteria

1. WHEN an educator sets up their profile, THE Proposal_System SHALL require the educator to provide both a Listed_Rate and a Minimum_Rate in INR
2. THE Proposal_System SHALL enforce that the Minimum_Rate is no more than ₹100 below the Listed_Rate (i.e., `min_rate_inr >= session_rate_inr - 100`)
3. THE Proposal_System SHALL enforce that the Minimum_Rate is greater than zero
4. THE Proposal_System SHALL store the Minimum_Rate in the `educator_profiles` table as a column named `min_rate_inr` with type INTEGER
5. THE Proposal_System SHALL ensure that the Minimum_Rate is never exposed to parents through any API endpoint, RLS policy, or frontend display
6. WHEN an educator updates their Listed_Rate, THE Proposal_System SHALL validate that the existing Minimum_Rate still satisfies the ₹100 constraint, and reject the update if it does not

### Requirement 2: Session Proposal Creation

**User Story:** As a parent, I want to propose a session package to an educator specifying my child, schedule preferences, and rate, so that I can initiate a booking without needing prior consent.

#### Acceptance Criteria

1. WHEN a parent submits a session proposal, THE Proposal_System SHALL require: child_id, educator_id, sessions_per_week (integer, 1-7), total_sessions (integer, minimum 1), and proposed_rate_inr (integer)
2. THE Proposal_System SHALL pre-fill the proposed_rate_inr with the educator's Listed_Rate in the frontend, allowing the parent to edit it within a valid range
3. WHEN a proposed_rate_inr is below the educator's Listed_Rate but at or above the Minimum_Rate, THE Proposal_System SHALL accept the proposal without any warning
4. WHEN a proposed_rate_inr is below the educator's Minimum_Rate, THE Proposal_System SHALL reject the proposal with an error message stating "This rate is below the educator's acceptable range"
5. THE Proposal_System SHALL calculate and display the total cost as `total_sessions × proposed_rate_inr` before submission
6. THE Proposal_System SHALL calculate and display the GST amount as `total_cost × 0.18` and the grand total as `total_cost + GST` before submission
7. THE Proposal_System SHALL accept an optional `notes` text field (maximum 500 characters) for special requests
8. WHEN a parent submits a valid proposal, THE Proposal_System SHALL create a `session_proposals` record with status `pending` and a `created_at` timestamp
9. THE Proposal_System SHALL validate that the specified child belongs to the authenticated parent before creating the proposal
10. THE Proposal_System SHALL validate that the educator has verification_status `provisionally_verified` or `verified` AND subscription_status `active` before accepting the proposal
11. WHEN the proposal is successfully created, THE Proposal_System SHALL display a confirmation message to the parent stating: "When the educator accepts, they'll automatically receive time-limited access to [child name]'s data for the session duration"

### Requirement 3: Soft Rate Warning

**User Story:** As a parent, I want to receive a soft warning when my proposed rate is below the educator's listed rate, so that I understand my proposal may be less attractive without knowing the exact minimum.

#### Acceptance Criteria

1. WHEN a parent enters a proposed_rate_inr below the educator's Listed_Rate but at or above the Minimum_Rate, THE Proposal_System SHALL display a non-blocking warning: "This rate is below the listed rate. The educator may counter-propose."
2. WHEN a parent enters a proposed_rate_inr equal to or above the educator's Listed_Rate, THE Proposal_System SHALL display no rate-related warning
3. THE Proposal_System SHALL perform the soft warning check on the frontend using only the Listed_Rate (publicly available) without revealing the Minimum_Rate

### Requirement 4: Educator Proposal Response

**User Story:** As an educator, I want to accept, reject, or counter-propose incoming session proposals, so that I can manage my booking pipeline and negotiate terms.

#### Acceptance Criteria

1. WHEN an educator views their dashboard, THE Proposal_System SHALL display all proposals with status `pending` addressed to that educator, ordered by creation date (newest first)
2. WHEN an educator accepts a proposal, THE Proposal_System SHALL transition the proposal status from `pending` to `accepted` and record `responded_at` timestamp
3. WHEN an educator rejects a proposal, THE Proposal_System SHALL transition the proposal status from `pending` to `rejected` and record `responded_at` timestamp with an optional rejection reason
4. WHEN an educator counter-proposes, THE Proposal_System SHALL transition the proposal status from `pending` to `countered`, store the counter_rate_inr and counter_sessions_per_week and counter_total_sessions, and record `responded_at` timestamp
5. THE Proposal_System SHALL validate that counter_rate_inr in a counter-proposal is at or above the educator's own Minimum_Rate
6. THE Proposal_System SHALL only allow responses to proposals with status `pending`
7. THE Proposal_System SHALL verify that the responding educator matches the educator_id on the proposal

### Requirement 5: Parent Response to Counter-Proposal

**User Story:** As a parent, I want to accept or withdraw from a counter-proposal, so that I can decide whether the educator's alternative terms work for me.

#### Acceptance Criteria

1. WHEN a parent views a counter-proposed proposal, THE Proposal_System SHALL display the original terms alongside the educator's counter terms (counter_rate_inr, counter_sessions_per_week, counter_total_sessions)
2. WHEN a parent accepts a counter-proposal, THE Proposal_System SHALL transition the proposal status from `countered` to `parent_accepted` and update the effective rate and schedule to the counter values
3. WHEN a parent withdraws from a counter-proposal, THE Proposal_System SHALL transition the proposal status from `countered` to `withdrawn`
4. THE Proposal_System SHALL only allow parent responses to proposals with status `countered`
5. THE Proposal_System SHALL verify that the responding parent is the parent who created the original proposal

### Requirement 6: Auto-Consent on Acceptance

**User Story:** As a parent, I want consent to be automatically granted when an educator accepts my proposal, so that sessions can proceed without a separate consent workflow.

#### Acceptance Criteria

1. WHEN a proposal transitions to `accepted` or `parent_accepted`, THE Proposal_System SHALL automatically create a `consent_grant` record for the educator to access the specified child's data
2. THE Proposal_System SHALL set the consent_grant `expires_at` to NULL initially, indicating that expiry is tied to session completion rather than a fixed calendar date
3. THE Proposal_System SHALL set the consent_grant `purpose` field to "Session package: [total_sessions] sessions at ₹[rate]/session"
4. THE Proposal_System SHALL store the proposal_id as a reference on the consent_grant record to link consent scope to the specific proposal
5. WHEN all sessions in a proposal are marked `completed`, THE Proposal_System SHALL automatically set the consent_grant `expires_at` to the completion timestamp plus a 7-day buffer period
6. THE Proposal_System SHALL respect the existing consent revocation system — a parent can still revoke consent at any time regardless of proposal status
7. THE Proposal_System SHALL NOT create a consent_grant if the proposal is rejected or withdrawn

### Requirement 7: Payment Trigger After Acceptance

**User Story:** As a parent, I want to be prompted to pay after the educator accepts my proposal, so that payment confirms my commitment before sessions are scheduled.

#### Acceptance Criteria

1. WHEN a proposal transitions to `accepted` or `parent_accepted`, THE Proposal_System SHALL create a payment record with status `pending` linked to the proposal
2. THE Proposal_System SHALL calculate the payment amount as: `(effective_total_sessions × effective_rate_inr) + GST_18_percent`
3. THE Proposal_System SHALL display a payment prompt to the parent in the child's "Classroom" tab showing the breakdown: sessions count, rate per session, subtotal, GST (18%), and grand total
4. WHEN the parent completes payment, THE Proposal_System SHALL update the payment record status to `captured` and mark the proposal as `paid`
5. THE Proposal_System SHALL prevent individual sessions from being scheduled until payment status is `captured`
6. FOR MVP: WHEN the parent initiates payment, THE Proposal_System SHALL immediately mark the payment as `captured` (Razorpay integration is stubbed)
7. THE Proposal_System SHALL send an in-app notification to the parent upon proposal acceptance prompting them to complete payment

### Requirement 8: Notifications

**User Story:** As a user (parent or educator), I want to receive in-app notifications for proposal lifecycle events, so that I can respond promptly to proposals and updates.

#### Acceptance Criteria

1. WHEN a parent submits a new proposal, THE Proposal_System SHALL send an in-app notification to the target educator with the proposal summary
2. WHEN an educator responds to a proposal (accept, reject, or counter), THE Proposal_System SHALL send an in-app notification to the parent with the response details
3. WHEN a parent responds to a counter-proposal (accept or withdraw), THE Proposal_System SHALL send an in-app notification to the educator
4. WHEN payment is completed for a proposal, THE Proposal_System SHALL send an in-app notification to the educator confirming the booking is paid and sessions can begin
5. THE Proposal_System SHALL display notifications in the user's notification feed with a timestamp and a link to the relevant proposal

### Requirement 9: Proposal Expiry

**User Story:** As a platform operator, I want proposals to expire automatically if not responded to within a reasonable timeframe, so that stale proposals do not accumulate and parents are not left waiting indefinitely.

#### Acceptance Criteria

1. WHILE a proposal has status `pending` for more than 72 hours, THE Proposal_System SHALL automatically transition the status to `expired`
2. WHILE a proposal has status `countered` for more than 72 hours without a parent response, THE Proposal_System SHALL automatically transition the status to `expired`
3. WHEN a proposal expires, THE Proposal_System SHALL send an in-app notification to both the parent and the educator
4. THE Proposal_System SHALL NOT create a consent_grant or trigger payment for expired proposals

### Requirement 10: Session Proposal Data Model

**User Story:** As a developer, I want a well-defined session_proposals table that tracks the full proposal lifecycle, so that the system maintains a clear audit trail of all booking negotiations.

#### Acceptance Criteria

1. THE Proposal_System SHALL create a `session_proposals` table with columns: id (UUID, PK), parent_id (UUID, FK to users), child_id (UUID, FK to children), educator_id (UUID, FK to users), sessions_per_week (INTEGER), total_sessions (INTEGER), proposed_rate_inr (INTEGER), notes (TEXT, nullable), status (TEXT enum), counter_rate_inr (INTEGER, nullable), counter_sessions_per_week (INTEGER, nullable), counter_total_sessions (INTEGER, nullable), counter_notes (TEXT, nullable), consent_grant_id (UUID, FK to consent_grants, nullable), payment_id (UUID, nullable), created_at (TIMESTAMPTZ), responded_at (TIMESTAMPTZ, nullable), paid_at (TIMESTAMPTZ, nullable), expires_at (TIMESTAMPTZ, nullable)
2. THE Proposal_System SHALL enforce RLS on the `session_proposals` table: parents can SELECT and INSERT proposals where `parent_id = auth.uid()`, educators can SELECT and UPDATE proposals where `educator_id = auth.uid()`
3. THE Proposal_System SHALL create indexes on `session_proposals` for: (educator_id, status), (parent_id, status), and (status, expires_at)
4. THE Proposal_System SHALL add a `min_rate_inr` column (INTEGER) to the existing `educator_profiles` table with a CHECK constraint ensuring `min_rate_inr >= session_rate_inr - 100` and `min_rate_inr > 0`
5. THE Proposal_System SHALL exclude the `min_rate_inr` column from all SELECT RLS policies accessible to parents (only the educator themselves and service_role can read it)

### Requirement 11: Backward Compatibility

**User Story:** As a developer, I want the new parent-initiated proposal flow to coexist with the existing educator-initiated session system, so that no existing functionality breaks.

#### Acceptance Criteria

1. THE Proposal_System SHALL NOT modify the existing `sessions` table schema or its RLS policies
2. THE Proposal_System SHALL NOT modify the existing `propose-session` edge function (educator-initiated flow remains functional)
3. THE Proposal_System SHALL NOT modify the existing `respond-session` edge function (parent accept/reject of educator-proposed sessions remains functional)
4. THE Proposal_System SHALL create new edge functions (`create-proposal`, `respond-proposal`, `respond-counter`) separate from existing session functions
5. THE Proposal_System SHALL use the existing `consent_grants` table structure for auto-consent records, adding only a `proposal_id` reference column
6. THE Proposal_System SHALL use the pinned import format `https://esm.sh/@supabase/supabase-js@2.49.1` consistent with existing edge functions

### Requirement 12: Educator Onboarding Update

**User Story:** As an educator setting up my profile for the first time, I want to set my minimum acceptable rate alongside my listed rate, so that the booking system can validate parent proposals from day one.

#### Acceptance Criteria

1. WHEN an educator creates their profile via the `create-educator-profile` edge function, THE Proposal_System SHALL accept an optional `min_rate_inr` field
2. IF `min_rate_inr` is not provided during profile creation, THEN THE Proposal_System SHALL default it to `session_rate_inr` (listed rate equals minimum — no discount accepted)
3. WHEN an educator updates their profile, THE Proposal_System SHALL allow updating `min_rate_inr` subject to the ₹100 constraint validation
4. THE Proposal_System SHALL display the minimum rate configuration in the educator's own profile settings screen (visible only to the educator)

### Requirement 13: Frontend — Proposal Modal on Educator Profile

**User Story:** As a parent viewing an educator's profile, I want a clear "Propose Sessions" action that opens a structured form, so that I can easily compose and submit a session proposal.

#### Acceptance Criteria

1. WHEN a parent taps "Propose Sessions" on an educator profile, THE Proposal_System SHALL present a bottom sheet or modal with fields: child selector (if multiple children), sessions per week, total sessions, proposed rate (pre-filled with Listed_Rate, editable), and notes
2. THE Proposal_System SHALL display the total cost calculation (sessions × rate), GST amount, and grand total updating in real-time as the parent adjusts values
3. THE Proposal_System SHALL disable the "Propose Sessions" button for educators whose verification_status is `pending` or `rejected`
4. WHEN a parent has only one child, THE Proposal_System SHALL auto-select that child and hide the child selector field
5. THE Proposal_System SHALL validate all fields before enabling the submit button: sessions_per_week between 1-7, total_sessions minimum 1, proposed_rate_inr at or above 1

### Requirement 14: Frontend — Educator Proposals Inbox

**User Story:** As an educator, I want a dedicated proposals section in my dashboard where I can see and respond to incoming proposals, so that I can manage my booking pipeline efficiently.

#### Acceptance Criteria

1. THE Proposal_System SHALL display a "Proposals" tab or section in the educator dashboard showing all proposals grouped by status (pending first, then countered awaiting parent response, then historical)
2. WHEN an educator selects a pending proposal, THE Proposal_System SHALL show the full proposal details (child name — only if consent is later granted — parent name, sessions per week, total sessions, proposed rate, notes) and action buttons: Accept, Reject, Counter
3. WHEN an educator taps "Counter," THE Proposal_System SHALL present a form to enter counter_rate_inr, counter_sessions_per_week, and counter_total_sessions with optional notes
4. THE Proposal_System SHALL show a badge count of pending proposals on the educator dashboard navigation item

### Requirement 15: Frontend — Parent Proposal Status View

**User Story:** As a parent, I want to see the status of my submitted proposals, so that I know when an educator responds and what action I need to take.

#### Acceptance Criteria

1. THE Proposal_System SHALL display a "My Proposals" section accessible from the parent dashboard showing all proposals with their current status
2. WHEN a proposal has status `countered`, THE Proposal_System SHALL display the counter-offer details with "Accept" and "Withdraw" action buttons
3. WHEN a proposal has status `accepted` or `parent_accepted` with payment pending, THE Proposal_System SHALL display a "Complete Payment" button linking to the payment flow
4. THE Proposal_System SHALL display proposals in chronological order (most recent first) with visual status indicators (pending = yellow, accepted = green, rejected = red, countered = blue, expired = grey)
