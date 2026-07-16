# Requirements Document: Phase 5 Critical Bugs

## Introduction

This document specifies the requirements for fixing 7 bugs discovered during V-SPED 1.0 Phase 5 end-to-end testing. These bugs span authentication token management, payment flow logic errors, missing session generation, and UI/UX gaps that prevent the complete parent-educator booking lifecycle from functioning. Fixes must be applied in dependency order (1→7) since later fixes depend on earlier ones.

## Glossary

- **Auth_Store**: The Zustand-based state management module (`mobile/store/authStore.ts`) responsible for persisting authentication tokens and user state
- **Access_Token**: A short-lived JWT (1-hour expiry) returned by Supabase Auth after OTP verification, used to authenticate API calls
- **Refresh_Token**: A long-lived token returned alongside the access token, used to obtain new access tokens without re-authenticating
- **Payment_Order_Function**: The Supabase Edge Function (`create-payment-order`) that creates Razorpay Payment Links for session payments
- **Webhook_Handler**: The Supabase Edge Function (`razorpay-webhook`) that processes Razorpay payment event callbacks
- **Session_Generator**: A new function or database trigger responsible for creating individual session records after a proposal is paid
- **Proposal**: A session booking request from a parent to an educator, containing session count, rate, and child reference
- **Schedule_Config**: A JSONB field on `educator_profiles` containing `available_days` (array of weekday names) and `session_start_time` (time string)
- **Notification_Feed**: The React Native component (`NotificationFeed.tsx`) that displays in-app notifications to users
- **Consent_Acknowledgment**: A UI element that explicitly informs an educator when a parent has granted them consent to access child data

## Requirements

### Requirement 1: Token Refresh and Session Persistence

**User Story:** As a parent or educator, I want my app session to remain active beyond 1 hour without requiring re-login, so that I can use the app continuously without interruption.

#### Acceptance Criteria

1. WHEN the Auth_Store receives authentication tokens from `verify-otp`, THE Auth_Store SHALL persist both the access_token and the refresh_token to SecureStore
2. WHEN the access_token is within 5 minutes of expiry, THE Auth_Store SHALL use the refresh_token to obtain a new access_token from Supabase Auth
3. WHEN a refresh_token exchange succeeds, THE Auth_Store SHALL update both the stored access_token and refresh_token with the new values
4. IF a refresh_token exchange fails with an unrecoverable error (e.g., refresh token revoked or expired), THEN THE Auth_Store SHALL clear all stored credentials and navigate the user to the login screen
5. WHEN the app is launched and a stored refresh_token exists, THE Auth_Store SHALL attempt to refresh the session before making any API calls
6. WHILE the token refresh is in progress, THE Auth_Store SHALL queue or defer any outgoing API calls until the new token is available

### Requirement 2: Payment Order Status Validation

**User Story:** As a parent, I want to pay for proposals that both parties have accepted (including counter-accepted proposals), so that I can complete the booking without being incorrectly rejected.

#### Acceptance Criteria

1. WHEN a parent requests a payment link for a proposal with status `accepted`, THE Payment_Order_Function SHALL create the Razorpay Payment Link
2. WHEN a parent requests a payment link for a proposal with status `parent_accepted`, THE Payment_Order_Function SHALL create the Razorpay Payment Link
3. WHEN a parent requests a payment link for a proposal with any status other than `accepted` or `parent_accepted`, THE Payment_Order_Function SHALL reject the request with a 422 status and a descriptive error message

### Requirement 3: Webhook Proposal Payment Variable Fix

**User Story:** As a system operator, I want the Razorpay webhook to correctly process proposal payments, so that proposals are marked as paid and educators are notified.

#### Acceptance Criteria

1. WHEN the Webhook_Handler function `handleProposalPayment` is invoked with a `paymentId` and `proposalId`, THE Webhook_Handler SHALL use the `proposalId` parameter directly to update the `session_proposals` table
2. WHEN the Webhook_Handler function `handleProposalPayment` is invoked with a `paymentId` and `proposalId`, THE Webhook_Handler SHALL use the `proposalId` parameter directly to query proposal details for notification
3. WHEN the Webhook_Handler function `handleProposalPayment` is invoked with a `paymentId` and `proposalId`, THE Webhook_Handler SHALL use the `proposalId` parameter directly in notification metadata

