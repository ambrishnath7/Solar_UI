// Mirrors backend DTOs (camelCase JSON). Field labels are the physical PMC form's wording.
export type YesNo = 'YES' | 'NO'
export type GoodDefect = 'GOOD' | 'DEFECT'
export type ReportStatus = 'draft' | 'submitted' | 'corrected'
export type AmcStatus = 'FREE_YEAR1' | 'AMC' | 'EXPIRED' | 'NONE'

export type Me = { userId: string; role: 'admin' | 'engineer'; engineerId?: string | null; engineerName?: string | null; email?: string | null }

export type Client = {
  id: string; name: string; contactPerson?: string | null; phone?: string | null; email?: string | null; address?: string | null; siteLocation?: string | null
  solarCapacityKwp?: number | null; moduleMake?: string | null; moduleModel?: string | null; moduleCount?: number | null; moduleWattage?: number | null
  inverterMake?: string | null; inverterModel?: string | null; inverterCapacityKw?: number | null; installationDate?: string | null
  previousMaintenanceDate?: string | null; nextDueDate?: string | null; amcStatus: AmcStatus; amcStartDate?: string | null; amcExpiryDate?: string | null; isActive: boolean
}

export type ReportFields = {
  visitDate: string; previousMaintenanceDate?: string | null; technicianCount?: number | null
  s1ModuleCleaning?: YesNo | null; s1BrokenModule?: YesNo | null; s1MountingStructure?: GoodDefect | null; s1NutBoltTightness?: GoodDefect | null; s1PhotosBeforeAfter?: YesNo | null; s1Remarks?: string | null
  s2DcCables?: GoodDefect | null; s2Mc4Connectors?: GoodDefect | null; s2DcJunctionBox?: GoodDefect | null; s2StringVoltage?: GoodDefect | null; s2CableInsulation?: GoodDefect | null; s2Remarks?: string | null
  s3InverterWorking?: GoodDefect | null; s3CoolingFans?: GoodDefect | null; s3AcOutputVoltage?: GoodDefect | null; s3OtherIssues?: GoodDefect | null; s3Remarks?: string | null
  s4AcCablesConnections?: GoodDefect | null; s4AcDistributionBoard?: GoodDefect | null; s4McbMccb?: GoodDefect | null; s4Remarks?: string | null
  s5EquipmentEarthing?: GoodDefect | null; s5LightningArrester?: GoodDefect | null; s5SurgeProtection?: GoodDefect | null; s5EarthingPit?: GoodDefect | null; s5Remarks?: string | null
  s6TotalGenerationKwh?: number | null; s6AvgDailyGenerationKwh?: number | null; s6ExpectedGenerationKwh?: number | null; s6PerformanceStatus?: GoodDefect | null; s6Remarks?: string | null
  s7ImportUnits?: number | null; s7ExportUnits?: number | null; s7NetMeterCondition?: GoodDefect | null; s7Remarks?: string | null
  s8GeneralObservations?: string | null; s8ActionRequired?: string | null; nextVisitDate?: string | null; clientRepName?: string | null
}

export type Report = {
  id: string; clientLocalId: string; reportRef?: string | null; status: ReportStatus; version: number; defectCount: number
  clientId: string; clientName: string; engineerId: string; engineerName: string; fields: ReportFields
  hasEngineerSignature: boolean; hasClientSignature: boolean; submittedAt?: string | null; createdAt: string; updatedAt: string
}
export type ReportListItem = { id: string; reportRef?: string | null; status: ReportStatus; visitDate: string; nextVisitDate?: string | null; clientId: string; clientName: string; engineerName: string; defectCount: number; submittedAt?: string | null; updatedAt: string }
export type SubmitResult = { id: string; reportRef: string; nextVisitDate: string; submittedAt: string; version: number }
export type EngineerDashboard = { todayVisits: number; drafts: number; submittedThisMonth: number; upcoming: { clientId: string; clientName: string; siteLocation?: string | null; nextDueDate?: string | null; amcStatus: AmcStatus; isOverdue: boolean }[] }
export type Paged<T> = { items: T[]; page: number; pageSize: number; total: number }

