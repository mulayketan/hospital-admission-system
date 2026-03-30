# Agent Prompts — IPD Treatment Plan Implementation

Use these prompts verbatim when starting each new chat session.
Each chat should be opened with the **worktree folder** as the workspace root.

---

## How to Open Each Agent Chat

| Track | Open this folder in Cursor | Model | When to run |
|-------|---------------------------|-------|-------------|
| Backend | `worktrees/ipd-backend` | claude-sonnet | Phase 1 |
| Frontend | `worktrees/ipd-frontend` | claude-sonnet | Phase 1 (parallel) |
| Sheets + PDF | `worktrees/ipd-sheets-pdf` | claude-sonnet | Phase 1 (parallel) |
| Tests | `worktrees/ipd-tests` | codex / o4-mini | Phase 1 (parallel) |
| **Code Review** | **main repo root (after merge)** | **claude-opus / Composer** | **Phase 2 — after all merges** |

In each Cursor window: **File → Open Folder** → select the worktree path above.
Then paste the prompt below into a new Agent chat.

---

## BACKEND AGENT PROMPT
(Open folder: `worktrees/ipd-backend`, model: Sonnet)

```
You are implementing the backend data layer for an IPD Treatment Plan module
in a Next.js 15 (App Router) + Google Sheets hospital management system.

The complete feature spec is at: IPD_TREATMENT_SPEC.md in this repository.
Read it fully before writing any code. It is the single source of truth.

Your scope is BACKEND ONLY:
1. lib/google-sheets.ts — add 7 new SHEET_NAMES; remove ADMISSIONS entry
2. lib/sheets-models.ts — add 7 new Model classes (MedicineModel, InvestigationModel,
   ProgressReportModel, NursingNotesModel, NursingChartModel, DrugOrderModel,
   PatientAdviceModel); fix bugs #1, #1b, #2, #3 from §12 of the spec
3. lib/validations.ts — add 5 new Zod schemas from §9 of the spec; remove admissionSchema
4. app/api/medicines/route.ts — GET handler
5. app/api/investigations/route.ts — GET handler
6. app/api/ipd/progress-report/route.ts + [id]/route.ts — full CRUD
7. app/api/ipd/nursing-notes/route.ts + [id]/route.ts — full CRUD
8. app/api/ipd/nursing-chart/route.ts + [id]/route.ts — full CRUD
9. app/api/ipd/drug-orders/route.ts + [id]/route.ts — full CRUD
10. app/api/ipd/advice/route.ts + [id]/route.ts — full CRUD

Key rules from the spec:
- All DELETE routes must check session.user.role === 'ADMIN' → return 403 for STAFF
- All datetimes stored as ISO 8601 IST e.g. "2026-03-23T17:30:00+05:30"
- The vitalSignSchema has a .refine() requiring at least one of temp/pulse/bp/spo2
- Diagnosis is only stored on the isAdmissionNote=true row (see §4.3.1)
- DrugOrders: drugAllergy/ward/bedNo are intentionally denormalized per row
- Route enum uses "INJ (IM)" with a space — exactly as in the Zod schema in §9
- Do NOT create any UI components or PDF code — that is handled by other agents

TypeScript interfaces for all models are in §10 of the spec. Use them exactly as defined.

After implementing, run: npx tsc --noEmit
Fix all TypeScript errors before finishing.
Commit your work on branch feature/ipd-backend with message:
"feat(backend): implement IPD treatment plan API routes and data layer"
```

---

## FRONTEND AGENT PROMPT
(Open folder: `worktrees/ipd-frontend`, model: Sonnet)

