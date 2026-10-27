import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../../lib/api'
import { Button, EmptyState, ErrorState, Input, PageHeader, Skeleton, today } from '../../components/ui'

export default function DefectSummaryPage() {
  const [from, setFrom] = useState(() => new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)); const [to, setTo] = useState(today())
  const q = useQuery({ queryKey: ['defects', from, to], queryFn: () => api.defects(from, to) }); const nav = useNavigate()
  const max = Math.max(1, ...(q.data?.map(d => d.count) ?? [1]))
  return <>
    <PageHeader title="Defect summary" subtitle="Count of DEFECT results per inspection item in submitted reports" actions={<><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /><Input type="date" value={to} onChange={e => setTo(e.target.value)} /><Button variant="secondary" onClick={() => nav(`/reports?from=${from}&to=${to}&sort=defects_desc`)}>Open reports</Button></>} />
    {q.isLoading ? <Skeleton /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> : !q.data?.length ? <EmptyState text="No defects recorded in this period." /> :
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4">{q.data.map(d => <div key={d.field} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm md:grid-cols-[280px_1fr_auto]">
        <span className="truncate">{d.label}</span><div className="hidden h-3 rounded bg-slate-100 md:block"><div className="h-3 rounded bg-red-500" style={{ width: `${(d.count / max) * 100}%` }} /></div><span className="w-8 text-right font-semibold text-red-700">{d.count}</span></div>)}</div>}
  </>
}