export type FieldType = 'yn' | 'gd' | 'num'
export type SectionDef = { n: number; title: string; remarks: keyof ReportFields; remarksLabel?: string; rows: { key: keyof ReportFields; label: string; type: FieldType }[] }

export const SECTIONS: SectionDef[] = [
  { n: 1, title: 'Solar Module Inspection', remarks: 's1Remarks', rows: [
    { key: 's1ModuleCleaning', label: 'Solar module cleaning', type: 'yn' }, { key: 's1BrokenModule', label: 'Broken module', type: 'yn' },
    { key: 's1MountingStructure', label: 'Module mounting structure condition', type: 'gd' }, { key: 's1NutBoltTightness', label: 'Module nut and bolt tightness', type: 'gd' },
    { key: 's1PhotosBeforeAfter', label: 'Photos taken before and after cleaning', type: 'yn' } ] },
  { n: 2, title: 'DC System Inspection', remarks: 's2Remarks', rows: [
    { key: 's2DcCables', label: 'DC cables condition', type: 'gd' }, { key: 's2Mc4Connectors', label: 'MC4 connectors condition', type: 'gd' },
    { key: 's2DcJunctionBox', label: 'DC junction box condition', type: 'gd' }, { key: 's2StringVoltage', label: 'String voltage measurement', type: 'gd' },
    { key: 's2CableInsulation', label: 'Cable insulation condition', type: 'gd' } ] },
  { n: 3, title: 'Inverter Inspection', remarks: 's3Remarks', rows: [
    { key: 's3InverterWorking', label: 'Inverter working condition', type: 'gd' }, { key: 's3CoolingFans', label: 'Cooling fans working', type: 'gd' },
    { key: 's3AcOutputVoltage', label: 'Inverter AC output voltage', type: 'gd' }, { key: 's3OtherIssues', label: 'Other inverter issues', type: 'gd' } ] },
  { n: 4, title: 'AC System Inspection', remarks: 's4Remarks', rows: [
    { key: 's4AcCablesConnections', label: 'AC cables and electrical connections', type: 'gd' }, { key: 's4AcDistributionBoard', label: 'AC distribution board condition', type: 'gd' },
    { key: 's4McbMccb', label: 'MCB / MCCB condition', type: 'gd' } ] },
  { n: 5, title: 'Earthing and Safety', remarks: 's5Remarks', rows: [
    { key: 's5EquipmentEarthing', label: 'Equipment earthing condition', type: 'gd' }, { key: 's5LightningArrester', label: 'Lightning arrester condition', type: 'gd' },
    { key: 's5SurgeProtection', label: 'Surge protection device condition', type: 'gd' }, { key: 's5EarthingPit', label: 'Earthing pit condition', type: 'gd' } ] },
  { n: 6, title: 'Generation Performance', remarks: 's6Remarks', remarksLabel: 'Remarks / reasons for poor performance', rows: [
    { key: 's6TotalGenerationKwh', label: 'Total generation this month (kWh)', type: 'num' }, { key: 's6AvgDailyGenerationKwh', label: 'Average daily generation (kWh)', type: 'num' },
    { key: 's6ExpectedGenerationKwh', label: 'Expected generation (kWh)', type: 'num' }, { key: 's6PerformanceStatus', label: 'Performance status', type: 'gd' } ] },
  { n: 7, title: 'Net Meter / EB Check', remarks: 's7Remarks', rows: [
    { key: 's7ImportUnits', label: 'Import units', type: 'num' }, { key: 's7ExportUnits', label: 'Export units', type: 'num' },
    { key: 's7NetMeterCondition', label: 'Net meter condition', type: 'gd' } ] },
]
export const SECTION_8_TITLE = 'Observations and Issues'

export const addDays = (iso: string, days: number) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }
export const todayIso = () => new Date().toISOString().slice(0, 10)
export const fmtDate = (d?: string | null) => (d ? new Date(d.length === 10 ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