```
You are implementing the frontend UI for an IPD Treatment Plan module
in a Next.js 15 (App Router) + React 18 + Tailwind hospital management system.

The complete feature spec is at: IPD_TREATMENT_SPEC.md in this repository.
Read it fully before writing any code. It is the single source of truth.

Your scope is FRONTEND ONLY (no API route files, no PDF generation):
1. components/ipd-treatment-panel.tsx — patient search + sub-tab shell (§6.1)
2. components/ipd/patient-context-banner.tsx (§7.1)
3. components/ipd/medicine-select.tsx — searchable dropdown, fetches /api/medicines
4. components/ipd/investigation-select.tsx — fetches /api/investigations
5. components/ipd/diagnosis-block.tsx — editable; PUTs to admission note row (§4.3.1)
6. components/ipd/clinical-note-form.tsx + clinical-note-table.tsx (§7.3)
7. components/ipd/nursing-note-form.tsx + nursing-note-table.tsx (§7.4)
8. components/ipd/vitals-form.tsx + vitals-table.tsx (§7.5)
9. components/ipd/drug-order-form.tsx + drug-day-grid.tsx (§7.6)
    — day cells store comma-separated times e.g. "5:30PM,8PM"
    — cells are fully editable after saving (popup pre-filled)
    — horizontal scroll; up to 36 day columns
10. components/ipd/advice-form.tsx + advice-table.tsx (§7.7)
11. components/ipd/ipd-pdf-export.tsx — 4 individual + 1 combined download buttons (§7.8)
12. app/dashboard/page.tsx — add 'ipd' TabType; add selectedPatient state; add IPD tab nav
13. components/patient-list.tsx — add "Open IPD" action button per row
14. components/admission-form.tsx — add Bed No. field (§4.8)
15. lib/translations.ts — add EN/MR strings for all new UI labels

Key rules from the spec:
- Patient identity is threaded via patientId + ipdNo held in React state at dashboard level
- Delete buttons are only shown/enabled when session.user.role === 'ADMIN'
- Use existing UI primitives: Button, Input, etc. from components/ui/
- Use react-hook-form for all forms; zod for validation (consistent with existing code)
- Use react-hot-toast for notifications (consistent with existing code)
- Use lucide-react for icons (consistent with existing code)
- Advice tab data entry exists in the UI but there is NO "Download Advice PDF" button;
  Advice is embedded in the Progress Report PDF automatically

TypeScript interfaces for all data types are in §10 of the spec.
The API endpoints you will call are listed in §5 of the spec.

After implementing, run: npx tsc --noEmit
Fix all TypeScript errors before finishing.
Commit your work on branch feature/ipd-frontend with message:
"feat(frontend): implement IPD treatment plan UI components and dashboard integration"
```

---

## SHEETS + PDF AGENT PROMPT
(Open folder: `worktrees/ipd-sheets-pdf`, model: Sonnet)

```
You are implementing the Google Sheets setup scripts and PDF generator for an IPD
Treatment Plan module in a Next.js 15 hospital management system using Puppeteer.

The complete feature spec is at: IPD_TREATMENT_SPEC.md in this repository.
Read it fully before writing any code. It is the single source of truth.
Also read the existing lib/pdf-generator-final.ts to understand current patterns.

Your scope:
1. scripts/create-sheets.ts — add creation of 7 new sheet tabs:
   Medicines, Investigations, ProgressReport, NursingNotes, NursingChart,
   DrugOrders, PatientAdvice (with correct headers matching §4.1–§4.7)

2. lib/ipd-pdf-generator.ts — new file with 4 HTML→PDF template functions:
   a) generateProgressReportPDF({ patient, entries, adviceEntries })
      - Portrait A4; matches physical form exactly (see §8.1)
      - Diagnosis block above clinical table
      - Advice box below clinical table (only if adviceEntries.length > 0)
      - Hospital ZH logo, UHID box, BED No. in patient strip
      - Footer: "Every Entry to be Named, Signed, Dated & Timed" + doctor signature

   b) generateNursingNotesPDF({ patient, entries })
      - Portrait A4; matches physical form exactly (see §8.2)
      - UHID at top-right above header; NO Bed No.
      - Two separate columns: Doctor's Notes | Treatment (not merged)
      - Handover rows: grey background + "⇄ HANDOVER" prefix
      - Signature uses patient.treatingDoctor

   c) generateNursingChartPDF({ patient, vitalSigns })
      - Landscape A4 (see §8.3)

   d) generateDrugOrderPDF({ patient, drugOrders })
      - Landscape A4; day × drug grid (see §8.4)
      - Page 1: days 1-15; Page 2 (PTO): days 16-36 (only if needed)
      - Day cells: comma-separated times stacked vertically

3. app/api/patients/[id]/ipd-pdf/route.ts
   - Reads ?form= query param: progress-report | nursing-notes | nursing-chart | drug-orders
   - No ?form=advice (returns 400 if requested)
   - No ?form= (combined): calls all 4 generators and concatenates via Puppeteer
   - Fetches patient + relevant IPD records from Google Sheets
   - Streams PDF binary with correct Content-Disposition filename
   - runtime = 'nodejs' (required for Puppeteer)

Key rules:
- Reuse existing getBrowser() / Puppeteer patterns from lib/pdf-generator-final.ts
- Datetime display in PDF: DD/MM/YY h:MM AM/PM
- Noto Devanagari font is already loaded in app/layout.tsx for Marathi text
- ZH logo is at /images/zh-logo.svg
- Vercel maxDuration is 30s — keep PDF generation efficient

After implementing, run: npx tsc --noEmit
Fix all TypeScript errors before finishing.
Commit your work on branch feature/ipd-sheets-pdf with message:
"feat(sheets-pdf): add sheet setup scripts and IPD PDF generator"
```

