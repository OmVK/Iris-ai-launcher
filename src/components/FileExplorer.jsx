import React, { useState, useEffect } from 'react'
import FileCreator from './FileCreator'

const INITIAL_FS = {
  "/": { type: 'dir', children: ['documents', 'downloads', 'vault_private'] },
  "/documents": { type: 'dir', children: ['welcome_agentic.md', 'tasks.txt', 'sector_sweep.sh'] },
  "/documents/welcome_agentic.md": { 
    type: 'file', 
    content: "# IRIS SYSTEM OS\nWelcome to the Cybernetic OS interface. Operating System Kernel: STABLE v4.2.0.\n\nAI integration (Google Gemini, Groq, local Llama) active.\nAll operations are monitored and encrypted." 
  },
  "/documents/tasks.txt": { 
    type: 'file', 
    content: "1. Configure Gemini & Groq APIs in Settings\n2. Run simulated Sector Diagnostics in Assistant\n3. Execute 'hack live website' commands\n4. Synchronize mobile node telemetry link" 
  },
  "/documents/sector_sweep.sh": {
    type: 'file',
    content: "#!/bin/sh\n# Cybernetic Sector Sweep Macro\nclear\ndiagnostic\nweather London\nconsult oracle schema"
  },
  "/downloads": { type: 'dir', children: ['iris_schema.json'] },
  "/downloads/iris_schema.json": { 
    type: 'file', 
    content: "{\n  \"model\": \"Llama-3-Instruct\",\n  \"vectorDB\": \"LanceDB-Embedded\",\n  \"chronopin\": \"ChronoPinLock-V2\",\n  \"active\": true\n}" 
  },
  "/vault_private": { type: 'dir', children: ['confidential_rag.db', 'gemini_encryption.key'], locked: true },
  "/vault_private/confidential_rag.db": { 
    type: 'file', 
    content: "[Vector Embeddings: 482 vectors stored in LanceDB Local Table]" 
  },
  "/vault_private/gemini_encryption.key": { 
    type: 'file', 
    content: "AES_256_KEY=0x8842_A9F2_BC00_FF92" 
  }
}

