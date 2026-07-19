import React, { useState } from 'react'

export default function FileCreator({ onCreated, onCancel }) {
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!fileName.trim()) return
    onCreated(fileName.trim(), fileContent)
  }

  return (
    <form onSubmit={handleSubmit} className="absolute inset-0 bg-surface-container/95 backdrop-blur p-4 flex flex-col gap-3">
      <h3 className="font-label-caps text-label-caps text-primary-fixed-dim">CREATE COGNITIVE NODE</h3>
      <div className="flex flex-col gap-1">
        <label className="text-[9px] text-on-surface-variant">NODE_NAME.TXT</label>
        <input
          value={fileName}
          onChange={e => setFileName(e.target.value)}
          placeholder="system_directive.txt"
          className="bg-black/30 border border-outline-variant/30 rounded p-2 focus:outline-none focus:border-primary-fixed-dim text-xs text-[#dfe2ef]"
          type="text"
          required
        />
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <label className="text-[9px] text-on-surface-variant">DATA_PAYLOAD</label>
        <textarea
          value={fileContent}
          onChange={e => setFileContent(e.target.value)}
          placeholder="Enter document lines here..."
          className="flex-1 bg-black/30 border border-outline-variant/30 rounded p-2 focus:outline-none focus:border-primary-fixed-dim text-xs text-[#dfe2ef] resize-none"
          required
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded hover:bg-white/10 text-on-surface-variant text-[10px]">CANCEL</button>
        <button type="submit" className="px-4 py-1.5 rounded bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/40 hover:bg-primary-fixed-dim/30 text-[10px] font-bold">COMPILE NODE</button>
      </div>
    </form>
  )
}
