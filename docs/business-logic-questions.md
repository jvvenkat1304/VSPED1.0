# V-SPED — Business Logic Clarifications

Prepared for management review. Updated July 3, 2026 after meeting with Venkat.

Legend: ✅ **ANSWERED** | ⚠️ **PARTIALLY ANSWERED** | ❓ **STILL OPEN** | ~~REMOVED~~ (no longer relevant)

---

## 1. Roles, Onboarding & Verification

### 1.1 Which roles can self-register, and which are invite-only? ✅ ANSWERED
- **Parent** — self-registers (phone OTP + PIN).
- **Special Educator** — self-registers as a separate profile (subscription-based access).
- **School Admin** — created via sales/contract (not self-serve; discussed but not explicitly confirmed as self-serve).
- **School Teacher** — **invite-only**. The school admin adds them and generates credentials (employee ID / token-based login, NOT phone OTP). If a teacher forgets their token, they go to the admin to get it re-issued.
- **Admin (platform)** — there is NO traditional admin login/dashboard role. Platform owners (you) access the database directly via internal function calls and debugging tools, constrained by privacy rules. No admin UI needed.
- **Manufacturer** — removed for now. "I don't know what role that fellow will have. Will be covered later." — Venkat.

### 1.2 How does a user become an educator or school? ✅ ANSWERED
- Users don't "become" an educator from a parent account. **Educator is a separate profile** — they sign up as an educator independently. If a special educator also wants to be a parent (for their own child), they use the same mobile number and the app treats it as a parent login (different from school teacher login which uses employee credentials).
- Schools are onboarded via contract/sales — school admin is set up, admin adds teachers via generated credentials.

### 1.3 Educator verification — who reviews, criteria? ✅ ANSWERED
- **RCI-certified special educators** — verification is automated. Educator provides their RCI certificate number; the system queries the RCI portal website to confirm the person exists. Verified = can offer sessions to neurodivergent children.
- **Non-RCI educators (tutors, general ed)** — they expose their own credentials on their profile. The platform does NOT verify them; parents assess at their own discretion.
- **Key decision:** The platform initially targets **neurodivergent children only** (special education via RCI-certified educators). General tuition/neurotypical education is NOT in scope for V1 — "we don't want to compete in that space."
- The games/assessment (NeuroBridge) are for neurotypical children as B2C, but private educator marketplace is RCI-only.

### 1.4 Can one person hold multiple roles? ✅ ANSWERED
- **Not exactly "multiple roles" — separate profiles.** A special educator who wants to add their own child doesn't need a parent profile; they can add a child directly from their educator account. A teacher who is also a parent uses their personal phone number to log in as a parent (different login path than their school employee-ID login). These are effectively separate sessions, not a "role-switcher."

### 1.5 Is the manufacturer role internal/partner-only? ⚠️ PARTIALLY ANSWERED
- **Removed for now.** Venkat explicitly said to remove manufacturer from current scope. Will be revisited later.

---

## 2. Parents (B2C) — Discovery, Booking, Sessions

