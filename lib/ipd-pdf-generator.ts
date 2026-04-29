import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { getBrowser } from './browser'
import {
  DRUG_ORDER_DATE_COLUMNS_PER_PAGE,
  DRUG_ORDER_PDF_MAX_DAYS,
  WARD_DISPLAY_NAMES,
} from './ipd-types'

// ---------------------------------------------------------------------------
// TypeScript interfaces (§10 of spec)
// ---------------------------------------------------------------------------

export interface IPDPatient {
  id: string
  ipdNo: string | null
  uhidNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  age: number
  sex: 'M' | 'F'
  ward: string
  treatingDoctor: string | null
  bedNo?: string | null
}

export interface ProgressReportEntry {
  id: string
  patientId: string
  ipdNo: string
  diagnosis: string | null
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
  drugAllergy: string | null
  frequency: string
  route: string
  startDate: string
  days: Record<string, string>
  medOfficerSignature: string | null
  ward: string | null
  bedNo: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientAdvice {
  id: string
  patientId: string
  ipdNo: string
  dateTime: string
  category: string
  investigationName: string
  notes: string | null
  advisedBy: string
  status: 'Pending' | 'Done' | 'Report Received'
  reportNotes: string | null
  createdAt: string
  updatedAt: string
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape HTML special characters. */
const esc = (s: string | null | undefined): string => {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Bordered UHID line; when empty, leaves a wide box for handwriting. */
const uhidBoxHtml = (uhid: string | null | undefined): string => {
  const t = uhid && String(uhid).trim() ? String(uhid).trim() : ''
  return `<div class="uhid-box">${t ? `UHID: ${esc(t)}` : 'UHID: '}</div>`
}

/**
 * Format an ISO 8601 IST datetime string for PDF display.
 * Output: "D/M/YY H:MMam/pm"  e.g. "23/3/26 5:30PM"
 * Parses directly from the string without UTC conversion so the stored
 * IST wall-clock time is always shown as-is.
 */
const formatIPDDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return iso
  const [, yyyy, mm, dd, hh, min] = m
  const day = parseInt(dd, 10)
  const month = parseInt(mm, 10)
  const year = parseInt(yyyy, 10) % 100
  const hour = parseInt(hh, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${day}/${month}/${year} ${h12}:${min}${ampm}`
}

/** Parse "YYYY-MM-DD..." into a Date in local (no timezone shift). */
const parseDateStr = (s: string): Date => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return new Date()
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
}

/** Drug order `startDate` (YYYY-MM-DD) → D/M/YYYY for PDF (matches data-entry UI). */
const formatDrugStartDatePdf = (s: string | null | undefined): string => {
  if (!s?.trim()) return '—'
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return esc(s.trim())
  const day = parseInt(m[3], 10)
  const month = parseInt(m[2], 10)
  const year = m[1]
  return esc(`${day}/${month}/${year}`)
}

const normalizeFrequency = (value: string | null | undefined): string => {
  const v = (value || '').trim().toUpperCase()
  if (v === 'TD') return 'TDS'
  if (v === 'QD') return 'QID'
  return v
}

const frequencyRowCount = (value: string | null | undefined): number => {
  const f = normalizeFrequency(value)
  if (f === 'BD') return 2
  if (f === 'TDS') return 3
  if (f === 'QID') return 4
  if (f === 'STAT' || f === 'OD' || f === 'HS') return 1
  return 1
}

/** Format a Date as "D/M" (no year, for day-column headers). */
const fmtDayHeader = (d: Date): string => `${d.getDate()}/${d.getMonth() + 1}`

/** Order sheet day cell: single line so fixed-height rows are not stretched by stacked times. */
const stackTimesOrderSheet = (val: string): string => esc(val).replace(/,/g, ', ')

/** Remove frequency labels mistakenly stored in day columns (e.g. STAT duplicate). */
const sanitizeOrderSheetDayValue = (drug: DrugOrder, raw: string): string => {
  const freqN = normalizeFrequency(drug.frequency)
  const hasTimeOrDosePattern = (s: string) => /\d|AM|PM|[:/]|\bMG\b|ML\b/i.test(s)

  return (raw || '')
    .split(',')
    .map(p => p.trim())
    .filter(p => {
      if (!p) return false
      if (/^STAT\.?$/i.test(p)) return false
      if (freqN && normalizeFrequency(p) === freqN && !hasTimeOrDosePattern(p)) return false
      return true
    })
    .join(', ')
}

/** Full patient name. */
const fullName = (p: IPDPatient): string =>
  [p.firstName, p.middleName, p.surname].filter(Boolean).join(' ')

/** Resolve a ward code to its display label. */
const wardLabel = (code: string): string => WARD_DISPLAY_NAMES[code] ?? code

// ---------------------------------------------------------------------------
// Shared CSS constants
// ---------------------------------------------------------------------------

const NOTO_DEVANAGARI_TTF = 'NotoSansDevanagari-Regular.ttf'

/** Reject mistyped "fonts" (e.g. saved HTML) so we do not inline garbage as @font-face. */
const looksLikeTtf = (buf: Buffer): boolean => {
  if (buf.length < 4) return false
  if (buf[0] === 0x3c) return false
  if (buf[0] === 0x00 && buf[1] === 0x01 && buf[2] === 0x00 && buf[3] === 0x00) return true
  const sig = buf.subarray(0, 4).toString('binary')
  return sig === 'OTTO' || sig === 'true' || sig === 'ttcf'
}

/**
 * Resolve a directory that contains the bundled IPD font (see `lib/ipd-pdf-assets/`)
 * and/or `public/fonts/`. Walk from cwd and from this module so it works in Vercel
 * stand-alone and nested `.next/server` bundles.
 */
const findProjectRootWithPublic = (): string | null => {
  const hasFont = (root: string) =>
    existsSync(join(root, 'lib', 'ipd-pdf-assets', NOTO_DEVANAGARI_TTF)) ||
    existsSync(join(root, 'public', 'fonts', NOTO_DEVANAGARI_TTF))

  const tryWalk = (start: string | null | undefined, fromFile: boolean): string | null => {
    if (!start) return null
    let d = fromFile ? dirname(start) : start
    for (let i = 0; i < 12; i++) {
      if (hasFont(d)) return d
      const parent = join(d, '..')
      if (parent === d) break
      d = parent
    }
    return null
  }

  const fromPackage = (): string | null => {
    try {
      const pkg = join(process.cwd(), 'package.json')
      if (!existsSync(pkg)) return null
      const r = createRequire(pkg)
      const self = r.resolve('./lib/ipd-pdf-generator') as string
      return tryWalk(self, true)
    } catch {
      return null
    }
  }

  return tryWalk(process.cwd(), false) || fromPackage()
}

/**
 * Load Noto Devanagari from disk (base64) so PDF render never depends on the network.
 * Tries `lib/ipd-pdf-assets` (traced for serverless) then `public/fonts/`.
 */
const loadDevanagariFontFace = (): string => {
  const ttf = NOTO_DEVANAGARI_TTF
  const toFace = (buf: Buffer): string => {
    const dataUrl = `data:font/ttf;base64,${buf.toString('base64')}`
    return `@font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('${dataUrl}') format('truetype');
      font-weight: 400 700;
      font-style: normal;
      font-display: block;
    }`
  }
  const tryFile = (full: string): string | null => {
    if (!existsSync(full)) return null
    try {
      const buf = readFileSync(full)
      if (!looksLikeTtf(buf)) return null
      return toFace(buf)
    } catch {
      return null
    }
  }
  const extraRoots = [process.cwd(), join(process.cwd(), '..'), join(process.cwd(), '../..')]
  const fromWalk = findProjectRootWithPublic()
  const priorityRel = [join('lib', 'ipd-pdf-assets', ttf), join('public', 'fonts', ttf)]
  for (const rel of priorityRel) {
    for (const root of (fromWalk ? [fromWalk, ...extraRoots] : extraRoots)) {
      const css = tryFile(join(root, rel))
      if (css) return css
    }
  }
  return ''
}
const DEVANAGARI_FONT_FACE = loadDevanagariFontFace()

const FONT_IMPORT = DEVANAGARI_FONT_FACE
  ? `${DEVANAGARI_FONT_FACE}
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');`
  : `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap');`

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: 100%;
    max-width: 100%;
  }
  body {
    font-family: 'Noto Sans', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.35;
    color: #000;
    -webkit-font-smoothing: antialiased;
  }
  .marathi { font-family: 'Noto Sans Devanagari', 'Mangal', 'Kokila', Arial, sans-serif !important; }
  /* box-decoration-break: when content spans PDF pages, border/pad repeat on each fragment */
  .container {
    border: 2px solid #000;
    padding: 8px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  /* One complete outer box per order-sheet section (incl. each continuation block) */
  .order-sheet-print-wrap {
    display: block;
    width: 100%;
    box-sizing: border-box;
    border: 2px solid #000;
    padding: 6px 8px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .badge {
    display: inline-block;
    background: #000; color: #fff;
    padding: 5px 12px; border-radius: 15px;
    font-weight: bold; font-size: 15px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;
  }
  .logo-img { height: 46px; width: auto; margin-right: 8px; }
  .uhid-box {
    display: inline-block; border: 1px solid #000;
    padding: 4px 10px; font-weight: bold; font-size: 13px;
    margin-top: 4px;
    min-width: 22rem;
    min-height: 1.45em;
    text-align: left;
    box-sizing: border-box;
  }
  .patient-strip {
    border: 1px solid #000; padding: 5px 8px;
    margin: 5px 0; font-size: 13px;
  }
  .ps-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .ps-item { white-space: nowrap; }
  .ps-label { font-weight: bold; font-size: 13px; }
  .ps-value { border-bottom: 1px solid #aaa; min-width: 60px; display: inline-block; font-size: 13px; font-weight: 400; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; font-size: 12.5px; }
  th { background: #e8e8e8; font-weight: bold; text-align: center; }
  .cell-wrap { white-space: pre-wrap; word-break: break-word; }
  .footer { margin-top: 10px; font-size: 12px; }
  .footer-note {
    text-align: center; font-style: italic;
    border-top: 1px solid #000; padding-top: 5px; margin-bottom: 8px;
  }
  .footer-sigs { display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #000; height: 28px; width: 140px; margin: 0 auto 4px; }
  /* Order sheet: fixed-height grid; thead/tfoot repeat on each printed page */
  table.drug-order-sheet {
    table-layout: fixed;
    font-size: 14px;
    border-collapse: collapse;
    page-break-inside: auto;
  }
  table.drug-order-sheet thead { display: table-header-group; }
  table.drug-order-sheet tfoot { display: table-footer-group; }
  table.drug-order-sheet thead th {
    height: 30px;
    padding: 2px 4px;
    vertical-align: middle;
    line-height: 1.2;
    white-space: nowrap;
  }
  table.drug-order-sheet thead td.order-sheet-banner,
  table.drug-order-sheet thead td.order-sheet-patient {
    background: #fff;
    font-size: 14px;
  }
  table.drug-order-sheet tfoot td.order-sheet-sig {
    background: #fff;
    border: 1px solid #000;
    padding: 2px 5px 3px 5px;
    vertical-align: middle;
  }
  /* STAT/OD/HS = 1 row; BD/TDS = multiple rows — each tr is the same height */
  table.drug-order-sheet tbody tr {
    height: 46px !important;
    min-height: 46px;
    max-height: 46px;
  }
  table.drug-order-sheet tbody td {
    height: 46px !important;
    min-height: 46px;
    max-height: 46px !important;
    padding: 1px 4px;
    vertical-align: middle !important;
    line-height: 1.15;
    box-sizing: border-box;
    overflow: hidden;
  }
  table.drug-order-sheet tbody td.order-drug-name {
    text-align: left;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  table.drug-order-sheet .cell-wrap {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

// ---------------------------------------------------------------------------
// ZH Logo — read actual SVG from the public folder at runtime (server-side)
// ---------------------------------------------------------------------------
const loadLogoSrc = (): string => {
  const rel = join('public', 'images', 'zh-logo.svg')
  const fromRoot = findProjectRootWithPublic()
  const candidates = [
    fromRoot ? join(fromRoot, rel) : '',
    join(process.cwd(), rel),
    join(process.cwd(), '..', rel),
    join(process.cwd(), '../..', rel),
  ].filter(Boolean)
  for (const p of candidates) {
    if (!existsSync(p)) continue
    try {
      const svgContent = readFileSync(p)
      return `data:image/svg+xml;base64,${svgContent.toString('base64')}`
    } catch {
      /* try next */
    }
  }
  return ''
}
const ZH_LOGO_SRC = loadLogoSrc()

/** Logo + Marathi/English — right-aligned within the header column (all portrait IPD forms). */
const ipdPortraitHospitalBlock = (): string => `
  <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
    <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
    <div style="text-align:right;">
      <div class="marathi" style="font-weight:bold;font-size:20px;line-height:1.15;">झंवर हॉस्पिटल</div>
      <div style="font-weight:bold;font-size:18px;line-height:1.15;">Zawar Hospital</div>
    </div>
  </div>`

// ---------------------------------------------------------------------------
// Shared HTML wrapper (adds fonts + base styles for portrait or landscape)
// ---------------------------------------------------------------------------

const htmlDoc = (orientation: 'portrait' | 'landscape', body: string, title = 'IPD Report'): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${FONT_IMPORT}
    @page { size: A4 ${orientation}; margin: 8mm 8mm; }
    ${BASE_CSS}
  </style>
</head>
<body>
${body}
</body>
</html>`

// ---------------------------------------------------------------------------
// Render a Puppeteer page and return a PDF Buffer
// ---------------------------------------------------------------------------

const waitForRender = async (page: import('puppeteer-core').Page): Promise<void> => {
  if (typeof page.evaluate !== 'function') return
  await page.evaluate(() => {
    return new Promise<void>(resolve => {
      const cap = setTimeout(() => resolve(), 8000)
      ;(async () => {
        try {
          const imgs = Array.from(document.querySelectorAll('img'))
          await Promise.all(
            imgs.map(
              img =>
                new Promise<void>(r => {
                  if (img.complete) {
                    r()
                    return
                  }
                  img.addEventListener('load', () => r(), { once: true })
                  img.addEventListener('error', () => r(), { once: true })
                })
            )
          )
          try {
            await document.fonts.ready
          } catch {
            /* ignore */
          }
          await new Promise<void>(r => setTimeout(r, 200))
        } finally {
          clearTimeout(cap)
          resolve()
        }
      })()
    })
  })
}

const renderPDF = async (
  html: string,
  orientation: 'portrait' | 'landscape'
): Promise<Buffer> => {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    if (typeof page.setViewport === 'function') {
      await page.setViewport({ width: orientation === 'landscape' ? 1600 : 1200, height: 1100 })
    }
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 })
    await waitForRender(page)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      // Aligns with @page in htmlDoc() so Chromium applies the same size (incl. serverless).
      preferCSSPageSize: true,
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

// ---------------------------------------------------------------------------
// 1. Progress Report PDF (Portrait A4)  §8.1
// ---------------------------------------------------------------------------

export const generateProgressReportPDF = async ({
  patient,
  entries,
  progressEntries,
  adviceEntries,
}: {
  patient: IPDPatient
  entries?: ProgressReportEntry[]
  progressEntries?: ProgressReportEntry[]
  adviceEntries: PatientAdvice[]
}): Promise<Buffer> => {
  const effectiveEntries = entries ?? progressEntries ?? []
  const admissionEntry = effectiveEntries.find(e => e.isAdmissionNote)
  const diagnosis = admissionEntry?.diagnosis || ''

  const rowsHtml = effectiveEntries
    .map(
      e => `
      <tr>
        <td style="width:15%;text-align:center">${formatIPDDate(e.dateTime)}</td>
        <td style="width:45%" class="cell-wrap">${esc(e.doctorNotes)}</td>
        <td style="width:40%" class="cell-wrap">${esc(e.treatment || '')}</td>
      </tr>`
    )
    .join('')

  const adviceHtml =
    adviceEntries.length > 0
      ? `
      <div style="margin:10px 0; border:2px solid #000;">
        <div style="background:#000;color:#fff;padding:4px 8px;font-weight:bold;font-size:12px;">
          INVESTIGATIONS / ADVICE
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:16%">Date &amp; Time</th>
              <th style="width:18%">Category</th>
              <th style="width:28%">Investigation</th>
              <th style="width:38%">Report Notes</th>
            </tr>
          </thead>
          <tbody>
            ${adviceEntries
              .map(
                a => `
              <tr>
                <td style="text-align:center">${formatIPDDate(a.dateTime)}</td>
                <td>${esc(a.category)}</td>
                <td>${esc(a.investigationName)}</td>
                <td class="cell-wrap">${esc(a.reportNotes || '—')}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>`
      : ''

  const body = `
  <div class="container">
    <div class="header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">PROGRESS REPORT</span>
      </div>
      <div style="text-align:right">
        ${ipdPortraitHospitalBlock()}
        ${uhidBoxHtml(patient.uhidNo)}
      </div>
    </div>

    <div class="patient-strip">
      <div class="ps-row">
        <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value">${esc(fullName(patient))}</span></div>
        <div class="ps-item"><span class="ps-label">I.P.D No.:</span>&nbsp;<span class="ps-value">${esc(patient.ipdNo || '—')}</span></div>
        <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;<span class="ps-value">${patient.age}</span></div>
        <div class="ps-item"><span class="ps-label">SEX:</span>&nbsp;<span class="ps-value">${patient.sex}</span></div>
        <div class="ps-item"><span class="ps-label">BED No.:</span>&nbsp;<span class="ps-value">${esc(patient.bedNo || '—')}</span></div>
      </div>
    </div>

    <div style="background:#f2f2f2;border:1px solid #000;padding:6px;margin:5px 0;">
      <div style="font-weight:bold;margin-bottom:4px;">DIAGNOSIS</div>
      <div class="cell-wrap" style="min-height:32px;">${esc(diagnosis)}</div>
    </div>

    <table style="margin-top:6px;">
      <thead>
        <tr>
          <th style="width:15%">Date &amp; Time</th>
          <th style="width:45%">Doctor's Notes</th>
          <th style="width:40%">Treatment</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="3" style="text-align:center;color:#888">No entries</td></tr>'}
      </tbody>
    </table>

    ${adviceHtml}

    <div class="footer">
      <div class="footer-note">Every Entry to be Named, Signed, Dated &amp; Timed</div>
      <div class="footer-sigs" style="margin-top:10px;">
        <div></div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
      </div>
    </div>
  </div>`

  return renderPDF(htmlDoc('portrait', body, `Progress Report — ${fullName(patient)}`), 'portrait')
}

// ---------------------------------------------------------------------------
// 2. Nursing Notes PDF (Portrait A4)  §8.2
// ---------------------------------------------------------------------------

export const generateNursingNotesPDF = async ({
  patient,
  entries,
  nursingEntries,
}: {
  patient: IPDPatient
  entries?: NursingNote[]
  nursingEntries?: NursingNote[]
}): Promise<Buffer> => {
  const effectiveEntries = entries ?? nursingEntries ?? []
  const rowsHtml = effectiveEntries
    .map(e => {
      const bg = e.isHandover ? 'background:#d0d0d0;' : ''
      const handoverPrefix = e.isHandover ? '<strong>⇄ HANDOVER</strong><br>' : ''
      return `
      <tr style="${bg}">
        <td style="width:15%;text-align:center">${formatIPDDate(e.dateTime)}</td>
        <td style="width:45%" class="cell-wrap">${handoverPrefix}${esc(e.notes)}</td>
        <td style="width:40%" class="cell-wrap">${esc(e.treatment || '')}</td>
      </tr>`
    })
    .join('')

  const body = `
  <div class="container">
    <div class="header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">NURSING NOTES</span>
      </div>
      <div style="text-align:right">
        ${ipdPortraitHospitalBlock()}
        ${uhidBoxHtml(patient.uhidNo)}
      </div>
    </div>

    <div class="patient-strip">
      <div style="display:flex;gap:20px;margin-bottom:4px;">
        <div><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value" style="min-width:140px;">${esc(fullName(patient))}</span></div>
        <div><span class="ps-label">Age:</span>&nbsp;<span class="ps-value" style="min-width:50px;">${patient.age}</span></div>
      </div>
      <div style="display:flex;gap:20px;">
        <div><span class="ps-label">IPD No.:</span>&nbsp;<span class="ps-value" style="min-width:100px;">${esc(patient.ipdNo || '—')}</span></div>
        <div><span class="ps-label">Sex M/F:</span>&nbsp;<span class="ps-value" style="min-width:30px;">${patient.sex}</span></div>
      </div>
    </div>

    <table style="margin-top:6px;">
      <thead>
        <tr>
          <th style="width:15%">Date &amp; Time</th>
          <th style="width:45%">Doctor's Notes</th>
          <th style="width:40%">Treatment</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="3" style="text-align:center;color:#888">No entries</td></tr>'}
      </tbody>
    </table>

    <div class="footer">
      <div class="footer-note">Every Entry to be Named, Signed, Dated &amp; Timed</div>
      <div class="footer-sigs" style="margin-top:10px;">
        <div></div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
      </div>
    </div>
  </div>`

  return renderPDF(htmlDoc('portrait', body, `Nursing Notes — ${fullName(patient)}`), 'portrait')
}

// ---------------------------------------------------------------------------
// 3. Nursing Chart PDF (Portrait A4)  §8.3
// ---------------------------------------------------------------------------

export const generateNursingChartPDF = async ({
  patient,
  vitalSigns,
}: {
  patient: IPDPatient
  vitalSigns: VitalSign[]
}): Promise<Buffer> => {
  const rowsHtml = vitalSigns
    .map(
      v => `
      <tr>
        <td style="text-align:center">${formatIPDDate(v.dateTime)}</td>
        <td style="text-align:center">${esc(v.temp || '—')}</td>
        <td style="text-align:center">${esc(v.pulse || '—')}</td>
        <td style="text-align:center">${esc(v.bp || '—')}</td>
        <td style="text-align:center">${esc(v.spo2 || '—')}</td>
        <td style="text-align:center">${esc(v.bsl || '—')}</td>
        <td>${esc(v.ivFluids || '—')}</td>
        <td style="text-align:center">${esc(v.staffName)}</td>
      </tr>`
    )
    .join('')

  const body = `
  <div class="container">
    <div class="header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">NURSING CHART</span>
      </div>
      <div style="text-align:right">
        ${ipdPortraitHospitalBlock()}
        ${uhidBoxHtml(patient.uhidNo)}
      </div>
    </div>

    <div class="patient-strip">
      <div class="ps-row">
        <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value">${esc(fullName(patient))}</span></div>
        <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;<span class="ps-value">${patient.age}</span></div>
        <div class="ps-item"><span class="ps-label">IPD No.:</span>&nbsp;<span class="ps-value">${esc(patient.ipdNo || '—')}</span></div>
        <div class="ps-item"><span class="ps-label">Sex M/F:</span>&nbsp;<span class="ps-value">${patient.sex}</span></div>
      </div>
    </div>

    <table style="margin-top:6px;table-layout:fixed;">
      <colgroup>
        <col style="width:13%">
        <col style="width:8%">
        <col style="width:8%">
        <col style="width:9%">
        <col style="width:8%">
        <col style="width:7%">
        <col style="width:28%">
        <col style="width:19%">
      </colgroup>
      <thead>
        <tr>
          <th>DATE / TIME</th>
          <th>TEMP</th>
          <th>P/MIN</th>
          <th>B.P</th>
          <th>SPO2</th>
          <th>BSL</th>
          <th>IV FLUIDS</th>
          <th>NAME OF STAFF</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml || '<tr><td colspan="8" style="text-align:center;color:#888">No entries</td></tr>'}
      </tbody>
    </table>

    <div class="footer">
      <div class="footer-sigs" style="margin-top:15px;">
        <div></div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
      </div>
    </div>
  </div>`

  return renderPDF(htmlDoc('portrait', body, `Nursing Chart — ${fullName(patient)}`), 'portrait')
}

// ---------------------------------------------------------------------------
// 4. Drug Order Sheet PDF (Portrait A4)  §8.4
//    Columns match physical template: Name of Drug | Freq. | Route | Date: D/M | …
//    DRUG_ORDER_DATE_COLUMNS_PER_PAGE date columns per page; PTO for continuations.
// ---------------------------------------------------------------------------

/**
 * Order grid widths (colgroup required: row 1 is full colspan).
 * Date: columns get the remainder split evenly in drugOrderDatePcts().
 */
const DRUG_ORDER_NAME_PCT = 45
const DRUG_ORDER_FREQ_PCT = 7
const DRUG_ORDER_ROUTE_PCT = 7
const DRUG_ORDER_START_PCT = 10

/** Remaining table width (after name/freq/route/start) split across date columns. */
const drugOrderDatePcts = (
  namePct: number,
  freqPct: number,
  routePct: number,
  startPct: number,
  numDateCols: number
): number[] => {
  const rem = 100 - namePct - freqPct - routePct - startPct
  if (numDateCols <= 0) return []
  const base = rem / numDateCols
  return Array.from({ length: numDateCols }, (_, i) =>
    i < numDateCols - 1 ? base : rem - base * (numDateCols - 1)
  )
}

const fmtPct = (n: number): string => (Math.round(n * 100) / 100).toString()

/** Must be first child of <table> when row 1 is a full-width colspan. */
const drugOrderColGroupHtml = (
  namePct: number,
  freqPct: number,
  routePct: number,
  startPct: number,
  datePcts: number[]
): string => {
  const col = (w: number) => `<col style="width:${fmtPct(w)}%;" />`
  return `<colgroup>
${[col(namePct), col(freqPct), col(routePct), col(startPct), ...datePcts.map(col)].join('\n')}
</colgroup>`
}

export const generateDrugOrderPDF = async ({
  patient,
  drugOrders,
}: {
  patient: IPDPatient
  drugOrders: DrugOrder[]
}): Promise<Buffer> => {
  if (drugOrders.length === 0) {
    return renderPDF(
      htmlDoc(
        'landscape',
        '<div class="order-sheet-print-wrap" style="padding:20px;text-align:center;color:#888;">No drug orders found.</div>'
      ),
      'landscape'
    )
  }

  const globalStart = drugOrders.reduce<Date>((earliest, d) => {
    const c = parseDateStr(d.startDate)
    return c < earliest ? c : earliest
  }, parseDateStr(drugOrders[0].startDate))

  const colDate = (n: number): Date => {
    const d = new Date(globalStart)
    d.setDate(d.getDate() + n - 1)
    return d
  }

  const cellValue = (drug: DrugOrder, colN: number): string => {
    const ds = parseDateStr(drug.startDate)
    const dayOffset = Math.round((colDate(colN).getTime() - ds.getTime()) / 86_400_000)
    if (dayOffset < 0 || dayOffset > 35) return ''
    const raw = drug.days[`day${dayOffset + 1}`] || ''
    const val = sanitizeOrderSheetDayValue(drug, raw)
    return val ? stackTimesOrderSheet(val) : ''
  }

  const hasDaysData = (from: number, to: number): boolean =>
    drugOrders.some(drug =>
      Array.from({ length: to - from + 1 }, (_, i) => `day${from + i}`).some(
        key => (drug.days[key] || '').trim() !== ''
      )
    )

  const firstDrug = drugOrders[0]
  const drugAllergy = firstDrug.drugAllergy || ''
  const ward = firstDrug.ward || patient.ward || '—'
  const bedNo = firstDrug.bedNo || patient.bedNo || '—'
  // Patient strip: name line same visual size as drug cells (table is 14px; value one step up for balance)
  const patientInfoRow = `
    <div style="display:flex;border:1px solid #000;font-size:14px;line-height:1.25;">
      <div style="flex:2;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Patient Name</div>
        <div style="font-size:15px;font-weight:400;color:#000;line-height:1.2;">${esc(fullName(patient))}</div>
      </div>
      <div style="flex:1.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Drug Allergy</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${esc(drugAllergy)}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Age</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${patient.age}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Sex M/F</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${patient.sex}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Ward</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${esc(wardLabel(ward))}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">Room/Bed No.</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${esc(bedNo)}</div>
      </div>
      <div style="flex:1;padding:2px 4px;">
        <div style="font-weight:bold;font-size:14px;color:#000;">IPD No.</div>
        <div style="font-size:14px;font-weight:400;color:#000;">${esc(patient.ipdNo || '—')}</div>
      </div>
    </div>`

  const COLS_PER_PAGE = DRUG_ORDER_DATE_COLUMNS_PER_PAGE

  const orderHeaderHtml = `
    <div class="header" style="margin-bottom:4px;padding:2px 0;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div>
          <div style="font-weight:bold;font-size:22px;" class="marathi">झंवर हॉस्पिटल</div>
          <div style="font-size:19px;font-weight:bold;">Zawar Hospital</div>
        </div>
      </div>
      <div><span class="badge" style="font-size:19px;">ORDER SHEET</span></div>
    </div>`

  const orderSheetSigHtml = `
    <div class="footer" style="margin-top:0;padding-top:0;">
      <div class="footer-sigs">
        <div></div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
      </div>
    </div>`

  const buildPage = (daysFrom: number, daysTo: number, isPto: boolean): string => {
    const numCols = daysTo - daysFrom + 1
    const namePct = DRUG_ORDER_NAME_PCT
    const freqPct = DRUG_ORDER_FREQ_PCT
    const routePct = DRUG_ORDER_ROUTE_PCT
    const startPct = DRUG_ORDER_START_PCT
    const datePcts = drugOrderDatePcts(namePct, freqPct, routePct, startPct, numCols)
    const colGroup = drugOrderColGroupHtml(namePct, freqPct, routePct, startPct, datePcts)

    // Date column headers: one line so header row height matches the fixed grid
    const headerRow = [
      `<th style="width:${fmtPct(namePct)}%;">Name of Drug</th>`,
      `<th style="width:${fmtPct(freqPct)}%;">Freq.</th>`,
      `<th style="width:${fmtPct(routePct)}%;">Route</th>`,
      `<th style="width:${fmtPct(startPct)}%;text-align:center;">Start</th>`,
      ...datePcts.map(
        w =>
          `<th style="width:${fmtPct(w)}%;text-align:center;font-weight:bold;">Date:</th>`
      ),
    ].join('')

    const bodyRows = drugOrders
      .flatMap(drug => {
        const repeatRows = frequencyRowCount(drug.frequency)
        return Array.from({ length: repeatRows }, (_, rowIdx) => `
          <tr>
            <td class="cell-wrap order-drug-name">${rowIdx === 0 ? esc(drug.drugName) : ''}</td>
            <td style="text-align:center">${rowIdx === 0 ? esc(drug.frequency) : ''}</td>
            <td style="text-align:center">${rowIdx === 0 ? esc(drug.route) : ''}</td>
            <td style="text-align:center;white-space:nowrap;">${rowIdx === 0 ? formatDrugStartDatePdf(drug.startDate) : ''}</td>
            ${Array.from({ length: numCols }, (_, i) => {
              const val = cellValue(drug, daysFrom + i)
              return `<td style="text-align:center;">${val}</td>`
            }).join('')}
          </tr>`)
      })
      .join('')

    const colSpan = 4 + numCols
    const ptoThead = isPto
      ? `<tr><td colspan="${colSpan}" style="border:1px solid #000;padding:2px 6px;font-weight:bold;font-size:10px;">PTO</td></tr>`
      : ''

    return `<table class="drug-order-sheet" style="width:100%;">
      ${colGroup}
      <thead>
        <tr>
          <td colspan="${colSpan}" class="order-sheet-banner" style="border:1px solid #000;padding:0;vertical-align:top;">
            ${orderHeaderHtml}
          </td>
        </tr>
        ${ptoThead}
        <tr>
          <td colspan="${colSpan}" class="order-sheet-patient" style="border:1px solid #000;padding:0;vertical-align:top;">
            ${patientInfoRow}
          </td>
        </tr>
        <tr>${headerRow}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
      <tfoot>
        <tr>
          <td colspan="${colSpan}" class="order-sheet-sig">${orderSheetSigHtml}</td>
        </tr>
      </tfoot>
    </table>`
  }

  const pages: string[] = []
  for (let start = 1; start <= DRUG_ORDER_PDF_MAX_DAYS; start += COLS_PER_PAGE) {
    const end = start + COLS_PER_PAGE - 1
    if (start === 1 || hasDaysData(start, end)) {
      pages.push(buildPage(start, end, start > 1))
    }
  }

  const body = pages
    .map(
      (p, i) =>
        `<div class="order-sheet-print-wrap"${i > 0 ? ' style="page-break-before:always;"' : ''}>${p}</div>`
    )
    .join('')

  return renderPDF(htmlDoc('landscape', body, `Order Sheet — ${fullName(patient)}`), 'landscape')
}

// ---------------------------------------------------------------------------
// 5. Combined IPD PDF — 4 forms concatenated (§8.5)
//    Merge the four standalone PDFs so the drug-order section keeps A4 landscape
//    and the same embedded font path as per-form exports (Vercel serverless).
// ---------------------------------------------------------------------------

const mergeIpdPdfBuffers = async (buffers: Buffer[]): Promise<Buffer> => {
  const merged = await PDFDocument.create()
  for (const buf of buffers) {
    if (!buf.length) continue
    const src = await PDFDocument.load(buf)
    const pages = await merged.copyPages(src, src.getPageIndices())
    pages.forEach(page => merged.addPage(page))
  }
  return Buffer.from(await merged.save())
}

export const generateCombinedIPDPDF = async ({
  patient,
  progressEntries,
  adviceEntries,
  nursingNotes,
  vitalSigns,
  drugOrders,
}: {
  patient: IPDPatient
  progressEntries: ProgressReportEntry[]
  adviceEntries: PatientAdvice[]
  nursingNotes: NursingNote[]
  vitalSigns: VitalSign[]
  drugOrders: DrugOrder[]
}): Promise<Buffer> => {
  const progressBuf = await generateProgressReportPDF({
    patient,
    progressEntries,
    adviceEntries,
  })
  const nursingBuf = await generateNursingNotesPDF({ patient, nursingEntries: nursingNotes })
  const chartBuf = await generateNursingChartPDF({ patient, vitalSigns })
  const drugBuf = await generateDrugOrderPDF({ patient, drugOrders })
  return mergeIpdPdfBuffers([progressBuf, nursingBuf, chartBuf, drugBuf])
}

