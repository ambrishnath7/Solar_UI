import { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, Text, View } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { drafts, type Draft } from '../../db'
import { syncStore } from '../../lib/store'
import { runSync } from '../../sync/engine'
import { fmtDate } from '../../lib/types'
import { Button, Empty, Screen, StateBadge } from '../../components/ui'
import { colors, font, space } from '../../theme'

export default function Drafts() {
  const router = useRouter(); const tick = syncStore.use(s => s.tick); const syncing = syncStore.use(s => s.syncing)
  const [list, setList] = useState<Draft[]>([])
  const reload = useCallback(() => { drafts.all().then(setList) }, [])
  useFocusEffect(useCallback(() => { reload() }, [reload, tick]))
  const open = (d: Draft) => router.push(d.syncState === 'submitted' ? `/(app)/reports/${d.localId}/success` : `/(app)/reports/${d.localId}/review`)
  const del = (d: Draft) => Alert.alert('Delete draft?', d.syncState === 'submitted' ? 'This report was submitted; only the local copy is removed.' : 'This draft has NOT been submitted. Deleting it discards the data on this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await drafts.remove(d.localId); reload() } }])
  return <Screen scroll={false} footer={<Button title={syncing ? 'Syncing…' : 'Sync now'} variant="secondary" loading={syncing} onPress={() => void runSync().then(reload)} />}>
    <FlatList data={list} keyExtractor={d => d.localId} ListEmptyComponent={<Empty text="No drafts on this device. Start a maintenance visit from Home." />}
      renderItem={({ item: d }) => <Pressable onPress={() => open(d)} onLongPress={() => del(d)} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontSize: font.large, fontWeight: '700', flex: 1 }}>{d.clientName}</Text><StateBadge state={d.syncState} /></View>
        <Text style={{ color: colors.muted, fontSize: font.small, marginTop: 2 }}>Visit {fmtDate(d.fields.visitDate)}{d.reportRef ? ` · ${d.reportRef}` : ''} · edited {new Date(d.localUpdatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
        {d.lastError && <Text style={{ color: colors.danger, fontSize: font.small, marginTop: 2 }}>{d.lastError}</Text>}
      </Pressable>} />
    <Text style={{ color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: space.sm }}>Long-press a draft to delete it. Drafts are never deleted automatically.</Text>
  </Screen>
}