### 2.1 How do parents find educators? ✅ ANSWERED
- **Search/browse marketplace** with filters:
  - Subjects/skills (primary filter)
  - Language
  - Distance (relevant because offline sessions are possible — "it does become a tuition facilitator")
  - NOT price (price isn't a search filter — subscription model means no per-session fee visible)

### 2.2 Do parents book a package or individual sessions? ✅ ANSWERED
- **Both are accessible.** The special educator defines their offerings:
  - A package = X number of sessions over Y period (e.g., "3 months, 3x/week")
  - Individual sessions also possible
  - The educator defines: subject name, number of sessions, schedule, and any discount for packages

### 2.3 Payment timing: per session, per package, or subscription? ✅ ANSWERED — KEY DECISION
- **SUBSCRIPTION MODEL for everyone.** This is the fundamental revenue model:
  - **Parents** pay a subscription fee to access the platform (NOT per-session fees to the platform)
  - **Special Educators** pay a subscription fee for a year (auto-pay)
  - **Schools** pay subscription fees
- The platform does NOT take a percentage cut of educator-parent transactions.
- How the parent pays the educator for sessions is **between them** — the platform provides the facility (scheduling, video, etc.) but does NOT intermediate the session payment.
- Razorpay logic becomes "far simpler" with subscriptions — just recurring subscription charges.

### 2.4 Cancellation/refund/reschedule policy? ⚠️ PARTIALLY ANSWERED
- If a parent doesn't pay the educator, the **educator can suspend the child** from their sessions.
- Educator must select a reason when suspending.
- A notification is sent to the parent explaining the suspension.
- Formal cancellation/refund policy for the platform subscription itself: not yet defined.

### 2.5 Educator availability? ✅ ANSWERED
- **Educator proposes times, parent accepts.** No calendar-slot picker on the platform.
- Educator creates scheduled sessions within the app; parent gets notified and accepts.
- Expectation: most scheduling details will be discussed on the phone between educator and parent; the app just formalises what they agree on.
- No platform-controlled availability grid.
- Free pricing: educators set their own rates. Platform does NOT do administrative pricing. "We are not the Government." — Venkat.

### 2.6 Multiple children per parent? ✅ ANSWERED
- **Yes, of course.** Each child has a unique Child ID. 2 parents can have 2+ child profiles. Child ID is the unique identifier in the system.
- The child is at the centre of the ecosystem — everything revolves around the child.

### 2.7 Session recording? ⚠️ PARTIALLY ANSWERED — DEFERRED
- Recording is **allowed with consent** (both parties must consent; a prompt is shown).
- Either party can stop recording at any point.
- Recording stored **on the device/disc** (NOT on platform servers — avoids storage/encryption cost).
- Consent for minors is complex (child can't consent; parent may not be supervising). **Feature PAUSED for now.** Will be revisited later.

---

## 3. Private Educators (B2B2C) — Marketplace & Token Economy

### 3.1–3.3 Token economy? ✅ ANSWERED — REPLACED BY SUBSCRIPTION
- **There is NO token economy.** The Upwork-style connects model is scrapped.
- Revenue model is **subscription-based**:
  - Educator pays annual subscription to be listed, access tools, video, scheduling.
  - By default, new educators get some free functionality to get started.
  - Paid subscription unlocks full features.
- This removes the complexity of token purchases, per-lead charges, etc.

### 3.4 Platform commission per booking? ✅ ANSWERED — NO
- **No percentage cut.** "I am not interested in per-session fees." — Venkat
- Only revenue from educators is the subscription fee.
- How the educator charges the parent is their own business.

### 3.5 Educator payouts? ✅ ANSWERED — NOT APPLICABLE
- The platform doesn't collect session payments, so there are no payouts to process.
- Educator-parent payment is direct/external (cash, UPI, whatever they arrange).

### 3.6 Can educators set their own prices? ✅ ANSWERED
- Yes, fully. The platform doesn't intermediate pricing. Educator defines their own packages/rates.

### 3.7 Reviews? ❓ STILL OPEN
Not discussed in this meeting.

---

## 4. Schools (B2B) — Licensing & Billing

### 4.1 Pricing model? ⚠️ PARTIALLY ANSWERED
- **Subscription-based** (confirmed).
- Exact pricing tiers/numbers not discussed.

### 4.2 Who pays what? ✅ ANSWERED
- **School pays platform subscription** for access.
- Parents do NOT pay the platform separately for school features — the school's subscription covers their students' access.

### 4.3 Billing cycle? ❓ STILL OPEN
Not discussed beyond "subscription."

### 4.4 School onboarding? ⚠️ PARTIALLY ANSWERED
- Admin adds teachers, teachers add students (via Excel upload or manual entry).
- Class data uploaded via Excel. Teachers assigned to classes (many-to-many).
- Implies a sales-led onboarding rather than self-serve, but not explicitly confirmed.

### 4.5 Limits per plan? ❓ STILL OPEN

---

## 5. Classrooms, Students & Parent Approval

### 5.1 Parent-approval / linking flow? ✅ ANSWERED — DETAILED
The flow is:
1. School admin uploads student data (name, parent mobile number) via Excel or manual entry.
2. System sends **WhatsApp/SMS invite** to parent's mobile number with a deep-link.
3. Parent downloads/opens app using that invite → child is **automatically synchronised** (linked to both the school record and the parent account).
4. If the invite fails (wrong number, unreachable), the **admin gets a flag** showing which parents weren't reached.
5. Once linked, the parent can see school updates, teacher notes, and progress data.
6. The teacher can see that the parent is connected (visibility confirmed).

**Key design decisions:**
- Duplicate children are acceptable temporarily (parent creates child independently, school also adds the same child). Linking happens via the invite flow.
- Parent mobile number is the linking identifier (uploaded by school in the Excel).
- No GPS/location-based school discovery (rejected as too complex / too many points of failure).

### 5.2 Can a student be in both school and private track? ✅ ANSWERED
- Yes — the child is at the centre. They can be in a school AND see a private special educator. These are independent relationships.
- Billing is separate: school subscription covers the school side; private educator sessions are between parent and educator.

### 5.3 Who owns student data? ✅ ANSWERED — CRITICAL PRIVACY DECISION
- **Encryption and privacy are mandatory.** Even the platform admin/owner CANNOT see individual child data (names, records, notes) without parental consent/token.
- Admin can only see:
  - Workflows and execution logs
  - Aggregate statistics (e.g., "percentage improvement across all users")
  - Encrypted references (Child ID — a 36-char string, not readable attributes)
- Individual records require the specific parent's consent/token to decrypt.
- This aligns with India DPDP Act requirements for children's data.
- Fields must be designed as "show" or "not show" at creation time — internal-only fields are never exposed externally.

### 5.4 Can a student exist without a parent account? ✅ ANSWERED
- Yes — when the school creates the student record (before the parent invite is sent/accepted). The student exists in the school context; the parent link comes later.

---

## 6. Educational Games & Content
❓ **NOT DISCUSSED** in this meeting. All sub-questions remain open.

---

## 7. Devices / Tablets / Manufacturer Royalties
~~**REMOVED FROM CURRENT SCOPE.**~~ Manufacturer role deferred. Will be revisited in a future phase.

---

## 8. Payments (Razorpay) — Cross-cutting

### 8.1 Currency, GST? ✅ ANSWERED
- INR for India. GST applies — likely 18% on subscription fees (to be confirmed with CA/tax advisor).
- Startups get income tax exemption but NOT GST exemption.
- GST ID will be needed once the company is formally registered.
- Invoice generation for subscriptions will be needed.

### 8.2 Merchant of record / payment split? ✅ ANSWERED — SIMPLIFIED
- **No marketplace split needed.** The platform only collects subscription fees directly from:
  - Parents (parent subscription)
  - Special Educators (educator subscription)
  - Schools (school subscription)
- No per-session payment routing, no payouts, no Razorpay Route complexity.
- Razorpay handles subscription auto-pay (UPI auto-debit). Razorpay's own APIs handle the legal notification requirements for recurring payments.

### 8.3 Refunds / chargebacks? ⚠️ PARTIALLY ANSWERED
- Razorpay API handles the subscription notification/compliance side.
- Custom refund policy for platform subscriptions: not yet defined.

### 8.4 Both educator and school billing via Razorpay? ✅ ANSWERED
- Yes — all three subscription types (parent, educator, school) go through Razorpay subscriptions.

---

## 9. Sessions / Video (VideoSDK)

### 9.1 1:1 only or group? ✅ ANSWERED
- **Both.** 1:1 is standard for special education sessions. Group sessions up to 1:4 (maybe up to 1:8) are possible.
- Subscription tiers may vary by session size: 1:1 at base subscription; group (1:4, 1:8) may incur incremental fees due to VideoSDK per-participant billing costs.
- The platform should let the educator choose session capacity, but VideoSDK costs scale with participant count — this needs to be reflected in subscription pricing tiers.

### 9.2 Recording? ⚠️ ANSWERED — DEFERRED
- Allowed with consent. Stored on device (NOT platform). Feature paused for now due to consent complexity with minors. Will be revisited.

### 9.3 Session lifecycle? ⚠️ PARTIALLY ANSWERED
- Calendar-based scheduling with reminders (24h, 12h, 6h before).
- Educator can suspend a child (choose reason → notification to parent).
- No per-session payment capture needed (subscription model).
- Review prompt after session: not discussed.

---

## 10. Notifications

### 10.1 Channels? ✅ ANSWERED
- **In-app notifications** (primary).
- **Push/banner notifications** for reminders.
- **SMS** for invite links (parent onboarding from school).
- Razorpay handles payment-related notifications for subscriptions.

### 10.2 Events? ⚠️ PARTIALLY ANSWERED
- Session reminders (24h, 12h, 6h — configurable flags on the calendar).
- Parent invite sent (with failure flags to admin).
- Child suspension notification to parent.
- Subscription/auto-pay notifications (handled by Razorpay).
- Other events: not enumerated.

### 10.3 Email provider? ✅ ANSWERED
- **AWS SES** (Amazon Simple Email Service). The eventual infrastructure target is AWS — Supabase handles the immediate RLS/auth layer, but the backend will eventually run on AWS. Email (for invoices, receipts, notifications to international users) goes through AWS SES.

---

## 11. Admin / Platform Operations

### 11.1 What can the admin do? ✅ ANSWERED — REFRAMED
- **There is no "admin dashboard" in the traditional sense.** The platform owner (Karan/Venkat) accesses the system via:
  - Internal function calls / debugging tools
  - Direct database access (encrypted, constrained by RLS and privacy rules)
  - Can see workflows, logs, execution history, aggregate stats
  - CANNOT see individual user PII (names, records, session notes) without the user's consent token
- This is a deliberate privacy-first design, not an oversight.

### 11.2 Dispute process? ❓ STILL OPEN

---

## 12. Compliance & Legal

### 12.1 Consent model for minors? ✅ ANSWERED
- **Full encryption.** Child data fields are encrypted at rest. Even the platform owner cannot access individual records without the parent's consent token.
- Fields designed as "internal only" at creation time — never exposed to any external interface.
- Aligns with India DPDP Act and COPPA-style protection.
- Referenced as "the level of security" needed for any app dealing with children.

### 12.2 Therapy/health progress data? ⚠️ PARTIALLY ANSWERED
- Implied sensitive — falls under the same encryption/consent rules as all child data.
- Explicit retention/deletion policy not discussed.

### 12.3 Terms of Service / Privacy Policy? ⚠️ PARTIALLY ANSWERED
- Venkat will draft DPDP-compliant policies and push them to the GitHub repo. These will then be used to generate RLS constraints and data-access rules.
- Kiro/Claude should generate the RLS policies compliant with DPDP once Venkat provides the policy document.
- Regression tests should be written for privacy rules (e.g., "educator cannot see child data without active consent; consent expires after the session term").

### 12.4 Consent model — detailed (from meeting v2) ✅ ANSWERED
- **Consent is time-bound.** A parent gives consent for a specific term (e.g., 6 months aligned with the session package). After that, consent expires automatically.
- **Consent is revocable.** Parent sees a list of who has access to their child's data, with a "revoke access" button.
- **Educator cannot download/export child data** beyond what's shown in-session. They can view derivative data (progress trends) but cannot extract raw records.
- **No screenshots during sessions** — platform should prevent/warn (though enforcement is technically hard, the policy should discourage it).
- **Aggregation is allowed without individual consent.** Platform can show aggregate statistics (e.g., "X% improvement across all users") without per-child consent.
- **Individual data requires active, informed consent** with clear duration and scope.
- **Different rules for NeuroBridge (healthcare/clinical):** will be stricter. Clinicians are busy; consent model will put the burden on the parent to manage/renew consent proactively.

---

## 13. Monetization Summary ✅ ANSWERED — SIMPLIFIED

| Stream | Model | Details |
|--------|-------|---------|
| Parent subscription | Recurring (monthly/annual TBD) | Access to platform, educator discovery, games, assessments, tracking |
| Educator subscription | Annual (auto-pay) | Listing, scheduling, video, portfolio, tools. Some free features to start. |
| School subscription | Recurring (details TBD) | Full platform access for teachers + students + parent visibility |
| ~~Manufacturer royalties~~ | ~~Deferred~~ | ~~Role removed from current scope~~ |
| ~~Custom game fees~~ | ~~Unknown~~ | ~~Not discussed~~ |
| ~~Platform commission on bookings~~ | ~~REMOVED~~ | ~~No per-session cut. Platform only collects subscriptions.~~ |
| ~~Token economy~~ | ~~REMOVED~~ | ~~Replaced by subscription model~~ |

**Revenue = subscriptions only.** No per-session cuts, no token sales, no marketplace splits. Drastically simpler Razorpay integration (just subscriptions).

---

## Summary of Impact on Architecture

Key decisions from these meetings that change the previously planned architecture:

1. **Token economy is dead.** Tables `educator_tokens` and `token_transactions` can be dropped or repurposed. No token purchase flow needed.
2. **No per-session payment routing.** `platform_transactions` table purpose changes — it only tracks subscription payments now, not per-booking fees.
3. **Manufacturer role removed.** `manufacturer_royalties` and `tablets` tables deferred. Manufacturer portal not needed.
4. **School teacher login is NOT phone OTP** — it's employee-ID/token based (generated by school admin). This requires a different auth path from the parent/educator phone-OTP flow.
5. **Admin role removed from app.** No admin dashboard UI. Platform access is via internal tools only.
6. **Privacy-first data model.** Child data must be encrypted at field level. Admin cannot see PII. Aggregate-only visibility for platform operators.
7. **Recording feature paused.** Don't build it yet.
8. **V1 = B2C only.** First version targets parents + RCI-certified special educators directly. School/B2B features deferred to V2 (requires more investment — devices, classroom infra).
9. **Educator verification via RCI portal.** Automated check against RCI website using certificate number. Non-RCI educators (general tutors) are out of scope for V1.
10. **Consent is time-bound and revocable.** Parent gives consent for a defined term (e.g., 6 months). Educator cannot export/download child data. Consent revocable at any time. Aggregation allowed without individual consent.
11. **Email via AWS SES.** Not MSG91 for email — AWS is the eventual infrastructure target.
12. **Educator sets scheduling.** No platform-controlled calendar slots. Educator proposes session times, parent accepts. Pricing is fully educator-controlled ("we are not the Government").
13. **Group sessions allowed (1:1 to 1:4, up to 1:8).** VideoSDK costs scale per participant — subscription tiers should reflect this.
14. **NeuroBridge shares a database** with V-SPED (for the special education side). The games/assessment data for neurodivergent children is accessible from both platforms via a common database. Exact architecture TBD.

---

## Still Open (for next meeting)

| # | Question | Urgency |
|---|----------|---------|
| 3.7 | Reviews: who, when, disputes | SOON |
| 4.1 | Exact subscription pricing tiers / numbers | BLOCKER (for Razorpay setup) |
| 4.3 | Billing cycle details (monthly vs annual) | SOON |
| 4.5 | Limits per plan (teacher seats, students) | SOON |
| 6.x | All games/content questions (who authors, IP, progress visibility) | SOON |
| 9.3 | Session lifecycle events (what triggers review prompt, etc.) | SOON |
| 11.2 | Dispute handling process | SOON |
| 12.2 | Data retention/deletion policy | SOON |

**New items from meeting v2:**
| # | Question | Urgency |
|---|----------|---------|
| NEW | V1 target: B2C only (parents + RCI educators). Schools (B2B) deferred to V2? Confirm. | BLOCKER |
| NEW | Subscription pricing: free tier for parents? What's included free vs paid? | BLOCKER |
| NEW | VideoSDK cost tiers: at what participant count do incremental fees kick in? | SOON |
| NEW | NeuroBridge database relationship to V-SPED — shared Supabase project or separate? | SOON |
| NEW | Venkat to push DPDP policy document to repo — timeline? | BLOCKER (for RLS rewrite) |
