import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { drafts, type Draft } from '../../../../db'
import { missingItems } from '../../../../forms/schema'
import { runSync, resolveConflict } from '../../../../sync/engine'
import { syncStore } from '../../../../lib/store'
import { SECTIONS, fmtDate } from '../../../../lib/types'
import { Button, Card, Loading, Row, Screen, StateBadge } from '../../../../components/ui'
import { colors, font, space } from '../../../../theme'

export default function Review() {
  const { localId } = useLocalSearchParams<{ localId: string }>(); const router = useRouter()
  const [d, setD] = useState<Draft | null>(null); const [busy, setBusy] = useState(false)
  const tick = syncStore.use(s => s.tick); const net = syncStore.use(s => s.net)
  const reload = useCallback(() => { drafts.get(localId).then(setD) }, [localId])
  useFocusEffect(reload); useEffect(reload, [tick, reload])
  useEffect(() => { if (d?.syncState === 'submitted' && d.reportRef) router.replace(`/(app)/reports/${localId}/success`) }, [d, localId, router])
  if (!d) return <Screen><Loading /></Screen>
  const f = d.fields
  const missing = missingItems(f, { engineer: !!d.engineerSigUri, client: !!d.clientSigUri })
  const defects = SECTIONS.flatMap(s => s.rows.filter(r => f[r.key] === 'DEFECT' || (r.key === 's1BrokenModule' && f[r.key] === 'YES')).map(r => `${s.n}. ${r.label}`))

  const submit = () => Alert.alert('Submit final report?', `${d.clientName}\nVisit ${fmtDate(f.visitDate)} · Next visit ${fmtDate(f.nextVisitDate)}\n\nAfter submission the report is locked and cannot be edited from the app.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Submit', style: 'default', onPress: async () => { setBusy(true); await drafts.patch(localId, { submitRequested: 1, syncState: 'submitting', lastError: null }); await runSync(); setBusy(false); reload() } }])
  const retry = async () => { await drafts.patch(localId, { syncState: 'local', attempts: 0, nextAttemptAt: null, lastError: null }); await runSync(); reload() }

  return <Screen footer={d.syncState === 'conflict' ? undefined : <>
    {d.syncState === 'submitting' ? <Text style={{ textAlign: 'center', color: colors.info, fontWeight: '700' }}>{net === 'offline' ? 'Queued — will submit when back online' : 'Submitting…'}</Text>
      : <Button title={missing.length ? `${missing.length} item(s) missing` : 'Submit final report'} disabled={missing.length > 0} loading={busy} onPress={submit} />}
    <Button title="Save draft and exit" variant="secondary" onPress={() => router.replace('/(app)/drafts')} /></>}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md }}><Text style={{ fontSize: font.title, fontWeight: '700' }}>{d.clientName}</Text><StateBadge state={d.syncState} /></View>
    {d.lastError && <Text style={{ color: colors.danger, fontWeight: '600', marginBottom: space.md }}>{d.lastError}{d.syncState === 'failed' && ' — '}{d.syncState === 'failed' && <Text onPress={retry} style={{ textDecorationLine: 'underline' }}>retry now</Text>}</Text>}
    {d.syncState === 'conflict' && <Card style={{ borderColor: colors.danger }}><Text style={{ fontWeight: '700', fontSize: font.large, color: colors.danger }}>Edited on another device</Text>
      <Text style={{ marginVertical: space.sm }}>The server has a newer copy of this draft. Choose which version to keep. Nothing is overwritten until you decide.</Text>
      <Button title="Keep my version" onPress={() => resolveConflict(localId, 'mine').then(reload)} style={{ marginBottom: space.sm }} /><Button title="Take the server version" variant="secondary" onPress={() => resolveConflict(localId, 'server').then(reload)} /></Card>}

    <Card><Row k="Visit date" v={fmtDate(f.visitDate)} /><Row k="Previous maintenance" v={fmtDate(f.previousMaintenanceDate)} /><Row k="Technicians" v={f.technicianCount ?? undefined} /><Row k="Next visit date" v={fmtDate(f.nextVisitDate)} /><Row k="Signatures" v={`${d.engineerSigUri ? '✓' : '✗'} engineer · ${d.clientSigUri ? '✓' : '✗'} client`} /></Card>
    {missing.length > 0 && <Card style={{ borderColor: colors.warn, backgroundColor: colors.warnSoft }}><Text style={{ fontWeight: '700', marginBottom: 4 }}>Missing before submission</Text>{missing.map(m => <Text key={m} style={{ fontSize: font.small }}>• {m}</Text>)}</Card>}
    <Card style={defects.length ? { borderColor: colors.defect } : undefined}><Text style={{ fontWeight: '700', marginBottom: 4 }}>{defects.length ? `${defects.length} defect(s) recorded` : 'No defects recorded'}</Text>{defects.map(m => <Text key={m} style={{ color: colors.defect, fontSize: font.small }}>• {m}</Text>)}</Card>
    {SECTIONS.map(s => <Pressable key={s.n} onPress={() => router.push(`/(app)/reports/${localId}/section/${s.n}`)}><Card><Text style={{ fontWeight: '700', fontSize: font.base, marginBottom: 4 }}>{s.n}. {s.title}  ›</Text>
      {s.rows.map(r => <Row key={r.key} k={r.label} v={(f[r.key] as string | number | null | undefined) ?? undefined} />)}
      {!!f[s.remarks] && <Text style={{ color: colors.muted, fontSize: font.small, marginTop: 4 }}>Remarks: {f[s.remarks] as string}</Text>}</Card></Pressable>)}
    <Pressable onPress={() => router.push(`/(app)/reports/${localId}/section/8`)}><Card><Text style={{ fontWeight: '700', fontSize: font.base, marginBottom: 4 }}>8. Observations and Issues  ›</Text><Row k="General observations" v={f.s8GeneralObservations ?? undefined} /><Row k="Action required" v={f.s8ActionRequired ?? undefined} /></Card></Pressable>
  </Screen>
}
