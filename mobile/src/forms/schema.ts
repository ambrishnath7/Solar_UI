import { z } from 'zod'
import { SECTIONS, type ReportFields } from '../lib/types'

const yn = z.enum(['YES', 'NO'])
const gd = z.enum(['GOOD', 'DEFECT'])
const num = z.number().nonnegative()
const text = z.string().nullable().optional()

/** Per-section "complete" schemas: every enumerated / numeric field required. */
export const sectionSchemas: Record<number, z.ZodTypeAny> = {
  1: z.object({ s1ModuleCleaning: yn, s1BrokenModule: yn, s1MountingStructure: gd, s1NutBoltTightness: gd, s1PhotosBeforeAfter: yn, s1Remarks: text }),
  2: z.object({ s2DcCables: gd, s2Mc4Connectors: gd, s2DcJunctionBox: gd, s2StringVoltage: gd, s2CableInsulation: gd, s2Remarks: text }),
  3: z.object({ s3InverterWorking: gd, s3CoolingFans: gd, s3AcOutputVoltage: gd, s3OtherIssues: gd, s3Remarks: text }),
  4: z.object({ s4AcCablesConnections: gd, s4AcDistributionBoard: gd, s4McbMccb: gd, s4Remarks: text }),
  5: z.object({ s5EquipmentEarthing: gd, s5LightningArrester: gd, s5SurgeProtection: gd, s5EarthingPit: gd, s5Remarks: text }),
  6: z.object({ s6TotalGenerationKwh: num, s6AvgDailyGenerationKwh: num, s6ExpectedGenerationKwh: num, s6PerformanceStatus: gd, s6Remarks: text }),
  7: z.object({ s7ImportUnits: num, s7ExportUnits: num, s7NetMeterCondition: gd, s7Remarks: text }),
  8: z.object({ s8GeneralObservations: text, s8ActionRequired: text, nextVisitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
}
export const headerSchema = z.object({ visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD'), previousMaintenanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional().or(z.literal('')), technicianCount: z.number().int().nonnegative() })

export function sectionComplete(n: number, f: ReportFields): boolean { return sectionSchemas[n].safeParse(f).success }
export function headerComplete(f: ReportFields): boolean { return headerSchema.safeParse(f).success }

/** Human list of missing items across the whole form, for the review screen. */
export function missingItems(f: ReportFields, sigs: { engineer: boolean; client: boolean }): string[] {
  const out: string[] = []
  if (!headerComplete(f)) out.push('Visit date / number of technicians')
  for (const s of SECTIONS) for (const r of s.rows) { const v = f[r.key]; if (v === null || v === undefined || v === '') out.push(`${s.n}. ${r.label}`) }
  if (!f.nextVisitDate) out.push('8. Next visit date')
  if (!sigs.engineer) out.push('Engineer signature')
  if (!sigs.client) out.push('Client representative signature')
  return out
}
