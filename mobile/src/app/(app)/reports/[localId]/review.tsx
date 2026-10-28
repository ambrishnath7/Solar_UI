import { useCallback, useEffect, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { drafts, type Draft } from '../../../../db'
import { missingItems } from '../../../../forms/schema'
import { conflictDiff, resolveConflict, runSync, syncNow } from '../../../../sync/engine'
import { syncStore } from '../../../../lib/store'
import { SECTIONS, fmtDate } from '../../../../lib/types'
import { Button, Card, Loading, NotFound, Row, Screen, StateBadge } from '../../../../components/ui'
import { colors, font, space } from '../../../../theme'

export default function Review() {
  const { localId } = useLocalSearchParams<{ localId: string }>(); const router = useRouter()
  const [d, setD] = useState<Draft | null | undefined>(undefined); const [busy, setBusy] = useState(false)
  const tick = syncStore.use(s => s.tick); const net = syncStore.use(s => s.net)
  const reload = useCallback(() => { drafts.get(localId).then(setD) }, [localId])
  useFocusEffect(reload); useEffect(reload, [tick, reload])
  useEffect(() => { if (d?.syncState === 'submitted' && d.reportRef) router.replace(`/(app)/reports/${localId}/success`) }, [d, localId, router])
  if (d === undefined) return <Screen><Loading /></Screen>
  if (d === null) return <NotFound onBack={() => router.replace('/(app)')} />
  const f = d.fields
  const missing = missingItems(f, { engineer: !!d.engineerSigUri, client: !!d.clientSigUri })
  /** Missing items grouped per section, so the engineer jumps straight to the right screen. */
  const missingGroups = [
    ...(missing.some(m => m.startsWith('Visit date') || m.startsWith('Number of technicians') || m.startsWith('Visit')) ? [{ key: 'h', title: 'Visit details', detail: 'Visit date and number of technicians', count: 0, path: `/(app)/reports/${localId}/section/1` }] : []),
    ...SECTIONS.map(sec => ({ sec, rows: sec.rows.filter(r => f[r.key] === null || f[r.key] === undefined || (f[r.key] as unknown) === '') }))
      .filter(x => x.rows.length).map(x => ({ key: `s${x.sec.n}`, title: `${x.sec.n}. ${x.sec.title}`, detail: x.rows.map(r => r.label).join(', '), count: x.rows.length, path: `/(app)/reports/${localId}/section/${x.sec.n}` })),
    ...(!f.nextVisitDate ? [{ key: 's8', title: '8. Observations and Issues', detail: 'Next visit date', count: 1, path: `/(app)/reports/${localId}/section/8` }] : []),
    ...(!d.engineerSigUri || !d.clientSigUri || !f.clientRepName?.trim() ? [{ key: 'sig', title: 'Signatures', detail: [!d.engineerSigUri && 'Engineer signature', !f.clientRepName?.trim() && 'Client representative name', !d.clientSigUri && 'Client signature'].filter(Boolean).join(', '), count: 0, path: `/(app)/reports/${localId}/signatures` }] : []),
  ]
  const defects = SECTIONS.flatMap(s => s.rows.filter(r => f[r.key] === 'DEFECT' || (r.key === 's1BrokenModule' && f[r.key] === 'YES')).map(r => `${s.n}. ${r.label}`))
  const editable = !['submitting', 'submitted', 'conflict', 'elsewhere'].includes(d.syncState)

  const submit = () => Alert.alert('Submit final report?', `${d.clientName}\nVisit ${fmtDate(f.visitDate)} · Next visit ${fmtDate(f.nextVisitDate)}\n\nAfter submission the report is locked and cannot be edited from the app.`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Submit', style: 'default', onPress: async () => {
      setBusy(true)
      await drafts.patch(localId, { submitRequested: 1, syncState: 'submitting', lastError: null, attempts: 0, nextAttemptAt: null })
      await runSync({ manual: true }); setBusy(false); reload()
    } }])
  const discard = () => Alert.alert('Discard local copy?', 'The report on the server is not affected. Only this phone’s copy is removed.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: async () => { await drafts.remove(localId); router.dismissAll(); router.replace('/(app)/drafts') } }])
  const open = (path: string) => { if (editable) router.push(path as never) }

  const footer = d.syncState === 'conflict' || d.syncState === 'elsewhere' ? undefined : <>
    {d.syncState === 'submitting'
      ? <><Text style={{ textAlign: 'center', color: colors.info, fontWeight: '800', fontSize: font.base }}>{net === 'offline' ? 'Queued — will submit automatically when back online' : 'Submitting… it will keep retrying until the server confirms'}</Text>
          <Button title="Try now" variant="secondary" onPress={() => void syncNow().then(reload)} /></>
      : <Button title={missing.length ? `${missing.length} item(s) missing` : 'Submit final report'} disabled={missing.length > 0 || !editable} loading={busy} onPress={submit} />}
    <Button title="Save draft and exit" variant="secondary" onPress={() => { router.dismissAll(); router.replace('/(app)/drafts') }} /></>

  return <Screen footer={footer}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md, gap: space.sm }}><Text style={{ fontSize: font.title, fontWeight: '800', flex: 1 }}>{d.clientName}</Text><StateBadge state={d.syncState} /></View>
    {d.lastError && d.syncState !== 'conflict' && d.syncState !== 'elsewhere' && <Card style={{ borderColor: colors.danger, backgroundColor: colors.defectSoft }}>
      <Text style={{ color: colors.danger, fontWeight: '700' }}>{d.lastError}</Text>
      {(d.syncState === 'failed' || d.syncState === 'local') && <Button title="Retry sync now" variant="secondary" onPress={() => void syncNow().then(reload)} style={{ marginTop: space.sm }} />}</Card>}

    {d.syncState === 'elsewhere' && <Card style={{ borderColor: colors.info, backgroundColor: colors.infoSoft }}>
      <Text style={{ fontWeight: '800', fontSize: font.large, color: colors.info }}>Already submitted {d.reportRef ? `as ${d.reportRef}` : ''}</Text>
      <Text style={{ marginVertical: space.sm }}>This report was finalised from another device or by an admin. The copy below is what this phone had; it was not sent. Open History to see the official report.</Text>
      <Button title="Discard local copy" variant="danger" onPress={discard} /></Card>}

    {d.syncState === 'conflict' && <ConflictCard d={d} onResolved={reload} />}

    <Card><Row k="Visit date" v={fmtDate(f.visitDate)} /><Row k="Previous maintenance" v={fmtDate(f.previousMaintenanceDate)} /><Row k="Technicians" v={f.technicianCount ?? undefined} /><Row k="Next visit date" v={fmtDate(f.nextVisitDate)} />
      <Row k="Signatures" v={`${d.engineerSigUri ? '✓' : '✗'} engineer · ${d.clientSigUri ? '✓' : '✗'} client`} /><Row k="Client representative" v={f.clientRepName || undefined} /></Card>
    {editable && missing.length > 0 && <Card style={{ borderColor: colors.warn, backgroundColor: colors.warnSoft }}>
      <Text style={{ fontWeight: '800', fontSize: font.large, marginBottom: space.sm }}>Still to fill in</Text>
      {missingGroups.map(g => <Pressable key={g.key} accessibilityRole="button" onPress={() => open(g.path)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#FDE68A' }}>
        <View style={{ flex: 1 }}><Text style={{ fontWeight: '700', fontSize: font.base }}>{g.title}</Text>{g.detail ? <Text style={{ color: colors.muted, fontSize: font.small }} numberOfLines={2}>{g.detail}</Text> : null}</View>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: font.base }}>{g.count ? `${g.count} ›` : '›'}</Text></Pressable>)}
    </Card>}
    <Card style={defects.length ? { borderColor: colors.defect } : undefined}><Text style={{ fontWeight: '800', marginBottom: 4 }}>{defects.length ? `${defects.length} defect(s) recorded` : 'No defects recorded'}</Text>{defects.map(m => <Text key={m} style={{ color: colors.defect, fontSize: font.small }}>• {m}</Text>)}</Card>
    {SECTIONS.map(s => <Pressable key={s.n} disabled={!editable} onPress={() => open(`/(app)/reports/${localId}/section/${s.n}`)}><Card><Text style={{ fontWeight: '800', fontSize: font.base, marginBottom: 4 }}>{s.n}. {s.title}{editable ? '  ›' : ''}</Text>
      {s.rows.map(r => <Row key={r.key} k={r.label} v={(f[r.key] as string | number | null | undefined) ?? undefined} />)}
      {!!f[s.remarks] && <Text style={{ color: colors.muted, fontSize: font.small, marginTop: 4 }}>Remarks: {f[s.remarks] as string}</Text>}</Card></Pressable>)}
    <Pressable disabled={!editable} onPress={() => open(`/(app)/reports/${localId}/section/8`)}><Card><Text style={{ fontWeight: '800', fontSize: font.base, marginBottom: 4 }}>8. Observations and Issues{editable ? '  ›' : ''}</Text><Row k="General observations" v={f.s8GeneralObservations || undefined} /><Row k="Action required" v={f.s8ActionRequired || undefined} /></Card></Pressable>
  </Screen>
}

