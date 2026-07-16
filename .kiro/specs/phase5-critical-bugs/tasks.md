# Implementation Plan: Phase 5 Critical Bugs

## Overview

This plan addresses 7 critical bugs blocking the parent-educator booking lifecycle in V-SPED 1.0. Tasks are ordered by dependency: webhook fix (Task 1) enables session generation (Task 4), which unblocks UI tasks (5-7). Auth and payment fixes (Tasks 2-3) are independent.

## Tasks

- [x] 1. Fix webhook undefined variable in handleProposalPayment (Bug 3)
  - [x] 1.1 In `supabase/functions/razorpay-webhook/index.ts`, replace all 4 occurrences of `proposalPayment.proposal_id` with the function parameter `proposalId` inside `handleProposalPayment`
  - [x] 1.2 Verify the `.eq("id", proposalId)` fix on the `session_proposals` update query, the `session_proposals` select query, the notification metadata insert, and the console.log statement
  - [x] 1.3 Add the `generate-sessions` invocation call at the end of `handleProposalPayment` using `fetch` with service role key authorization
  - [x] 1.4 Deploy the updated `razorpay-webhook` edge function via `supabase functions deploy razorpay-webhook`
  - [x] 1.5 Test with a simulated `payment.captured` webhook event to confirm proposal transitions to `paid` without ReferenceError

- [x] 2. Fix payment order status validation for parent_accepted (Bug 2)
  - [x] 2.1 In `supabase/functions/create-payment-order/index.ts` line 72, replace `if (proposal.status !== "accepted")` with `if (!['accepted', 'parent_accepted'].includes(proposal.status))`
  - [x] 2.2 Verify the error message remains "Proposal must be accepted before payment" for rejected statuses
  - [x] 2.3 Deploy the updated `create-payment-order` edge function via `supabase functions deploy create-payment-order`
  - [x] 2.4 Test by calling create-payment-order with a `parent_accepted` proposal and confirm a checkout_url is returned

- [x] 3. Add token refresh and session persistence to authStore (Bug 1)
  - [x] 3.1 Add `refreshToken: string | null` and `isRefreshing: boolean` state fields to the AuthState interface in `mobile/store/authStore.ts`
  - [x] 3.2 Add the `refreshSession` action that calls `supabase.auth.refreshSession`, persists new tokens to SecureStore, and handles failures by triggering logout
  - [x] 3.3 Modify `setAuth` to accept and persist `refreshToken` as the third parameter, and update `logout` to delete the `refresh_token` key from SecureStore
  - [x] 3.4 Modify `loadFromSecureStore` to read `refresh_token` from SecureStore and call `refreshSession` on app launch if a refresh token exists
  - [x] 3.5 Update callers in `mobile/app/auth/otp-verify.tsx` and `mobile/app/auth/pin-entry.tsx` to pass `data.refresh_token` as the third argument to `setAuth`
  - [x] 3.6 Add a 55-minute interval timer and `AppState` foreground listener in `mobile/app/_layout.tsx` to proactively call `refreshSession`

- [x] 4. Create generate-sessions edge function (Bug 4) [depends on: 1]
  - [x] 4.1 Create `supabase/functions/generate-sessions/index.ts` with service-role-key authorization check and `proposal_id` body parsing
  - [x] 4.2 Implement the proposal fetch (from `session_proposals` where status='paid') and educator schedule fetch (from `educator_profiles.schedule_config`)
  - [x] 4.3 Implement the `generateSessionDates` algorithm that distributes sessions across available days respecting `sessions_per_week` cap and 45-minute duration
  - [x] 4.4 Implement the fallback path: when `schedule_config` is null or `available_days` is empty, create placeholder sessions with null times and status `proposed`, and insert a `schedule_needed` notification for the educator
  - [x] 4.5 Add bulk insert of generated session rows into the `sessions` table and return `{ success: true, sessions_created, scheduled }` response
  - [x] 4.6 Create `supabase/functions/generate-sessions/deno.json` with the standard Supabase function config
  - [x] 4.7 Deploy via `supabase functions deploy generate-sessions` and test end-to-end with a paid proposal

- [x] 5. Display educator schedule on profile page (Bug 5) [depends on: 4]
  - [x] 5.1 In `mobile/app/dashboard/search.tsx`, add `schedule_config` to the Supabase query `.select()` call and update the `Educator` interface to include `schedule_config`
  - [x] 5.2 In `mobile/app/dashboard/search.tsx`, pass `schedule_config: JSON.stringify(item.schedule_config)` in the route params when navigating to educator-profile
  - [x] 5.3 In `mobile/app/educator-profile.tsx`, parse `schedule_config` from route params via `useLocalSearchParams` and `JSON.parse`
  - [x] 5.4 In `mobile/app/educator-profile.tsx`, add an Availability UI section that renders available days as chips and session start time, or "Schedule not set" when schedule_config is null/empty

- [x] 6. Add notification navigation and auto-refresh (Bug 6) [depends on: 4]
  - [x] 6.1 In `mobile/components/NotificationFeed.tsx`, import `router` from `expo-router` and replace `handleNotificationPress` to navigate to `/dashboard/parent` when `metadata.proposal_id` exists, or `/dashboard/educator` for `consent_granted` type
  - [x] 6.2 In `mobile/components/NotificationFeed.tsx`, add a 30-second `setInterval` polling loop to call `fetchNotifications` automatically
  - [x] 6.3 In `mobile/components/ParentProposalsView.tsx`, add `useFocusEffect` from `expo-router` to call `fetchProposals` on screen focus, and add a 30-second interval for auto-refresh
  - [x] 6.4 In `mobile/components/EducatorProposalsInbox.tsx`, add the same focus-refresh and 30-second interval polling pattern as ParentProposalsView

- [x] 7. Add educator consent acknowledgment notification (Bug 7) [depends on: 4]
  - [x] 7.1 In `supabase/functions/respond-proposal/index.ts`, add a notification insert for the educator with type `consent_granted` after the consent grant is created in `handleAccept`, ensuring the body contains NO child PII (only generic "the child's data" text and opaque UUIDs in metadata)
  - [x] 7.2 Deploy the updated `respond-proposal` edge function via `supabase functions deploy respond-proposal`
  - [x] 7.3 In `mobile/components/NotificationFeed.tsx`, enhance `renderNotificationItem` to detect `consent_granted` type and display consent scope from `metadata.consent_scope` with a styled badge
  - [x] 7.4 In `mobile/components/NotificationFeed.tsx`, add a `consentScopeText` style and ensure the navigation handler routes `consent_granted` taps to the educator dashboard (My Clients view)

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": [1, 2, 3],
      "description": "Independent fixes: webhook variable, payment status, token refresh"
    },
    {
      "wave": 2,
      "tasks": [4],
      "description": "Session generation edge function (depends on Task 1 webhook fix)"
    },
    {
      "wave": 3,
      "tasks": [5, 6, 7],
      "description": "UI improvements: schedule display, notification nav, consent notification (depend on Task 4)"
    }
  ]
}
```

## Notes

- No database migrations are required — the `sessions` table already has the needed columns
- Tasks 1, 2, 3 can be executed in parallel since they have no interdependencies
- Tasks 5, 6, 7 can be executed in parallel after Task 4 completes
- Recommended deployment order: Task 1 → Task 2 → Task 4 → mobile update bundling Tasks 3, 5, 6, 7
- All edge function deploys use `supabase functions deploy <function-name>` from the project root
