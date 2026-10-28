import { z } from 'zod'
import { FIELD_LABELS, SECTIONS, addDays, isValidIso, todayIso, type ReportFields } from '../lib/types'

// Mirrors the server rules (backend Validators.cs) so invalid drafts are caught on the phone, not by a 400.
export const LIMITS = { maxNumber: 1_000_000_000, maxTechnicians: 50, maxText: 2000, maxName: 200, minDate: '2000-01-01', futureDays: 30, nextVisitYears: 3 }

const yn = z.enum(['YES', 'NO'])
const gd = z.enum(['GOOD', 'DEFECT'])
const num = z.number().min(0).max(LIMITS.maxNumber)
const text = z.string().max(LIMITS.maxText).nullable().optional()

/** Per-section "complete" schemas: every enumerated / numeric field required. */
export const sectionSchemas: Record<number, z.ZodTypeAny> = {
  1: z.object({ s1ModuleCleaning: yn, s1BrokenModule: yn, s1MountingStructure: gd, s1NutBoltTightness: gd, s1PhotosBeforeAfter: yn, s1Remarks: text }),
  2: z.object({ s2DcCables: gd, s2Mc4Connectors: gd, s2DcJunctionBox: gd, s2StringVoltage: gd, s2CableInsulation: gd, s2Remarks: text }),
  3: z.object({ s3InverterWorking: gd, s3CoolingFans: gd, s3AcOutputVoltage: gd, s3OtherIssues: gd, s3Remarks: text }),
  4: z.object({ s4AcCablesConnections: gd, s4AcDistributionBoard: gd, s4McbMccb: gd, s4Remarks: text }),
  5: z.object({ s5EquipmentEarthing: gd, s5LightningArrester: gd, s5SurgeProtection: gd, s5EarthingPit: gd, s5Remarks: text }),
  6: z.object({ s6TotalGenerationKwh: num, s6AvgDailyGenerationKwh: num, s6ExpectedGenerationKwh: num, s6PerformanceStatus: gd, s6Remarks: text }),
  7: z.object({ s7ImportUnits: num, s7ExportUnits: num, s7NetMeterCondition: gd, s7Remarks: text }),
  8: z.object({ s8GeneralObservations: text, s8ActionRequired: text, nextVisitDate: z.string().refine(isValidIso) }),
}

/**
 * Problems that make the server reject the draft even as a draft (dates, ranges, lengths).
 * Empty answers are fine for a draft; they are required only at submission (missingItems).
 */
export function draftProblems(f: ReportFields): string[] {
  const out: string[] = []
  const maxVisit = addDays(todayIso(), LIMITS.futureDays)
  if (!isValidIso(f.visitDate)) out.push('Visit date is not a valid date')
  else if (f.visitDate < LIMITS.minDate || f.visitDate > maxVisit) out.push('Visit date must be between 2000 and 30 days from today')
  if (f.previousMaintenanceDate && !isValidIso(f.previousMaintenanceDate)) out.push('Previous maintenance date is not a valid date')
  if (f.nextVisitDate) {
    if (!isValidIso(f.nextVisitDate)) out.push('Next visit date is not a valid date')
    else if (isValidIso(f.visitDate) && f.nextVisitDate < f.visitDate) out.push('Next visit date is before the visit date')
    else if (isValidIso(f.visitDate) && f.nextVisitDate > addDays(f.visitDate, 365 * LIMITS.nextVisitYears)) out.push('Next visit date is more than 3 years after the visit')
  }
  if (f.technicianCount != null && (!Number.isInteger(f.technicianCount) || f.technicianCount < 0 || f.technicianCount > LIMITS.maxTechnicians)) out.push(`Number of technicians must be a whole number 0–${LIMITS.maxTechnicians}`)
  for (const s of SECTIONS) for (const r of s.rows) {
    const v = f[r.key]
    if (r.type === 'num' && v != null && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > LIMITS.maxNumber)) out.push(`${FIELD_LABELS[r.key]} must be between 0 and 1,000,000,000`)
  }
  for (const [k, v] of Object.entries(f)) if (typeof v === 'string' && v.length > (k === 'clientRepName' ? LIMITS.maxName : LIMITS.maxText)) out.push(`${FIELD_LABELS[k] ?? k} is too long`)
  return out
}

export function headerComplete(f: ReportFields): boolean {
  return isValidIso(f.visitDate) && f.technicianCount != null && Number.isInteger(f.technicianCount) && f.technicianCount > 0
}
export function sectionComplete(n: number, f: ReportFields): boolean {
  if (n === 1 && !headerComplete(f)) return false
  if (n === 8 && !(f.s8GeneralObservations?.trim() || f.s8ActionRequired?.trim())) return false   // next visit is pre-filled, so it alone does not mean "done"
  return sectionSchemas[n].safeParse(f).success
}

/** Everything required before Submit Final, in human terms. */
export function missingItems(f: ReportFields, sigs: { engineer: boolean; client: boolean }): string[] {
  const out = [...draftProblems(f)]
  if (!headerComplete(f)) out.push('Visit date / number of technicians')
  for (const s of SECTIONS) for (const r of s.rows) { const v = f[r.key]; if (v === null || v === undefined || v === '') out.push(`${s.n}. ${r.label}`) }
  if (!f.nextVisitDate) out.push('8. Next visit date')
  if (!sigs.engineer) out.push('Engineer signature')
  if (!f.clientRepName?.trim()) out.push('Client representative name')
  if (!sigs.client) out.push('Client representative signature')
  return out
}
