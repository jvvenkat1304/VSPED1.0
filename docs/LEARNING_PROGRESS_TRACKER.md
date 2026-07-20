# V-SPED Learning App — Progress Tracker

**Goal:** A consumer-acquisition learning app (CBSE/ICSE, Grades 1-3 first) with adaptive assessment, to build a parent+child user base before the main educator marketplace launches.
**Branch:** `Learning-app-version` · Folder: `K:\V-SPED\VSPED1.0-learning\`
**Last Updated:** July 17, 2026

> Companion docs: `LEARNING_APP_VISION.md` (full vision & decisions), `.kiro/specs/learning-modules/`, `.kiro/specs/adaptive-assessment-engine/`

---

## Overall Progress: █░░░░░░░░░░░░░░░ ~8% (design phase)

| Phase | Progress | Status |
|-------|----------|--------|
| Phase 0: Strategy & branch setup | 100% | ✅ DONE |
| Phase 1: Specs & design | 40% | 🔄 Designs done, requirements/tasks pending |
| Phase 2: Database & schema | 0% | ⬜ Not started |
| Phase 3: Learning modules (content viewer) | 0% | ⬜ Not started |
| Phase 4: Adaptive assessment engine | 0% | ⬜ Not started |
| Phase 5: Content authoring (G1-3) | 0% | ⬜ Not started |
| Phase 6: Parent dashboard & insights | 0% | ⬜ Not started |
| Phase 7: E2E testing | 0% | ⬜ Not started |
| Phase 8: Beta launch | 0% | ⬜ Not started |

---

## Phase 0: Strategy & Branch Setup ✅ COMPLETE (July 17)

| Task | Status |
|------|--------|
| Board decision: learning app as top-of-funnel consumer version | ✅ |
| Git branch `Learning-app-version` forked from main (656c525) | ✅ |
| Separate local folder `VSPED1.0-learning` (dual Expo Go) | ✅ |
| Vision documented (`LEARNING_APP_VISION.md`) | ✅ |
| Steering files inherited (child-privacy, ponytail, sonarqube) | ✅ |

---

## Phase 1: Specs & Design 🔄 IN PROGRESS

| Task | Status | Notes |
|------|--------|-------|
| `learning-modules` design.md | ✅ | Content viewer, catalog, WebView bridge, progress |
| `adaptive-assessment-engine` design.md | ✅ | 3 engines, concept DAG, templated question bank |
| Revised learning-modules to remove in-module quiz | ✅ | Assessment now app-native; clean table split |
| NIPUN Bharat framework research | ✅ | Components + G1-3 progression documented |
| `learning-modules` requirements.md | ⬜ | Next |
| `learning-modules` tasks.md | ⬜ | |
| `adaptive-assessment-engine` requirements.md | ⬜ | |
| `adaptive-assessment-engine` tasks.md | ⬜ | |

---

## Phase 2: Database & Schema ⬜ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| Decide DB strategy (clone vs. shared w/ unused educator tables) | ⬜ | Open question |
| Migration: subjects, modules, child_module_progress + RLS | ⬜ | learning-modules spec |
| Migration: concepts, concept_edges + RLS | ⬜ | assessment spec |
| Migration: question_templates, question_responses, child_concept_mastery, question_instances + RLS | ⬜ | assessment spec |
| Supabase Storage bucket `modules` | ⬜ | |
| Seed subjects (Math, English, EVS, Hindi) | ⬜ | |

---

## Phase 3: Learning Modules — Content Viewer ⬜ NOT STARTED

| Task | Status |
|------|--------|
| Catalog screen (subject → grade → chapter) | ⬜ |
| Zustand learningStore | ⬜ |
| Module viewer screen + react-native-webview | ⬜ |
| postMessage bridge (host-side) | ⬜ |
| Progress persistence service (debounced) | ⬜ |
| Prerequisite unlock logic | ⬜ |
| `validate-module.mjs` content validator | ⬜ |
| Seed reference module (Class 8 Math Ch.1 adapted, + G1-3 samples) | ⬜ |
| Hand-off hook: activities_completed → assessment engine | ⬜ |

---

## Phase 4: Adaptive Assessment Engine (CORE IP) ⬜ NOT STARTED

| Task | Status |
|------|--------|
| Concept DAG seed for G1-3 (Math first) | ⬜ |
| Question template schema + param instantiation (safe evaluator) | ⬜ |
| Edge Function: `select-questions` (adaptive selection + instantiation) | ⬜ |
| Edge Function: `submit-response` (validate, 3D score, persist, mastery update) | ⬜ |
| Edge Function: `compute-ceiling` (per-chapter recompute + insights) | ⬜ |
| Scoring Engine | ⬜ |
| Assessment Engine (3D: difficulty × time × understanding + guess detection) | ⬜ |
| Progress Engine (mastery, backward-trace, ceiling, suggestions) | ⬜ |
| Quiz runner screen (app-native MCQ) | ⬜ |
| Anti-memorization verification (fresh params per attempt) | ⬜ |

---

## Phase 5: Content Authoring (Grades 1-3) ⬜ NOT STARTED

| Task | Status | Notes |
|------|--------|-------|
| Gather CBSE + ICSE syllabus for G1-3 | 🔄 | Karan's team working on it |
| Map NIPUN Lakshyas → concepts per subject | ⬜ | |
| Difficulty rubric from NCERT analysis | ⬜ | |
| Author modules: Math G1-3 | ⬜ | |
| Author modules: English G1-3 | ⬜ | |
| Author modules: EVS G1-3 | ⬜ | |
| Author modules: Hindi G1-3 | ⬜ | |
| Build question template banks per concept (multi-difficulty) | ⬜ | |
| Distractor design (misconception-based) | ⬜ | |

---

## Phase 6: Parent Dashboard & Insights ⬜ NOT STARTED

| Task | Status |
|------|--------|
| Module progress dashboard | ⬜ |
| Assessment insights view (ceiling, strengths, weaknesses, suggestions) | ⬜ |
| Learning velocity display (grasping faster/slower) | ⬜ |

---

## Phase 7: E2E Testing ⬜ NOT STARTED

| Task | Status |
|------|--------|
| Full flow: catalog → module → activities → assessment → insights | ⬜ |
| RLS cross-family isolation tests | ⬜ |
| Anti-memorization property test (no repeat questions) | ⬜ |
| Backward-trace correctness test | ⬜ |
| SonarQube scan of all new code | ⬜ |

---

## Phase 8: Beta Launch ⬜ NOT STARTED

| Task | Status |
|------|--------|
| EAS build | ⬜ |
| Onboarding flow (reuse phone OTP + PIN) | ⬜ |
| App store listing (beta) | ⬜ |
| Acquisition funnel metrics | ⬜ |

---

## Deferred to Main App (NOT in this version)

- Special-education modules & special assessment
- Educator marketplace, sessions, video, consent-request flow
- Smartpen hardware (live note ↔ video-recording sync)
- Playschool / younger-than-Grade-1 support
- Grades 4-10 content (structure supports; content later), expansion to Grade 12

---

## Key Decisions Log (quick reference)

| Decision | Choice |
|----------|--------|
| Question format v1 | MCQ only |
| Question storage | Server-side (Supabase) |
| Anti-memorization | Parameterized templates, fresh per attempt |
| Quiz location | App-native (IP protection), NOT in module HTML |
| Assessment cadence | Continuous; ceiling recompute per chapter; not parent-gated |
| Starting grades | 1, 2, 3 together |
| Subjects | Math, English, EVS, Hindi |
| Boards | CBSE + ICSE |
| Framework | NIPUN Bharat + NCERT |
| Child model | Profile row owned by parent_id (reuse children table) |
| Concept model | Cross-grade prerequisite DAG w/ backward-trace |
| DB | Same DB, strategy TBD (clone vs shared) |