---

## TESTS AGENT PROMPT
(Open folder: `worktrees/ipd-tests`, model: Codex / o4-mini)

```
You are writing tests for an IPD Treatment Plan module in a Next.js 15 hospital
management system. The spec is at IPD_TREATMENT_SPEC.md — read §9, §10, §13 carefully.

The existing codebase has NO test infrastructure yet. Set up a minimal Jest config
first, then write tests in a __tests__/ directory.

Setup:
- Install: jest, @types/jest, ts-jest, jest-environment-node
- Create jest.config.ts
- Create tsconfig for tests if needed

Test files to create:

1. __tests__/unit/validations.test.ts
   Test all 5 new Zod schemas from §9:
   - progressReportEntrySchema: valid case, missing doctorNotes, empty patientId
   - nursingNoteSchema: valid, missing notes
   - vitalSignSchema: valid, ALL of temp/pulse/bp/spo2 empty → should FAIL refine
     (this is the critical test — see §4.5 validation rule)
   - drugOrderSchema: valid, invalid frequency enum, invalid route enum (test "INJ(IM)"
     without space fails; "INJ (IM)" with space passes)
   - patientAdviceSchema: valid, invalid category enum (e.g. "Lab" should fail)

2. __tests__/unit/sheets-models.test.ts
   Mock lib/google-sheets.ts (appendSheet, readSheet, updateRow, deleteRow, generateId).
   Test each of the 7 new Model classes:
   - MedicineModel.findMany: returns mapped Medicine[]
   - InvestigationModel.findMany: returns mapped Investigation[]
   - ProgressReportModel.create: calls appendSheet with correct row order per §4.3
   - ProgressReportModel.findByPatientId: filters by column B (patientId)
   - ProgressReportModel.update (diagnosis-only): merges, doesn't overwrite staffName
   - NursingChartModel.create: correct column order per §4.5
   - DrugOrderModel.create: day1–day36 columns K–AT serialised correctly
   - PatientAdviceModel.updateStatus: only status/reportNotes/updatedAt changed

3. __tests__/unit/ipd-pdf-generator.test.ts
   Mock Puppeteer (puppeteer-core). Test HTML template output:
   - generateProgressReportPDF: HTML contains patient name, IPD No, UHID, BED No.
   - generateProgressReportPDF with adviceEntries=[]: HTML does NOT contain "INVESTIGATIONS"
   - generateProgressReportPDF with adviceEntries=[...]: HTML DOES contain "INVESTIGATIONS"
   - generateNursingNotesPDF: HTML contains UHID; does NOT contain "BED" in patient strip
   - generateDrugOrderPDF with 16 days: HTML contains "PTO" (page 2 indicator)
   - generateDrugOrderPDF with 14 days: HTML does NOT contain "PTO"

4. __tests__/integration/ipd-api.test.ts
   Use fetch mocking or next/test-utils to test key API scenarios from §13.2:
   - POST /api/ipd/progress-report: 201 with valid body
   - POST /api/ipd/progress-report: 400 with missing doctorNotes
   - POST /api/ipd/progress-report: 401 without session
   - DELETE /api/ipd/progress-report/[id]: 403 for STAFF role
   - POST /api/ipd/nursing-chart: 400 when all of temp/pulse/bp/spo2 are empty
   - GET /api/patients/[id]/ipd-pdf?form=advice: 400 (this route does not exist)
   - GET /api/patients/[id]/ipd-pdf: 200, binary content-type

Key facts from the spec:
- Route enum must be exactly "INJ (IM)" with a space (§2.6, §9)
- Investigation categories: 9 values including "Urine Test" and "Echo" (§2.7)
- isAdmissionNote=true row is the only row that holds diagnosis (§4.3.1)
- Combined PDF has 4 sections, not 5 (§8.5)

Commit your work on branch feature/ipd-tests with message:
"test: add unit and integration tests for IPD treatment plan module"
```

