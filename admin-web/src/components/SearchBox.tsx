import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cx } from '../lib/format'
import { Input } from './ui'

/**
 * Search input kept in sync with the URL value: when `value` changes from outside (Clear filters, browser back),
 * the box shows it. Enter applies, ✕ clears. Parents should key nothing — sync happens here.
 */
export function SearchBox({ value, onSearch, placeholder, label, className }: { value: string; onSearch: (v: string) => void; placeholder: string; label: string; className?: string }) {
  const [text, setText] = useState(value)
  const [synced, setSynced] = useState(value)
  if (synced !== value) { setSynced(value); setText(value) }          // adopt external changes (render-time sync, no effect)
  return <div className={cx('relative', className)}>
    <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-400" aria-hidden />
    <Input type="search" aria-label={label} placeholder={placeholder} value={text} onChange={e => setText(e.target.value)}
      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSearch(text.trim()) } }} onBlur={() => { if (text.trim() !== value) onSearch(text.trim()) }} className="pl-8 pr-8" />
    {text && <button type="button" aria-label="Clear search" onClick={() => { setText(''); onSearch('') }} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>}
  </div>
}