/** Shows exactly what differs between this phone and the server before the engineer chooses. Nothing is overwritten until then. */
function ConflictCard({ d, onResolved }: { d: Draft; onResolved: () => void }) {
  const diff = conflictDiff(d)
  const [busy, setBusy] = useState<'mine' | 'server' | null>(null)
  const choose = (c: 'mine' | 'server') => Alert.alert(c === 'mine' ? 'Keep my version?' : 'Take the server version?',
    c === 'mine' ? 'Your values replace the server copy.' : 'Your values on this phone are replaced by the server copy.', [
      { text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: async () => { setBusy(c); await resolveConflict(d.localId, c); setBusy(null); onResolved() } }])
  return <Card style={{ borderColor: colors.danger }}>
    <Text style={{ fontWeight: '800', fontSize: font.large, color: colors.danger }}>Changed on another device</Text>
    <Text style={{ marginVertical: space.sm }}>The server copy of this draft was changed elsewhere. Compare the differences and choose which version to keep. Submission is paused until you decide.</Text>
    {diff.length === 0 ? <Text style={{ color: colors.muted, marginBottom: space.sm }}>No field differences (only signatures or version changed).</Text>
      : diff.map(x => <View key={x.label} style={{ paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
          <Text style={{ fontWeight: '700' }}>{x.label}</Text>
          <Text style={{ fontSize: font.small }}>This phone: <Text style={{ fontWeight: '800' }}>{x.mine}</Text></Text>
          <Text style={{ fontSize: font.small }}>Server: <Text style={{ fontWeight: '800' }}>{x.server}</Text></Text></View>)}
    <Button title="Keep my version" loading={busy === 'mine'} onPress={() => choose('mine')} style={{ marginTop: space.sm, marginBottom: space.sm }} />
    <Button title="Take the server version" variant="secondary" loading={busy === 'server'} onPress={() => choose('server')} />
  </Card>
}
