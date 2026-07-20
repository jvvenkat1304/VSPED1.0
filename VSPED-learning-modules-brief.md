# VSPED — Engineering Brief: Child-Facing Learning Modules Subsystem

**Issue this brief to Claude (Claude Code) working inside the VSPED repository.**
Attach these reference files when you issue it:
1. `class8-math-ch1-square-and-cube.html` — the validated interactive module template.
2. (Optional) `handwriting-eval-feasibility.html` — context for the future auto-grading seam.

---

## 0 · Working agreement (read first)

- You are extending an **existing** app (VSPED). **Do not assume the stack, schema, or conventions — detect and confirm them first (Step 1 below).** In particular, **the data model in this brief (Section 4) is a *proposal*, not ground truth. Your very first action is to pull the live VSPED Supabase schema and align this brief to it** — reusing and extending existing tables — **before writing a single migration.**
- VSPED is a **special-education** learning platform. **Accessibility is a hard requirement, not a nice-to-have** (Section 7). Treat every UI decision through that lens.
- Work on a **feature branch**. Keep PRs small and reviewable. All DB changes go through **reversible migrations**. Add **tests**.
- **Never** commit secrets; reuse the repo's existing env/config pattern.
- When the child-auth/session model, RLS intent, or any product rule is ambiguous, **stop and ask** — do not guess on security-relevant design.
- Do **not** break the existing parent registration, child registration, or educator registration flows.

---

## 1 · Context & goal

VSPED already has an outer layer: **parents register their children**, **educators register themselves**, and data lives in **Supabase** (Postgres + Auth + Storage). 

**This work adds the child-facing Learning Modules subsystem**: a child (under parent/educator supervision) can browse and complete **interactive learning modules** spanning **Standards I–X** across **Mathematics, Science, English, and Social Sciences**.

Each module follows a **validated template** we have already built and tested — see the attached `class8-math-ch1-square-and-cube.html`. It contains: a short **parent-guidance** layer, several **interactive discovery activities**, and an **adaptive, procedurally-generated quiz** (fresh non-repeating questions in mixed formats, with step-by-step worked solutions). That file is the **reference standard** for what a module is.

Deliver in two tracks in this brief: **(A) the foundation, built end-to-end now** with one seeded reference module, and **(B) the full Std I–X content pipeline, designed now** so scaling is clear from day one.

---

## 2 · Step 1 (do this before anything else) — Extract the live VSPED schema and align this brief to it

**This is the first and gating step. The data model in Section 4 is a PROPOSAL, not ground truth. Before writing any migration or feature code, pull the actual VSPED Supabase schema and reconcile this brief against it. Nothing downstream begins until this is done and confirmed.**

Do the following, in order:

1. **Extract the live schema.** Enumerate the actual Supabase database in full: every table, column, type, constraint, foreign key, index, enum/domain, and existing **RLS policy**. Use the repo's migration history and/or the Supabase project directly (e.g. `information_schema`/`pg_catalog`, the Supabase CLI `supabase db dump`, or the generated types). Record the **real names and conventions**: snake_case vs camelCase, id type (uuid vs bigint), timestamp/soft-delete patterns, and any tenancy/ownership columns.
2. **Establish the child/parent/educator model as it truly exists** — the real table names, the real linkage between children ↔ parents and children ↔ educators, and **whether a child is a Supabase Auth user or a profile row owned by a parent/educator**. This is authoritative; do not invent or duplicate it.
3. **Reconcile Section 4 against reality.** For every proposed table/column, decide **reuse existing / extend existing / create new**. Reuse what exists, extend rather than duplicate, rename to match existing conventions, and repoint **every** foreign key at the real tables/columns. **Never create a second "children"/roles concept if one already exists.** Flag every conflict, overlap, or naming collision and resolve it.
4. **Rewrite the data model.** Produce a corrected, schema-aligned "as-built plan" that references only real, confirmed identifiers — this supersedes Section 4 for implementation.

Also inventory (for the broader picture): **stack & framework** (Next.js/React web, React Native/Expo, or Flutter), routing, state, styling, and CI; **Storage** buckets and upload conventions; and **where a "child session" happens** in the current app today, plus the gap to an interactive module viewer.