export default function FileExplorer({ isVaultUnlocked = false, onTriggerUnlock }) {
  const [fs, setFs] = useState(() => {
    const saved = localStorage.getItem('iris_virtual_fs')
    return saved ? JSON.parse(saved) : INITIAL_FS
  })
  const [currentPath, setCurrentPath] = useState('/documents')
  const [selectedFile, setSelectedFile] = useState(null)
  const [showCreator, setShowCreator] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    localStorage.setItem('iris_virtual_fs', JSON.stringify(fs))
  }, [fs])

  const getDirectoryContents = (path) => {
    const dir = fs[path]
    if (!dir || dir.type !== 'dir') return []
    return dir.children.map(name => {
      const fullPath = path === '/' ? `/${name}` : `${path}/${name}`
      return {
        name,
        fullPath,
        ...fs[fullPath]
      }
    })
  }

  const navigateTo = (path) => {
    const target = fs[path]
    if (target && target.locked && !isVaultUnlocked) {
      setAlertMsg("SECURITY WARNING: CHRONO-PASSKEY PIN SYNC REQUIRED TO UNLOCK VAULT.")
      if (onTriggerUnlock) onTriggerUnlock()
      return
    }
    setCurrentPath(path)
    setSelectedFile(null)
    setShowCreator(false)
    setAlertMsg('')
  }

  const goUp = () => {
    if (currentPath === '/') return
    const segments = currentPath.split('/')
    segments.pop()
    const parent = segments.join('/') || '/'
    navigateTo(parent)
  }

  const handleDelete = (name, fullPath) => {
    const updatedChildren = fs[currentPath].children.filter(c => c !== name)
    const newFs = { ...fs }
    delete newFs[fullPath]
    
    // Recursively clean directories if it was a directory
    if (fs[fullPath].type === 'dir') {
      Object.keys(newFs).forEach(key => {
        if (key.startsWith(fullPath)) delete newFs[key]
      })
    }

    newFs[currentPath] = {
      ...newFs[currentPath],
      children: updatedChildren
    }

    setFs(newFs)
    setSelectedFile(null)
    setAlertMsg(`Deleted ${name} & flushed RAG index.`)
  }

  // Drag and Drop implementation
  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const reader = new FileReader()

    reader.onload = (event) => {
      const content = event.target.result
      const sanitizedName = file.name.replace(/[/\s]/g, '_')
      const fullPath = currentPath === '/' ? `/${sanitizedName}` : `${currentPath}/${sanitizedName}`

      if (fs[fullPath]) {
        setAlertMsg(`Error: File ${sanitizedName} already exists.`)
        return
      }

      setFs(prev => ({
        ...prev,
        [currentPath]: {
          ...prev[currentPath],
          children: [...prev[currentPath].children, sanitizedName]
        },
        [fullPath]: {
          type: 'file',
          content: typeof content === 'string' ? content : "[Binary content parsed successfully]"
        }
      }))
      setAlertMsg(`Smart Ingestion successful: ${sanitizedName} auto-indexed in RAG Vector DB!`)
    }

    reader.readAsText(file)
  }

  const contents = getDirectoryContents(currentPath)

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-xl border border-outline-variant/30 overflow-hidden font-mono-data text-xs text-[#dfe2ef]">
      {/* Explorer Header */}
      <div className="bg-surface-container/60 px-4 py-2 border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-fixed-dim text-sm">folder_open</span>
          <span className="text-[10px] text-primary-fixed-dim tracking-wider">WORKSPACE: {currentPath}</span>
        </div>
        <div className="flex gap-2">
          <button 
            disabled={currentPath === '/'}
            onClick={goUp} 
            className="p-1 rounded hover:bg-white/10 text-on-surface-variant disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-sm">arrow_upward</span>
          </button>
          <button 
            onClick={() => setShowCreator(prev => !prev)}
            className="px-2 py-0.5 rounded bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/30 hover:bg-primary-fixed-dim/30"
          >
            + NEW FILE
          </button>
        </div>
      </div>

      {/* Main Panel */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Dynamic drop zone overlay */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 relative transition-all duration-300 ${
            isDragOver ? 'bg-primary-fixed-dim/10 border-2 border-dashed border-primary-fixed-dim m-2 rounded-lg' : ''
          }`}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-primary-fixed-dim">
              <span className="material-symbols-outlined text-4xl animate-bounce">download</span>
              <span className="font-label-caps text-xs tracking-widest mt-2">INGEST FILE TO VAULT</span>
            </div>
          )}

          {!isDragOver && contents.map((item) => {
            const isDir = item.type === 'dir'
            const isLocked = item.locked && !isVaultUnlocked

            return (
              <div 
                key={item.fullPath}
                onClick={() => isDir ? navigateTo(item.fullPath) : setSelectedFile(item)}
                className={`p-3 rounded-lg border flex flex-col items-center text-center cursor-pointer transition-all active:scale-95 ${
                  isLocked 
                    ? 'border-error/30 bg-error-container/5 hover:border-error/60'
                    : 'border-primary-fixed-dim/10 bg-surface-container/20 hover:border-primary-fixed-dim/30 hover:shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]'
                }`}
              >
                <span className={`material-symbols-outlined text-3xl mb-1 ${
                  isLocked ? 'text-error' : isDir ? 'text-secondary-fixed-dim' : 'text-primary-fixed-dim'
                }`}>
                  {isLocked ? 'lock' : isDir ? 'folder' : 'description'}
                </span>
                <span className="w-full truncate text-[10px] uppercase tracking-wide">
                  {item.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* File Content Preview Side Drawer */}
        {selectedFile && (
          <div className="w-64 bg-surface-container border-l border-outline-variant/40 p-4 flex flex-col min-h-0">
            <div className="flex justify-between items-center pb-2 border-b border-white/10 mb-2">
              <h3 className="font-bold text-[10px] text-primary-fixed-dim uppercase truncate w-40">{selectedFile.name}</h3>
              <button onClick={() => setSelectedFile(null)} className="text-on-surface-variant hover:text-white">
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-black/40 p-2 rounded text-[9px] whitespace-pre-wrap font-mono-data leading-relaxed mb-3 border border-white/5">
              {selectedFile.content}
            </div>
            <button 
              onClick={() => handleDelete(selectedFile.name, selectedFile.fullPath)}
              className="py-1.5 rounded bg-error-container/20 border border-error/30 text-error hover:bg-error-container/40 text-[10px] font-bold"
            >
              DELETE FILE
            </button>
          </div>
        )}

        {/* New File creator panel */}
        {showCreator && (
          <FileCreator
            onCreated={(name, content) => {
              const sanitizedName = name.replace(/[/\s]/g, '_')
              const fullPath = currentPath === '/' ? `/${sanitizedName}` : `${currentPath}/${sanitizedName}`
              if (fs[fullPath]) { setAlertMsg("Error: Object already exists."); return }
              const updatedFs = {
                ...fs,
                [currentPath]: { ...fs[currentPath], children: [...fs[currentPath].children, sanitizedName] },
                [fullPath]: { type: 'file', content }
              }
              setFs(updatedFs); setShowCreator(false)
              setAlertMsg(`Created file: ${sanitizedName} & auto-indexed in RAG Vector DB!`)
            }}
            onCancel={() => setShowCreator(false)}
          />
        )}
      </div>

      {/* Explorer Alerts Footer */}
      {alertMsg && (
        <div className="bg-surface-container-high px-4 py-1.5 border-t border-outline-variant/30 text-[9px] text-primary-fixed-dim flex items-center justify-between animate-pulse">
          <span>{alertMsg}</span>
          <button onClick={() => setAlertMsg('')}>
            <span className="material-symbols-outlined text-xs">close</span>
          </button>
        </div>
      )}
    </div>
  )
}