---

## CODE REVIEW AGENT PROMPT
(Open folder: `worktrees/ipd-backend` OR the main repo root after merging, model: **claude-opus / Composer**)

> Run this agent **after all four implementation agents have committed** and ideally after merging into master. It performs a full critical evaluation of both the existing codebase and all IPD additions.

```
You are a senior full-stack engineer performing a critical code review of a
Next.js 15 (App Router) + Google Sheets hospital management system.

The codebase is at the repo root. The IPD Treatment Plan spec is at IPD_TREATMENT_SPEC.md.
Read the spec fully before reviewing — it is the contract all IPD code must satisfy.

## Your Mission

Produce a structured review report covering the ENTIRE codebase (existing + new IPD code).
Flag every issue with severity: CRITICAL | WARNING | SUGGESTION.
For every finding include: file path, line number(s), problem description, and a concrete fix.

---

## Review Checklist

### 1. TypeScript & Type Safety
- No use of `any` — flag every occurrence; suggest specific types
- All Google Sheets row arrays must be typed with explicit tuple or interface (not `string[]`)
- Zod inferred types used consistently — no manual re-declaration of equivalent interfaces
- All `z.infer<typeof schema>` types exported and used in API handlers + components
- No implicit `undefined` access on optional fields without null checks
- React component props typed with interfaces, not inline objects

### 2. API Route Security
- Every mutating route (POST/PUT/DELETE) must call `getServerSession()` and return 401 if no session
- DELETE routes must check `session.user.role === 'ADMIN'` → 403 for STAFF (per spec §5)
- Every route must parse the request body with the corresponding Zod schema → 400 on failure
- No secret values (GOOGLE_SERVICE_ACCOUNT_KEY, NEXTAUTH_SECRET) logged or returned in API responses
- Formula injection in Google Sheets: any user input stored in Sheets must be sanitised
  (values starting with `=`, `+`, `-`, `@` must be prefixed with a single quote or rejected)

### 3. Google Sheets Data Layer (lib/google-sheets.ts, lib/sheets-models.ts)
- All SHEET_NAMES entries match the actual tab names created by scripts/create-sheets.ts
- Row read/write column indices are consistent between Model.create and Model.findMany
- No N+1 reads: models must not call readSheet inside a loop
- generateId() produces collision-resistant IDs; no sequential integers
- Error handling: all Sheets API calls wrapped in try/catch with meaningful error messages
- No stale data risk: reads always fetch fresh rows (no in-memory caching without TTL)

### 4. IPD Spec Compliance (compare code against IPD_TREATMENT_SPEC.md)
- §4.3.1: isAdmissionNote=true row is the ONLY row storing diagnosis — verify model logic
- §4.5: vitalSignSchema .refine() requires at least one of temp/pulse/bp/spo2 — verify API enforces this
- §4.6: DrugOrder day1–day36 columns K–AT — verify column mapping in DrugOrderModel
- §5: All 12 API routes exist (10 CRUD + 2 master data GET endpoints)
- §9: Route enum value is exactly "INJ (IM)" with a space — check all occurrences
- §9: Investigation category enum has exactly 9 values including "Urine Test" and "Echo"
- §8.3: NursingChart PDF is Landscape A4 — verify Puppeteer page settings
- §8.4: DrugOrder PDF page 2 ("PTO") rendered only when days > 15

### 5. React & Next.js Patterns
- No `use client` in files that could be Server Components
- No `useEffect` used for data fetching that should be a Server Component or Route Handler
- Forms use `react-hook-form` + Zod resolver consistently (no raw `useState` for form fields)
- Loading and error states handled in every data-fetching component
- No unhandled Promise rejections in event handlers (must be wrapped in try/catch)
- No direct `fetch()` calls from Server Components to own API routes (use model layer directly)
- `next/image` used for all `<img>` tags; no raw `<img>` with external URLs

### 6. Performance
- Puppeteer PDF generation: browser instance reuse via `getBrowser()` singleton — not spawning per request
- No synchronous file I/O in API routes
- Google Sheets: no unbounded reads (readSheet on sheets with potentially thousands of rows
  must filter by patientId in-memory efficiently, or flag for indexing strategy)
- React: expensive list renders use `key` props correctly; no index-as-key on reorderable lists

### 7. Error Handling & Observability
- All API routes return structured JSON errors: `{ error: string }` — no raw exception messages to client
- Server-side errors logged with `console.error` (not `console.log`) including context (patientId, route)
- No empty catch blocks
- PDF route: timeout handling — what happens if Puppeteer hangs past Vercel's 30s limit?

### 8. Code Quality & Consistency
- No duplicate schema declarations (e.g., same Zod schema defined twice in validations.ts)
- No unused imports or dead exports
- Consistent datetime format: all datetimes stored/returned as ISO 8601 IST (§2.9 of spec)
- Magic strings extracted to constants (sheet names, column indices, enum values)
- No hardcoded hospital name / doctor name strings in code (must come from env or data)
- File naming: kebab-case for all files under components/ and app/

### 9. Authentication & Session
- `next-auth` session checked on both client (useSession) and server (getServerSession) as appropriate
- JWT strategy: session.user has role, id, name — no extra sensitive fields in token
- No client component reads session.user.id from a prop passed down from server — use useSession()

### 10. Existing Feature Regression Check
- Patient registration flow (components/admission-form.tsx + /api/patients POST) untouched except Bed No. field
- Patient list (components/patient-list.tsx) search/display working; only addition is "Open IPD" button
- PDF export (/api/patients/[id]/pdf) uses lib/pdf-generator-final.ts — NOT the new IPD generator
- Ward charges and TPA management routes unaffected
- User management (create/delete user) unaffected
- Login flow (/login, next-auth) unaffected

---

## Output Format

Produce your report as markdown with this structure:

```markdown
# Code Review Report — Hospital Admission System (IPD Implementation)
Date: <today>
Reviewer: AI Code Review Agent
Scope: Full codebase (existing + IPD additions)