**Deliverables (the rest of the work is gated on these):**
- `docs/learning-modules/PROJECT-STRUCTURE.md` — stack findings, the **live schema dump + ERD**, and the confirmed child/parent/educator + auth model.
- `docs/learning-modules/DATA-MODEL-ALIGNED.md` — the reconciled data model: a table-by-table mapping of every Section 4 proposal to **reuse / extend / create**, with final real names and foreign keys, and the list of conflicts resolved.
- A short list of assumptions to confirm with the team **before** proceeding to migrations.

---

## 3 · Recommended architecture (delivery approach) — and why

**Recommendation for the MVP: deliver each module as a self-contained HTML document rendered inside a sandboxed container** — an `<iframe sandbox>` on web, `react-native-webview` on React Native, or a `WebView` widget on Flutter — with a thin host app around it for the catalog, progress, and persistence.

**Why this over the alternatives:**

- **Maximum reuse.** The attached template is already built, verified, and accessible. Content authoring continues in the exact format we validated, instead of re-implementing every interaction as native components.
- **Scales to hundreds of modules.** 4 subjects × 10 grades × many chapters is 400+ modules. Authoring HTML (or generating it) is far cheaper than hand-coding components per chapter.
- **Content/code decoupling.** Modules live as data (files in Supabase Storage / CDN), so publishing new content does **not** require an app release.
- **Isolation.** The sandbox contains each module's JS and blocks it from touching app state, cookies, or the network.

**The host ⇄ module contract (`postMessage`)** — keep this stable regardless of stack or future rendering approach:

- **Host → module (init payload):** child display name, **accessibility profile** (font scale, high-contrast, reduced-motion, TTS on/off, dyslexia-friendly, low-stimulation), and **resume state** for this child+module.
- **Module → host (events):** `ready`, `progress` (percent + resume_state), `activity_completed`, `quiz_started`, `quiz_result` (score, max, level_reached, adaptive_path), `request_capture_work` (opens the photo/work upload flow), `module_completed`, `a11y_change`.

