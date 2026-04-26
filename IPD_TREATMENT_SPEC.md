# IPD Treatment Plan Module — Feature Specification

**Project:** Zawar Hospital Admission System  
**Feature:** IPD Treatment Plan Data Entry + PDF Export  
**Version:** 2.3.0 (post-implementation: PDF layout, multi-select investigations, form fixes)  
**Date:** March 30, 2026  
**Status:** Implemented — Updated to reflect actual built behaviour

---

## 1. Background

The hospital uses paper forms for IPD treatment documentation. No digital record of ongoing treatment, vitals, drug administration, or advised investigations exists. This spec extends the existing admission system to capture the full IPD lifecycle, digitising exactly the forms used by the hospital.

**In scope for v1:** Data entry for all four form types, Google Sheets storage, PDF export matching physical form layouts, role-based access (ADMIN/STAFF), ADMIN-only delete.  
**Out of scope for v1:** Audit log UI, EMR integration, multi-hospital support, extending `DrugOrders` day columns beyond `day36` (longer stays continue via **additional drug rows**; see §4.6.1).

---

## 2. Handwritten Sample Analysis — Key Findings

Forms analysed for patient **Bharatkumar Suvald Jangid** (UHID: Z-21667, IPD: 188, Age: 42, M, Bed: Deluxe).

### 2.1 Progress Report — Three Sections

**Section A — Diagnosis** (free text above table):
```
Viral Fever c severe Joint pain (IPD) c severe myalgia
```

**Section B — Admission Note** (first table entry, `isAdmissionNote = true`):
```
23/3/26, 9PM | S/B Dr. Amol
C/O: Fever & chills, Headache, Body pain, Joint pain, Weakness, Abdominal pain
O/E: BP 110/70 mmHg, PR 70/min, SPO2 98%, Temp 97.6°F
S/E: CVS-S1S2, CNS(N), R/S-Clear, PA-Pain & Tenderness
Treatment: Rx, CT-011
```

**Section C — Ongoing progress entries** (subsequent rows):
```
23/3/26, 7PM | O/E: P-78/min, BP 130/70, SPO2 99%, T-99.2°F
Treatment: Inj Pan 40mg OD, Inj Core SB1.5gm IV, Inj Dexa 4mg TDS,
           Inj Pacirnol 1gm BD, IV DNS, Tab HCQ 300mg 1-0-1
```

### 2.2 Nursing Notes

Nursing Notes record **what was actually given** (administration confirmation) by nurses. Entries span multiple shifts; shift handover is explicitly noted. Same 3-column table layout as Progress Report. UHID appears handwritten at top-right above the printed form header.

### 2.3 Drug Order Sheet — Day Cells Contain Times

Each day cell stores comma-separated administration times (e.g. `"5:30PM,8PM"`), **not checkboxes**. Cells are fully editable after saving.

### 2.4 Drugs Pre-seeded in `Medicines` Sheet

| # | Drug Name | Category | Dose | Default Freq | Default Route |
|---|-----------|----------|------|--------------|---------------|
| 1 | INJ PAN | INJ | 40mg | BD | IV |
| 2 | INJ C-ONE SB | INJ | 1.5gm | BD | IV |
| 3 | INJ DEXA | INJ | 4mg | TDS | IV |
| 4 | IV PACIRNOL | IV | 1gm | BD | IV |
| 5 | TAB ETODONOL ER | TAB | 300mg | BD | Oral (TAB) |
| 6 | TAB HCQS | TAB | 300mg | 1-0-1 | Oral (TAB) |
| 7 | SYP MEDICAINE GEL | SYP | 2tsp | TDS | Oral (SYP) |
| 8 | TAB MAHAYOGRAJ GUGGAL | TAB | — | 2-2-2 | Oral (TAB) |
| 9 | DNS | IV | 500ml | — | IV |
| 10 | NS (Normal Saline) | IV | 500ml | — | IV |
| 11 | INJ CALCIUM GLUCONATE | INJ | — | — | IV |
| 12 | INJ FEBRINIL | INJ | 2 amp | — | IV |
| 13 | INJ KITCOFOL | INJ | — | — | IV |
| 14 | SYP CADILASE | SYP | 15ml | — | Oral (SYP) |
| 15 | TAB DROTIK MF | TAB | — | — | Oral (TAB) |
| 16 | INJ NC95 | INJ | — | — | IV |

### 2.5 Canonical Frequency Values

`BD` · `TDS` · `OD` · `STAT` · `SOS` · `QID` · `HS` · `1-0-1` · `2-2-2` · `Other`

### 2.6 Canonical Route Values

`IV` · `INJ (IM)` · `Oral (TAB)` · `Oral (SYP)` · `Oral (CAP)` · `Topical` · `SL` · `Other`

> These exact strings are used in every location they appear: Google Sheets column descriptions, Zod enums, TypeScript types, and UI dropdown labels.

### 2.7 Canonical Investigation Category Values

`Blood Test` · `Urine Test` · `X-Ray` · `CT Scan` · `MRI` · `USG` · `ECG` · `Echo` · `Other`

> These exact strings are used in: §4.2 `Investigations` master tab, §4.7 `PatientAdvice` tab, Zod `patientAdviceSchema`, TypeScript `PatientAdvice` interface, and UI dropdown labels.

### 2.8 Doctor Signature on All Forms

All physical forms are signed by the treating doctor (e.g. Dr. Deshmukh Ajinkya Vijayrao, M.B.B.S., MD Anesthesiologist, Reg.No.2020/10/6299). In v1, PDFs use the `treatingDoctor` value from the `Patients` sheet for the signature block on all four form PDFs. Individual entry rows store `staffName` (the nurse or doctor who made that specific entry).

---

## 3. Architecture Overview

### 3.1 Data Flow

```
Patient Search → Select Patient → IPD Treatment Dashboard
                                           │
     ┌─────────────────┬───────────────────┼───────────────────┬──────────────────┐
     ▼                 ▼                   ▼                   ▼                  ▼
Progress Report   Nursing Notes      Nursing Chart        Drug Orders          Advice
(ProgressReport   (NursingNotes      (NursingChart        (DrugOrders          (PatientAdvice
 sheet tab)        sheet tab)         sheet tab)           sheet tab)            sheet tab)
     │                 │                   │                   │                  │
     └─────────────────┴───────────────────┴───────────────────┴──────────────────┘
                                           │
                                       PDF Export
                            (4 downloadable forms; Advice
                             embedded in Progress Report PDF)
```

**Master Data (read-only dropdowns):**
- `Medicines` tab → drug name dropdowns (Progress Report, Nursing Notes, Drug Orders)
- `Investigations` tab → investigation category/name dropdowns (Advice)

### 3.2 Patient Identity Threading

All IPD records store `patientId` (UUID, FK → `Patients.id`) + `ipdNo` (business key). Once a patient is selected in the IPD Treatment tab, their context is held in React state at the dashboard level and passed to all sub-components. No re-search is needed when switching sub-tabs.

### 3.3 Navigation Model

```
Dashboard Tabs:
  [New Admission]  [Patient Records]  [IPD Treatment ← NEW]  [User Management*]

IPD Treatment Tab:
  Step 1 — Search & select patient (same search as Patient Records)
            → click "Open IPD" on a patient row

  Step 2 — Patient Context Banner shown (persistent)
            Sub-tabs:
            [Progress Report] [Nursing Notes] [Nursing Chart] [Drug Orders] [Advice] [Export PDF]
```

> *User Management: ADMIN-only (unchanged). IPD Treatment: ADMIN and STAFF.*

### 3.4 Datetime Storage & Display

- **Storage format:** ISO 8601 with IST offset — `"2026-03-23T17:30:00+05:30"`.  
  All datetime fields in all sheets follow this format. No UTC conversion is performed; dates are stored as entered at the hospital (Asia/Kolkata, UTC+5:30).
