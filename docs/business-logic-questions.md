# V-SPED — Business Logic Clarifications Needed

Prepared for management review. Answers to these unblock the backend service contracts and the feature-screen frontend. Grouped by area; each item is numbered for easy reply (e.g., "3.2: ...").

Legend: **[BLOCKER]** = needed before we can build that feature area; **[SOON]** = needed shortly after.

---

## 1. Roles, Onboarding & Verification
1.1 Which roles can self-register, and which are invite-only? (parent, special_educator, school_admin, school_teacher, admin, manufacturer) **[BLOCKER]**
1.2 Everyone signs up defaulting to `parent`. How does a user become an educator or school? Application + admin approval, or invite link? **[BLOCKER]**
1.3 Educator verification — who reviews, what criteria/documents (credentials, certifications), and what's the approval SLA? **[SOON]**
1.4 Can one person hold multiple roles (e.g., a parent who is also an educator)? If yes, how do they switch context? **[BLOCKER]**
1.5 Is the `manufacturer` role internal/partner-only, created manually by admin?

## 2. Parents (B2C) — Discovery, Booking, Sessions
2.1 How do parents find educators? Browse marketplace, search, filters (therapy type, price, rating, availability, language)? **[BLOCKER]**
2.2 Do parents book a **package/offering** or **individual sessions** (or both)? **[BLOCKER]**
2.3 Payment timing: pay per session, per package upfront, or subscription? **[BLOCKER]**
2.4 Cancellation/refund/reschedule policy and no-show handling? **[SOON]**
2.5 How is educator availability defined and shown (calendar, slots)? **[SOON]**
2.6 Multiple children per parent — is booking per-child? Is a child profile required before booking? **[BLOCKER]**
2.7 Session delivery via video — typical session length, and is recording allowed/stored? **[SOON]**

## 3. Private Educators (B2B2C) — Marketplace & Token Economy
3.1 **Define the token economy precisely.** What do tokens buy — responding to/unlocking parent leads, being listed, posting offerings, something else? (Upwork-"connects" style?) **[BLOCKER]**
3.2 Token price (token-to-INR rate) and purchase bundles? **[BLOCKER]**
3.3 Exactly **when are tokens consumed** (per lead, per booking, per offering posted)? **[BLOCKER]**
3.4 Platform commission: is there a % cut per booking in addition to tokens, or instead of? What %? **[BLOCKER]**
3.5 Educator payouts: schedule, method, minimum threshold, and who handles tax/TDS? **[SOON]**
3.6 Can educators set their own prices freely, or are there caps/approval? **[SOON]**
3.7 Reviews: who can leave them (only parents post-session?), can educators respond, and can reviews be removed/disputed? **[SOON]**

## 4. Schools (B2B) — Licensing & Billing
4.1 Pricing model: per-student/month, per-seat, tiered plans, or annual contract? Exact numbers? **[BLOCKER]**
4.2 Who pays what — school pays platform; do parents of school students also pay anything? **[BLOCKER]**
4.3 Billing cycle (monthly/annual), invoicing vs auto-charge, and payment method (Razorpay / bank transfer)? **[SOON]**
4.4 School onboarding: self-serve signup or sales-led with a contract? **[SOON]**
4.5 Limits per plan: number of teacher seats and students? **[SOON]**

## 5. Classrooms, Students & Parent Approval
5.1 Parent-approval flow when a school enrolls a student: exact steps, and what happens if the parent **declines or never responds** (timeout/auto-expire)? **[BLOCKER]**
5.2 Can a student be in **both** a school track and a private track ("blended")? If so, how do billing and data separate? **[BLOCKER]**
5.3 Who owns student data — the school or the parent — and what consent is captured? (minors; India DPDP Act) **[BLOCKER]**
5.4 Can a student exist without a linked parent account?

## 6. Educational Games & Content
6.1 Universal games — who authors them, and are they tied to therapy type / age / skill area? **[SOON]**
6.2 Custom games — who can request, who approves, pricing, turnaround, and who owns the IP? **[SOON]**
6.3 Game progress data — what's tracked, and who can see it (parent, teacher, educator, school)? **[SOON]**

## 7. Devices / Tablets / Manufacturer Royalties
7.1 How are tablets registered and tracked (at manufacture, at activation)? **[SOON]**
7.2 Royalty model: per device sold, per active device/month, or flat? What rate? **[SOON]**
7.3 How is an "active" device defined for royalty purposes? **[SOON]**
7.4 What analytics does the manufacturer portal show?

## 8. Payments (Razorpay) — Cross-cutting
8.1 Currency INR only? GST/tax and invoice requirements? **[BLOCKER]**
8.2 Who is the merchant of record — does the platform collect then split to educators/schools (Razorpay Route/marketplace split)? **[BLOCKER]**
8.3 Refunds, chargebacks, and failed-payment handling rules? **[SOON]**
8.4 Are both educator payouts and school billing handled through Razorpay? **[SOON]**

## 9. Sessions / Video (VideoSDK)
9.1 1:1 only, or group classroom sessions? Max participants? **[BLOCKER]**
9.2 Recording: allowed? Where stored? Consent for minors? **[SOON]**
9.3 Session lifecycle that drives the system (scheduled → join window → in-session → completed) — what events trigger payment capture, session-count increment, and the review prompt? **[BLOCKER]**

## 10. Notifications
10.1 Which channels — SMS (MSG91), email, push, in-app? **[BLOCKER]**
10.2 Which events must notify users (booking confirmed, session reminder, payment, enrollment approval request, review received, low token balance, etc.)? **[SOON]**
10.3 Email provider preference (none is set up yet)? **[SOON]**

## 11. Admin / Platform Operations
11.1 What can the platform admin do — verification queue, refunds, dispute resolution, content moderation, financial reports? **[SOON]**
11.2 Dispute process between parent and educator (e.g., disputed session/refund) — who decides and how? **[SOON]**

## 12. Compliance & Legal (minors + therapy/health data, India)
12.1 Consent model for minors' data under the India DPDP Act — verifiable parental consent required? **[BLOCKER]**
12.2 Is therapy/health-related progress data treated as sensitive, with a retention/deletion policy? **[SOON]**
12.3 Are Terms of Service and Privacy Policy finalized? (StarterPage already references "agree to our Terms.") **[SOON]**

## 13. Monetization Summary (confirm the 5 revenue streams + numbers)
13.1 Confirm each stream and its exact pricing: (a) platform commission on bookings, (b) educator token sales, (c) school subscriptions, (d) manufacturer royalties, (e) custom-game fees. **[BLOCKER]**

---

### Highest-priority blockers (if management can only answer a few first)
- 3.1 / 3.3 / 3.4 — token economy + commission (de `fines the whole educator marketplace)
- 4.1 / 4.2 — school pricing and who pays
- 2.2 / 2.3 — parent booking unit and payment timing
- 8.2 — payment split / merchant of record
- 5.1 / 5.3 / 12.1 — parent approval + minor data consent
