import { useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { drafts, type Draft } from '../../db'
import { syncStore } from '../../lib/store'
import { fmtDate } from '../../lib/types'
import { Button, Card, Empty, Screen, StateBadge, Title } from '../../components/ui'
import { colors, font, space } from '../../theme'

export default function Dashboard() {
  const router = useRouter()
  const tick = syncStore.use(s => s.tick)
  const dash = useQuery({ queryKey: ['dashboard', tick], queryFn: api.dashboard })
  const [local, setLocal] = useState<Draft[]>([])
  useFocusEffect(useCallback(() => { drafts.all().then(setLocal) }, [tick]))
  const open = local.filter(d => d.syncState !== 'submitted')
  const submittedLocal = local.filter(d => d.syncState === 'submitted')

  const stat = (label: string, value: number | string, onPress?: () => void, tone = colors.text) => <Pressable onPress={onPress} style={{ flex: 1, minWidth: 140, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space.md }}>
    <Text style={{ color: colors.muted, fontSize: font.small }}>{label}</Text><Text style={{ fontSize: 30, fontWeight: '800', color: tone }}>{value}</Text></Pressable>

  return <Screen footer={<Button title="＋  Start maintenance visit" onPress={() => router.push('/(app)/clients')} />}>
    <Title sub={dash.data ? undefined : 'Showing device data; server stats load when online'}>Today</Title>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
      {stat("Today's visits", dash.data?.todayVisits ?? '—', () => router.push('/(app)/clients'))}
      {stat('Drafts', open.length, () => router.push('/(app)/drafts'), open.length ? colors.warn : colors.text)}
      {stat('Submitted this month', dash.data?.submittedThisMonth ?? submittedLocal.length, () => router.push('/(app)/history'), colors.good)}
      {stat('Upcoming (14 d)', dash.data?.upcoming.length ?? '—')}
    </View>
    {open.length > 0 && <Card><Text style={{ fontWeight: '700', fontSize: font.large, marginBottom: space.sm }}>Continue a draft</Text>
      {open.slice(0, 3).map(d => <Pressable key={d.localId} onPress={() => router.push(`/(app)/reports/${d.localId}/section/1`)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
        <View><Text style={{ fontSize: font.base, fontWeight: '600' }}>{d.clientName}</Text><Text style={{ color: colors.muted, fontSize: font.small }}>Visit {fmtDate(d.fields.visitDate)}</Text></View><StateBadge state={d.syncState} /></Pressable>)}</Card>}
    <Card><Text style={{ fontWeight: '700', fontSize: font.large, marginBottom: space.sm }}>Upcoming visits</Text>
      {!dash.data ? <Empty text={dash.isError ? 'Could not load from server.' : 'Loading…'} /> : dash.data.upcoming.length === 0 ? <Empty text="No visits due in the next 14 days." /> :
        dash.data.upcoming.map(u => <Pressable key={u.clientId} onPress={() => router.push(`/(app)/clients/${u.clientId}`)} style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }}>
          <Text style={{ fontSize: font.base, fontWeight: '600' }}>{u.clientName}</Text><Text style={{ color: u.isOverdue ? colors.danger : colors.muted, fontSize: font.small }}>{u.isOverdue ? 'OVERDUE · ' : 'Due '}{fmtDate(u.nextDueDate)} · {u.siteLocation ?? ''}</Text></Pressable>)}</Card>
  </Screen>
}
