# V-SPED Progress Tracker

**Goal:** A working, functioning app ready for initial customers and funding demo.
**Last Updated:** July 5, 2026

---

## Overall Progress: ██████░░░░░░░░░░ ~40%

| Milestone | Progress | Status |
|-----------|----------|--------|
| Backend Core | 100% | ✅ DONE |
| Security & Compliance | 100% | ✅ DONE |
| Flutter Frontend | 0% | ⬜ NOT STARTED |
| Razorpay Live Integration | 0% | ⬜ NOT STARTED |
| VideoSDK Integration | 0% | ⬜ NOT STARTED |
| End-to-End Testing | 20% | 🔄 Backend tested; full-flow pending |
| App Store Deployment | 0% | ⬜ NOT STARTED |
| Demo Polish & Branding | 0% | ⬜ NOT STARTED |

---

## Phase 1: Backend Core ✅ COMPLETE (June 13 – July 5)

| Task | Status |
|------|--------|
| Database schema (26 tables) | ✅ |
| RLS security policies (60+) | ✅ |
| Auth: Phone OTP + PIN + lockout | ✅ Tested |
| Auth: Send SMS Hook (Supabase → MSG91) | ✅ Tested |
| Consent system: encrypted child data | ✅ Tested |
| Consent: request/respond/revoke flow | ✅ Tested |
| Educator profiles + RCI verification | ✅ Deployed |
| Educator subscriptions (placeholder pricing) | ✅ Deployed |
| Session scheduling (propose/respond) | ✅ Deployed |
| Rate limiting (3 OTP/5min) | ✅ Active |
| Security: 37/37 core + 7/7 advanced tests PASS | ✅ |
| Supply chain: imports pinned to exact versions | ✅ |
| DPDP privacy policy drafted | ✅ |
| Immutable child-data steering rule | ✅ Active |

---

## Phase 2: Flutter Frontend (NEXT — estimated 2-3 weeks)

| Task | Status | Blocks |
|------|--------|--------|
| Flutter SDK installed on dev machine | ⬜ | — |
| FlutterFlow code exported to `frontend/` | ⬜ | May need paid FF plan |
| Brand assets (logo, colors, fonts) | ⬜ | User to provide or pull from vathsalya.co.in |
| **Auth screens** | | |
| → StarterPage (phone entry) | ⬜ | — |
| → OTP verification page | ⬜ | — |
| → PIN creation page | ⬜ | — |
| → PIN entry page (returning user) | ⬜ | — |
| **Parent screens** | | |
| → Parent dashboard (home) | ⬜ | — |
| → Child profile management | ⬜ | — |
| → Educator discovery/search | ⬜ | — |
| → Educator profile view | ⬜ | — |
| → Consent management (who has access) | ⬜ | — |
| → Session calendar + notifications | ⬜ | — |
| **Educator screens** | | |
| → Educator onboarding (profile + RCI) | ⬜ | — |
| → Subscription checkout | ⬜ | Razorpay (can stub) |
| → Client (child) list | ⬜ | — |
| → Session management (propose/view) | ⬜ | — |
| → Consent request submission | ⬜ | — |
| **Shared** | | |
| → Role-based routing (parent vs educator) | ⬜ | — |
| → Navigation shell + bottom nav | ⬜ | — |
| → Error handling + loading states | ⬜ | — |
| → Responsive design (phone + tablet) | ⬜ | — |

---

## Phase 3: Razorpay Live Integration (estimated 1 week)

| Task | Status | Notes |
|------|--------|-------|
| Razorpay account created & verified | ⬜ | Needs business PAN, bank account |
| Subscription plans created in Razorpay dashboard | ⬜ | Basic ₹2,999/yr, Premium ₹5,999/yr |
| `subscribe-educator` updated with real Razorpay API | ⬜ | Currently placeholder (direct-activate) |
| Payment webhook edge function | ⬜ | Confirms payment → activates subscription |
| Razorpay checkout in Flutter (educator flow) | ⬜ | Uses Razorpay Flutter SDK |
| Test: full subscription flow end-to-end | ⬜ | Test mode → live mode |

---

