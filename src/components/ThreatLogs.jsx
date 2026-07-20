import React, { useState, useEffect } from 'react'

export default function ThreatLogs() {
  const [threats, setThreats] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadedCount, setLoadedCount] = useState(20)

  useEffect(() => {
    const fetchThreats = async () => {
      try {
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
        const res = await Filesystem.readdir({ path: 'Iris_Threats', directory: Directory.Data })
        const files = res.files.filter(f => (f.name.startsWith('Threat_') || f.name.startsWith('Private_Threat_')) && f.name.endsWith('.txt'))
        
        const loadedThreats = []
        for (const f of files) {
          const fileData = await Filesystem.readFile({
            path: `Iris_Threats/${f.name}`,
            directory: Directory.Data,
            encoding: Encoding.UTF8
          })
          
          let timeLabel = f.name.replace('Private_Threat_', 'Private: ').replace('Threat_', '').replace('.txt', '').replace(/-/g, ':')
          loadedThreats.push({
            id: f.name,
            time: timeLabel,
            image: fileData.data
          })
        }
        
        setThreats(loadedThreats.reverse()) // newest first
      } catch(e) {
        // Directory doesn't exist or permission error
      } finally {
        setIsLoading(false)
      }
    }
    fetchThreats()
  }, [])

  const deleteThreat = async (name) => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      await Filesystem.deleteFile({
        path: `Iris_Threats/${name}`,
        directory: Directory.Data
      })
      setThreats(prev => prev.filter(t => t.id !== name))
    } catch(e) {
      console.error(e)
    }
  }

  const purgeAll = async () => {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem')
      for (const t of threats) {
        await Filesystem.deleteFile({
          path: `Iris_Threats/${t.id}`,
          directory: Directory.Data
        })
      }
      setThreats([])
    } catch(e) {
      console.error(e)
    }
  }

  return (
    <div className="flex flex-col h-full bg-error/5 border border-error/20 rounded-lg p-3">
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-label-caps text-[10px] text-error tracking-wider flex items-center gap-1.5 font-bold">
          <span className="material-symbols-outlined text-xs animate-pulse">security_update_warning</span>
          SECURITY THREAT CAPTURES
        </h2>
        {threats.length > 0 && (
          <button onClick={purgeAll} className="text-error hover:bg-error/20 px-2 py-0.5 rounded font-label-caps text-[9px] tracking-wider transition-colors border border-error/40 flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">delete_sweep</span>
            PURGE
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-error/50 font-mono-data text-[10px] animate-pulse">
            SCANNING FILE SYSTEM...
          </div>
        ) : threats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-error/40 italic">
            <span className="material-symbols-outlined text-xl mb-1 opacity-50">verified_user</span>
            NO THREATS DETECTED.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {threats.slice(0, loadedCount).map(threat => (
              <div key={threat.id} className="relative rounded overflow-hidden border border-error/50 bg-black/80 shadow-[0_0_15px_rgba(255,23,68,0.2)] flex flex-col group">
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 to-transparent p-1.5 z-10 flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[7.5px] text-error font-bold tracking-widest bg-error/20 px-1 rounded truncate max-w-[80%]">{threat.time}</span>
                  <button onClick={() => deleteThreat(threat.id)} className="text-white/50 hover:text-error active:scale-90 transition-transform">
                    <span className="material-symbols-outlined text-[12px]">delete</span>
                  </button>
                </div>
                
                <div className="aspect-[3/4] w-full bg-black relative">
                  <img src={threat.image} alt="Threat Capture" className="w-full h-full object-cover opacity-90 grayscale-[20%] sepia-[20%] hue-rotate-[-50deg] contrast-125" />
                  <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] pointer-events-none mix-blend-overlay"></div>
                </div>

                <div className="bg-error/90 text-white text-center text-[8px] font-bold py-1 uppercase tracking-widest border-t border-error/50 flex justify-between items-center px-2">
                  <span>ACCESS DENIED</span>
                  <span className="opacity-70">{threat.time.split('T')[0]}</span>
                </div>
              </div>
            ))}
            {loadedCount < threats.length && (
              <button
                onClick={() => setLoadedCount(prev => Math.min(prev + 20, threats.length))}
                className="col-span-2 py-2 text-[10px] font-label-caps tracking-widest text-error/70 border border-error/30 rounded hover:bg-error/10 transition-colors"
              >
                LOAD MORE ({threats.length - loadedCount})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
