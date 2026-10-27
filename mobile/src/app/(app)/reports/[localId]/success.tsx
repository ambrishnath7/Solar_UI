import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as Sharing from 'expo-sharing'
import { drafts, type Draft } from '../../../../db'
import { api, errorMessage } from '../../../../lib/api'
import { fmtDate } from '../../../../lib/types'
import { Button, Loading, Screen } from '../../../../components/ui'
import { colors, font, space } from '../../../../theme'

export default function Success() {
  const { localId } = useLocalSearchParams<{ localId: string }>(); const router = useRouter()
  const [d, setD] = useState<Draft | null>(null); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => { drafts.get(localId).then(setD) }, [localId])
  if (!d) return <Screen><Loading /></Screen>
  const share = async () => {
    if (!d.serverId) return
    setBusy(true); setMsg(null)
    try { const file = await api.reports.downloadPdf(d.serverId, `${d.reportRef ?? 'report'}.pdf`); await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: `Share ${d.reportRef}` }) }
    catch (e) { setMsg(errorMessage(e)) } finally { setBusy(false) }
  }
  const finish = async () => { await drafts.remove(localId); router.replace('/(app)') }   // only here, after the server confirmed submission
  return <Screen footer={<>
    <Button title="Share PDF (WhatsApp, email…)" onPress={share} loading={busy} />
    <Button title="Done" variant="secondary" onPress={finish} /></>}>
    <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
      <Text style={{ fontSize: 64 }}>✅</Text>
      <Text style={{ fontSize: font.title, fontWeight: '800', color: colors.good, marginTop: space.md }}>Report submitted</Text>
      <Text style={{ fontSize: 30, fontWeight: '800', marginTop: space.sm, letterSpacing: 1 }}>{d.reportRef}</Text>
      <Text style={{ color: colors.muted, fontSize: font.base, marginTop: space.md, textAlign: 'center' }}>{d.clientName}{'\n'}Next visit due {fmtDate(d.nextVisitDate)}</Text>
      {msg && <Text style={{ color: colors.danger, marginTop: space.md }}>{msg}</Text>}
      <Text style={{ color: colors.muted, fontSize: font.small, marginTop: space.xl, textAlign: 'center' }}>The share sheet attaches the actual PDF file. Choose WhatsApp or Gmail to send it to the client.</Text>
    </View>
  </Screen>
}
