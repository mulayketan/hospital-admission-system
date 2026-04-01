/**
 * Parses Progress Report "Treatment" free text and creates DrugOrders + Medicines rows.
 * Best-effort; staff can edit/delete orders afterward.
 */
import {
  DrugOrderModel,
  MedicineModel,
  PatientModel,
  type ProgressReportEntry,
} from './sheets-models'

type OrderFrequency =
  | 'BD'
  | 'TDS'
  | 'OD'
  | 'STAT'
  | 'SOS'
  | 'QID'
  | 'HS'
  | '1-0-1'
  | '2-2-2'
  | 'Other'

type OrderRoute =
  | 'IV'
  | 'INJ (IM)'
  | 'Oral (TAB)'
  | 'Oral (SYP)'
  | 'Oral (CAP)'
  | 'Topical'
  | 'SL'
  | 'Other'

export type ParsedTreatmentLine = {
  drugName: string
  frequency: OrderFrequency
  route: OrderRoute
}

const NOISE_END_TOKENS = new Set(['GIVEN', 'ADMINISTERED', 'STARTED'])

function normDedupeKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Skip IV-fluid shorthand lines, not drug rows. */
function shouldSkipLine(line: string): boolean {
  const t = line.trim()
  if (t.length < 2) return true
  if (/\|\|\s*POINT/i.test(t)) return true
  if (/^(NS|RL|DNS|D5)\s*(\|\||$)/i.test(t)) return true
  return false
}

function inferRouteFromLine(line: string): OrderRoute {
  if (/\bIM\b/i.test(line)) return 'INJ (IM)'
  if (/^INJ\.|^INJ\s/i.test(line.trim())) return 'IV'
  if (/^TAB\s/i.test(line.trim())) return 'Oral (TAB)'
  if (/^SYP\s/i.test(line.trim())) return 'Oral (SYP)'
  if (/^CAP\s/i.test(line.trim())) return 'Oral (CAP)'
  if (/^SL\s/i.test(line.trim())) return 'SL'
  if (/topical/i.test(line)) return 'Topical'
  return 'Other'
}

function mapLastTokenToFreq(token: string): OrderFrequency | null {
  const u = token.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (u === 'BID' || u === 'BD') return 'BD'
  if (u === 'TID') return 'TDS'
  if (
    u === 'TDS' ||
    u === 'OD' ||
    u === 'STAT' ||
    u === 'SOS' ||
    u === 'QID' ||
    u === 'HS' ||
    u === '1-0-1' ||
    u === '2-2-2'
  ) {
    return u as OrderFrequency
  }
  return null
}

export function parseTreatmentLines(raw: string | null | undefined): ParsedTreatmentLine[] {
  if (!raw?.trim()) return []
  const out: ParsedTreatmentLine[] = []
  const lines = raw.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (shouldSkipLine(trimmed)) continue

    let tokens = trimmed.split(/\s+/).filter(Boolean)
    while (tokens.length > 0) {
      const t = tokens[tokens.length - 1].toUpperCase()
      if (NOISE_END_TOKENS.has(t)) tokens = tokens.slice(0, -1)
      else break
    }
    if (tokens.length === 0) continue

    let frequency: OrderFrequency = 'Other'
    const last = tokens[tokens.length - 1]
    const mapped = mapLastTokenToFreq(last)
    if (mapped) {
      frequency = mapped
      tokens = tokens.slice(0, -1)
    }
    const drugName = tokens.join(' ').trim()
    if (drugName.length < 2) continue

    const route = inferRouteFromLine(trimmed)
    out.push({ drugName, frequency, route })
  }
  return out
}

function startDateFromProgressEntry(entry: ProgressReportEntry): string {
  const dt = entry.dateTime
  if (dt.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dt)) return dt.slice(0, 10)
  try {
    const d = new Date(dt)
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d)
    }
  } catch {
    /* ignore */
  }
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
}

export async function syncProgressTreatmentToDrugOrders(entry: ProgressReportEntry): Promise<void> {
  try {
    if (!entry.treatment?.trim()) return

    const parsed = parseTreatmentLines(entry.treatment)
    if (parsed.length === 0) return

    const patient = await PatientModel.findById(entry.patientId)
    const ward = patient?.ward ?? null
    const bedNo = patient?.bedNo ?? null

    const existing = await DrugOrderModel.findByPatientId(entry.patientId)
    const startDate = startDateFromProgressEntry(entry)

    const existingKeys = new Set(
      existing.map((o) => `${normDedupeKey(o.drugName)}|${o.startDate}`)
    )

    for (const p of parsed) {
      const key = `${normDedupeKey(p.drugName)}|${startDate}`
      if (existingKeys.has(key)) continue
      existingKeys.add(key)

      await MedicineModel.ensureInMaster(p.drugName, {
        defaultFrequency: p.frequency,
        defaultRoute: p.route,
      })

      const days: Record<string, string> =
        p.frequency === 'STAT' ? { day1: 'STAT' } : {}

      await DrugOrderModel.create({
        patientId: entry.patientId,
        ipdNo: entry.ipdNo,
        drugName: p.drugName,
        drugAllergy: null,
        frequency: p.frequency,
        route: p.route,
        startDate,
        ward,
        bedNo,
        days,
        medOfficerSignature: null,
      })
    }
  } catch (e) {
    console.error('[syncProgressTreatmentToDrugOrders]', { entryId: entry.id, error: e })
  }
}
