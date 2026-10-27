import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useDraft } from '../../../../../forms/useDraft'
import { headerComplete, sectionComplete } from '../../../../../forms/schema'
import { SECTION_8_TITLE, SECTIONS, addDays, type ReportFields } from '../../../../../lib/types'
import { Button, Field, Input, Loading, Progress, Screen, StateBadge, Toggle } from '../../../../../components/ui'
import { colors, font, space } from '../../../../../theme'

const num = (v: string): number | null => (v.trim() === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)

export default function SectionScreen() {
  const { localId, n: nStr } = useLocalSearchParams<{ localId: string; n: string }>()
  const n = Math.min(8, Math.max(1, Number(nStr) || 1))
  const router = useRouter(); const nav = useNavigation()
  const { draft, fields, setFields, flush, loading } = useDraft(localId)
  const section = SECTIONS.find(s => s.n === n)
  useEffect(() => { nav.setOptions({ title: `${n}. ${section?.title ?? SECTION_8_TITLE}` }) }, [n, nav, section])
  if (loading || !draft || !fields) return <Screen><Loading /></Screen>
  const locked = draft.syncState === 'submitted' || draft.syncState === 'submitting'
  const done = [1, 2, 3, 4, 5, 6, 7, 8].map(i => sectionComplete(i, fields))
  const go = async (to: number) => { await flush(); if (to > 8) router.push(`/(app)/reports/${localId}/signatures`); else router.push(`/(app)/reports/${localId}/section/${to}`) }
  const f = fields

  return <Screen footer={<View style={{ flexDirection: 'row', gap: space.sm }}>
    {n > 1 && <Button title="Back" variant="secondary" onPress={() => go(n - 1)} style={{ flex: 1 }} />}
    <Button title={n < 8 ? `Next: section ${n + 1}` : 'Next: signatures'} onPress={() => go(n + 1)} style={{ flex: 2 }} /></View>}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}><Text style={{ color: colors.muted, fontSize: font.small }}>{draft.clientName} · Section {n} of 8</Text><StateBadge state={draft.syncState} /></View>
    <Progress done={done} total={8} />
    {locked && <Text style={{ color: colors.danger, fontWeight: '700', marginBottom: space.md }}>This report is submitted and locked. Values are read-only.</Text>}

    {n === 1 && <View style={{ marginBottom: space.md, padding: space.md, backgroundColor: colors.surface, borderRadius: 10 }}>
      <Text style={{ fontWeight: '700', fontSize: font.base, marginBottom: space.sm }}>Visit details</Text>
      <Field label="Visit date (YYYY-MM-DD)" error={headerComplete(f) ? undefined : 'Enter the visit date and number of technicians'}><Input value={f.visitDate} editable={!locked} onChangeText={v => setFields({ visitDate: v, nextVisitDate: /^\d{4}-\d{2}-\d{2}$/.test(v) ? addDays(v, 90) : f.nextVisitDate })} keyboardType="numbers-and-punctuation" /></Field>
      <Field label="Previous maintenance date (YYYY-MM-DD)"><Input value={f.previousMaintenanceDate ?? ''} editable={!locked} onChangeText={v => setFields({ previousMaintenanceDate: v || null })} keyboardType="numbers-and-punctuation" /></Field>
      <Field label="Number of technicians"><Input value={f.technicianCount == null ? '' : String(f.technicianCount)} editable={!locked} onChangeText={v => setFields({ technicianCount: num(v) })} keyboardType="number-pad" /></Field>
    </View>}

    {section && <>
      {section.rows.map(r => <Field key={r.key} label={r.label}>
        {r.type === 'num'
          ? <Input value={f[r.key] == null ? '' : String(f[r.key])} editable={!locked} keyboardType="decimal-pad" onChangeText={v => setFields({ [r.key]: num(v) } as Partial<ReportFields>)} placeholder="0" />
          : <Toggle value={f[r.key] as string | null} options={r.type === 'yn' ? ['YES', 'NO'] : ['GOOD', 'DEFECT']} onChange={v => { if (!locked) setFields({ [r.key]: v } as Partial<ReportFields>) }} />}
      </Field>)}
      <Field label={section.remarksLabel ?? 'Remarks'}><Input value={(f[section.remarks] as string) ?? ''} editable={!locked} multiline onChangeText={v => setFields({ [section.remarks]: v } as Partial<ReportFields>)} placeholder="Optional" /></Field>
    </>}

    {n === 8 && <>
      <Field label="General observations"><Input value={f.s8GeneralObservations ?? ''} editable={!locked} multiline onChangeText={v => setFields({ s8GeneralObservations: v })} /></Field>
      <Field label="Action required"><Input value={f.s8ActionRequired ?? ''} editable={!locked} multiline onChangeText={v => setFields({ s8ActionRequired: v })} /></Field>
      <Field label="Next visit date (YYYY-MM-DD)" hint="Defaults to 90 days after the visit date. Edit if a different date was agreed."><Input value={f.nextVisitDate ?? ''} editable={!locked} onChangeText={v => setFields({ nextVisitDate: v || null })} keyboardType="numbers-and-punctuation" /></Field>
      <Button title="Reset to visit date + 90 days" variant="ghost" onPress={() => setFields({ nextVisitDate: addDays(f.visitDate, 90) })} />
    </>}
  </Screen>
}
