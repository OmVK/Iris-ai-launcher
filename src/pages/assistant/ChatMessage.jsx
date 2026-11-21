import { useState, useMemo } from 'react'

function renderInlineFormatting(text) {
  if (!text) return null
  const parts = String(text).split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} className="text-white font-semibold">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={idx} className="px-1.5 py-0.5 mx-0.5 rounded bg-black/50 border border-white/10 text-[11.5px] font-mono text-[var(--primary-color)]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function FormattedBlocks({ text }) {
  const [copiedBlockIdx, setCopiedBlockIdx] = useState(null)

  const blocks = useMemo(() => {
    if (!text) return []
    const rawBlocks = String(text).split(/(```[\s\S]*?```)/g)
    const out = []

    rawBlocks.forEach((chunk) => {
      if (!chunk) return
      if (chunk.startsWith('```') && chunk.endsWith('```')) {
        const inner = chunk.slice(3, -3)
        const firstLineEnd = inner.indexOf('\n')
        let lang = 'CODE'
        let code = inner
        if (firstLineEnd !== -1) {
          const maybeLang = inner.slice(0, firstLineEnd).trim()
          if (/^[a-zA-Z0-9_+-]{1,18}$/.test(maybeLang)) {
            lang = maybeLang.toUpperCase()
            code = inner.slice(firstLineEnd + 1)
          }
        }
        out.push({ type: 'code', lang, code: code.trim() })
      } else {
        const lines = chunk.split('\n')
        lines.forEach((line) => {
          const trimmed = line.trim()
          if (!trimmed) {
            out.push({ type: 'spacer' })
          } else if (/^#{1,3}\s+/.test(trimmed)) {
            out.push({ type: 'heading', content: trimmed.replace(/^#{1,3}\s+/, '') })
          } else if (/^[-*•]\s+/.test(trimmed)) {
            out.push({ type: 'bullet', content: trimmed.replace(/^[-*•]\s+/, '') })
          } else if (/^\d+\.\s+/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/)
            out.push({ type: 'numbered', num: numMatch ? numMatch[1] : '•', content: numMatch ? numMatch[2] : trimmed })
          } else {
            out.push({ type: 'paragraph', content: line })
          }
        })
      }
    })
    return out
  }, [text])

  const handleCopyCode = (e, code, idx) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(code)
    setCopiedBlockIdx(idx)
    setTimeout(() => setCopiedBlockIdx(null), 1500)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {blocks.map((b, i) => {
        if (b.type === 'spacer') return <div key={i} className="h-1" />
        if (b.type === 'heading') {
          return (
            <div key={i} className="text-[13.5px] font-bold text-[var(--primary-color)] tracking-wide pt-1">
              {renderInlineFormatting(b.content)}
            </div>
          )
        }
        if (b.type === 'bullet') {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-[var(--primary-color)] font-bold mt-0.5 text-xs">▸</span>
              <span className="flex-1 leading-relaxed">{renderInlineFormatting(b.content)}</span>
            </div>
          )
        }
        if (b.type === 'numbered') {
          return (
            <div key={i} className="flex items-start gap-2 pl-1">
              <span className="text-[var(--primary-color)] font-mono text-xs font-bold mt-0.5 shrink-0">{b.num}</span>
              <span className="flex-1 leading-relaxed">{renderInlineFormatting(b.content)}</span>
            </div>
          )
        }
        if (b.type === 'code') {
          return (
            <div key={i} className="my-1.5 rounded-xl overflow-hidden border border-white/15 bg-[#020617]/95 shadow-inner">
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10">
                <span className="text-[9px] font-mono font-bold tracking-widest text-[var(--primary-color)] uppercase">
                  {b.lang}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopyCode(e, b.code, i)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9.5px] font-mono text-white/80 transition-colors"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {copiedBlockIdx === i ? 'check' : 'content_copy'}
                  </span>
                  <span>{copiedBlockIdx === i ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
              <pre className="p-3 text-[11.5px] font-mono text-emerald-300 overflow-x-auto leading-relaxed whitespace-pre">
                <code>{b.code}</code>
              </pre>
            </div>
          )
        }
        return (
          <p key={i} className="leading-relaxed break-words">
            {renderInlineFormatting(b.content)}
          </p>
        )
      })}
    </div>
  )
}

