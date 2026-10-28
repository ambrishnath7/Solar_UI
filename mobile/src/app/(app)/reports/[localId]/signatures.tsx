import { useState } from 'react'
import { Text } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { drafts } from '../../../../db'
import { useDraft } from '../../../../forms/useDraft'
import { LIMITS } from '../../../../forms/schema'
import { scheduleSync } from '../../../../sync/engine'
import { SignaturePad } from '../../../../components/SignaturePad'
import { Button, Field, Input, Loading, NotFound, Screen } from '../../../../components/ui'
import { colors, font, space } from '../../../../theme'

export default function Signatures() {
  const { localId } = useLocalSearchParams<{ localId: string }>(); const router = useRouter()
  const { draft, fields, setFields, flush, loading, locked, reload } = useDraft(localId)
  const [drawing, setDrawing] = useState(false)
  if (loading) return <Screen><Loading /></Screen>
  if (!draft || !fields) return <NotFound onBack={() => router.replace('/(app)')} />
  const save = async (kind: 'engineer' | 'client', uri: string) => {
    await flush()
    if (!(await drafts.setSignature(localId, kind, uri))) throw new Error('locked')
    scheduleSync(1000); await reload()
  }
  const toReview = async () => {
    await flush()
    // Review is usually below us in the stack (Review → section → … → Signatures): go back to it instead of stacking another copy.
    if (router.canDismiss()) router.dismissTo(`/(app)/reports/${localId}/review`)
    else router.push(`/(app)/reports/${localId}/review`)
  }
  return <Screen scrollEnabled={!drawing} footer={<Button title="Review and submit" onPress={toReview} />}>
    <Text style={{ color: colors.muted, fontSize: font.small, marginBottom: space.md }}>Sign with a finger or stylus, then tap Save signature. Signatures stay on this phone until the report syncs.</Text>
    <SignaturePad title="Engineer signature" filePrefix={`${localId}-engineer`} existingUri={draft.engineerSigUri} disabled={locked} onDrawing={setDrawing} onSaved={u => save('engineer', u)} />
    <Field label="Client representative name" error={!locked && !fields.clientRepName?.trim() ? 'Required before submission' : undefined}>
      <Input value={fields.clientRepName ?? ''} editable={!locked} maxLength={LIMITS.maxName} onChangeText={v => setFields({ clientRepName: v })} placeholder="Name of the person signing" autoCapitalize="words" /></Field>
    <SignaturePad title="Client representative signature" filePrefix={`${localId}-client`} existingUri={draft.clientSigUri} disabled={locked} onDrawing={setDrawing} onSaved={u => save('client', u)} />
  </Screen>
}
