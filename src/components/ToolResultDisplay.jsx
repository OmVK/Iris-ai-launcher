export default function ResultDisplay({ tool, result, copied, copyToClipboard }) {
  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copyToClipboard(text, id)}
      className="text-on-surface-variant/30 hover:text-on-surface-variant transition-colors ml-1">
      <span className="material-symbols-outlined text-[14px]">{copied === id ? 'check' : 'content_copy'}</span>
    </button>
  )

  const Row = ({ label, value, copyId }) => {
    if (value === null || value === undefined) return null
    return (
      <div className="flex items-start justify-between gap-2 py-1 border-b border-white/5 last:border-0">
        <span className="text-on-surface-variant/40 shrink-0">{label}</span>
        <span className="text-on-surface-variant text-right flex items-center">
          <span className="break-all">{String(value)}</span>
          {copyId && <CopyBtn text={String(value)} id={copyId} />}
        </span>
      </div>
    )
  }

  if (tool === 'ip_info' && result.info) {
    const i = result.info
    return (
      <div>
        <Row label="IP" value={i.ip} copyId="ip" />
        <Row label="City" value={i.city} />
        <Row label="Region" value={i.region} />
        <Row label="Country" value={i.country_name ? `${i.country_name} (${i.country_code})` : '—'} />
        <Row label="Org" value={i.org} copyId="org" />
        <Row label="Coordinates" value={`${i.latitude}, ${i.longitude}`} />
        <Row label="Timezone" value={i.timezone} />
        {i.postal && <Row label="Postal" value={i.postal} />}
      </div>
    )
  }

  if (tool === 'pw_gen' && result.password) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-on-surface-variant/50 tracking-wider uppercase">Generated ({result.password.length} chars)</span>
          <CopyBtn text={result.password} id="pw" />
        </div>
        <div className="bg-black/40 rounded-lg p-3 text-sm text-on-surface-variant break-all font-mono-data tracking-wide select-all">
          {result.password}
        </div>
      </div>
    )
  }

  if (tool === 'hash_gen') {
    return (
      <div className="space-y-3">
        {result.sha256 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-on-surface-variant/50 tracking-wider uppercase text-[9px]">SHA-256</span>
              <CopyBtn text={result.sha256} id="sha256" />
            </div>
            <div className="bg-black/40 rounded-lg p-2 text-[10px] text-on-surface-variant break-all font-mono-data select-all">{result.sha256}</div>
          </div>
        )}
        {result.sha1 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-on-surface-variant/50 tracking-wider uppercase text-[9px]">SHA-1</span>
              <CopyBtn text={result.sha1} id="sha1" />
            </div>
            <div className="bg-black/40 rounded-lg p-2 text-[10px] text-on-surface-variant break-all font-mono-data select-all">{result.sha1}</div>
          </div>
        )}
      </div>
    )
  }

  if (tool === 'crypto') {
    const items = [
      { label: 'Base64 Encode', value: result.b64encode, id: 'b64e' },
      { label: 'Base64 Decode', value: result.b64decode, id: 'b64d' },
      { label: 'URL Encode', value: result.urlencode, id: 'urle' },
      { label: 'URL Decode', value: result.urldecode, id: 'urld' },
    ]
    return (
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-on-surface-variant/50 tracking-wider uppercase text-[9px]">{item.label}</span>
              <CopyBtn text={item.value} id={item.id} />
            </div>
            <div className="bg-black/40 rounded-lg p-2 text-[10px] text-on-surface-variant break-all font-mono-data select-all">{item.value}</div>
          </div>
        ))}
      </div>
    )
  }

  return <div className="text-on-surface-variant/30">No data</div>
}