## Phase 4: VideoSDK Integration (estimated 1 week)

| Task | Status | Notes |
|------|--------|-------|
| VideoSDK account created | ⬜ | |
| API key set as Supabase secret | ⬜ | |
| `start-session` edge function (creates room) | ⬜ | Generates videosdk_room_id |
| Flutter VideoSDK widget integration | ⬜ | 1:1 and group (up to 4) |
| Session lifecycle: join → in-progress → complete | ⬜ | |
| Recording consent prompt (UI only, storage deferred) | ⬜ | Feature paused per meeting decision |
| Test: full video session flow | ⬜ | |

---

## Phase 5: End-to-End Testing (estimated 3-5 days)

| Task | Status | Notes |
|------|--------|-------|
| Complete user journey: parent sign-up → find educator → consent → book → session | ⬜ | |
| Complete user journey: educator sign-up → profile → RCI → subscribe → get clients | ⬜ | |
| Edge cases: expired consent, lockout recovery, bad network | ⬜ | |
| Cross-device testing (Android + iOS + web) | ⬜ | |
| Performance under load (10 concurrent sessions) | ⬜ | |
| Regression run (all 44 security tests) | ⬜ | Must still pass |

---

## Phase 6: Demo Polish & App Store Deployment (estimated 1 week)

| Task | Status | Notes |
|------|--------|-------|
| Branding pass (logo, splash screen, app icon) | ⬜ | |
| Onboarding tutorial / walkthrough | ⬜ | First-time user guidance |
| Loading/empty states with branded illustrations | ⬜ | |
| Error messages human-friendly | ⬜ | |
| Demo script (for funding pitch) | ⬜ | Prepared user journey showing key features |
| Android APK build | ⬜ | |
| iOS build (requires Apple Developer account) | ⬜ | |
| Web build (for quick demos, no app store needed) | ⬜ | Flutter web → hosted on Vercel/Firebase |
| Google Play Store submission | ⬜ | |
| Apple App Store submission | ⬜ | |

---

## Blockers & Dependencies

| Item | Blocker for | Status |
|------|-------------|--------|
| Flutter SDK on dev machine | Phase 2 start | Not installed yet |
| Brand assets (logo/colors/fonts) | Phase 2 design | Pending from user |
| Razorpay business account | Phase 3 | Not created yet |
| VideoSDK account | Phase 4 | Not created yet |
| Apple Developer account ($99/yr) | Phase 6 iOS | Not confirmed |
| Exact subscription pricing (from management) | Phase 3 go-live | Placeholder set, final TBD |
| Terms of Service / Privacy Policy (legal review) | Phase 6 app store | Draft ready, legal review pending |

---

## Timeline Estimate (aggressive but realistic)

| Phase | Duration | Target |
|-------|----------|--------|
| Phase 2: Frontend | 2-3 weeks | Mid-to-late July 2026 |
| Phase 3: Razorpay | 1 week | Late July |
| Phase 4: VideoSDK | 1 week | Early August |
| Phase 5: E2E Testing | 3-5 days | First week of August |
| Phase 6: Polish + Deploy | 1 week | Mid August |
| **MVP ready for customers + demo** | | **~August 15, 2026** |

---

## What "Done" Looks Like (Demo-Ready Criteria)

A parent can:
- [x] Sign up with phone
- [ ] Create child profile (encrypted)
- [ ] Find and view RCI-verified educators
- [ ] Educator requests data consent → parent approves
- [ ] Book a session
- [ ] Join a video session
- [ ] See child's progress (only they can see it)
- [ ] Revoke consent instantly

An educator can:
- [x] Sign up with phone
- [ ] Complete profile with RCI number
- [ ] Get verified
- [ ] Subscribe (pay via Razorpay)
- [ ] Appear in parent search
- [ ] Request consent → propose sessions
- [ ] Conduct video sessions
- [ ] Add session notes (encrypted)

For the funding demo:
- [ ] Polished UI with Vathsalya branding
- [ ] Smooth 3-minute walkthrough (both user types)
- [ ] Security talking point: "DPDP-compliant, field-level encryption, 44 automated security tests pass"
- [ ] Web build for instant demo (no app install needed)
