import type { QueryClient } from '@tanstack/react-query'

/** Everything derived from client data: lists, detail, schedule/calendar, AMC, dashboard cards. */
export function invalidateClientData(qc: QueryClient, clientId?: string) {
  for (const key of ['clients', 'schedule', 'amc', 'dashboard']) void qc.invalidateQueries({ queryKey: [key] })
  if (clientId) void qc.invalidateQueries({ queryKey: ['client', clientId] })
}

/** A report change (e.g. admin correction) also moves the client's next due date and defect counts. */
export function invalidateReportData(qc: QueryClient, reportId: string, clientId?: string) {
  void qc.invalidateQueries({ queryKey: ['report', reportId] })
  for (const key of ['reports', 'defects', 'pdf']) void qc.invalidateQueries({ queryKey: [key] })
  invalidateClientData(qc, clientId)
}
