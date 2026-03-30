import { getBrowser } from './browser'

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

/** Format a Date as "D/M" (no year, for day-column headers). */
const fmtDayHeader = (d: Date): string => `${d.getDate()}/${d.getMonth() + 1}`

/** Stack comma-separated times vertically (replace "," with "<br>"). */
const stackTimes = (val: string): string =>
  esc(val).replace(/,/g, '<br>')

/** Full patient name. */
const fullName = (p: IPDPatient): string =>
  [p.firstName, p.middleName, p.surname].filter(Boolean).join(' ')

// ---------------------------------------------------------------------------
// Shared CSS constants
// ---------------------------------------------------------------------------

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap');
`

const BASE_CSS = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Noto Sans', Arial, sans-serif;
    font-size: 11px;
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
    font-weight: bold; font-size: 12px;
  }
  .header {
    display: flex; justify-content: space-between; align-items: flex-start;
    border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px;
  }
  .logo-img { height: 46px; width: auto; margin-right: 8px; }
  .uhid-box {
    display: inline-block; border: 1px solid #000;
    padding: 3px 8px; font-weight: bold; font-size: 11px;
    margin-top: 4px;
  }
  .patient-strip {
    border: 1px solid #000; padding: 5px 8px;
    margin: 5px 0; font-size: 11px;
  }
  .ps-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .ps-item { white-space: nowrap; }
  .ps-label { font-weight: bold; }
  .ps-value { border-bottom: 1px solid #aaa; min-width: 60px; display: inline-block; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 4px 5px; vertical-align: top; font-size: 10.5px; }
  th { background: #e8e8e8; font-weight: bold; text-align: center; }
  .cell-wrap { white-space: pre-wrap; word-break: break-word; }
  .footer { margin-top: 12px; font-size: 10px; }
  .footer-note {
    text-align: center; font-style: italic;
    border-top: 1px solid #000; padding-top: 5px; margin-bottom: 10px;
  }
  .footer-sigs { display: flex; justify-content: space-between; align-items: flex-end; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #000; height: 28px; width: 140px; margin: 0 auto 4px; }
`

// ---------------------------------------------------------------------------
// ZH Logo (same base64 PNG as pdf-generator-final.ts)
// ---------------------------------------------------------------------------
const ZH_LOGO_SRC =
  'data:image/png;base64,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' +
  'ODcryAAAAAElFTkSuQmCC'

// ---------------------------------------------------------------------------
// Shared HTML wrapper (adds fonts + base styles for portrait or landscape)
// ---------------------------------------------------------------------------