- **UI display:** `DD/MM/YY h:MM AM/PM` (e.g. "23/3/26 5:30PM").
- **PDF display:** Same — `DD/MM/YY HH:MM`.

### 3.5 Concurrency Policy

Google Sheets has no row-level locking. This system uses **last-write-wins**: the most recent `PUT`/append overwrites the stored value. The UI refreshes the record list after every successful save. No concurrent-edit warning is shown in v1. If two users edit the same row simultaneously, the last writer's changes are preserved. This is acceptable given the low concurrent-user volume expected in v1.

### 3.6 Security & Audit Scope (v1)

- Authentication: NextAuth JWT session.
- Read/write: any authenticated user (ADMIN or STAFF).
- Delete: ADMIN role only (`session.user.role === 'ADMIN'`); returns 403 for STAFF.
- Audit trail: each IPD row stores `staffName` (who created the entry) and `createdAt`/`updatedAt`. No separate audit log table in v1.

---

## 4. Google Sheets Schema

### 4.1 Tab: `Medicines` (Master Reference — admin-managed)

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | manual or generated |
| B | `name` | e.g. `INJ PAN 40mg` |
| C | `category` | `INJ` / `IV` / `TAB` / `SYP` / `CAP` / `DROP` / `CREAM` / `OTHER` |
| D | `defaultDose` | e.g. `40mg`, `1.5gm` |
| E | `defaultFrequency` | e.g. `BD`, `TDS` |
| F | `defaultRoute` | one of the canonical Route values in §2.6 |
| G | `createdAt` | ISO datetime |
| H | `updatedAt` | ISO datetime |

Pre-populated with all 16 drugs from §2.4.

### 4.2 Tab: `Investigations` (Master Reference — admin-managed)

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | |
| B | `name` | e.g. `CBC`, `X-Ray Chest PA`, `MRI Lumbar Spine` |
| C | `category` | one of the canonical Investigation Category values in §2.7 |
| D | `createdAt` | |
| E | `updatedAt` | |

**Pre-populated sample data:**  
Blood Test: CBC, LFT, KFT, HbA1c, CRP, ESR, RA Factor, Blood Culture, Blood Sugar F/PP, Electrolytes, TFT, Lipid Profile  
Urine Test: Urine R/M  
X-Ray: Chest PA, Abdomen, LS Spine, Knee  
CT Scan: Brain, Chest, Abdomen, LS Spine  
MRI: Brain, Lumbar Spine, Knee, Shoulder  
USG: Abdomen, Pelvis, Whole Abdomen  
ECG, Echo: Echocardiography, 2D Echo  
Other: Spirometry

### 4.3 Tab: `ProgressReport`

One row per entry. Multiple entries per patient.

| Column | Field | Type | Notes |
|--------|-------|------|-------|
| A | `id` | string | UUID |
| B | `patientId` | string | FK → `Patients.id` |
| C | `ipdNo` | string | denormalised for fast filtering |
| D | `diagnosis` | string | **Populated only on the admission note row** (`isAdmissionNote = "true"`). Empty string on all other rows. See §4.3.1 for semantics. |
| E | `dateTime` | string | ISO 8601 IST |
| F | `isAdmissionNote` | string | `"true"` on the first entry; `"false"` on all subsequent entries |
| G | `doctorNotes` | string | Free text: complaints, vitals, examination findings |
| H | `treatment` | string | Free text: prescriptions and treatments ordered |
| I | `staffName` | string | Who entered this row |
| J | `doctorSignature` | string | Signing doctor name for this entry (optional; defaults to `treatingDoctor`) |
| K | `createdAt` | string | |
| L | `updatedAt` | string | |

#### 4.3.1 Diagnosis Field Semantics

`diagnosis` is stored on **one row per IPD admission** — the row where `isAdmissionNote = "true"`.

- **First POST** for a patient: automatically sets `isAdmissionNote: true` and stores `diagnosis` on that row.
- **Subsequent POSTs**: `isAdmissionNote: false`, `diagnosis` stored as empty string.
- **`DiagnosisBlock` UI**: on load, reads `diagnosis` from the single entry where `isAdmissionNote = "true"`. On save, calls `PUT /api/ipd/progress-report/[admissionNoteId]` sending only `{ diagnosis: "..." }` — the API merges this into the existing row without overwriting other fields.
- **No separate endpoint** for diagnosis — it is updated via the standard `PUT` on the admission note entry.

### 4.4 Tab: `NursingNotes`

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | |
| B | `patientId` | |
| C | `ipdNo` | |
| D | `dateTime` | ISO 8601 IST |
| E | `notes` | What was done/given (e.g. "Inj-Pan 40mg + NS 100ml given") |
| F | `treatment` | Additional treatment given this entry |
| G | `staffName` | Nurse who made the entry |
| H | `isHandover` | `"true"` if this is a shift handover note |
| I | `createdAt` | |
| J | `updatedAt` | |

### 4.5 Tab: `NursingChart`

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | |
| B | `patientId` | |
| C | `ipdNo` | |
| D | `dateTime` | ISO 8601 IST |
| E | `temp` | e.g. `99.2°F` |
| F | `pulse` | e.g. `78/min` |
| G | `bp` | e.g. `130/70` |
| H | `spo2` | e.g. `99%` |
| I | `bsl` | Blood sugar level |
| J | `ivFluids` | IV fluid type and volume |
| K | `staffName` | Nurse name (required) |
| L | `createdAt` | |
| M | `updatedAt` | |

> **Validation rule:** `staffName` and `dateTime` are always required. At least one of `temp`, `pulse`, `bp`, `spo2` must be non-empty. Rows with all clinical fields empty are rejected with a 400 error.

### 4.6 Tab: `DrugOrders`

One row per **drug** per patient. Day columns store time strings, not checkboxes.

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | |
| B | `patientId` | |
| C | `ipdNo` | |
| D | `drugName` | From `Medicines` dropdown |
| E | `drugAllergy` | **Intentionally denormalised** from patient record; stored per row for self-contained PDF rendering |
| F | `frequency` | One of the canonical Frequency values (§2.5) |
| G | `route` | One of the canonical Route values (§2.6) — e.g. `IV`, `INJ (IM)`, `Oral (TAB)` |
| H | `startDate` | Date started. Maps to `day1`. `day2` = startDate + 1 calendar day (IST). |
| I | `ward` | **Intentionally denormalised** from patient record for PDF rendering |
| J | `bedNo` | **Intentionally denormalised** from patient record for PDF rendering |
| K–AT | `day1`–`day36` | Comma-separated administration times for that calendar day, e.g. `5:30PM,8PM` |
| AU | `medOfficerSignature` | Officer who signed the order |
| AV | `createdAt` | |
| AW | `updatedAt` | |

#### 4.6.1 36-Day Limit

`DrugOrders` supports a maximum of **36 calendar days** per drug row (columns `day1`–`day36`). If a patient's stay extends beyond 36 days, a **new row** must be created for the same drug with a new `startDate` pointing to day 37 onward. Extending the column schema beyond day 36 is **out of scope for v1**.

### 4.7 Tab: `PatientAdvice`

One row per investigation advised to the patient.

| Column | Field | Notes |
|--------|-------|-------|
| A | `id` | |
| B | `patientId` | |
| C | `ipdNo` | |
| D | `dateTime` | ISO 8601 IST |
| E | `category` | One of the canonical Investigation Category values (§2.7): `Blood Test` / `Urine Test` / `X-Ray` / `CT Scan` / `MRI` / `USG` / `ECG` / `Echo` / `Other` |
| F | `investigationName` | **Comma-separated list** of selected tests (e.g. `"CBC, LFT, KFT"`). Multiple investigations selected via multi-select UI per entry; stored as one comma-separated string. |
| G | `notes` | Additional instruction (e.g. `fasting`, `with contrast`) |
| H | `advisedBy` | Doctor name |
| I | `status` | `Pending` / `Done` / `Report Received` |
| J | `reportNotes` | Brief result summary when status = Done / Report Received |
| K | `createdAt` | |
| L | `updatedAt` | |

