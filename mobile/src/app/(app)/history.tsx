import { FlatList, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api, errorMessage } from '../../lib/api'
import { fmtDate } from '../../lib/types'
import { Button, Empty, Loading, Screen } from '../../components/ui'
import { colors, font } from '../../theme'

export default function History() {
  const router = useRouter()
  const q = useQuery({ queryKey: ['history'], queryFn: () => api.reports.list('submitted') })
  if (q.isLoading) return <Screen><Loading /></Screen>
  if (q.isError) return <Screen><Empty text={errorMessage(q.error)} /><Button title="Retry" variant="secondary" onPress={() => q.refetch()} /></Screen>
  return <Screen scroll={false}>
    <FlatList data={q.data} keyExtractor={r => r.id} refreshing={q.isFetching} onRefresh={() => q.refetch()} ListEmptyComponent={<Empty text="No submitted reports yet." />}
      renderItem={({ item: r }) => <Pressable onPress={() => router.push(`/(app)/reports/view/${r.id}`)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontSize: font.large, fontWeight: '700' }}>{r.clientName}</Text><Text style={{ fontWeight: '700', color: colors.primaryDark }}>{r.reportRef}</Text></View>
        <Text style={{ color: colors.muted, fontSize: font.small }}>Visit {fmtDate(r.visitDate)} · next {fmtDate(r.nextVisitDate)}{r.defectCount ? ` · ${r.defectCount} defect(s)` : ''}</Text></Pressable>} />
  </Screen>
}