### Requirement 4: Session Generation After Payment

**User Story:** As a parent, I want individual session records to be automatically created after I pay for a proposal, so that both the educator and I can see scheduled sessions in the Classroom and Calendar views.

#### Acceptance Criteria

1. WHEN a proposal status transitions to `paid`, THE Session_Generator SHALL create individual session records in the `sessions` table equal to the proposal's `total_sessions` count
2. WHEN generating sessions, THE Session_Generator SHALL assign each session's `special_educator_id`, `parent_id`, and `child_id` from the paid proposal data
3. WHEN generating sessions, THE Session_Generator SHALL schedule sessions on the educator's available days (from `schedule_config.available_days`) starting from the next available day after payment
4. WHEN generating sessions, THE Session_Generator SHALL set each session's `start_time` using the educator's `schedule_config.session_start_time` and calculate `end_time` as start_time plus 45 minutes
5. WHEN generating sessions, THE Session_Generator SHALL distribute sessions across weeks according to the proposal's `sessions_per_week` value
6. THE Session_Generator SHALL set each created session's initial status to `accepted`
7. IF the educator's `schedule_config` is missing or incomplete, THEN THE Session_Generator SHALL create sessions with null start/end times and status `proposed`, and notify the educator to set their schedule

### Requirement 5: Educator Schedule Display on Profile

**User Story:** As a parent, I want to see an educator's available days and session times on their profile page, so that I can assess schedule compatibility before proposing sessions.

#### Acceptance Criteria

1. WHEN fetching educator profiles for the search listing, THE search screen SHALL include `schedule_config` in the query to `educator_profiles`
2. WHEN navigating to an educator's profile page, THE search screen SHALL pass the `schedule_config` data as a route parameter
3. WHEN displaying an educator's profile, THE educator profile screen SHALL render the educator's available days from `schedule_config.available_days`
4. WHEN displaying an educator's profile, THE educator profile screen SHALL render the educator's session start time from `schedule_config.session_start_time`
5. IF an educator has no `schedule_config` set, THEN THE educator profile screen SHALL display "Schedule not set" in the availability section

### Requirement 6: Notification Navigation and Real-Time Refresh

**User Story:** As a parent or educator, I want to tap a notification and be taken directly to the relevant proposal or session, so that I can act on updates without manual navigation.

#### Acceptance Criteria

1. WHEN a user taps a notification with `metadata.proposal_id`, THE Notification_Feed SHALL navigate the user to the proposals view
2. WHEN a proposal status changes (accepted, paid, countered), THE proposals view SHALL automatically refresh its data within 30 seconds without manual pull-to-refresh
3. WHEN the parent's proposals view receives focus (tab switch or navigation), THE proposals view SHALL fetch fresh proposal data from the server
4. IF a notification's `metadata` does not contain a recognizable navigation target, THEN THE Notification_Feed SHALL mark the notification as read without navigating

### Requirement 7: Educator Consent Acknowledgment UI

**User Story:** As an educator, I want to see an explicit acknowledgment when a parent grants me consent to access their child's data, so that I am aware of my access rights and responsibilities.

#### Acceptance Criteria

1. WHEN an educator's proposal is accepted (triggering auto-consent), THE system SHALL create a notification of type `consent_granted` for the educator
2. WHEN the educator views a `consent_granted` notification, THE Notification_Feed SHALL display the child's name (decrypted), the consent scope, and the consent expiry date
3. WHEN the educator taps a `consent_granted` notification, THE Notification_Feed SHALL navigate to the My Clients screen
4. THE Consent_Acknowledgment notification body SHALL include text indicating that the educator now has time-bound access to the specified child's data for the stated purpose

## Implementation Order Constraints

- Requirements 1, 2, and 3 are independent fixes and MAY be implemented in parallel
- Requirement 4 depends on Requirement 3 (webhook must correctly mark proposals as paid before session generation can trigger)
- Requirements 5, 6, and 7 are UI/UX improvements and MAY be implemented in parallel after Requirements 1-4 are complete
- The recommended order is: 1 → 2 → 3 → 4 → 5 → 6 → 7