const htmlDoc = (orientation: 'portrait' | 'landscape', body: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
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

const renderPDF = async (
  html: string,
  orientation: 'portrait' | 'landscape'
): Promise<Buffer> => {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.setViewport({ width: orientation === 'landscape' ? 1600 : 1200, height: 1100 })
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    const pdfBuffer = await page.pdf({
      format: 'A4',
      landscape: orientation === 'landscape',
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      timeout: 28000,
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
  adviceEntries,
}: {
  patient: IPDPatient
  entries: ProgressReportEntry[]
  adviceEntries: PatientAdvice[]
}): Promise<Buffer> => {
  const admissionEntry = entries.find(e => e.isAdmissionNote)
  const diagnosis = admissionEntry?.diagnosis || ''

  const rowsHtml = entries
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
              <th style="width:22%">Notes</th>
              <th style="width:16%">Status</th>
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
                <td class="cell-wrap">${esc(a.notes || '—')}</td>
                <td style="text-align:center">${esc(a.status)}</td>
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
      <div style="font-weight:bold;margin-bottom:4px;">DIAGNOSIS / CHIEF COMPLAINT</div>
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
        <div style="font-size:9px;color:#555;align-self:flex-end;">
          Zawar Hospital, Solapur Road, Barshi, Dist. Solapur.
        </div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(patient.treatingDoctor || '')}</div>
          <div>Treating Doctor</div>
        </div>
      </div>
    </div>
  </div>`

  return renderPDF(htmlDoc('portrait', body), 'portrait')
}

// ---------------------------------------------------------------------------
// 2. Nursing Notes PDF (Portrait A4)  §8.2
// ---------------------------------------------------------------------------

export const generateNursingNotesPDF = async ({
  patient,
  entries,
}: {
  patient: IPDPatient
  entries: NursingNote[]
}): Promise<Buffer> => {
  const rowsHtml = entries
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

  return renderPDF(htmlDoc('portrait', body), 'portrait')
}

// ---------------------------------------------------------------------------
// 3. Nursing Chart PDF (Landscape A4)  §8.3
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

  return renderPDF(htmlDoc('landscape', body), 'landscape')
}

// ---------------------------------------------------------------------------
// 4. Drug Order Sheet PDF (Landscape A4)  §8.4
// ---------------------------------------------------------------------------

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
        '<div class="container" style="padding:20px;text-align:center;color:#888;">No drug orders found.</div>'
      ),
      'landscape'
    )
  }

  // Compute global start date (earliest across all drug rows)
  const globalStart = drugOrders.reduce<Date>((earliest, d) => {
    const candidate = parseDateStr(d.startDate)
    return candidate < earliest ? candidate : earliest
  }, parseDateStr(drugOrders[0].startDate))

  const drugStart = (drug: DrugOrder): Date => parseDateStr(drug.startDate)

  /** Column N (1-indexed) → calendar date. */
  const colDate = (n: number): Date => {
    const d = new Date(globalStart)
    d.setDate(d.getDate() + n - 1)
    return d
  }

  /** Drug × column → administration times (stacked). */
  const cellValue = (drug: DrugOrder, colN: number): string => {
    const ds = drugStart(drug)
    const msPerDay = 86_400_000
    const dayOffset = Math.round((colDate(colN).getTime() - ds.getTime()) / msPerDay)
    if (dayOffset < 0 || dayOffset > 35) return ''
    const val = drug.days[`day${dayOffset + 1}`] || ''
    return val ? stackTimes(val) : ''
  }

  // Check if page 2 is needed
  const needsPage2 = drugOrders.some(drug =>
    Array.from({ length: 21 }, (_, i) => `day${i + 16}`).some(
      key => (drug.days[key] || '').trim() !== ''
    )
  )

  // Use the first drug row for denormalized patient info
  const firstDrug = drugOrders[0]
  const drugAllergy = firstDrug.drugAllergy || 'NKDA'
  const ward = firstDrug.ward || patient.ward || '—'
  const bedNo = firstDrug.bedNo || patient.bedNo || '—'
  const medOfficer = firstDrug.medOfficerSignature || ''

  const patientInfoCol = `
    <div style="width:120px;min-width:120px;border-right:2px solid #000;padding:4px 6px;font-size:10px;line-height:1.6;">
      <div><strong>Patient Name:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${esc(fullName(patient))}</div>
      <div><strong>Drug Allergy:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${esc(drugAllergy)}</div>
      <div><strong>Age:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${patient.age}</div>
      <div><strong>Sex M/F:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${patient.sex}</div>
      <div><strong>Ward:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${esc(ward)}</div>
      <div><strong>Room/Bed No.:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:4px;">${esc(bedNo)}</div>
      <div><strong>IPD No.:</strong></div>
      <div>${esc(patient.ipdNo || '—')}</div>
    </div>`

  const buildPage = (daysFrom: number, daysTo: number, isPto: boolean): string => {
    const numCols = daysTo - daysFrom + 1
    const drugCols = ['#', 'Name of Drug', 'Freq', 'Route', 'Start']
    const dayColWidth = Math.floor(62 / numCols)

    const headerRow = [
      ...drugCols.map(
        (h, i) =>
          `<th style="width:${[3, 24, 7, 8, 7][i]}%;">${h}</th>`
      ),
      ...Array.from({ length: numCols }, (_, i) => {
        const d = colDate(daysFrom + i)
        return `<th style="width:${dayColWidth}%;text-align:center;">${fmtDayHeader(d)}</th>`
      }),
    ].join('')

    const bodyRows = drugOrders
      .map(
        (drug, idx) => `
        <tr>
          <td style="text-align:center">${idx + 1}</td>
          <td class="cell-wrap">${esc(drug.drugName)}</td>
          <td style="text-align:center">${esc(drug.frequency)}</td>
          <td style="text-align:center">${esc(drug.route)}</td>
          <td style="text-align:center">${fmtDayHeader(parseDateStr(drug.startDate))}</td>
          ${Array.from({ length: numCols }, (_, i) => {
            const val = cellValue(drug, daysFrom + i)
            return `<td style="text-align:center;vertical-align:top;font-size:9px;">${val}</td>`
          }).join('')}
        </tr>`
      )
      .join('')

    return `
      <div style="display:flex;">
        ${patientInfoCol}
        <div style="flex:1;overflow:hidden;">
          ${isPto ? '<div style="font-weight:bold;font-size:11px;margin-bottom:4px;">PTO — Days 16–36</div>' : ''}
          <table style="table-layout:fixed;width:100%;font-size:9.5px;">
            <thead><tr>${headerRow}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>
      </div>`
  }

  const page1 = buildPage(1, 15, false)
  const page2 = needsPage2 ? buildPage(16, 36, true) : ''

  const header = `
    <div class="header" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div>
          <div style="font-weight:bold;font-size:14px;" class="marathi">झावर हॉस्पिटल</div>
          <div style="font-size:12px;font-weight:bold;">Zawar Hospital</div>
        </div>
      </div>
      <div><span class="badge" style="font-size:14px;">ORDER SHEET</span></div>
    </div>`

  const footer = `
    <div class="footer" style="margin-top:12px;">
      <div class="footer-sigs">
        <div></div>
        <div class="sig-block">
          <div class="sig-line"></div>
          <div style="font-weight:bold;">${esc(medOfficer || patient.treatingDoctor || '')}</div>
          <div>Medical Officer</div>
        </div>
      </div>
    </div>`

  const body = `
  <div class="container">
    ${header}
    ${page1}
    ${needsPage2
      ? `<div style="page-break-before:always;margin-top:8px;">${header}${page2}${footer}</div>`
      : footer}
  </div>`

  return renderPDF(htmlDoc('landscape', body), 'landscape')
}

// ---------------------------------------------------------------------------
// 5. Combined IPD PDF — 4 forms concatenated (§8.5)
//    Uses CSS named pages so portrait and landscape sections coexist.
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
              <th style="width:22%">Notes</th>
              <th style="width:16%">Status</th>
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
                <td class="cell-wrap">${esc(a.notes || '—')}</td>
                <td style="text-align:center">${esc(a.status)}</td>
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
        <div style="font-weight:bold;margin-bottom:4px;">DIAGNOSIS / CHIEF COMPLAINT</div>
        <div class="cell-wrap" style="min-height:28px;">${esc(diagnosis)}</div>
      </div>
      <table><thead><tr><th style="width:15%">Date &amp; Time</th><th style="width:45%">Doctor's Notes</th><th style="width:40%">Treatment</th></tr></thead>
      <tbody>${prRows || '<tr><td colspan="3" style="text-align:center;color:#888">No entries</td></tr>'}</tbody></table>
      ${adviceBlock}
      <div class="footer">
        <div class="footer-note">Every Entry to be Named, Signed, Dated &amp; Timed</div>
        <div class="footer-sigs" style="margin-top:10px;">
          <div style="font-size:9px;color:#555;align-self:flex-end;">Zawar Hospital, Solapur Road, Barshi, Dist. Solapur.</div>
          ${sigBlock('Treating Doctor', patient.treatingDoctor)}
        </div>
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
    <div style="text-align:right;margin-bottom:4px;font-size:11px;"><strong>UHID:</strong> ${esc(patient.uhidNo || '—')}</div>
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
      <table><thead><tr><th style="width:15%">Date &amp; Time</th><th style="width:45%">Doctor's Notes</th><th style="width:40%">Treatment</th></tr></thead>
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
    <div class="container" style="page:landscape-page;">
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
    // Do NOT pass `format` or `landscape` here — the combined PDF uses CSS
    // @page named-pages to control per-section orientation (portrait for
    // Progress Report / Nursing Notes; landscape for Nursing Chart / Drug Orders).
    // Passing format:'A4' would override the CSS @page size directives and render
    // all sections as portrait, breaking the landscape sections (§8.3, §8.4).
    const pdfBuffer = await page.pdf({
      printBackground: true,
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      timeout: 28000,
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
    const msPerDay = 86_400_000
    const dayOffset = Math.round((colDate(colN).getTime() - ds.getTime()) / msPerDay)
    if (dayOffset < 0 || dayOffset > 35) return ''
    const val = drug.days[`day${dayOffset + 1}`] || ''
    return val ? stackTimes(val) : ''
  }

  const needsPage2 = drugOrders.some(drug =>
    Array.from({ length: 21 }, (_, i) => `day${i + 16}`).some(
      key => (drug.days[key] || '').trim() !== ''
    )
  )

  const firstDrug = drugOrders[0]
  const drugAllergy = firstDrug.drugAllergy || 'NKDA'
  const ward = firstDrug.ward || patient.ward || '—'
  const bedNo = firstDrug.bedNo || patient.bedNo || '—'
  const medOfficer = firstDrug.medOfficerSignature || patient.treatingDoctor || ''

  const patientCol = `
    <div style="width:110px;min-width:110px;border-right:2px solid #000;padding:4px;font-size:9px;line-height:1.7;">
      <div><strong>Patient Name:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:3px;">${esc(fullName(patient))}</div>
      <div><strong>Drug Allergy:</strong></div>
      <div style="border-bottom:1px solid #aaa;margin-bottom:3px;">${esc(drugAllergy)}</div>
      <div><strong>Age:</strong>&nbsp;${patient.age}</div>
      <div><strong>Sex M/F:</strong>&nbsp;${patient.sex}</div>
      <div><strong>Ward:</strong>&nbsp;${esc(ward)}</div>
      <div><strong>Room/Bed:</strong>&nbsp;${esc(bedNo)}</div>
      <div><strong>IPD No.:</strong>&nbsp;${esc(patient.ipdNo || '—')}</div>
    </div>`

  const buildGrid = (from: number, to: number): string => {
    const numCols = to - from + 1
    const dayColW = Math.floor(58 / numCols)
    const header = [
      `<th style="width:3%">#</th>`,
      `<th style="width:22%">Name of Drug</th>`,
      `<th style="width:6%">Freq</th>`,
      `<th style="width:7%">Route</th>`,
      `<th style="width:6%">Start</th>`,
      ...Array.from({ length: numCols }, (_, i) =>
        `<th style="width:${dayColW}%;text-align:center;">${fmtDayHeader(colDate(from + i))}</th>`
      ),
    ].join('')
    const rows = drugOrders
      .map(
        (drug, idx) => `
        <tr>
          <td style="text-align:center">${idx + 1}</td>
          <td class="cell-wrap">${esc(drug.drugName)}</td>
          <td style="text-align:center">${esc(drug.frequency)}</td>
          <td style="text-align:center;font-size:8.5px;">${esc(drug.route)}</td>
          <td style="text-align:center">${fmtDayHeader(parseDateStr(drug.startDate))}</td>
          ${Array.from({ length: numCols }, (_, i) => {
            const v = cellValue(drug, from + i)
            return `<td style="text-align:center;vertical-align:top;font-size:8px;">${v}</td>`
          }).join('')}
        </tr>`
      )
      .join('')
    return `<table style="table-layout:fixed;width:100%;font-size:9px;"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`
  }

  const orderHeader = `
    <div class="header" style="margin-bottom:6px;">
      <div style="display:flex;align-items:center;gap:8px;flex:1;justify-content:center;">
        <img class="logo-img" src="${ZH_LOGO_SRC}" alt="ZH" />
        <div>
          <div class="marathi" style="font-weight:bold;font-size:13px;">झावर हॉस्पिटल</div>
          <div style="font-size:11px;font-weight:bold;">Zawar Hospital</div>
        </div>
      </div>
      <span class="badge" style="font-size:13px;">ORDER SHEET</span>
    </div>`

  const sig = `
    <div class="footer"><div class="footer-sigs" style="margin-top:10px;"><div></div>
      <div class="sig-block"><div class="sig-line"></div>
        <div style="font-weight:bold;">${esc(medOfficer)}</div>
        <div>Medical Officer</div>
      </div>
    </div></div>`

  const page1 = `
    <div class="container" style="page:landscape-page;">
      ${orderHeader}
      <div style="display:flex;">${patientCol}<div style="flex:1;overflow:hidden;">${buildGrid(1, 15)}</div></div>
      ${needsPage2 ? '' : sig}
    </div>`

  const page2 = needsPage2
    ? `
    <div class="container" style="page:landscape-page;margin-top:8px;">
      ${orderHeader}
      <div style="font-weight:bold;font-size:10px;margin-bottom:4px;">PTO — Days 16–36</div>
      <div style="display:flex;">${patientCol}<div style="flex:1;overflow:hidden;">${buildGrid(16, 36)}</div></div>
      ${sig}
    </div>`
    : ''

  return page1 + (needsPage2 ? `<div class="new-page">${page2}</div>` : '')
}