### 4.8 Existing Tab: `Patients` — `bedNo` Column Added

`bedNo` is added to the `Patients` sheet (after `timeOfDischarge`) and to the Admission Form UI. It auto-fills in all IPD form headers (Progress Report PDF, Drug Order PDF) without re-entry.

**Existing field (no change for IPD v1):** `treatingDoctor` is already on `Patients` and the Admission Form. All four IPD PDF signature blocks use this value (see §2.8, §8).

**Required code changes:**
- Add `bedNo` after `timeOfDischarge` in `patientToRow`, `rowToPatient`, and `initializeSheet` headers in `PatientModel`
- Add `bedNo: string | null` to the `Patient` interface
- Add `Bed No.` field to `components/admission-form.tsx`

---

## 5. API Routes

All routes require an authenticated session. See §3.6 for role rules.

```
# Master data (read-only)
GET    /api/medicines
GET    /api/investigations

# Progress Report
GET    /api/ipd/progress-report?patientId=
POST   /api/ipd/progress-report
PUT    /api/ipd/progress-report/[id]
DELETE /api/ipd/progress-report/[id]          ← ADMIN only

# Nursing Notes
GET    /api/ipd/nursing-notes?patientId=
POST   /api/ipd/nursing-notes
PUT    /api/ipd/nursing-notes/[id]
DELETE /api/ipd/nursing-notes/[id]            ← ADMIN only

# Nursing Chart
GET    /api/ipd/nursing-chart?patientId=
POST   /api/ipd/nursing-chart
PUT    /api/ipd/nursing-chart/[id]
DELETE /api/ipd/nursing-chart/[id]            ← ADMIN only

# Drug Orders
GET    /api/ipd/drug-orders?patientId=
POST   /api/ipd/drug-orders
PUT    /api/ipd/drug-orders/[id]
DELETE /api/ipd/drug-orders/[id]              ← ADMIN only

# Patient Advice
GET    /api/ipd/advice?patientId=
POST   /api/ipd/advice
PUT    /api/ipd/advice/[id]
DELETE /api/ipd/advice/[id]                   ← ADMIN only

# PDF Export — 4 form templates + 1 combined
GET    /api/patients/[id]/ipd-pdf                       ← combined (4 forms)
GET    /api/patients/[id]/ipd-pdf?form=progress-report  ← includes Advice box
GET    /api/patients/[id]/ipd-pdf?form=nursing-notes
GET    /api/patients/[id]/ipd-pdf?form=nursing-chart
GET    /api/patients/[id]/ipd-pdf?form=drug-orders
# No ?form=advice — Advice is embedded inside the Progress Report PDF
```

---

## 6. UI Component Plan

### 6.1 New Components

| Component | File | Purpose |
|-----------|------|---------|
| `IpdTreatmentPanel` | `components/ipd-treatment-panel.tsx` | Patient search + sub-tab shell |
| `PatientContextBanner` | `components/ipd/patient-context-banner.tsx` | Persistent patient identity strip |
| `ProgressReportView` | `components/ipd/progress-report-view.tsx` | DiagnosisBlock + ClinicalNoteTable parent |
| `DiagnosisBlock` | `components/ipd/diagnosis-block.tsx` | Editable diagnosis; PUTs to admission note row |
| `ClinicalNoteForm` | `components/ipd/clinical-note-form.tsx` | Add/edit a single Progress Report entry |
| `ClinicalNoteTable` | `components/ipd/clinical-note-table.tsx` | All entries with edit/delete actions |
| `NursingNotesView` | `components/ipd/nursing-notes-view.tsx` | NursingNoteForm + NursingNoteTable parent |
| `NursingNoteForm` | `components/ipd/nursing-note-form.tsx` | Add/edit nursing entry; Handover toggle |
| `NursingNoteTable` | `components/ipd/nursing-note-table.tsx` | All nursing entries |
| `NursingChartView` | `components/ipd/nursing-chart-view.tsx` | VitalsForm + VitalsTable parent |
| `VitalsForm` | `components/ipd/vitals-form.tsx` | Inline quick-add vitals row |
| `VitalsTable` | `components/ipd/vitals-table.tsx` | All vital sign entries |
| `DrugOrderView` | `components/ipd/drug-order-view.tsx` | DrugOrderForm + DrugDayGrid parent |
| `DrugOrderForm` | `components/ipd/drug-order-form.tsx` | Add drug (MedicineSelect + freq/route/startDate) |
| `DrugDayGrid` | `components/ipd/drug-day-grid.tsx` | Horizontal day × drug grid; editable time cells |
| `AdviceView` | `components/ipd/advice-view.tsx` | AdviceForm + AdviceTable parent |
| `AdviceForm` | `components/ipd/advice-form.tsx` | Add advice (InvestigationSelect + status) |
| `AdviceTable` | `components/ipd/advice-table.tsx` | All advice entries; inline status update |
| `MedicineSelect` | `components/ipd/medicine-select.tsx` | Searchable dropdown fetching `/api/medicines` |
| `InvestigationSelect` | `components/ipd/investigation-select.tsx` | Searchable dropdown fetching `/api/investigations` |
| `IpdPdfExport` | `components/ipd/ipd-pdf-export.tsx` | 4 individual + 1 combined download buttons |

### 6.2 Modified Files

| File | Change |
|------|--------|
| `app/dashboard/page.tsx` | Add `'ipd'` tab type; add `selectedPatient` state |
| `components/patient-list.tsx` | Add "Open IPD" button per row |
| `components/admission-form.tsx` | Add `Bed No.` field |
| `lib/validations.ts` | Add 5 new Zod schemas; remove unused `admissionSchema` |
| `lib/sheets-models.ts` | Add 7 new Model classes; fix bugs #1, #1b, #2, #3 |
| `lib/google-sheets.ts` | Add 7 new `SHEET_NAMES` entries; remove `ADMISSIONS` |
| `lib/translations.ts` | Add EN/MR strings for new UI labels |
| `scripts/create-sheets.ts` | Create 7 new sheet tabs with headers |

---

## 7. UI Design Specifications

### 7.1 Patient Context Banner

```
┌────────────────────────────────────────────────────────────────────┐
│  Bharatkumar Suvald Jangid  │  IPD: 188  │  UHID: Z-21667         │
│  Age: 42  │  Sex: M  │  Ward: Deluxe  │  Dr. Deshmukh Ajinkya     │
│                                              [Change Patient]       │
└────────────────────────────────────────────────────────────────────┘
```

### 7.2 Progress Report Tab

```
DIAGNOSIS
┌──────────────────────────────────────────────────────────────┐
│  Viral Fever c severe Joint pain (IPD) c severe myalgia      │
│  [textarea — editable]                             [Save]    │
└──────────────────────────────────────────────────────────────┘

CLINICAL NOTES                                  [+ Add Entry]
┌──────────┬─────────────────────────────┬──────────────────┬──────────┐
│ Date &   │ Doctor's Notes              │ Treatment        │ Actions  │
│ Time     │                             │                  │          │
├──────────┼─────────────────────────────┼──────────────────┼──────────┤
│ 23/3/26  │ C/O Fever & chills          │ Inj Pan 40mg OD  │  ✏  🗑  │
│ 9 PM     │ O/E: BP 110/70, PR 70/min   │ Tab HCQ 1-0-1    │          │
└──────────┴─────────────────────────────┴──────────────────┴──────────┘
```

### 7.3 Add Clinical Note Form