export default function ChatMessage({
  msg,
  index,
  chatUnlocked = true,
  onDelete,
  onSpeak,
  onSaveTask,
  onSaveNote,
  onQuickFollowUp
}) {
  const [copied, setCopied] = useState(false)
  const [savedType, setSavedType] = useState(null)
  const isIris = msg.sender === 'IRIS'
  const isError = msg.type === 'error'

  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(msg.text || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleSave = (e, type) => {
    e.stopPropagation()
    if (type === 'TASK' && onSaveTask) onSaveTask(msg.text)
    if (type === 'NOTE' && onSaveNote) onSaveNote(msg.text)
    setSavedType(type)
    setTimeout(() => setSavedType(null), 1600)
  }

  return (
    <div className={`w-full flex ${isIris ? 'justify-start' : 'justify-end'} mb-3.5 animate-in slide-in-from-bottom-2 fade-in duration-200 ${!chatUnlocked ? 'opacity-10 blur-md select-none' : ''}`}>
      <div className="group relative max-w-[90%] sm:max-w-[85%] flex flex-col gap-1">
        <div className={`flex items-start gap-2.5 ${isIris ? 'flex-row' : 'flex-row-reverse'}`}>
          {isIris && (
            <div className="w-7 h-7 mt-0.5 rounded-full bg-[rgba(var(--primary-rgb),0.18)] border border-[rgba(var(--primary-rgb),0.35)] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(var(--primary-rgb),0.2)]">
              <span className="material-symbols-outlined text-[15px] text-[var(--primary-color)]">smart_toy</span>
            </div>
          )}

          <div className={`px-4 py-3 rounded-2xl text-[13px] ${msg.loading ? 'animate-pulse' : ''} ${
            isIris
              ? (isError
                ? 'bg-red-500/10 border border-red-500/30 text-red-300 rounded-tl-sm'
                : 'bg-[#0a1022]/85 border border-white/10 text-white/90 backdrop-blur-xl rounded-tl-sm shadow-lg')
              : 'bg-[rgba(var(--primary-rgb),0.16)] border border-[rgba(var(--primary-rgb),0.35)] text-white shadow-[0_0_18px_rgba(var(--primary-rgb),0.12)] rounded-tr-sm'
          }`}>
            {msg.imagePreview && (
              <div className="mb-2.5 rounded-xl overflow-hidden border border-white/15 max-w-[220px]">
                <img src={msg.imagePreview} alt="Attached" className="w-full h-auto object-cover max-h-44" />
              </div>
            )}

            <div className="font-sans selectable-text">
              {isIris ? <FormattedBlocks text={msg.text} /> : <span className="break-words">{msg.text}</span>}
            </div>

            {isIris && !msg.loading && !isError && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-[var(--primary-color)] transition-colors"
                    title="Copy response"
                  >
                    <span className="material-symbols-outlined text-[13px]">{copied ? 'check' : 'content_copy'}</span>
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>

                  {onSpeak && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSpeak(msg.text) }}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-[var(--primary-color)] transition-colors"
                      title="Read aloud"
                    >
                      <span className="material-symbols-outlined text-[13px]">volume_up</span>
                      <span>SPEAK</span>
                    </button>
                  )}

                  {onSaveNote && (
                    <button
                      type="button"
                      onClick={(e) => handleSave(e, 'NOTE')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-amber-300 transition-colors"
                      title="Save to IRIS Notes"
                    >
                      <span className="material-symbols-outlined text-[13px]">{savedType === 'NOTE' ? 'check' : 'note_add'}</span>
                      <span>{savedType === 'NOTE' ? 'SAVED' : 'NOTE'}</span>
                    </button>
                  )}

                  {onSaveTask && (
                    <button
                      type="button"
                      onClick={(e) => handleSave(e, 'TASK')}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white/70 hover:text-emerald-300 transition-colors"
                      title="Save to Day Tasks"
                    >
                      <span className="material-symbols-outlined text-[13px]">{savedType === 'TASK' ? 'check' : 'add_task'}</span>
                      <span>{savedType === 'TASK' ? 'ADDED' : 'TASK'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {onQuickFollowUp && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onQuickFollowUp('Make your previous response shorter and more concise in 3 bullet points.') }}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9.5px] font-mono text-white/50 hover:text-white transition-colors"
                        title="Summarize shorter"
                      >
                        ✂️ SHORTER
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onQuickFollowUp('Explain your previous response in deeper detail with concrete examples.') }}
                        className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[9.5px] font-mono text-white/50 hover:text-white transition-colors"
                        title="Expand with more detail"
                      >
                        ➕ DEEPER
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDelete(index) }}
                    className="p-1 rounded-lg hover:bg-red-500/20 text-white/35 hover:text-red-400 transition-colors"
                    title="Delete message"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`text-[9px] uppercase tracking-wider text-white/30 font-mono px-9 flex items-center gap-2 ${isIris ? 'justify-start' : 'justify-end'}`}>
          <span>{msg.time} {msg.loading ? '• STREAMING...' : ''}</span>
          {!isIris && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(index) }}
              className="text-white/25 hover:text-red-400 transition-colors"
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
