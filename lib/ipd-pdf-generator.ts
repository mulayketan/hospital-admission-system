import { readFileSync } from 'fs'
import { join } from 'path'
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

/** Stack comma-separated times vertically (replace "," with "<br>"). */
const stackTimes = (val: string): string =>
  esc(val).replace(/,/g, '<br>')

/** Full patient name. */
const fullName = (p: IPDPatient): string =>
  [p.firstName, p.middleName, p.surname].filter(Boolean).join(' ')

/** Resolve a ward code to its display label. */
const wardLabel = (code: string): string => WARD_DISPLAY_NAMES[code] ?? code

// ---------------------------------------------------------------------------
// Shared CSS constants
// ---------------------------------------------------------------------------

// Embed local Noto Sans Devanagari font so Puppeteer never needs a network
// request for Devanagari rendering (Google Fonts can't load in headless env).
const loadDevanariFontSrc = (): string => {
  try {
    const buf = readFileSync(join(process.cwd(), 'public', 'fonts', 'NotoSansDevanagari-Regular.ttf'))
    return `data:font/truetype;base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}
const DEVANAGARI_FONT_SRC = loadDevanariFontSrc()

const FONT_IMPORT = DEVANAGARI_FONT_SRC
  ? `@font-face {
      font-family: 'Noto Sans Devanagari';
      src: url('${DEVANAGARI_FONT_SRC}') format('truetype');
      font-weight: 400 700;
      font-style: normal;
    }
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&display=swap');`
  : `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap');`

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.3;
    color: #000;
    -webkit-font-smoothing: antialiased;
  }
  .marathi { font-family: 'Noto Sans Devanagari', 'Mangal', 'Kokila', Arial, sans-serif !important; }
  .container { border: 2px solid #000; padding: 8px; }
  .badge {
    display: inline-block;
    background: #000; color: #fff;
    padding: 5px 12px; border-radius: 15px;
    font-weight: bold; font-size: 14px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;
  }
  .logo-img { height: 46px; width: auto; margin-right: 8px; }
  .uhid-box {
    display: inline-block; border: 1px solid #000;
    padding: 3px 8px; font-weight: bold; font-size: 12px;
    margin-top: 4px;
  }
  .patient-strip {
    border: 1px solid #000; padding: 5px 8px;
    margin: 5px 0; font-size: 12px;
  }
  .ps-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .ps-item { white-space: nowrap; }
  .ps-label { font-weight: bold; }
  .ps-value { border-bottom: 1px solid #aaa; min-width: 60px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; font-size: 11.5px; }
  th { background: #e8e8e8; font-weight: bold; text-align: center; }
  .cell-wrap { white-space: pre-wrap; word-break: break-word; }
  .footer { margin-top: 12px; font-size: 11px; }
  .footer-note {
    text-align: center; font-style: italic;
    border-top: 1px solid #000; padding-top: 5px; margin-bottom: 10px;
  }
  .footer-sigs { display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #000; height: 28px; width: 140px; margin: 0 auto 4px; }
`

// ---------------------------------------------------------------------------
// ZH Logo — read actual SVG from the public folder at runtime (server-side)
// ---------------------------------------------------------------------------
const loadLogoSrc = (): string => {
  try {
    const svgContent = readFileSync(join(process.cwd(), 'public', 'images', 'zh-logo.svg'))
    return `data:image/svg+xml;base64,${svgContent.toString('base64')}`
  } catch {
    return ''
  }
}
const ZH_LOGO_SRC = loadLogoSrc()

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
  await page.evaluate(() =>
    new Promise<void>(resolve => {
      // Wait for all images (including base64) to decode
      const imgs = Array.from(document.querySelectorAll('img'))
      const imgPromises = imgs.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(r => {
              img.addEventListener('load', () => r())
              img.addEventListener('error', () => r())
            })
      )
      Promise.all(imgPromises)
        .then(() => document.fonts.ready)
        .then(() => setTimeout(resolve, 200))
        .catch(() => setTimeout(resolve, 500))
      setTimeout(resolve, 3000)
    })
  )
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
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    await waitForRender(page)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
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
        <div style="background:#000;color:#fff;padding:4px 8px;font-weight:bold;font-size:11px;">
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
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
          <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
          <div>
            <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
          </div>
        </div>
        <div class="uhid-box">UHID: ${esc(patient.uhidNo || '—')}</div>
      </div>
    </div>

    <div class="patient-strip">
      <div class="ps-row">
        <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value">${esc(fullName(patient))}</span></div>
        <div class="ps-item"><span class="ps-label">I.P.D No.:</span>&nbsp;<span class="ps-value">${esc(patient.ipdNo || '—')}</span></div>
        <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;<span class="ps-value">${patient.age}</span></div>
        <div class="ps-item"><span class="ps-label">SEX:</span>&nbsp;${patient.sex}</div>
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
  <div style="text-align:right;margin-bottom:4px;font-size:11px;">
    <strong>UHID:</strong> ${esc(patient.uhidNo || '—')}
  </div>
  <div class="container">
    <div class="header">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="badge">NURSING NOTES</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
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
      <div style="display:flex;align-items:center;gap:6px;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
      </div>
    </div>

    <div class="patient-strip">
      <div class="ps-row">
        <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value">${esc(fullName(patient))}</span></div>
        <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;<span class="ps-value">${patient.age}</span></div>
        <div class="ps-item"><span class="ps-label">IPD No.:</span>&nbsp;<span class="ps-value">${esc(patient.ipdNo || '—')}</span></div>
        <div class="ps-item"><span class="ps-label">Sex M/F:</span>&nbsp;${patient.sex}</div>
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

const DRUG_ORDER_NAME_PCT = 38
const DRUG_ORDER_FREQ_PCT = 11
const DRUG_ORDER_ROUTE_PCT = 11
const DRUG_ORDER_START_PCT = 9

export const generateDrugOrderPDF = async ({
  patient,
  drugOrders,
}: {
  patient: IPDPatient
  drugOrders: DrugOrder[]
}): Promise<Buffer> => {
  if (drugOrders.length === 0) {
    return renderPDF(
      htmlDoc('landscape', '<div class="container" style="padding:20px;text-align:center;color:#888;">No drug orders found.</div>'),
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
    const val = drug.days[`day${dayOffset + 1}`] || ''
    return val ? stackTimes(val) : ''
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
  // Horizontal patient info bar — sits below the header, above the drug table
  const patientInfoRow = `
    <div style="display:flex;border:1px solid #000;border-bottom:none;font-size:10px;line-height:1.45;margin-bottom:0;">
      <div style="flex:2;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Patient Name</div>
        <div>${esc(fullName(patient))}</div>
      </div>
      <div style="flex:1.5;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Drug Allergy</div>
        <div>${esc(drugAllergy)}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Age</div>
        <div>${patient.age}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Sex M/F</div>
        <div>${patient.sex}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Ward</div>
        <div>${esc(wardLabel(ward))}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">Room/Bed No.</div>
        <div>${esc(bedNo)}</div>
      </div>
      <div style="flex:1;padding:3px 5px;">
        <div style="font-weight:bold;font-size:9px;color:#555;">IPD No.</div>
        <div>${esc(patient.ipdNo || '—')}</div>
      </div>
    </div>`

  const COLS_PER_PAGE = DRUG_ORDER_DATE_COLUMNS_PER_PAGE

  const buildPage = (daysFrom: number, daysTo: number, isPto: boolean): string => {
    const numCols = daysTo - daysFrom + 1
    const namePct = DRUG_ORDER_NAME_PCT
    const freqPct = DRUG_ORDER_FREQ_PCT
    const routePct = DRUG_ORDER_ROUTE_PCT
    const startPct = DRUG_ORDER_START_PCT
    const datePct = Math.floor(
      (100 - namePct - freqPct - routePct - startPct) / numCols
    )

    // Date column headers stay blank for staff-written calendar dates; Start shows system date per row.
    const headerRow = [
      `<th style="width:${namePct}%;">Name of Drug</th>`,
      `<th style="width:${freqPct}%;">Freq.</th>`,
      `<th style="width:${routePct}%;">Route</th>`,
      `<th style="width:${startPct}%;text-align:center;">Start</th>`,
      ...Array.from({ length: numCols }, () =>
        `<th style="width:${datePct}%;text-align:center;font-weight:bold;">Date:<br/><span style="font-weight:normal;font-size:8px;">&nbsp;</span></th>`
      ),
    ].join('')

    const bodyRows = drugOrders
      .flatMap(drug => {
        const repeatRows = frequencyRowCount(drug.frequency)
        return Array.from({ length: repeatRows }, (_, rowIdx) => `
          <tr>
            <td class="cell-wrap">${rowIdx === 0 ? esc(drug.drugName) : ''}</td>
            <td style="text-align:center">${rowIdx === 0 ? esc(drug.frequency) : ''}</td>
            <td style="text-align:center">${rowIdx === 0 ? esc(drug.route) : ''}</td>
            <td style="text-align:center;font-size:10px;white-space:nowrap;">${rowIdx === 0 ? formatDrugStartDatePdf(drug.startDate) : ''}</td>
            ${Array.from({ length: numCols }, (_, i) => {
              const val = cellValue(drug, daysFrom + i)
              return `<td style="text-align:center;vertical-align:top;font-size:10px;">${val}</td>`
            }).join('')}
          </tr>`)
      })
      .join('')

    return `
      ${isPto ? '<div style="font-weight:bold;font-size:10px;margin:4px 0;">PTO</div>' : ''}
      ${patientInfoRow}
      <table style="table-layout:fixed;width:100%;font-size:10.5px;">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>`
  }

  const orderHeader = `
    <div class="header" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div>
          <div style="font-weight:bold;font-size:16px;" class="marathi">झंवर हॉस्पिटल</div>
          <div style="font-size:14px;font-weight:bold;">Zawar Hospital</div>
        </div>
      </div>
      <div><span class="badge" style="font-size:16px;">ORDER SHEET</span></div>
    </div>`

  const orderFooter = `
    <div class="footer" style="margin-top:12px;">
      <div class="footer-sigs">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
        <div></div>
      </div>
    </div>`

  const pages: string[] = []
  for (let start = 1; start <= DRUG_ORDER_PDF_MAX_DAYS; start += COLS_PER_PAGE) {
    const end = start + COLS_PER_PAGE - 1
    if (start === 1 || hasDaysData(start, end)) {
      pages.push(buildPage(start, end, start > 1))
    }
  }

  const body = `
  <div class="container">
    ${orderHeader}
    ${pages.map((p, i) =>
      i === 0 ? p : `<div style="page-break-before:always;">${orderHeader}${p}</div>`
    ).join('')}
    ${orderFooter}
  </div>`

  return renderPDF(htmlDoc('landscape', body, `Order Sheet — ${fullName(patient)}`), 'landscape')
}

// ---------------------------------------------------------------------------
// 5. Combined IPD PDF — 4 forms concatenated (§8.5)
//    All sections are portrait. CSS named pages kept for extensibility.
// ---------------------------------------------------------------------------

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
  // Build HTML for each section inline (no separate Puppeteer calls needed)
  // Each section is wrapped in a div with a named CSS page for orientation.

  // Reuse the per-form body builders by copy-constructing the HTML strings
  // (same logic as individual generators, no Puppeteer overhead per form)

  const admissionEntry = progressEntries.find(e => e.isAdmissionNote)
  const diagnosis = admissionEntry?.diagnosis || ''

  // --- Progress Report section ---
  const prRows = progressEntries
    .map(
      e => `
      <tr>
        <td style="width:15%;text-align:center">${formatIPDDate(e.dateTime)}</td>
        <td style="width:45%" class="cell-wrap">${esc(e.doctorNotes)}</td>
        <td style="width:40%" class="cell-wrap">${esc(e.treatment || '')}</td>
      </tr>`
    )
    .join('')

  const adviceBlock =
    adviceEntries.length > 0
      ? `
      <div style="margin:10px 0; border:2px solid #000;">
        <div style="background:#000;color:#fff;padding:4px 8px;font-weight:bold;font-size:11px;">INVESTIGATIONS / ADVICE</div>
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

  const sigBlock = (label: string, name: string | null) => `
    <div class="sig-block">
      <div class="sig-line"></div>
      <div style="font-weight:bold;">${esc(name || '')}</div>
      <div>${label}</div>
    </div>`

  const prSection = `
    <div class="container" style="page:portrait-page;">
      <div class="header">
        <span class="badge">PROGRESS REPORT</span>
        <div style="text-align:right;">
          <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;">
            <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
            <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
          </div>
          <div class="uhid-box">UHID: ${esc(patient.uhidNo || '—')}</div>
        </div>
      </div>
      <div class="patient-strip">
        <div class="ps-row">
          <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value">${esc(fullName(patient))}</span></div>
          <div class="ps-item"><span class="ps-label">I.P.D No.:</span>&nbsp;<span class="ps-value">${esc(patient.ipdNo || '—')}</span></div>
          <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;${patient.age}</div>
          <div class="ps-item"><span class="ps-label">SEX:</span>&nbsp;${patient.sex}</div>
          <div class="ps-item"><span class="ps-label">BED No.:</span>&nbsp;${esc(patient.bedNo || '—')}</div>
        </div>
      </div>
      <div style="background:#f2f2f2;border:1px solid #000;padding:6px;margin:5px 0;">
        <div style="font-weight:bold;margin-bottom:4px;">DIAGNOSIS</div>
        <div class="cell-wrap" style="min-height:28px;">${esc(diagnosis)}</div>
      </div>
      <table><thead><tr><th style="width:15%">Date &amp; Time</th><th style="width:45%">Doctor's Notes</th><th style="width:40%">Treatment</th></tr></thead>
      <tbody>${prRows || '<tr><td colspan="3" style="text-align:center;color:#888">No entries</td></tr>'}</tbody></table>
      ${adviceBlock}
      <div class="footer">
        <div class="footer-note">Every Entry to be Named, Signed, Dated &amp; Timed</div>
      </div>
    </div>`

  // --- Nursing Notes section ---
  const nnRows = nursingNotes
    .map(e => {
      const bg = e.isHandover ? 'background:#d0d0d0;' : ''
      const prefix = e.isHandover ? '<strong>⇄ HANDOVER</strong><br>' : ''
      return `<tr style="${bg}"><td style="width:15%;text-align:center">${formatIPDDate(e.dateTime)}</td><td style="width:45%" class="cell-wrap">${prefix}${esc(e.notes)}</td><td style="width:40%" class="cell-wrap">${esc(e.treatment || '')}</td></tr>`
    })
    .join('')

  const nnSection = `
    <div class="container" style="page:portrait-page;">
      <div class="header">
        <span class="badge">NURSING NOTES</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
          <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
        </div>
      </div>
      <div class="patient-strip">
        <div style="display:flex;gap:20px;margin-bottom:4px;">
          <div><span class="ps-label">Patient Name:</span>&nbsp;<span class="ps-value" style="min-width:140px;">${esc(fullName(patient))}</span></div>
          <div><span class="ps-label">Age:</span>&nbsp;${patient.age}</div>
        </div>
        <div style="display:flex;gap:20px;">
          <div><span class="ps-label">IPD No.:</span>&nbsp;<span class="ps-value" style="min-width:100px;">${esc(patient.ipdNo || '—')}</span></div>
          <div><span class="ps-label">Sex M/F:</span>&nbsp;${patient.sex}</div>
        </div>
      </div>
      <table><thead><tr><th style="width:15%">Date &amp; Time</th><th style="width:45%">Notes</th><th style="width:40%">Treatment Given</th></tr></thead>
      <tbody>${nnRows || '<tr><td colspan="3" style="text-align:center;color:#888">No entries</td></tr>'}</tbody></table>
      <div class="footer">
        <div class="footer-note">Every Entry to be Named, Signed, Dated &amp; Timed</div>
        <div class="footer-sigs" style="margin-top:10px;">
          <div></div>${sigBlock('Treating Doctor', patient.treatingDoctor)}
        </div>
      </div>
    </div>`

  // --- Nursing Chart section ---
  const ncRows = vitalSigns
    .map(
      v => `<tr>
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

  const ncSection = `
    <div class="container" style="page:portrait-page;">
      <div class="header">
        <span class="badge">NURSING CHART</span>
        <div style="display:flex;align-items:center;gap:6px;">
          <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
          <div style="font-weight:bold;font-size:13px;">Zawar Hospital</div>
        </div>
      </div>
      <div class="patient-strip">
        <div class="ps-row">
          <div class="ps-item"><span class="ps-label">Patient Name:</span>&nbsp;${esc(fullName(patient))}</div>
          <div class="ps-item"><span class="ps-label">Age:</span>&nbsp;${patient.age}</div>
          <div class="ps-item"><span class="ps-label">IPD No.:</span>&nbsp;${esc(patient.ipdNo || '—')}</div>
          <div class="ps-item"><span class="ps-label">Sex M/F:</span>&nbsp;${patient.sex}</div>
        </div>
      </div>
      <table style="table-layout:fixed;margin-top:6px;">
        <colgroup><col style="width:13%"><col style="width:8%"><col style="width:8%"><col style="width:9%"><col style="width:8%"><col style="width:7%"><col style="width:28%"><col style="width:19%"></colgroup>
        <thead><tr><th>DATE / TIME</th><th>TEMP</th><th>P/MIN</th><th>B.P</th><th>SPO2</th><th>BSL</th><th>IV FLUIDS</th><th>NAME OF STAFF</th></tr></thead>
        <tbody>${ncRows || '<tr><td colspan="8" style="text-align:center;color:#888">No entries</td></tr>'}</tbody>
      </table>
      <div class="footer"><div class="footer-sigs" style="margin-top:15px;"><div></div>${sigBlock('Treating Doctor', patient.treatingDoctor)}</div></div>
    </div>`

  // --- Drug Orders section ---
  const doSection = await buildDrugOrderSection(patient, drugOrders)

  // Combine all sections with page-break separators
  const combinedHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>IPD Report — ${esc(fullName(patient))}</title>
  <style>
    ${FONT_IMPORT}
    @page portrait-page  { size: A4 portrait;  margin: 8mm; }
    @page landscape-page { size: A4 landscape; margin: 8mm; }
    ${BASE_CSS}
    .new-page { break-before: page; }
  </style>
</head>
<body>
  ${prSection}
  <div class="new-page">${nnSection}</div>
  <div class="new-page">${ncSection}</div>
  <div class="new-page">${doSection}</div>
</body>
</html>`

  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: 1600, height: 1100 })
    await page.setContent(combinedHtml, { waitUntil: 'domcontentloaded' })
    await waitForRender(page)
    // Do NOT pass `format` or `landscape` here — the combined PDF uses CSS
    // @page named-pages (portrait-page) for all sections. Passing format:'A4'
    // would override the CSS @page size directives.
    const pdfBuffer = await page.pdf({
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
    })
    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

// ---------------------------------------------------------------------------
// Internal helper — Drug Order HTML section (reused for combined PDF)
// ---------------------------------------------------------------------------

async function buildDrugOrderSection(
  patient: IPDPatient,
  drugOrders: DrugOrder[]
): Promise<string> {
  if (drugOrders.length === 0) {
    return `<div class="container" style="page:landscape-page;padding:20px;text-align:center;color:#888;">No drug orders.</div>`
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
    const val = drug.days[`day${dayOffset + 1}`] || ''
    return val ? stackTimes(val) : ''
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
  const patientInfoRow = `
    <div style="display:flex;border:1px solid #000;border-bottom:none;font-size:10px;line-height:1.45;">
      <div style="flex:2;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Patient Name</div>
        <div>${esc(fullName(patient))}</div>
      </div>
      <div style="flex:1.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Drug Allergy</div>
        <div>${esc(drugAllergy)}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Age</div>
        <div>${patient.age}</div>
      </div>
      <div style="flex:0.5;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Sex M/F</div>
        <div>${patient.sex}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Ward</div>
        <div>${esc(wardLabel(ward))}</div>
      </div>
      <div style="flex:1;border-right:1px solid #000;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">Room/Bed No.</div>
        <div>${esc(bedNo)}</div>
      </div>
      <div style="flex:1;padding:2px 4px;">
        <div style="font-weight:bold;font-size:8.5px;color:#555;">IPD No.</div>
        <div>${esc(patient.ipdNo || '—')}</div>
      </div>
    </div>`

  const COLS_PER_PAGE = DRUG_ORDER_DATE_COLUMNS_PER_PAGE

  const buildGrid = (from: number, to: number, isPto: boolean): string => {
    const numCols = to - from + 1
    const namePct = DRUG_ORDER_NAME_PCT
    const freqPct = DRUG_ORDER_FREQ_PCT
    const routePct = DRUG_ORDER_ROUTE_PCT
    const startPct = DRUG_ORDER_START_PCT
    const datePct = Math.floor(
      (100 - namePct - freqPct - routePct - startPct) / numCols
    )
    const headerRow = [
      `<th style="width:${namePct}%">Name of Drug</th>`,
      `<th style="width:${freqPct}%">Freq.</th>`,
      `<th style="width:${routePct}%">Route</th>`,
      `<th style="width:${startPct}%;text-align:center">Start</th>`,
      ...Array.from({ length: numCols }, () =>
        `<th style="width:${datePct}%;text-align:center;font-weight:bold;">Date:<br/><span style="font-weight:normal;font-size:7.5px;">&nbsp;</span></th>`
      ),
    ].join('')
    const rows = drugOrders
      .flatMap(drug => {
        const repeatRows = frequencyRowCount(drug.frequency)
        return Array.from({ length: repeatRows }, (_, rowIdx) => `
          <tr>
            <td class="cell-wrap">${rowIdx === 0 ? esc(drug.drugName) : ''}</td>
            <td style="text-align:center">${rowIdx === 0 ? esc(drug.frequency) : ''}</td>
            <td style="text-align:center;font-size:10px;">${rowIdx === 0 ? esc(drug.route) : ''}</td>
            <td style="text-align:center;font-size:9.5px;white-space:nowrap">${rowIdx === 0 ? formatDrugStartDatePdf(drug.startDate) : ''}</td>
            ${Array.from({ length: numCols }, (_, i) => {
              const v = cellValue(drug, from + i)
              return `<td style="text-align:center;vertical-align:top;font-size:9.5px;">${v}</td>`
            }).join('')}
          </tr>`)
      })
      .join('')
    return `
      ${isPto ? '<div style="font-weight:bold;font-size:9.5px;margin-bottom:3px;">PTO</div>' : ''}
      ${patientInfoRow}
      <table style="table-layout:fixed;width:100%;font-size:10px;">
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${rows}</tbody>
      </table>`
  }

  const orderHeader = `
    <div class="header" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div>
          <div class="marathi" style="font-weight:bold;font-size:15px;">झंवर हॉस्पिटल</div>
          <div style="font-size:13px;font-weight:bold;">Zawar Hospital</div>
        </div>
      </div>
      <span class="badge" style="font-size:15px;">ORDER SHEET</span>
    </div>`

  const sig = `
    <div class="footer"><div class="footer-sigs" style="margin-top:10px;">
      <div class="sig-block"><div class="sig-line"></div>
        <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
        <div>Treating Doctor</div>
      </div>
      <div></div>
    </div></div>`

  const pages: string[] = []
  for (let start = 1; start <= DRUG_ORDER_PDF_MAX_DAYS; start += COLS_PER_PAGE) {
    const end = start + COLS_PER_PAGE - 1
    if (start === 1 || hasDaysData(start, end)) {
      pages.push(buildGrid(start, end, start > 1))
    }
  }

  return pages
    .map((grid, i) => `
      <div class="container" style="page:landscape-page;">
        ${orderHeader}
        ${grid}
        ${i === pages.length - 1 ? sig : ''}
      </div>`)
    .join('<div class="new-page"></div>')
}