```
┌──────────────────────────────────────────────────────┐
│  Add Clinical Note                                    │
├──────────────────────────────────────────────────────┤
│  Date: [date picker]        Time: [time input]        │
│                                                       │
│  Doctor's Notes:                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  C/O Fever & chills                          │    │
│  │  O/E: BP 110/70, PR 70/min, SPO2 98%        │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  Treatment Ordered:                                   │
│  ┌──────────────────────────────────────────────┐    │
│  │  Inj Pan 40mg BD IV, Tab HCQ 300mg 1-0-1    │    │
│  └──────────────────────────────────────────────┘    │
│                                                       │
│  Staff Name: [text]    Signing Doctor: [text]         │
│                                                       │
│                      [Cancel]   [Save Entry]          │
└──────────────────────────────────────────────────────┘
```

### 7.4 Nursing Notes Tab

```
NURSING NOTES                                 [+ Add Note]
┌──────────┬─────────────────────────────────────────┬──────────┐
│ Date &   │ Notes / Treatment Given                  │ Actions  │
│ Time     │                                          │          │
├──────────┼─────────────────────────────────────────┼──────────┤
│ 23/3/26  │ Inj-Pan 40mg + NS 100ml given,           │  ✏  🗑  │
│ 5:30 PM  │ Tab-Etodonol ER 300mg given              │          │
├──────────┼─────────────────────────────────────────┼──────────┤
│ 23/3/26  │ ⇄ HANDOVER TO NIGHT DUTY                │  ✏  🗑  │
│ 9 PM     │ Tab-Drotik MF, Syp-Cadilase 15ml given  │          │
└──────────┴─────────────────────────────────────────┴──────────┘
```

Add Note Form: Date/Time · Notes (textarea) · Treatment Given (textarea) · Staff Name · Is Handover (toggle)

### 7.5 Nursing Chart Tab

```
VITAL SIGNS                                          [+ Add Reading]

Date/Time [__] Temp [___] P/Min [__] B.P [__/__] SPO2 [__%] BSL [___] IV Fluids [______] Staff [_____] [Add]
(at least one of Temp/P/Min/B.P/SPO2 required)

┌───────────┬──────┬───────┬────────┬──────┬────┬────────────┬───────────┐
│ DATE/TIME │ TEMP │ P/MIN │ B.P    │ SPO2 │ BSL│ IV FLUIDS  │ NAME OF   │
│           │      │       │        │      │    │            │ STAFF     │
├───────────┼──────┼───────┼────────┼──────┼────┼────────────┼───────────┤
│ 23/3 9PM  │99.2°F│ 78/m  │130/70  │ 99%  │  — │ DNS 500ml  │ Nurse X  │
└───────────┴──────┴───────┴────────┴──────┴────┴────────────┴───────────┘
```

### 7.6 Drug Orders Tab

```
DRUG ORDER SHEET       Drug Allergy: [__________]    [+ Add Drug]

Drug Name: [MedicineSelect — searchable]
Freq: [BD ▾]   Route: [IV ▾]   Start Date: [date picker]
Ward/Bed: (auto-filled from patient)
                                               [Save Drug]

ADMINISTRATION GRID (horizontal scroll, up to 36 days):

Drug          │Freq│Route   │Start │23/3  │24/3  │25/3  │...│
──────────────┼────┼────────┼──────┼──────┼──────┼──────┤   │
INJ PAN 40mg  │ BD │IV      │23/3  │5:30PM│8AM   │8AM   │   │
              │    │        │      │8PM   │8PM   │8PM   │   │
──────────────┼────┼────────┼──────┼──────┼──────┼──────┤   │
INJ C-ONE SB  │ BD │IV      │23/3  │11:30P│8:30AM│8AM   │   │
1.5gm         │    │        │      │6:30AM│11:45P│8PM   │   │
──────────────┴────┴────────┴──────┴──────┴──────┴──────┘

Click any day cell → popup pre-filled with saved times → edit freely → Save

Medical Officer Signature: [_______________________]
```

> If a drug's administration extends beyond day 36, add a new row for that drug with a new Start Date (see §4.6.1).

### 7.7 Advice Tab

```
PATIENT ADVICE                                      [+ Add Advice]

┌──────────┬─────────────┬───────────────────────────┬──────────┬──────────┬─────────┐
│ Date &   │ Category    │ Investigation             │ Advised  │ Status   │ Actions │
│ Time     │             │ (multi-select badges)     │ By       │          │         │
├──────────┼─────────────┼───────────────────────────┼──────────┼──────────┼─────────┤
│ 31/3/26  │ Blood Test  │ [CBC] [LFT] [KFT] [HbA1c] │ Dr. Zawr │[Pending▾]│  ✏  🗑 │
│ 11:53AM  │ Blood Test  │ [CBC]                     │ Dr. Zawr │[Done   ▾]│  ✏  🗑 │
└──────────┴─────────────┴───────────────────────────┴──────────┴──────────┴─────────┘
```

**Add Advice Form fields:**
- Date / Time
- Category — §2.7 dropdown
- Investigation — **multi-select** filtered by category; multiple tests can be selected per entry (e.g. CBC + LFT + KFT in one save). Values stored as comma-separated string in `investigationName`.
- Notes (optional) — e.g. "fasting, with contrast"
- Advised By — doctor name
- Status — native `<select>`: `Pending` / `Done` / `Report Received`
- Report Notes — visible only when Status = Done / Report Received

**Error handling:** API validation errors are shown as an inline red banner inside the form (above the action buttons) in addition to a toast notification. This ensures errors are never missed regardless of toast position or timing.

### 7.8 Export PDF Panel

```
┌──────────────────────────────────────────────┐
│  Export IPD Documents — Bharatkumar Jangid       │
├──────────────────────────────────────────────────┤
│  [↓ Progress Report PDF]                         │
│     (includes Investigations/Advice box)         │
│  [↓ Nursing Notes PDF]                           │
│  [↓ Nursing Chart PDF]                           │
│  [↓ Drug Order Sheet PDF (Portrait)]             │
│  ────────────────────────────────────            │
│  [↓ Complete IPD Package — All 4 Forms]          │
└──────────────────────────────────────────────────┘
```

---

## 8. PDF Template Specifications

All PDFs must match the physical Zawar Hospital form layout exactly, for printing and filing alongside paper records.

### 8.1 Progress Report PDF

- **Page:** A4, portrait
- **Header:** "PROGRESS REPORT" badge (black, top-left) · ZH logo (top-right) · UHID box (top-right, below logo)
- **Patient strip:** `Patient Name` · `I.P.D No.` · `Age` · `SEX: M/F` · `BED No.` (from `Patients.bedNo`)
- **Diagnosis block:** lightly shaded free-text area below patient strip, labelled "CLINICAL NOTE"
- **Table:** Date & Time (15%) · Doctor's Notes (45%) · Treatment (40%); all entries chronologically; multi-line wrap; auto page-break
- **Advice Box:** Rendered **below the last clinical note row**, before the footer, only if at least one `PatientAdvice` entry exists:

  ```
  ┌──────────────────────────────────────────────────────────────┐
  │  INVESTIGATIONS / ADVICE                                     │
  ├──────────┬──────────────┬────────────────┬───────┬──────────┤
  │ Date     │ Category     │ Investigation  │ Notes │ Status   │
  ├──────────┼──────────────┼────────────────┼───────┼──────────┤
  │ 23/3 9PM │ Blood Test   │ CBC            │  —    │ Pending  │
  │ 23/3 9PM │ CT Scan      │ CT Brain       │  —    │ Pending  │
  └──────────┴──────────────┴────────────────┴───────┴──────────┘
  ```

- **Footer:** *Every Entry to be Named, Signed, Dated & Timed* · Doctor signature block (name, qualifications, reg no) bottom-right; hospital address bottom-left

### 8.2 Nursing Notes PDF

