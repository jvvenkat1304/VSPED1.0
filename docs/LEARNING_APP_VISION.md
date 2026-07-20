# V-SPED Learning App — Vision & Decisions (Detailed Account)

**Last Updated:** July 17, 2026
**Branch:** `Learning-app-version` (Git) / folder `K:\V-SPED\VSPED1.0-learning\`
**Authority:** Karan Karthik Palukuri (primary decision-maker) + uncle (Venkat)
**Purpose:** This document is the authoritative, verbatim-detailed record of every decision, requirement, and nuance Karan specified for the Learning App Version. It exists so any fresh chat/context can fully reconstruct the vision without loss.

---

## 1. Strategic Context — Why This App Exists

The main V-SPED app (on the `main` branch) is a special-education marketplace: parents find RCI-verified special educators, propose sessions, pay, and attend video therapy sessions with a full consent/encryption model. That app is ~85% built.

**The problem with launching the main app first:** Special educators must be **onboarded manually** — each one verified, vetted, and brought onto the platform. This is a "very huge drag" — slow, high-friction, and it gates the whole platform's growth on a hard supply-side bottleneck.

**The board's solution (Karan + uncle):** Build a **different version of the app** — think of it as a **beta release / consumer-acquisition version** — that gets **parents and their children onto the platform first** through **Learning Modules and Assessment**, WITHOUT needing any educators at all.

**The sequencing strategy (butterfly rollout):**
1. **Phase A (this app):** Launch the learning version with CBSE/ICSE learning modules + adaptive assessment targeting the **average / neurotypical child**. Get a large base of parents + kids actively using it.
2. **Phase B (later):** Once enough users are on the platform, **roll out the main app** — introduce the special educators, the tuition/session marketplace, AND at that point introduce the **special assessment** and **special-education modules**, plus support for younger grades down to playschool.

This learning app is the **top of the funnel**. It builds the user base that the main app monetizes and serves later.

---

## 2. What the Learning App Is (Product Definition)

A **child-facing learning platform** based on the **CBSE and ICSE syllabuses**, targeting the **average / neurotypical kid** (explicitly distinct from the special-education modules & assessment, which are a different, later thing on the main app).

Two core pillars:

### Pillar 1: Learning Modules
- **Grade-wise.** Module 1 = Class 1 syllabus, and so on. Each module contains the needed syllabus for that grade per CBSE and ICSE.
- **Creative outlook and method of teaching** — the modules teach concepts in an engaging, discovery-driven way (not rote), so kids grasp concepts more easily and it **directly reflects in their academic performance**.
- Content is pulled/adapted directly from **CBSE and ICSE syllabus releases and their updates**. Karan's team is actively working on gathering those syllabuses (they are what's taught in schools).
- Reference standard: a validated interactive HTML module already built — `class8-math-ch1-square-and-cube_2.html` (Class 8 Math, "A Square and a Cube") — with parent-guidance sections, interactive discovery activities (locker puzzle, dot-grid, 3D cube), and originally an inline quiz. This is the template quality bar.

### Pillar 2: Learning Assessment (the adaptive test) — CORE IP
- A test the kid can take to see if he's **able to keep up with the syllabus of his grade** and **where exactly he stands in terms of his own academic ceiling**.
- The test is **adaptive** and **won't stop until the kid has achieved his ceiling** — it keeps probing until it finds the true limit of what the child can do.
- Explicitly **NOT a plain, boring, cut-copy-paste questionnaire.** It must be **clever, ever-evolving, and truly adaptive to the kid's level.**

> The learning assessment engine building "will come later" in terms of full depth, but the architecture and the engines are designed now.

---

## 3. The Question Bank Philosophy (verbatim intent)

- The question banks for each subject should **NOT be a static dump** — they must be **clever and ever-evolving.**
- **Anti-memorization is non-negotiable:** questions must NOT repeat such that a kid can just memorize the answer because he saw it before. That "will put us off" and produces **false data**. There must be a component to the engine that **changes the question every time the kid attempts that topic** to keep it unique and avoid false data from repetition.
- **Multi-level difficulty per topic.** Each topic has questions across multiple difficulty levels. Difficulty may come from the **wording of the questions** or something else — and this must be **deeply analyzed from NCERT and other sources** to determine how *they* define difficulty and structure material.
- **Maximum level of adaptiveness and complexity** is the goal.
- **Format (for now):** all questions are **objective — MCQ type with multiple options.** May change later; if so, we adapt then. For now MCQ is doable.
- **Storage:** typically **server-side**. (Pros/cons to be detailed further, but server-side is the direction.)

---

## 4. The Concept Chain / Butterfly Effect (the heart of the system)

This is the single most important intellectual concept Karan articulated:

- The concepts a kid learns in the **starting grades have an effect all the way to the very last grade** — there is a **clear butterfly effect and a clear chain of progression.**
- As we compile learning modules and questions for each grade, we must **associate the topics** so we can see **where the kid would have learnt the basics** for the topic he's learning now.
- **If the kid cannot answer a specific question or a whole topic**, the system should be able to **give him a question that is the basics of that topic from an earlier grade** — to see how he does on the foundation.
- This is how we **determine his ceiling** and **where exactly his strengths and weaknesses lie** — and specifically **where the basics are failing him.**

In technical terms this became: a **cross-grade concept dependency graph (DAG)** where a failure at a higher-grade concept triggers a **backward trace** down the prerequisite chain, serving diagnostic questions from earlier grades to locate the exact broken foundation.

---

## 5. The Three Engines (as Karan defined them)

### Engine 1 — Scoring Engine ("the easiest of them all")
- Maintains the **scoring and scores** of the kid based on correct and wrong answers.
- Simplest engine — pure bookkeeping.

### Engine 2 — Assessment Engine (the "3D approach" engine — "a bit complicated")
Three factors combine:
1. **The level of difficulty of the question.**
2. **The time taken to answer the question.**
3. **The understanding aspect** — whether he actually **understands** the question, or he's **just pressing random buttons.**

This engine judges the *quality* of each answer, not just right/wrong.

### Engine 3 — Overall Progress Engine (the fusion / intelligence layer)
- Takes the data from **both** the other engines and **combines** it.
- Pinpoints **exactly the topic → from the chapter → from the class level** to determine the child's **weaknesses and strengths.**
- Identifies **where the basics are failing him** and **where he can improve.**
- **Gives him suggestions.**

---

## 6. Assessment Cadence & Behavior (confirmed decisions)

- Assessment is **embedded in every module's quiz** — NOT locked behind a parent's initiation. Every interaction feeds the engines.
- It is **continuous** — recalculated **after every chapter or so**, to determine the kid's **learning ability** (is the kid grasping concepts **faster or slower**?). This velocity information can only be accurately calculated through continuous assessment.
- The adaptive quiz is **app-native** (not inside the module HTML) — because it's **our IP** and because the engine must pull cross-grade diagnostic questions live. Karan explicitly approved moving the quiz into the app for uniqueness and IP protection.

---

## 7. Starting Scope (confirmed)

- **Start with Grades 1, 2, 3 together.** They have the **same level of maturity**, so it's logical to frame their questions and modules as a group.
- **NCERT has excellent materials** for these grades — use them.
- Use the **NIPUN framework** (NIPUN Bharat, National Initiative for Proficiency in Reading with Understanding and Numeracy) to derive the **learning qualities / competencies** — i.e., how we assess children at this stage.
- **Boards:** Both **CBSE and ICSE**, Grades **1–10** as the eventual range (could expand to 12), but **focus now is 1–10** with the **first build targeting 1–3**. CBSE and ICSE "share a lot of similarities" so working both should be feasible.
- **Subjects (grade 1-3 stage):** Math, English, EVS, Hindi.

### NIPUN framework findings (researched July 17, 2026)
NIPUN Bharat targets Foundational Literacy & Numeracy by Grade 3. Age group 3–9 (Balvatika + Grades 1–3). Goals expressed as "Lakshya" (targets).
- **Foundational Numeracy components:** Pre-Number Concepts; Numbers & Operations on Numbers; Measurement; Shapes & Spatial Understanding; Patterns.
- **Foundational Literacy components:** Oral Language Development; Phonological Awareness; Decoding; Vocabulary; Reading Comprehension; Reading Fluency; Concept about Print; Writing; Culture of Reading.
- **Grade progression (butterfly chain):**
  - Grade 1: numbers 1–99, counting, number names, addition/subtraction to 20, basic shapes, simple patterns, comparison (big/small, long/short).
  - Grade 2: numbers to 100, place value (tens/ones), 2-digit +/− with regrouping, multiplication as repeated addition (2,3,4,5,10 tables), standard measurement intro.
  - Grade 3: numbers to 999, place value (hundreds), 3-digit +/−, multiplication tables + 2-digit×1-digit, division (equal sharing), fractions (half/quarter), measurement (length/weight/capacity/time/money).
  - Example chain: counting → addition → repeated addition → multiplication → division; and number recognition → place value → multi-digit place value.

---

## 8. Hardware Aspect (POSTPONED to main release)

- A **smartpen** that **live-syncs the notes** of the kid or the teacher teaching the concept in a video session.
- The **video recording should sync up with the notes** — so much so that when the kid **reviews the recording, it's almost as if the recording was live** (notes and video replay in sync).
- **This feature is postponed to the main release** — not part of the learning app now.

---

## 9. Copyright / Content Rules

- **NCERT content** may be **adapted with attribution** (government-published, freely adaptable).
- **ICSE textbooks are private-publisher copyright and must NOT be copied.** For ICSE, anchor modules on the **public CISCE syllabus** plus **original explanations** — never reproduce a specific publisher's text or figures.
- Keep `board` and `source_attribution` fields so provenance is auditable.

---

## 10. Technical / Branch Setup (confirmed)

- **Same app identity** — this is a different version/beta, not a separate product name. The main app release will be more of an "overhaul."
- **Same database.** Options discussed: clone the DB and adjust, OR use the main one and just not use the educator-specific tables. To be detailed further. Children remain **profile rows owned by parent_id** (NOT auth users) — reuse the existing `children` table.
- **Separate Git branch:** `Learning-app-version`, forked from `main` at commit 656c525. Pushes on one branch do NOT affect the other. No merging.
- **Separate local folder:** `K:\V-SPED\VSPED1.0-learning\` (clone of the same repo on the learning branch) so both Expo Go instances can run simultaneously on different ports for side-by-side testing.

---

## 11. Specs Created (as of July 17, 2026)

Two specs live under `K:\V-SPED\VSPED1.0-learning\.kiro\specs\`:

### `learning-modules` (content delivery)
- Catalog (subject → grade → chapter), WebView module viewer, module progress tracking, parent progress dashboard.
- Tables: `subjects`, `modules`, `child_module_progress`.
- Modules = self-contained HTML in Supabase Storage, rendered in `react-native-webview`, communicating via a `postMessage` bridge. NO quiz in the HTML anymore.
- `design.md` complete. Requirements + tasks pending.

### `adaptive-assessment-engine` (the core IP)
- The three engines, the cross-grade concept DAG, the templated (anti-memorization) question bank, adaptive selection, ceiling computation, insights.
- Tables: `concepts`, `concept_edges`, `question_templates`, `question_responses`, `child_concept_mastery`, `question_instances`.
- Server-authoritative via Edge Functions (`select-questions`, `submit-response`, `compute-ceiling`). Templates never client-readable (IP protection).
- MCQ-only v1. Parameterized templates instantiated fresh per attempt (anti-memorization). 3D understanding scoring with guess detection. Bayesian mastery updates. Backward-trace root-cause finder. `design.md` complete. Requirements + tasks pending.

---

## 12. Still-Open / To-Detail-Later Items

1. Exact NIPUN Lakshya → concept mapping per subject (component structure known; fine-grained per-grade competency list to be validated against the latest NIPUN handbook).
2. Difficulty-tier rubric per subject — how "difficulty 3" differs from "difficulty 4" (wording/steps/abstraction) — from NCERT material analysis.
3. Distractor design guidelines per concept (common misconceptions make the best wrong options).
4. Database strategy final call: clone vs. shared-with-unused-educator-tables.
5. Module storage: Supabase Storage (leaning) vs. bundled vs. CDN — pros/cons to finalize.
6. The scoring/assessment engine deeper working — Karan will provide more detail "shortly."
7. Monetization model for the learning version (free acquisition vs. its own pricing) — TBD.
8. Full module authoring pipeline for grades 1–3 across all 4 subjects.

---

## 13. Immutable Constraints (always apply)

- **Child Data Privacy & Consent Model** (steering `child-data-privacy.md`): all child PII encrypted, parent-owned, no admin bypass, DPDP Act 2023 compliant. Assessment data is child-linked but parent-owned. No child PII enters any question or the WebView sandbox.
- **Ponytail Protocol** (steering `ponytail.md`): YAGNI; prefer Expo SDK 54 / RN 0.81 core; Deno stdlib + pinned @2.49.1 for edge functions; minimum lines; never weaken RLS/encryption without explicit command.
- **SonarQube** analysis on any code created/modified.
