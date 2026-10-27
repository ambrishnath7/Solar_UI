import { useCallback, useState } from 'react'
import { Text } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { drafts, type Draft } from '../../../../db'
import { scheduleSync } from '../../../../sync/engine'
import { SignaturePad } from '../../../../components/SignaturePad'
import { Button, Field, Input, Loading, Screen } from '../../../../components/ui'
import { colors, font, space } from '../../../../theme'

export default function Signatures() {
  const { localId } = useLocalSearchParams<{ localId: string }>(); const router = useRouter()
  const [d, setD] = useState<Draft | null>(null)
  const reload = useCallback(() => { drafts.get(localId).then(setD) }, [localId])
  useFocusEffect(reload)
  if (!d) return <Screen><Loading /></Screen>
  const save = async (kind: 'engineer' | 'client', uri: string) => { await drafts.setSignature(localId, kind, uri); scheduleSync(1000); reload() }
  return <Screen footer={<Button title="Review and submit" onPress={() => router.push(`/(app)/reports/${localId}/review`)} />}>
    <Text style={{ color: colors.muted, fontSize: font.small, marginBottom: space.md }}>Sign with a finger or stylus, then tap Save signature. Signatures are stored on this device until the report syncs.</Text>
    <SignaturePad title="Engineer signature" fileName={`${localId}-engineer.png`} existingUri={d.engineerSigUri} onSaved={u => save('engineer', u)} />
    <Field label="Client representative name"><Input value={d.fields.clientRepName ?? ''} onChangeText={async v => { await drafts.saveFields(localId, { ...d.fields, clientRepName: v }); setD({ ...d, fields: { ...d.fields, clientRepName: v } }) }} placeholder="Name of the person signing" /></Field>
    <SignaturePad title="Client representative signature" fileName={`${localId}-client.png`} existingUri={d.clientSigUri} onSaved={u => save('client', u)} />
  </Screen>
}