- **Page:** A4, portrait
- **UHID:** rendered at top-right above the form boundary (matches physical form)
- **Header:** "NURSING NOTES" badge (black, top-left) · ZH logo + "Zawar Hospital" (top-right)
- **Patient strip Line 1:** `Patient Name:` ____________ `Age` ______
- **Patient strip Line 2:** `IPD No.` ____________ `Sex M/F` ______  — **No Bed No. on this form**
- **Table:** Date & Time (15%) · Doctor's Notes (45%) · Treatment (40%) — **two separate columns, not merged**
- **Handover rows:** grey background + "⇄ HANDOVER" prefix
- **Signature block:** uses `treatingDoctor` from `Patients` sheet. The physical form is signed by the treating doctor even though entries are made by nursing staff; this matches the physical form's layout. Staff who made each entry is captured in `staffName` per row.
- **Footer:** *Every Entry to be Named, Signed, Dated & Timed*

### 8.3 Nursing Chart PDF

- **Page:** A4, **portrait** (changed from landscape — matches physical A4 form)
- **Header:** "NURSING CHART" badge · ZH logo · "Zawar Hospital"
- **Patient strip:** `Patient Name` · `Age` · `IPD No.` · `Sex M/F`
- **Table:** DATE/TIME · TEMP · P/MIN · B.P · SPO2 · BSL · IV FLUIDS · NAME OF STAFF
- **Footer:** doctor signature block

### 8.4 Drug Order Sheet PDF

- **Page:** A4, **portrait** (changed from landscape — matches physical form proportions)
- **Document title:** `"Order Sheet — <Patient Full Name>"` (visible in PDF viewer)
- **Header:** ZH logo + Marathi hospital name `झंवर हॉस्पिटल` (centre) · "ORDER SHEET" badge (right)
  - Marathi text rendered using embedded Noto Sans Devanagari font (base64 TTF `@font-face`) for reliable headless Chrome rendering
  - Logo loaded from `public/images/zh-logo.svg` as inline base64 data URI
- **Patient strip (horizontal row below header):** Full-width flex bar with bordered cells — Patient Name · Drug Allergy · Age · Sex M/F · Ward · Room/Bed No. · IPD No.
  - Drug Allergy cell is **blank** if not entered (no default value; never shows "NKDA" unless explicitly stored)
  - All values sourced from denormalised columns on `DrugOrders` row
- **Table columns:** Name of Drug · Freq. · Route · Date: (×7 blank date columns)
  - Column `#` (row number) not used. **Start** column shows each row’s `startDate` (D/M/YYYY) from data entry; blank **Date:** columns remain for handwritten calendar dates on paper.
  - Date column headers show only `"Date:"` with a blank writeable line — **staff fills the actual date on the printed paper**. No computed dates are pre-printed.
  - 3 date columns per page with wider Name of Drug / Freq. / Route columns
  - Pages: days 1–3, 4–6, … up to 19–21; continuation sheets marked "PTO" when after page 1
  - Drug administration times (comma-separated) are still rendered in cells in the correct day-order sequence
- **Footer:** Medical Officer Signature block (bottom-left)

### 8.5 Combined IPD Package PDF

Four forms concatenated — each starting on a fresh page. CSS named `@page` rules allow portrait and landscape sections to coexist in one Puppeteer render.

1. Progress Report (portrait) — includes Advice box
2. Nursing Notes (portrait)
3. Nursing Chart (**portrait**)
4. Drug Order Sheet (**portrait**; up to 7 pages for days 1–21, 3 date columns per page)

- Document title: `"IPD Report — <Patient Full Name>"`

> There is no standalone Advice PDF. Advice data is embedded in the Progress Report PDF only (§8.1).

---

## 9. Zod Validation Schemas

```typescript
// Progress Report entry
export const progressReportEntrySchema = z.object({
  patientId:        z.string().min(1),
  ipdNo:            z.string().min(1),
  diagnosis:        z.string().optional(),  // only meaningful on admission note row
  dateTime:         z.string().min(1, 'Date and time required'),
  isAdmissionNote:  z.boolean().default(false),
  doctorNotes:      z.string().min(1, 'Notes are required'),
  treatment:        z.string().optional(),
  staffName:        z.string().min(1, 'Staff name required'),
  doctorSignature:  z.string().optional(),
})

// Nursing note entry
export const nursingNoteSchema = z.object({
  patientId:   z.string().min(1),
  ipdNo:       z.string().min(1),
  dateTime:    z.string().min(1),
  notes:       z.string().min(1, 'Notes are required'),
  treatment:   z.string().optional(),
  staffName:   z.string().min(1),
  isHandover:  z.boolean().default(false),
})

// Vital signs entry — at least one clinical field required
export const vitalSignSchema = z.object({
  patientId: z.string().min(1),
  ipdNo:     z.string().min(1),
  dateTime:  z.string().min(1),
  temp:      z.string().optional(),
  pulse:     z.string().optional(),
  bp:        z.string().optional(),
  spo2:      z.string().optional(),
  bsl:       z.string().optional(),
  ivFluids:  z.string().optional(),
  staffName: z.string().min(1),
}).refine(
  (d) => [d.temp, d.pulse, d.bp, d.spo2].some(v => v && v.trim() !== ''),
  { message: 'At least one of Temp, Pulse, B.P, SPO2 is required' }
)

// Drug order
export const drugOrderSchema = z.object({
  patientId:          z.string().min(1),
  ipdNo:              z.string().min(1),
  drugName:           z.string().min(1, 'Drug name required'),
  drugAllergy:        z.string().optional(),
  frequency:          z.enum(['BD','TDS','OD','STAT','SOS','QID','HS','1-0-1','2-2-2','Other']),
  route:              z.enum(['IV','INJ (IM)','Oral (TAB)','Oral (SYP)','Oral (CAP)','Topical','SL','Other']),
  startDate:          z.string().min(1),
  days:               z.record(z.string(), z.string()).optional(),
  medOfficerSignature: z.string().optional(),
  ward:               z.string().optional(),
  bedNo:              z.string().optional(),
})

// Patient advice / investigation
export const patientAdviceSchema = z.object({
  patientId:         z.string().min(1),
  ipdNo:             z.string().min(1),
  dateTime:          z.string().min(1),
  category:          z.enum(['Blood Test','Urine Test','X-Ray','CT Scan','MRI','USG','ECG','Echo','Other']),
  investigationName: z.string().min(1, 'Investigation name required'),
  notes:             z.string().optional(),
  advisedBy:         z.string().min(1),
  status:            z.enum(['Pending','Done','Report Received']).default('Pending'),
  reportNotes:       z.string().optional(),
})
```

---

## 10. TypeScript Interfaces

```typescript
export interface Medicine {
  id: string
  name: string
  category: 'INJ' | 'IV' | 'TAB' | 'SYP' | 'CAP' | 'DROP' | 'CREAM' | 'OTHER'
  defaultDose: string | null
  defaultFrequency: string | null
  defaultRoute: string | null
  createdAt: string
  updatedAt: string
}

export type InvestigationCategory =
  'Blood Test' | 'Urine Test' | 'X-Ray' | 'CT Scan' | 'MRI' | 'USG' | 'ECG' | 'Echo' | 'Other'

export interface Investigation {
  id: string
  name: string
  category: InvestigationCategory
  createdAt: string
  updatedAt: string
}

export interface ProgressReportEntry {
  id: string
  patientId: string
  ipdNo: string
  diagnosis: string | null         // populated only on isAdmissionNote row (see §4.3.1)
  dateTime: string
  isAdmissionNote: boolean
  doctorNotes: string
  treatment: string | null
  staffName: string
  doctorSignature: string | null
  createdAt: string
  updatedAt: string
}

export interface NursingNote {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  notes: string
  treatment: string | null
  staffName: string
  isHandover: boolean
  createdAt: string
  updatedAt: string
}

export interface VitalSign {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  temp: string | null
  pulse: string | null
  bp: string | null
  spo2: string | null
  bsl: string | null
  ivFluids: string | null
  staffName: string
  createdAt: string
  updatedAt: string
}

export interface DrugOrder {
  id: string
  patientId: string
  ipdNo: string
  drugName: string
  drugAllergy: string | null   // denormalised; see §4.6
  frequency: string
  route: string                // canonical Route value from §2.6
  startDate: string
  days: Record<string, string> // { day1: "5:30PM,8PM", day2: "8AM,8PM" }; max day36
  medOfficerSignature: string | null
  ward: string | null          // denormalised; see §4.6
  bedNo: string | null         // denormalised; see §4.6
  createdAt: string
  updatedAt: string
}

export interface PatientAdvice {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  category: InvestigationCategory  // same type as Investigation.category
  investigationName: string
  notes: string | null
  advisedBy: string
  status: 'Pending' | 'Done' | 'Report Received'
  reportNotes: string | null
  createdAt: string
  updatedAt: string
}
```