**Migration path (design for it, don't build it yet):** once modules stabilize, common interactions can be extracted into a **data-driven renderer** (JSON → components). Because the DB schema and the `postMessage` contract stay identical, that migration won't disturb the catalog, progress, or host UI.

**Security requirements for the sandbox:** restrictive `sandbox` attributes (allow scripts, block same-origin access to the parent), a Content-Security-Policy that **forbids external network calls** from module content, and **no `localStorage`/`sessionStorage`** inside modules (they persist only via `postMessage` to the host — this is already a rule in our template).

---

## 4 · Data model (Supabase) — PROPOSAL; reconcile against the live schema first (Step 1)

> ⚠️ **Do not apply this verbatim.** This is a *target shape*, not a migration to run as-is. Per **Step 1 (Section 2)** you must first extract the live VSPED schema, then **reuse/extend existing tables** and match existing naming and id/timestamp conventions. Only create what genuinely does not already exist. **Every `*_id` below must be repointed to the real, confirmed table/column**, and the **child FK in particular must match the confirmed child model** (Auth user vs owned profile row). Record every decision in `DATA-MODEL-ALIGNED.md`.

Design migrations for the following (adapt names to repo conventions; confirm the child FK against the Step 1 auth finding). All new tables get **RLS enabled**.

- **`subjects`** — `id`, `slug` (`math`|`science`|`english`|`social-science`), `name`.
- **`modules`** — `id`, `subject_id` (fk), `grade` (int 1–10), `unit_no`, `chapter_no`, `slug`, `title`, `description`, `board` (`ncert`|`cbse`|`icse`|`generic`), `status` (`draft`|`in_review`|`published`), `content_path` (Storage path to the HTML), `content_version`, `estimated_minutes`, `prerequisites` (jsonb array of module ids), `accessibility_flags` (jsonb), `created_at`, `updated_at`.
- **`child_module_progress`** — `id`, `child_id` (fk), `module_id` (fk), `status` (`not_started`|`in_progress`|`completed`), `percent_complete`, `resume_state` (jsonb), `last_activity_at`. Unique on (`child_id`,`module_id`).
- **`quiz_attempts`** — `id`, `child_id`, `module_id`, `started_at`, `finished_at`, `score`, `max_score`, `level_reached`, `adaptive_path` (jsonb). (Multiple attempts allowed; the quiz is non-repeating by design.)
- **`work_uploads`** — `id`, `child_id`, `module_id`, `question_ref`, `storage_path`, `ocr_text` (nullable), `status`. **This is the seam for the future handwriting-capture / auto-grading feature** (separate brief) — create the table and the "capture work" upload flow now, leave grading for later.
- **`educator_assignments`** — `id`, `educator_id`, `child_id`, `module_id`, `assigned_at`, `due_at`, `note`. Lets an educator assign specific modules to a linked child.

**RLS intent (confirm exact policies against the auth model):**

- A **child** can read `published` modules and read/write **only their own** progress, attempts, and work uploads.
- A **parent** can read progress/attempts/uploads for **their own children**.
- An **educator** can read progress and **create assignments** for children **linked to them**, and read those children's attempts/uploads.
- No role can read another family's data. Writes are always owner-scoped.

---

## 5 · Phase 1 — Foundation, built end-to-end

Build the full child path, wired with the seeded reference module.

1. **Catalog / browse** — subject → grade → module. Show progress state, locked/unlocked by `prerequisites`, and estimated time. Calm, low-stimulation, fully accessible UI (Section 7).
2. **Module viewer** — loads the module HTML in the sandbox, sends the **init payload** (resume + accessibility profile), listens for events, and **persists** progress and quiz results to Supabase. Handles completion and "resume where you left off."
3. **Capture-your-work hook** — on `request_capture_work`, the host opens a photo/file upload, stores it in a Supabase Storage bucket, and writes a `work_uploads` row. (Reading/grading it is a later brief.)
4. **Progress views for parent & educator** — read-only dashboards of a child's module progress and quiz scores, respecting RLS.
5. **Seeded reference module** — ingest the attached `class8-math-ch1-square-and-cube.html` as Math / Grade 8 / Chapter 1, wired through the full loop (catalog → open → activities → quiz → progress + score persisted). Adapt its persistence to use the `postMessage` bridge instead of any inline state.

---

## 6 · The Module Template Standard (every module conforms to this)

Codify the attached HTML into a documented standard plus reusable scaffolding.

**Required anatomy** (see reference file): (a) header + collapsible **parent/educator guidance**; (b) **interactive discovery activities** driven by manipulation, not text; (c) an **adaptive, procedurally-generated quiz** — questions generated from templates with fresh numbers and mixed multiple-choice / type-the-answer formats so it **never repeats across replays**, each with **step-by-step worked solutions**; (d) optional **capture-your-work** button.

**Technical contract (enforced):**

- **Self-contained**: all CSS/JS inline; **no external network requests**; images as data URIs.
- **No `localStorage`/`sessionStorage`**: persist only via the `postMessage` bridge.
- **Responsive & offline-capable**; works on low-end devices.
- **Emits the standard events** and **reads the init payload**; **honors the accessibility profile** it receives (font scale, contrast, motion, TTS, dyslexia-friendly, low-stimulation).

**Deliverables:**
- `templates/module-boilerplate.html` — a starter shell implementing the contract.
- `templates/vsped-bridge.js` — the small JS every module includes to talk to the host (event emitters + init-payload reader + accessibility applier).
- `docs/learning-modules/MODULE-TEMPLATE-STANDARD.md` — the written standard.

---

## 7 · Special-education accessibility (first-class, non-negotiable)

Target **WCAG 2.2 AA** across the host app **and** modules.

- **Per-child accessibility profile** stored in the DB and passed into every module via the init payload; modules must visibly honor it.
- **Read-aloud / TTS** for instructions and questions; **captions/transcripts** wherever audio is used.
- **Dyslexia-friendly option** (appropriate typeface where licensed, increased letter/line spacing), **adjustable font size**, **high-contrast** theme, and **reduced-motion** mode (respect `prefers-reduced-motion`).
- **Low-stimulation mode**: minimize animation, calmer palette, less on screen at once.
- **Full keyboard operability**, visible focus, correct ARIA roles/labels; large touch targets; simple, consistent, predictable layouts; plain language.
- **No default timers / no time pressure**; pacing is the child's. Multi-sensory by default (pair every visual concept with optional audio).

**Deliverable:** `docs/learning-modules/ACCESSIBILITY.md` — the checklist every module and screen is validated against.

---

## 8 · Full content pipeline & taxonomy (design now, populate incrementally)

**Taxonomy:** `board → subject → grade → unit/chapter → module`, each module tagged with **learning objectives** and **prerequisites**. Default board is **NCERT/CBSE** (its textbooks are government-published and freely adaptable with attribution). 

> **Copyright rule to encode:** NCERT content may be adapted (with attribution). **ICSE textbooks are private-publisher copyright and must NOT be copied.** For ICSE, anchor modules on the **public CISCE syllabus** plus **original** explanations — never reproduce a specific publisher's text or figures. Keep a `board` and `source_attribution` field so provenance is auditable.

**Scale:** 4 subjects × 10 grades = 40 subject-grades → hundreds of modules. Define **naming & versioning conventions**, a **status workflow** (`draft → in_review → published`), and treat the `modules` table as the content **registry**.

**Authoring workflow:** author from `module-boilerplate.html` → run the **validator** → upload HTML to Storage → register/publish the `modules` row → QA → publish.

**Deliverables:**
- `tools/validate-module.mjs` — a Node script that lints a module HTML against the contract: **no external URLs**, **no `localStorage`/`sessionStorage`**, presence of required event hooks, presence of a quiz, and basic accessibility checks (lang, alt text, contrast hints, focusability). Must exit non-zero on violations so it can gate CI.
- `docs/learning-modules/CONTENT-PIPELINE.md` — taxonomy, conventions, workflow, and the copyright rule.

---

## 9 · Deliverables checklist

1. `docs/learning-modules/PROJECT-STRUCTURE.md` (Step 1: stack + **live schema dump/ERD** + confirmed child/parent/educator auth model) **and** `docs/learning-modules/DATA-MODEL-ALIGNED.md` (reconciled data model: reuse/extend/create mapping with real names + FKs).
2. Supabase migration(s) **that reuse/extend the existing schema** (no duplicate children/roles concept): new/extended tables + RLS policies.
3. Child **catalog** + **module viewer** (in the detected stack).
4. Host-side `postMessage` bridge + `templates/vsped-bridge.js` (module side).
5. `templates/module-boilerplate.html`.
6. **Seeded reference module** (Class 8 Math Ch.1) wired end-to-end.
7. Parent & educator **progress read views**.
8. `work_uploads` table + "capture your work" upload flow (grading deferred).
9. `tools/validate-module.mjs` content validator.
10. Docs: `MODULE-TEMPLATE-STANDARD.md`, `ACCESSIBILITY.md`, `CONTENT-PIPELINE.md`.
11. Tests: viewer loads a module, events persist correctly, RLS blocks cross-family access, validator passes on the seed module.

---

## 10 · Acceptance criteria (Phase 1)

- A signed-in child (per the confirmed auth model) can **browse subject → grade → module**, **open** the seeded module, **complete the activities and the adaptive quiz**, and see the module marked **complete**.
- **Progress and quiz score persist** to Supabase and **survive resume**.
- **RLS verified**: the child sees only their own data; the linked parent and educator can read it; an unrelated account cannot.
- The **accessibility profile is honored** inside the module (demonstrate at least font scale, high-contrast, and reduced-motion).
- The seeded module makes **zero external network calls** and **uses no browser storage**; `validate-module.mjs` **passes** on it.
- Existing parent/educator/child registration flows still work; migrations are reversible.
- **The data model was reconciled to the live VSPED schema** — no duplicate children/roles concept was introduced, all foreign keys point at real existing tables, and `DATA-MODEL-ALIGNED.md` documents every reuse/extend/create decision.

---

## 11 · Non-goals for this phase (explicitly out of scope)

- The **AI handwriting auto-grading** pipeline (separate brief — only build the `work_uploads` seam here).
- The **live blackboard + voice recording** feature (separate brief).
- **Authoring all** Std I–X modules (only the one seeded reference module now; the pipeline makes the rest repeatable).
- Payments/billing, and any change to the existing registration/onboarding flows.

---

## 12 · Open questions to confirm with the team before/while building

1. **Child auth/session model** — own Supabase Auth user, or a profile row owned by a parent/educator? (Drives all RLS.)
2. **Board scope now** — NCERT/CBSE only for the MVP, or ICSE (syllabus-mapped) too?
3. **Module storage** — Supabase Storage bucket vs bundling modules with the app vs external CDN.
4. **Offline requirement** — must modules run fully offline, or is an online catalog with cached modules acceptable?
5. **Educator assignment** — is educator→child module assignment in Phase 1, or later?

---

*Prepared as the build brief for the VSPED learning-modules subsystem. Reference template: `class8-math-ch1-square-and-cube.html`. Ask before making security-relevant or destructive changes.*
