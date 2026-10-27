import { useRef } from 'react'
import { View, Text } from 'react-native'
import SignatureScreen, { type SignatureViewRef } from 'react-native-signature-canvas'
import { File, Paths } from 'expo-file-system'
import { Button } from './ui'
import { colors, space } from '../theme'

/** Captures a signature and writes it to a PNG file in the document directory. Returns the file URI. */
export function SignaturePad({ title, fileName, onSaved, existingUri }: { title: string; fileName: string; onSaved: (uri: string) => void; existingUri?: string | null }) {
  const ref = useRef<SignatureViewRef>(null)
  const handleOK = async (dataUrl: string) => {
    const b64 = dataUrl.replace(/^data:image\/png;base64,/, '')
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
    const file = new File(Paths.document, fileName)
    if (file.exists) file.delete()
    file.create()
    await file.write(bytes)
    onSaved(file.uri)
  }
  const style = `.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--body { border: none; } .m-signature-pad--footer { display: none; } body,html { background: #fff; }`
  return <View style={{ marginBottom: space.lg }}>
    <Text style={{ fontSize: 17, fontWeight: '700', marginBottom: space.sm }}>{title}{existingUri ? '  ✓ saved' : ''}</Text>
    <View style={{ height: 220, borderWidth: 2, borderColor: colors.border, borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}>
      <SignatureScreen ref={ref} onOK={handleOK} webStyle={style} backgroundColor="#ffffff" penColor={colors.text} descriptionText="" imageType="image/png" autoClear={false} />
    </View>
    <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm }}>
      <Button title="Clear" variant="secondary" onPress={() => ref.current?.clearSignature()} style={{ flex: 1 }} />
      <Button title={existingUri ? 'Re-save signature' : 'Save signature'} onPress={() => ref.current?.readSignature()} style={{ flex: 2 }} />
    </View>
  </View>
}