---

## 11. Implementation Phases

### Phase 1 — Master Data & Data Layer
**Estimated effort:** 3–4 days

- [ ] Add 7 new entries to `SHEET_NAMES` in `lib/google-sheets.ts`; remove `ADMISSIONS`
- [ ] Fix bugs #1, #1b, #2, #3 in `lib/sheets-models.ts` (see §12)
- [ ] Add `MedicineModel`, `InvestigationModel` to `lib/sheets-models.ts`
- [ ] Add `ProgressReportModel`, `NursingNotesModel`, `NursingChartModel`, `DrugOrderModel`, `PatientAdviceModel`
- [ ] Add all 5 Zod schemas to `lib/validations.ts`; remove `admissionSchema`
- [ ] Implement `GET /api/medicines` → `app/api/medicines/route.ts`
- [ ] Implement `GET /api/investigations` → `app/api/investigations/route.ts`
- [ ] Implement CRUD routes for all 5 IPD types under `app/api/ipd/`
- [ ] Update `scripts/create-sheets.ts` to create 7 new tabs with correct headers
- [ ] Pre-populate `Medicines` and `Investigations` tabs in Google Sheets

### Phase 2 — UI Shell & Patient Threading
**Estimated effort:** 1–2 days

- [ ] Add `'ipd'` tab and `selectedPatient: Patient | null` state to `app/dashboard/page.tsx`
- [ ] Build `components/ipd-treatment-panel.tsx` (search + sub-tab shell)
- [ ] Build `components/ipd/patient-context-banner.tsx`
- [ ] Add "Open IPD" button to `components/patient-list.tsx` rows
- [ ] Build `components/ipd/medicine-select.tsx` (fetches `/api/medicines`)
- [ ] Build `components/ipd/investigation-select.tsx` (fetches `/api/investigations`)

### Phase 3 — Data Entry Forms
**Estimated effort:** 4–5 days

- [ ] Progress Report: `components/ipd/diagnosis-block.tsx` + `components/ipd/clinical-note-form.tsx` + `components/ipd/clinical-note-table.tsx`
- [ ] Nursing Notes: `components/ipd/nursing-note-form.tsx` + `components/ipd/nursing-note-table.tsx`
- [ ] Nursing Chart: `components/ipd/vitals-form.tsx` + `components/ipd/vitals-table.tsx`
- [ ] Drug Orders: `components/ipd/drug-order-form.tsx` + `components/ipd/drug-day-grid.tsx`
- [ ] Advice: `components/ipd/advice-form.tsx` + `components/ipd/advice-table.tsx`
- [ ] Inline edit and delete (ADMIN-only delete guard) for all types

### Phase 4 — PDF Generation (4 templates)
**Estimated effort:** 3–4 days

- [ ] Create `lib/ipd-pdf-generator.ts`
- [ ] Implement `app/api/patients/[id]/ipd-pdf/route.ts` with `?form=` dispatch
- [ ] Progress Report HTML template (portrait; diagnosis block + clinical table + Advice box + signature)
- [ ] Nursing Notes HTML template (portrait; two separate columns; handover highlight; signature from `treatingDoctor`)
- [ ] Nursing Chart HTML template (landscape; vitals grid)
- [ ] Drug Order Sheet HTML template (landscape; day × drug grid; PTO page 2 if > 15 days)
- [ ] Combined PDF endpoint (4 templates concatenated; no standalone Advice PDF)
- [ ] Build `components/ipd/ipd-pdf-export.tsx` (4 individual + 1 combined buttons)

### Phase 5 — Polish & QA
**Estimated effort:** 2 days

- [ ] Add EN/MR strings for all new UI labels to `lib/translations.ts`
- [ ] Loading skeletons and empty states for each sub-tab
- [ ] Toast notifications: save success, save error, delete confirmation
- [ ] Fix remaining pre-existing bugs #4, #5, #6, #7 (see §12)
- [ ] Vercel 30s timeout review — browser caching already exists in `lib/pdf-generator-final.ts`
- [ ] End-to-end manual test of complete IPD workflow

**Total estimated: 13–17 days**

---

## 12. Pre-existing Bug Fixes

| # | Issue | Fix | Priority |
|---|-------|-----|----------|
| 1 | `uhidNo` missing from `initializeSheet` column order but referenced in `rowToPatient` | Add `uhidNo` at index 2 in `patientToRow` and `initializeSheet` | **Critical** |
| 1b | `bedNo` not in `Patient` interface or sheet | Add `bedNo` field, sheet column, and Admission Form field | **High** |
| 2 | No `createdByUserId` on patient rows | Add column; populate from `session.user.id` on `POST /api/patients` | High |
| 3 | Client-side bcrypt hashing in `UserManagement` | Move hashing to `PUT/POST /api/users` server route | High |
| 4 | `/api/ward-charges` has no auth guard | Add `getServerSession` check | Medium |
| 5 | `admissionSchema` in `validations.ts` unused | Remove; superseded by the 5 new IPD schemas | Medium |
| 6 | `ADMISSIONS` in `SHEET_NAMES` unused | Remove entry; superseded by **7** new tabs in `SHEET_NAMES` (2 master: `Medicines`, `Investigations` + 5 IPD clinical: ProgressReport, NursingNotes, NursingChart, DrugOrders, PatientAdvice) | Medium |
| 7 | `PatientList` API hardcodes `admissions: []` | Remove dead field from API response | Low |

---

## 13. Testing Plan

### 13.1 Unit Tests

| Module | Test Cases |
|--------|-----------|
| `lib/validations.ts` | Valid/invalid for all 5 schemas; route/frequency enum boundaries; vitalSign refine (all-empty → fail) |
| `MedicineModel` | `findMany`: mocked data, empty sheet, malformed row |
| `InvestigationModel` | Same |
| `ProgressReportModel` | `create`, `findByPatientId`, `update` (diagnosis-only PUT), `delete` |
| `NursingNotesModel` | `create`, `findByPatientId`, `update`, `delete` |
| `NursingChartModel` | Same |
| `DrugOrderModel` | `create` with days record; `update` merging day3 times; row beyond day36 documented |
| `PatientAdviceModel` | `create`, `updateStatus`, `delete` |
| `lib/ipd-pdf-generator.ts` | HTML contains patient name, IPD No, section labels; Advice box absent when no entries |

### 13.2 API Integration Tests

