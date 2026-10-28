import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useDraft } from '../../../../../forms/useDraft'
import { draftProblems, headerComplete, LIMITS, sectionComplete } from '../../../../../forms/schema'
import { SECTION_8_TITLE, SECTIONS, addDays, todayIso, type ReportFields } from '../../../../../lib/types'
import { DateField } from '../../../../../components/DateField'
import { Button, Field, Input, Loading, NotFound, NumberInput, Progress, Screen, StateBadge, Toggle } from '../../../../../components/ui'
import { colors, font, space } from '../../../../../theme'

export default function SectionScreen() {
  const { localId, n: nStr } = useLocalSearchParams<{ localId: string; n: string }>()
  const n = Math.min(8, Math.max(1, Number(nStr) || 1))
  const router = useRouter(); const nav = useNavigation()
  const { draft, fields, setFields, flush, loading, locked } = useDraft(localId)
  const [saved, setSaved] = useState(false)
  const section = SECTIONS.find(s => s.n === n)
  useEffect(() => { nav.setOptions({ title: `${n}. ${section?.title ?? SECTION_8_TITLE}` }) }, [n, nav, section])
  if (loading) return <Screen><Loading /></Screen>
  if (!draft || !fields) return <NotFound onBack={() => router.replace('/(app)')} />
  const f = fields
  const done = [1, 2, 3, 4, 5, 6, 7, 8].map(i => sectionComplete(i, f))
  const problems = draftProblems(f)
  const set = (p: Partial<ReportFields>) => { setSaved(false); setFields(p) }

  const next = async () => { await flush(); router.push(n < 8 ? `/(app)/reports/${localId}/section/${n + 1}` : `/(app)/reports/${localId}/signatures`) }
  const back = async () => { await flush(); if (router.canGoBack()) router.back(); else router.replace(`/(app)/reports/${localId}/review`) }
  const saveExit = async () => { await flush(); setSaved(true); router.dismissAll(); router.replace('/(app)/drafts') }

  /** Changing the visit date moves the default next visit (visit + 90) along, unless a different date was agreed. */
  const setVisitDate = (v: string | null) => {
    if (!v) return
    const wasDefault = !f.nextVisitDate || f.nextVisitDate === addDays(f.visitDate, 90)
    set(wasDefault ? { visitDate: v, nextVisitDate: addDays(v, 90) } : { visitDate: v })
  }

  return <Screen footer={<>
    <View style={{ flexDirection: 'row', gap: space.sm }}>
      <Button title="Back" variant="secondary" onPress={back} style={{ flex: 1 }} />
      <Button title={n < 8 ? `Next: section ${n + 1}` : 'Next: signatures'} onPress={next} style={{ flex: 2 }} />
    </View>
    {!locked && <Button title={saved ? 'Saved ✓' : 'Save draft and exit'} variant="ghost" onPress={saveExit} />}</>}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
      <Text style={{ color: colors.muted, fontSize: font.small, flex: 1 }}>{draft.clientName} · Section {n} of 8</Text><StateBadge state={draft.syncState} />
    </View>
    <Progress done={done} current={n} />
    {locked && <Text style={{ color: colors.danger, fontWeight: '800', marginBottom: space.md }}>
      {draft.syncState === 'conflict' ? 'Resolve the conflict on the Review screen before editing.' : 'This report is submitted and locked. Values are read-only.'}</Text>}
    {!locked && problems.length > 0 && <Text accessibilityRole="alert" style={{ color: colors.danger, fontWeight: '700', marginBottom: space.md }}>{problems.join('\n')}</Text>}

    {n === 1 && <View style={{ marginBottom: space.md, padding: space.md, backgroundColor: colors.surface, borderRadius: 10 }}>
      <Text style={{ fontWeight: '800', fontSize: font.base, marginBottom: space.sm }}>Visit details</Text>
      <Field label="Visit date"><DateField value={f.visitDate} editable={!locked} min={LIMITS.minDate} max={addDays(todayIso(), LIMITS.futureDays)} onChange={setVisitDate} /></Field>
      <Field label="Previous maintenance date"><DateField value={f.previousMaintenanceDate} editable={!locked} clearable max={f.visitDate} placeholder="Not recorded" onChange={v => set({ previousMaintenanceDate: v })} /></Field>
      <Field label="Number of technicians" error={f.technicianCount === 0 ? 'At least 1 technician' : undefined}>
        <NumberInput integer max={LIMITS.maxTechnicians} value={f.technicianCount} editable={!locked} onChange={v => set({ technicianCount: v })} /></Field>
      {!headerComplete(f) && <Text style={{ color: colors.muted, fontSize: font.small }}>Visit date and number of technicians are required.</Text>}
    </View>}

    {section && <>
      {section.rows.map(r => <Field key={r.key} label={r.label}>
        {r.type === 'num'
          ? <NumberInput value={f[r.key] as number | null | undefined} editable={!locked} max={LIMITS.maxNumber} onChange={v => set({ [r.key]: v } as Partial<ReportFields>)} placeholder="0" />
          : <Toggle value={f[r.key] as string | null} disabled={locked} options={r.type === 'yn' ? ['YES', 'NO'] : ['GOOD', 'DEFECT']} onChange={v => set({ [r.key]: v } as Partial<ReportFields>)} />}
      </Field>)}
      <Field label={section.remarksLabel ?? 'Remarks'}><Input value={(f[section.remarks] as string) ?? ''} editable={!locked} multiline maxLength={LIMITS.maxText} onChangeText={v => set({ [section.remarks]: v } as Partial<ReportFields>)} placeholder="Optional" /></Field>
    </>}

    {n === 8 && <>
      <Field label="General observations"><Input value={f.s8GeneralObservations ?? ''} editable={!locked} multiline maxLength={LIMITS.maxText} onChangeText={v => set({ s8GeneralObservations: v })} /></Field>
      <Field label="Action required"><Input value={f.s8ActionRequired ?? ''} editable={!locked} multiline maxLength={LIMITS.maxText} onChangeText={v => set({ s8ActionRequired: v })} /></Field>
      <Field label="Next visit date" hint="Defaults to 90 days after the visit date. Change it if a different date was agreed.">
        <DateField value={f.nextVisitDate} editable={!locked} min={f.visitDate} max={addDays(f.visitDate, 365 * LIMITS.nextVisitYears)} onChange={v => set({ nextVisitDate: v })} /></Field>
      {!locked && <Button title="Reset to visit date + 90 days" variant="ghost" onPress={() => set({ nextVisitDate: addDays(f.visitDate, 90) })} />}
    </>}
  </Screen>
}
