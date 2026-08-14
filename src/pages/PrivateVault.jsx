import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Capacitor } from '@capacitor/core'

export default function PrivateVault({ onNavigate }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState(null)
  const [loadedCount, setLoadedCount] = useState(24)
  const scrollRef = useRef(null)

  const loadMedia = async () => {
    try {
      setLoading(true)
      const res = await Filesystem.readdir({
        path: 'silent_captures',
        directory: Directory.Data
      }).catch(() => ({ files: [] }))
      
      const mediaFiles = (res.files || []).filter(f => {
        const name = typeof f === 'string' ? f : f.name
        return /\.(jpg|jpeg|png|mp4|webm|m4a|aac|mp3|wav)$/i.test(name)
      })
      
      const loadedItems = []
      for (const file of mediaFiles) {
        const fileName = typeof file === 'string' ? file : file.name
        const isVideo = /\.(mp4|webm)$/i.test(fileName)
        const isAudio = /\.(m4a|aac|mp3|wav)$/i.test(fileName)
        const isPhoto = /\.(jpg|jpeg|png)$/i.test(fileName)
        loadedItems.push({
          name: fileName,
          isVideo,
          isAudio,
          isPhoto,
          data: null,
          uri: null,
          loaded: false
        })
      }
      // Sort newest first based on timestamp in filename if present
      loadedItems.sort((a, b) => b.name.localeCompare(a.name))
      setItems(loadedItems)

      // Load initial batch URIs / base64
      const initialBatch = loadedItems.slice(0, 24)
      for (const item of initialBatch) {
        try {
          if (item.isVideo || item.isAudio) {
            const uriResult = await Filesystem.getUri({
              path: `silent_captures/${item.name}`,
              directory: Directory.Data
            })
            const nativeSrc = Capacitor.convertFileSrc(uriResult.uri)
            setItems(prev => prev.map(i => i.name === item.name ? { ...i, uri: nativeSrc, data: nativeSrc, loaded: true } : i))
          } else {
            const fileData = await Filesystem.readFile({
              path: `silent_captures/${item.name}`,
              directory: Directory.Data
            })
            const dataUrl = `data:image/jpeg;base64,${fileData.data}`
            setItems(prev => prev.map(i => i.name === item.name ? { ...i, data: dataUrl, loaded: true } : i))
          }
        } catch (_) {}
      }
    } catch (e) {
      console.warn('No silent_captures directory yet or read error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMoreMedia = useCallback(async () => {
    const unloaded = items.filter(i => !i.loaded).slice(0, 20)
    for (const item of unloaded) {
      try {
        if (item.isVideo || item.isAudio) {
          const uriResult = await Filesystem.getUri({
            path: `silent_captures/${item.name}`,
            directory: Directory.Data
          })
          const nativeSrc = Capacitor.convertFileSrc(uriResult.uri)
          setItems(prev => prev.map(i => i.name === item.name ? { ...i, uri: nativeSrc, data: nativeSrc, loaded: true } : i))
        } else {
          const fileData = await Filesystem.readFile({
            path: `silent_captures/${item.name}`,
            directory: Directory.Data
          })
          const dataUrl = `data:image/jpeg;base64,${fileData.data}`
          setItems(prev => prev.map(i => i.name === item.name ? { ...i, data: dataUrl, loaded: true } : i))
        }
      } catch (_) {}
    }
  }, [items])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200 && items.some(i => !i.loaded)) {
      loadMoreMedia()
    }
  }, [items, loadMoreMedia])

  const deleteItem = async (name) => {
    try {
      await Filesystem.deleteFile({
        path: `silent_captures/${name}`,
        directory: Directory.Data
      })
      setItems(prev => prev.filter(i => i.name !== name))
      if (selectedItem?.name === name) setSelectedItem(null)
    } catch (e) {
      alert("Failed to delete item: " + e.message)
    }
  }

  const wipeAll = async () => {
    if (confirm("Are you sure you want to securely wipe all private captures and recordings?")) {
      try {
        await Filesystem.rmdir({
          path: 'silent_captures',
          directory: Directory.Data,
          recursive: true
        })
        setItems([])
        setSelectedItem(null)
      } catch (e) {
        console.error("Wipe error", e)
      }
    }
  }

  const exportItemToPhone = async (item) => {
    try {
      const fileData = await Filesystem.readFile({
        path: `silent_captures/${item.name}`,
        directory: Directory.Data
      })
      await Filesystem.writeFile({
        path: `Iris_${item.name}`,
        data: fileData.data,
        directory: Directory.Documents
      })
      alert(`Saved ${item.name} to Documents folder successfully!`)
    } catch (e) {
      alert("Failed to export: " + e.message)
    }
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 flex flex-col h-full bg-[#020617] text-white p-4 pt-16 overflow-y-auto">
      {onNavigate && (
        <button
          onClick={() => onNavigate('iris_tools')}
          className="flex items-center gap-1 text-on-surface-variant/50 hover:text-cyan-400 text-xs font-mono-data mb-3 transition-colors select-none"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          IRIS TOOLS
        </button>
      )}
      <div className="flex justify-between items-center mb-6 border-b border-primary-fixed-dim/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">visibility_off</span>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-primary-fixed-dim uppercase">Private Vault</h1>
            <p className="text-[10px] text-on-surface-variant/60 font-mono-data uppercase">Secure Silent Captures & Audio Logs</p>
          </div>
        </div>
        {items.length > 0 && (
          <button 
            onClick={wipeAll}
            className="px-3 py-1.5 bg-error/20 border border-error/50 text-error rounded font-label-caps text-[10px] tracking-widest hover:bg-error hover:text-white transition-all"
          >
            WIPE ALL
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-primary-fixed-dim animate-pulse">
          <span className="material-symbols-outlined text-4xl animate-spin">refresh</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/40 py-12">
          <span className="material-symbols-outlined text-6xl mb-4 text-cyan-400/40">security</span>
          <p className="font-mono-data text-xs uppercase text-center max-w-sm leading-relaxed text-slate-400">
            No secure recordings found.<br/><br/>
            <span className="text-cyan-400 font-bold tracking-wider">COVERT VOICE TRIGGERS:</span><br/>
            • &quot;Go Silent [time]&quot; (Audio Recording)<br/>
            • &quot;Upgrade Time&quot; / &quot;Up Back&quot; (Back Photo)<br/>
            • &quot;Upgrade Front&quot; / &quot;Up Front&quot; (Front Photo)<br/>
            • &quot;Upgrade Front [time]&quot; (Front Video)<br/>
            • &quot;Upgrade Back [time]&quot; (Back Video)
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.slice(0, loadedCount).map(item => (
            <div 
              key={item.name} 
              className={`relative group rounded-xl overflow-hidden border aspect-square flex items-center justify-center cursor-pointer shadow-lg transition-all ${
                item.isAudio 
                  ? 'bg-emerald-950/40 border-emerald-500/30 hover:border-emerald-400/70' 
                  : item.isVideo 
                  ? 'bg-purple-950/40 border-purple-500/30 hover:border-purple-400/70' 
                  : 'bg-black/60 border-cyan-500/20 hover:border-cyan-400/60'
              }`}
              onClick={() => setSelectedItem(item)}
            >
              {item.isAudio ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <span className="material-symbols-outlined text-emerald-400 text-4xl mb-1 animate-pulse">mic</span>
                  <span className="text-[9px] text-emerald-300 font-mono tracking-widest uppercase">AUDIO LOG</span>
                </div>
              ) : item.isVideo ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <span className="material-symbols-outlined text-purple-400 text-4xl mb-1">videocam</span>
                  <span className="text-[9px] text-purple-300 font-mono tracking-widest uppercase">VIDEO</span>
                </div>
              ) : item.data ? (
                <img src={item.data} alt={item.name} className="object-cover w-full h-full pointer-events-none" />
              ) : (
                <span className="material-symbols-outlined text-primary-fixed-dim animate-pulse text-2xl">image</span>
              )}
              
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-white text-3xl">
                  {item.isAudio ? 'play_arrow' : item.isVideo ? 'play_circle' : 'fullscreen'}
                </span>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-black/85 px-2 py-1 pointer-events-none flex items-center justify-between">
                <p className="text-[8px] font-mono text-white/70 truncate flex-1">{item.name}</p>
                {item.isAudio ? (
                  <span className="material-symbols-outlined text-[10px] text-emerald-400 ml-1">volume_up</span>
                ) : item.isVideo ? (
                  <span className="material-symbols-outlined text-[10px] text-purple-400 ml-1">movie</span>
                ) : null}
              </div>
            </div>
          ))}
          {loadedCount < items.length && (
            <button
              onClick={() => { setLoadedCount(prev => Math.min(prev + 20, items.length)); loadMoreMedia() }}
              className="col-span-2 sm:col-span-3 md:col-span-4 py-2.5 text-[10px] font-label-caps tracking-widest text-primary-fixed-dim border border-primary-fixed-dim/30 rounded-xl hover:bg-primary-fixed-dim/10 transition-colors mt-2"
            >
              LOAD MORE ({items.length - loadedCount})
            </button>
          )}
        </div>
      )}

      {/* Full-screen Media / Audio Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in p-4">
          <div className="absolute top-6 right-6 flex gap-3 z-50">
            <button 
              onClick={() => exportItemToPhone(selectedItem)}
              title="Save to Phone Documents"
              className="w-11 h-11 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center hover:bg-cyan-500 hover:text-black transition-all"
            >
              <span className="material-symbols-outlined text-xl">download</span>
            </button>
            <button 
              onClick={() => deleteItem(selectedItem.name)}
              title="Delete File"
              className="w-11 h-11 rounded-full bg-red-500/20 text-red-300 border border-red-400/40 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-xl">delete</span>
            </button>
            <button 
              onClick={() => setSelectedItem(null)}
              title="Close"
              className="w-11 h-11 rounded-full bg-white/10 text-white border border-white/20 flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          
          {selectedItem.isAudio ? (
            <div className="w-full max-w-md p-6 rounded-2xl bg-slate-900/90 border border-emerald-500/40 shadow-2xl flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-400/50">
                <span className="material-symbols-outlined text-emerald-400 text-3xl animate-pulse">graphic_eq</span>
              </div>
              <div className="text-center">
                <h3 className="text-sm font-bold tracking-widest text-emerald-300 uppercase">Covert Audio Recording</h3>
                <p className="text-[10px] font-mono text-slate-400 mt-1 truncate max-w-xs">{selectedItem.name}</p>
              </div>
              <audio 
                src={selectedItem.uri || selectedItem.data} 
                controls 
                autoPlay 
                className="w-full mt-2 custom-audio-player" 
              />
            </div>
          ) : selectedItem.isVideo ? (
            <video 
              src={selectedItem.uri || selectedItem.data} 
              controls 
              autoPlay 
              playsInline
              className="max-w-full max-h-[80vh] rounded-xl border border-purple-500/30 shadow-2xl" 
            />
          ) : (
            <img 
              src={selectedItem.data} 
              alt={selectedItem.name} 
              className="max-w-full max-h-[80vh] object-contain rounded-xl border border-cyan-500/30 shadow-2xl" 
            />
          )}
          <p className="mt-4 font-mono text-xs text-white/60 tracking-wider">{selectedItem.name}</p>
        </div>
      )}
    </div>
  )
}