| Endpoint | Scenario | Expected |
|----------|----------|----------|
| `GET /api/medicines` | Authenticated | 200, array |
| `GET /api/medicines` | No session | 401 |
| `POST /api/ipd/progress-report` | Valid body, first entry | 201; row in sheet; `isAdmissionNote = true` |
| `POST /api/ipd/progress-report` | Missing `doctorNotes` | 400 with Zod error |
| `POST /api/ipd/progress-report` | No session | 401 |
| `PUT /api/ipd/progress-report/[id]` | Update `diagnosis` only | 200; only `diagnosis` and `updatedAt` changed |
| `DELETE /api/ipd/progress-report/[id]` | STAFF session | 403 |
| `DELETE /api/ipd/progress-report/[id]` | ADMIN session | 200; row removed |
| `POST /api/ipd/nursing-chart` | All clinical fields empty | 400 (vitalSign refine) |
| `GET /api/ipd/progress-report?patientId=X` | Authenticated | Only entries for patient X |
| `PUT /api/ipd/drug-orders/[id]` | Update day3 times | 200; `day3` column updated |
| `GET /api/patients/[id]/ipd-pdf?form=drug-orders` | Authenticated | Binary PDF, portrait; blank date headers |
| `GET /api/patients/[id]/ipd-pdf?form=progress-report` | Patient has advice entries | PDF contains Advice box |
| `GET /api/patients/[id]/ipd-pdf?form=progress-report` | No advice entries | PDF rendered without Advice box |
| `GET /api/patients/[id]/ipd-pdf` | Combined | Binary PDF, **4 sections** |
| `GET /api/patients/[id]/ipd-pdf?form=advice` | Any | 400 — route does not exist |

### 13.3 Manual / Browser Tests

| Test | Steps | Pass Criteria |
|------|-------|---------------|
| Full IPD workflow | Login → Patient Records → "Open IPD" → add Progress Report entry | Entry in table + sheet row created |
| Diagnosis block | Open IPD → type in Diagnosis → Save | Only admission note row's `diagnosis` field updated in sheet |
| Medicine dropdown | In Progress Report form, type "PAN" | Shows "INJ PAN 40mg" |
| Investigation dropdown | In Advice form, select "Blood Test" | Filters to blood test options |
| Patient context | Switch between sub-tabs | Banner unchanged throughout |
| Drug day grid | Add drug, click Day 1 cell, enter "8AM,8PM" | Cell shows "8AM / 8PM"; sheet updated |
| Drug day edit | Re-click Day 1 cell | Popup pre-filled with "8AM,8PM" |
| Drug day grid — Day 2 | Enter "8AM" for Day 2 | `day2` column updated |
| Handover toggle | Add nursing note with "Is Handover" on | Row shows "⇄ HANDOVER" badge |
| PDF — Progress Report | Download | Diagnosis block, clinical table, Advice box present |
| PDF — no advice | Download Progress Report with no advice | Advice box absent |
| PDF — Nursing Notes | Download | UHID top-right; no Bed No; two separate columns |
| PDF — Drug Orders | Download | Portrait; horizontal patient strip below header; blank "Date:" column headers; 3 date columns per page; PTO on continuation pages when data spans beyond page 1 |
| PDF — Drug Orders drug allergy blank | Download with no drug allergy entered | Drug Allergy cell is blank (not "NKDA") |
| PDF — Nursing Chart | Download | Portrait A4; vitals table correct |
| Investigation multi-select | In Advice form, select "Blood Test" category, then select CBC + LFT + KFT | All three appear as badge pills in Investigation field; saved as "CBC, LFT, KFT" in sheet |
| Advice error shown | Submit Advice form without filling required field | Inline red error banner visible inside form |
| Combined PDF | Download | **4 sections** in correct order; all pages portrait |
| Delete as STAFF | STAFF tries DELETE on any entry | 403 Forbidden |
| Delete as ADMIN | ADMIN deletes Progress Report entry | Removed from table and sheet |
| Advice status | Change Pending → Done | Sheet updated; UI reflects change |
| Bed No. auto-fill | Admit patient with Bed No. "Deluxe" | Bed No. in Progress Report and Drug Order PDF headers |
| Vitals — all empty | Submit vitals row with no temp/pulse/bp/spo2 | Validation error shown |
| Route enum | Select "INJ (IM)" in drug form | Saved as `INJ (IM)` (with space) in sheet |
| Role — STAFF | Login as STAFF | IPD tab visible; User Management tab hidden |
| Empty state | No entries for patient | Friendly empty state in each sub-tab |
| Long text | Doctor note > 500 chars | Wraps correctly in table and PDF |
| Vercel deploy | Deploy + test all IPD routes | All routes respond < 30s |

---

## 14. File Change Summary

### New Files

```
app/api/
  medicines/route.ts
  investigations/route.ts
  ipd/
    progress-report/route.ts
    progress-report/[id]/route.ts
    nursing-notes/route.ts
    nursing-notes/[id]/route.ts
    nursing-chart/route.ts
    nursing-chart/[id]/route.ts
    drug-orders/route.ts
    drug-orders/[id]/route.ts
    advice/route.ts
    advice/[id]/route.ts
  patients/[id]/ipd-pdf/route.ts

components/
  ipd-treatment-panel.tsx
  ipd/
    patient-context-banner.tsx
    medicine-select.tsx
    investigation-select.tsx
    diagnosis-block.tsx
    clinical-note-form.tsx
    clinical-note-table.tsx
    nursing-note-form.tsx
    nursing-note-table.tsx
    vitals-form.tsx
    vitals-table.tsx
    drug-order-form.tsx
    drug-day-grid.tsx
    advice-form.tsx
    advice-table.tsx
    ipd-pdf-export.tsx

lib/
  ipd-pdf-generator.ts
```

### Modified Files

```
lib/google-sheets.ts        ← +7 SHEET_NAMES; remove ADMISSIONS
lib/sheets-models.ts        ← +7 Model classes; fix bugs #1, #1b, #2, #3
lib/validations.ts          ← +5 schemas; remove admissionSchema
lib/translations.ts         ← +EN/MR labels
app/dashboard/page.tsx      ← +IPD tab; +selectedPatient state
components/patient-list.tsx ← +"Open IPD" action button
components/admission-form.tsx ← +Bed No. field
scripts/create-sheets.ts    ← +7 new tab creation
```

---

## 15. Design Decisions — Single Source of Truth

| Decision | Value |
|----------|-------|
| Frequency options | `BD` · `TDS` · `OD` · `STAT` · `SOS` · `QID` · `HS` · `1-0-1` · `2-2-2` · `Other` |
| Route options | `IV` · `INJ (IM)` · `Oral (TAB)` · `Oral (SYP)` · `Oral (CAP)` · `Topical` · `SL` · `Other` |
| Investigation categories | `Blood Test` · `Urine Test` · `X-Ray` · `CT Scan` · `MRI` · `USG` · `ECG` · `Echo` · `Other` |
| Day cell format | Comma-separated time strings, e.g. `5:30PM,8PM` |
| Datetime storage | ISO 8601 with IST offset `+05:30` |
| Drug names source | `Medicines` Google Sheet tab — admin-managed, pre-seeded |
| Investigation names source | `Investigations` Google Sheet tab — admin-managed, pre-seeded |
| Bed No. source | `Patients` sheet `bedNo` column — entered at admission |
| UHID on Nursing Notes PDF | Yes — shown at top-right above printed header |
| Nursing Notes — Bed No. in PDF | No — matches physical form |
| Nursing Notes PDF signature | Uses `treatingDoctor` from `Patients` sheet (physical form is doctor-signed) |
| Advice standalone PDF | None — embedded as box in Progress Report PDF |
| Number of PDF export templates | **4**: Progress Report, Nursing Notes, Nursing Chart, Drug Orders |
| Combined PDF sections | **4** in order: Progress Report (with Advice box), Nursing Notes, Nursing Chart, Drug Orders |
| Delete permission | ADMIN only; STAFF gets 403 |
| Diagnosis storage | One row per IPD episode (`isAdmissionNote = true`); `DiagnosisBlock` PUTs that row |
| 36-day limit | Hard cap at `day36`; new drug row required for stays > 36 days |
| Vitals required fields | `staffName` + `dateTime` always; at least one of `temp`/`pulse`/`bp`/`spo2` |
| Concurrency | Last-write-wins; UI refreshes after save; no warning in v1 |
| Denormalisation in DrugOrders | `drugAllergy`, `ward`, `bedNo` intentionally copied per row for self-contained PDF rendering |
| Audit trail (v1) | `staffName` per row + `createdAt`/`updatedAt`; no separate audit log table |
| Nursing Chart orientation | Portrait A4 (matches physical form) |
| Drug Order Sheet orientation | Portrait A4 (matches physical form) |
| Drug Order date column headers | Blank `"Date:"` only — staff writes actual dates on printed paper; no pre-computed dates in PDF |
| Drug Order columns per page | 3 date columns per page on portrait A4; wider Name / Freq. / Route; up to 7 pages for days 1–21 |
| Drug Order PDF columns | `#` omitted; **Start** (system date per row) + 3× blank **Date:** per page |
| Drug Allergy default | **No default** — field is blank if not entered; "NKDA" is never auto-filled |
| Multi-select investigations | Advice form allows multiple investigation names per entry; stored as comma-separated string in `investigationName` |
| Advice status control | Native HTML `<select>` (not Radix UI Select) to avoid lazy-mount rendering issues |
| Advice form error display | Inline red banner inside form + `toast.error()` for API validation errors |
| PDF document title | Each PDF has a `<title>` tag: `"Progress Report — <name>"`, `"Nursing Notes — <name>"`, `"Nursing Chart — <name>"`, `"Order Sheet — <name>"`, `"IPD Report — <name>"` (combined) |
| Marathi font rendering | Noto Sans Devanagari TTF embedded as base64 `@font-face` data URI in PDF CSS — ensures correct rendering in headless Chrome without network font loading |
| PDF logo | ZH logo loaded from `public/images/zh-logo.svg` as inline base64 SVG data URI at render time |
| PDF render wait | `waitForRender()` waits for all `<img>` elements and `document.fonts.ready` before generating PDF, preventing blank logos |