## Executive Summary
<2–3 sentence overall assessment. Is this safe to deploy?>

## CRITICAL Issues (must fix before deploying)
### [CR-1] <Short title>
- **File:** path/to/file.ts, line XX
- **Problem:** ...
- **Fix:** ...

## WARNING Issues (strongly recommended)
### [WA-1] <Short title>
...

## SUGGESTION (nice-to-have)
### [SU-1] <Short title>
...

## Spec Compliance Summary
| Spec Section | Check | Status | Notes |
|---|---|---|---|
| §4.3.1 isAdmissionNote | diagnosis only on admission row | ✅ / ❌ | |
...

## Regression Risk Assessment
| Existing Feature | Affected? | Notes |
|---|---|---|
| Patient registration | No / Yes — <explain> | |
...
```

After writing the report, do NOT make any code changes.
Save the report as: CODE_REVIEW_REPORT.md in the repo root.
```

---

## Merge Order (after all agents complete)

```bash
# 1. Backend first (other branches may import its types)
git checkout master
git merge feature/ipd-backend --no-ff -m "feat: IPD backend - API routes, models, schemas"

# 2. Sheets + PDF (depends on backend model types)
git merge feature/ipd-sheets-pdf --no-ff -m "feat: IPD sheets setup and PDF generator"

# 3. Frontend (depends on API routes existing)
git merge feature/ipd-frontend --no-ff -m "feat: IPD frontend - all UI components"

# 4. Tests last (imports from all other layers)
git merge feature/ipd-tests --no-ff -m "test: IPD treatment plan test suite"

# Clean up worktrees after merge
git worktree remove worktrees/ipd-backend
git worktree remove worktrees/ipd-frontend
git worktree remove worktrees/ipd-sheets-pdf
git worktree remove worktrees/ipd-tests
```

## Conflict Hotspots to Watch

| File | Modified by | Risk |
|------|------------|------|
| `lib/validations.ts` | Backend + Tests | LOW — tests import, don't modify |
| `lib/sheets-models.ts` | Backend + Tests | LOW — same reason |
| `lib/google-sheets.ts` | Backend | LOW — only backend touches this |
| `app/dashboard/page.tsx` | Frontend only | NONE |
| `lib/translations.ts` | Frontend only | NONE |
| `scripts/create-sheets.ts` | Sheets+PDF only | NONE |
