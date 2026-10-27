import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, font, space, touch } from '../theme'
import { syncStore } from '../lib/store'
import { runSync } from '../sync/engine'
import type { DraftSyncState } from '../db'

export function Screen({ children, scroll = true, padded = true, footer }: { children: ReactNode; scroll?: boolean; padded?: boolean; footer?: ReactNode }) {
  const insets = useSafeAreaInsets()
  const body = scroll ? <ScrollView contentContainerStyle={[padded && s.pad, { paddingBottom: space.xl }]} keyboardShouldPersistTaps="handled">{children}</ScrollView> : <View style={[{ flex: 1 }, padded && s.pad]}>{children}</View>
  return <View style={{ flex: 1, backgroundColor: colors.bg }}><ConnectionBanner />{body}{footer && <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, space.md) }]}>{footer}</View>}</View>
}

export function ConnectionBanner() {
  const net = syncStore.use(x => x.net); const syncing = syncStore.use(x => x.syncing); const failed = syncStore.use(x => x.failed)
  if (net === 'online' && !syncing && !failed) return null
  const bg = net === 'offline' ? colors.text : failed ? colors.danger : colors.info
  const text = net === 'offline' ? 'Offline — work is saved on this device' : failed ? `Sync failed for ${failed} report${failed > 1 ? 's' : ''} — tap to retry` : syncing ? 'Syncing…' : 'Reconnecting…'
  return <Pressable onPress={() => void runSync()} style={{ backgroundColor: bg, paddingVertical: 6, paddingHorizontal: space.lg }}><Text style={{ color: '#fff', fontSize: font.small, fontWeight: '600', textAlign: 'center' }}>{text}</Text></Pressable>
}

export function Button({ title, onPress, variant = 'primary', disabled, loading, style }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; disabled?: boolean; loading?: boolean; style?: ViewStyle }) {
  const bg = { primary: colors.primary, secondary: colors.bg, danger: colors.danger, ghost: 'transparent' }[variant]
  const fg = variant === 'secondary' || variant === 'ghost' ? colors.text : '#fff'
  return <Pressable onPress={onPress} disabled={disabled || loading} style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: variant === 'secondary' ? colors.border : bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
    {loading ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontSize: font.base, fontWeight: '700' }}>{title}</Text>}</Pressable>
}

export function Field({ label, children, error, hint }: { label: string; children: ReactNode; error?: string; hint?: string }) {
  return <View style={{ marginBottom: space.lg }}><Text style={s.label}>{label}</Text>{children}{hint && !error && <Text style={s.hint}>{hint}</Text>}{error && <Text style={s.error}>{error}</Text>}</View>
}
export function Input(p: TextInputProps) { return <TextInput placeholderTextColor="#94A3B8" {...p} style={[s.input, p.multiline && { minHeight: 90, textAlignVertical: 'top' }, p.style]} /> }

/** Two-option toggle used for YES/NO and GOOD/DEFECT. Selected state uses colour + filled background + check mark, never colour alone. */
export function Toggle({ value, onChange, options }: { value?: string | null; onChange: (v: string) => void; options: readonly [string, string] }) {
  return <View style={{ flexDirection: 'row', gap: space.sm }}>{options.map(o => {
    const sel = value === o; const bad = o === 'DEFECT' || o === 'NO' && false
    const tone = o === 'DEFECT' ? colors.defect : o === 'GOOD' ? colors.good : colors.primaryDark
    const soft = o === 'DEFECT' ? colors.defectSoft : o === 'GOOD' ? colors.goodSoft : colors.primarySoft
    return <Pressable key={o} onPress={() => onChange(o)} accessibilityRole="radio" accessibilityState={{ selected: sel }}
      style={[s.toggle, { borderColor: sel ? tone : colors.border, backgroundColor: sel ? soft : colors.bg }]}>
      <Text style={{ fontSize: font.base, fontWeight: '700', color: sel ? tone : colors.muted }}>{sel ? '✓ ' : ''}{o}{bad ? '' : ''}</Text></Pressable> })}</View>
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) { return <View style={[s.card, style]}>{children}</View> }
export function Row({ k, v }: { k: string; v?: ReactNode }) { return <View style={s.row}><Text style={{ color: colors.muted, fontSize: font.small, flex: 1 }}>{k}</Text><Text style={{ fontSize: font.base, flex: 1.4, textAlign: 'right' }}>{v ?? '—'}</Text></View> }
export function Title({ children, sub }: { children: ReactNode; sub?: string }) { return <View style={{ marginBottom: space.lg }}><Text style={s.title}>{children}</Text>{sub && <Text style={{ color: colors.muted, fontSize: font.small }}>{sub}</Text>}</View> }
export function Empty({ text }: { text: string }) { return <View style={{ padding: space.xl, alignItems: 'center' }}><Text style={{ color: colors.muted, fontSize: font.base, textAlign: 'center' }}>{text}</Text></View> }
export function Loading() { return <View style={{ padding: space.xl }}><ActivityIndicator color={colors.primary} size="large" /></View> }

export function StateBadge({ state }: { state: DraftSyncState }) {
  const map: Record<DraftSyncState, [string, string, string]> = {
    local: ['Local', colors.warnSoft, colors.warn], syncing: ['Syncing', colors.infoSoft, colors.info], synced: ['Synced', colors.goodSoft, colors.good], submitting: ['Submitting', colors.infoSoft, colors.info],
    submitted: ['Submitted', colors.goodSoft, colors.good], failed: ['Failed', colors.defectSoft, colors.defect], conflict: ['Conflict', colors.defectSoft, colors.defect] }
  const [t, bg, fg] = map[state]
  return <View style={{ backgroundColor: bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}><Text style={{ color: fg, fontSize: 13, fontWeight: '700' }}>{t}</Text></View>
}

export function Progress({ done, total }: { done: boolean[]; total: number }) {
  return <View style={{ flexDirection: 'row', gap: 4, marginBottom: space.md }}>{Array.from({ length: total }).map((_, i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: done[i] ? colors.good : colors.border }} />)}</View>
}

const s = StyleSheet.create({
  pad: { padding: space.lg },
  footer: { padding: space.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg, gap: space.sm },
  btn: { minHeight: touch, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg, borderWidth: 1.5 },
  label: { fontSize: font.base, fontWeight: '600', color: colors.text, marginBottom: space.sm },
  hint: { fontSize: font.small, color: colors.muted, marginTop: space.xs },
  error: { fontSize: font.small, color: colors.danger, marginTop: space.xs, fontWeight: '600' },
  input: { minHeight: touch, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: space.md, fontSize: font.base, color: colors.text, backgroundColor: colors.bg },
  toggle: { flex: 1, minHeight: touch, borderWidth: 2, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space.lg, backgroundColor: colors.bg, marginBottom: space.md },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  title: { fontSize: font.title, fontWeight: '700', color: colors.text },
})