---

## 16. Consistency Changelog (v2.1 → v2.2)

- **PDF count unified to 4:** Phase 4 checklist removed "Advice PDF" and "all 5 forms"; combined PDF now documented as 4 sections everywhere (§5, §8.5, §11, §13.2, §13.3, §14, §15).
- **Section renumbered:** §4.7 (`PatientAdvice`) and §4.8 (`Patients/bedNo`) were out of order in v2.1; corrected to sequential order.
- **Route enum canonicalised:** `INJ (IM)` (with space) is now consistent across §2.6, §4.6, §9 Zod enum, §10 TypeScript comments, and §15 decisions table.
- **Investigation categories aligned:** `Urine Test` and `Echo` were missing from §4.7 `PatientAdvice` category column description in v2.1; now consistent with §2.7, §4.2, Zod, and TypeScript across all four locations.
- **Diagnosis semantics defined:** §4.3.1 added with precise rules for `isAdmissionNote` row, `DiagnosisBlock` PUT behaviour, and how subsequent entries handle the field.
- **36-day limit documented:** §4.6.1 added; behaviour beyond day 36 is explicit (new row, out of scope for extending columns).
- **Vital signs validation added:** `vitalSignSchema` extended with `.refine()` requiring at least one of temp/pulse/bp/spo2; noted in §4.5, §9, §13.2, §13.3.
- **Datetime storage specified:** §3.4 added — ISO 8601 IST, display format DD/MM/YY HH:MM.
- **Concurrency policy added:** §3.5 — last-write-wins, UI refreshes after save.
- **Security/audit scope stated:** §3.6 — ADMIN delete, staffName audit trail, no audit log UI in v1.
- **Denormalisation intent documented:** §4.6 notes for `drugAllergy`, `ward`, `bedNo`; §15 decision entry added.
- **Nursing Notes PDF signature clarified:** §8.2 — doctor signs the form (matches physical); nurse staffName is captured per entry row.
- **Architecture diagram updated:** §3.1 shows Advice as a peer tab alongside all other tabs (not a child of Drug Orders as in v2.1).
- **Sections 15 & 16 merged:** v2.1 had two separate decision tables with overlapping content; merged into a single §15 decisions table.
- **PatientAdvice `category` type fixed:** v2.1 had `category: string` in the TypeScript interface; now uses `InvestigationCategory` union type.
- **Phase 4 checkbox wording corrected:** "all 5 forms" → "4 templates"; "Combined PDF (all 5)" → "4 templates concatenated".
- **Testing §13.2 combined PDF expectation fixed:** "all 5 sections" → "4 sections"; `?form=advice` test added (expects 400).
- **Bug fix §12:** Entry #6 aligned with Phase 1: **7** new sheet tabs (2 master + 5 IPD clinical), distinct from **4** PDF export templates.
- **v2.2.1:** §1 out-of-scope wording fixed (day-column cap vs multi-row continuation); §12 #6 explicitly lists 7 tabs; §4.8 states `treatingDoctor` already exists on `Patients`.

---

## 17. Post-Implementation Changelog (v2.3.0)

Changes applied after the baseline spec was used for development. All sections updated above.

### 17.1 PDF Layout Changes

| Area | Spec (v2.2) | Implemented (v2.3) |
|------|-------------|---------------------|
| Nursing Chart orientation | Landscape | **Portrait** |
| Drug Order Sheet orientation | Landscape | **Portrait** |
| Drug Order patient strip | Vertical left sidebar | **Horizontal row below header** |
| Drug Order columns | `#` · Name · Freq · Route · Start · 1…15 (numbered days + date sub-row) | Name · Freq. · Route · **Start** (D/M/YYYY from sheet) · `Date:` (×3 blank per page) |
| Drug Order pages | Page 1: days 1–15; PTO page 2: days 16–36 | Up to 7 pages: days 1–3, 4–6, … 19–21; PTO on pages after the first |
| Drug Order date headers | Computed calendar dates (e.g. 31/3, 1/4) | **Blank** — staff writes dates on printed paper |
| Drug Allergy default | "NKDA" when not entered | **Blank** when not entered |
| Combined PDF Drug Order | Landscape | **Portrait** |

### 17.2 Advice Form Changes

| Area | Spec (v2.2) | Implemented (v2.3) |
|------|-------------|---------------------|
| Investigation field | Single select | **Multi-select** — multiple tests per entry; stored comma-separated |
| Status field control | Radix UI `Select` (react-hook-form managed) | **Native `<select>`** — eliminates lazy-mount rendering blank |
| Error display | Toast only | **Inline red banner** inside form + toast |

### 17.3 PDF Technical Infrastructure

| Feature | Description |
|---------|-------------|
| Document `<title>` | Each PDF HTML template now has a `<title>` tag (e.g. `"Order Sheet — Ketan Prafulal Mulay"`), fixing "about:blank" shown in PDF viewers |
| Marathi font | Noto Sans Devanagari TTF (`public/fonts/NotoSansDevanagari-Regular.ttf`) embedded as base64 `@font-face` data URI in all PDF CSS — no Google Fonts network request in headless Chrome |
| Hospital logo | Replaced broken base64 PNG with dynamic inline SVG loaded from `public/images/zh-logo.svg` at render time |
| Render wait | `waitForRender()` function resolves after all `<img>` elements load and `document.fonts.ready` fires, plus 200ms buffer, before calling `page.pdf()` |
| Browser singleton | `lib/browser.ts` conditionally applies Linux-specific Chrome flags only on Linux; skips `@sparticuz/chromium` in development |
| Puppeteer timeout | Increased from 30s to 60s |

### 17.4 Other Runtime Fixes

| Fix | Description |
|-----|-------------|
| Grammarly extension React error | Added `data-gramm="false" data-gramm_editor="false"` to all `<textarea>` elements to prevent Grammarly's React root injection |
| Client state `Array.entries` collision | Client-side data assignment now checks `Array.isArray(data)` before accessing `.entries` / `.vitals` etc. properties, preventing native iterator method from being assigned to state |
| Advice `investigationName` column | The `PatientAdvice.investigationName` field stores a comma-separated list of test names (e.g. `"CBC, LFT, KFT"`) to support multi-select. The column definition in §4.7 reflects this. |
