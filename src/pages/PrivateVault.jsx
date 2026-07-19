import React, { useState, useEffect } from 'react'
import { Filesystem, Directory } from '@capacitor/filesystem'

export default function PrivateVault() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loadedCount, setLoadedCount] = useState(20)

  const loadImages = async () => {
    try {
      setLoading(true)
      const res = await Filesystem.readdir({
        path: 'silent_captures',
        directory: Directory.Data
      })
      const imageFiles = res.files.filter(f => f.name.endsWith('.jpg') || f.name.endsWith('.png'))
      
      const loadedImages = []
      for (const file of imageFiles) {
        const fileData = await Filesystem.readFile({
          path: `silent_captures/${file.name}`,
          directory: Directory.Data
        })
        loadedImages.push({
          name: file.name,
          data: `data:image/jpeg;base64,${fileData.data}`
        })
      }
      setImages(loadedImages.reverse()) // newest first
    } catch (e) {
      console.log('No silent_captures directory yet or read error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [])

  const deleteImage = async (name) => {
    try {
      await Filesystem.deleteFile({
        path: `silent_captures/${name}`,
        directory: Directory.Data
      })
      setImages(images.filter(img => img.name !== name))
    } catch (e) {
      alert("Failed to delete image: " + e.message)
    }
  }

  const wipeAll = async () => {
    if (confirm("Are you sure you want to securely wipe all private captures?")) {
      try {
        await Filesystem.rmdir({
          path: 'silent_captures',
          directory: Directory.Data,
          recursive: true
        })
        setImages([])
        setSelectedImage(null)
      } catch (e) {
        console.log("Wipe error", e)
      }
    }
  }

  const downloadImage = async (img) => {
    try {
      const base64Data = img.data.split(',')[1]
      await Filesystem.writeFile({
        path: `Iris_${img.name}`,
        data: base64Data,
        directory: Directory.Documents
      })
      alert("Image saved to Documents folder successfully!")
    } catch (e) {
      alert("Failed to save image: " + e.message)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] text-white p-4 pt-20 overflow-y-auto">
      <div className="flex justify-between items-center mb-6 border-b border-primary-fixed-dim/20 pb-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-fixed-dim text-3xl">visibility_off</span>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-primary-fixed-dim uppercase">Private Vault</h1>
            <p className="text-[10px] text-on-surface-variant/60 font-mono-data uppercase">Secure Silent Captures</p>
          </div>
        </div>
        {images.length > 0 && (
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
      ) : images.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant/40">
          <span className="material-symbols-outlined text-6xl mb-4">no_photography</span>
          <p className="font-mono-data text-xs uppercase text-center max-w-xs">
            No secure captures found.<br/><br/>Use voice commands in Comm:<br/>"capture silent front" or "capture silent back"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.slice(0, loadedCount).map(img => (
            <div 
              key={img.name} 
              className="relative group rounded overflow-hidden border border-outline-variant/20 aspect-square bg-black/50 flex items-center justify-center cursor-pointer"
              onClick={() => setSelectedImage(img)}
            >
              <img src={img.data} alt={img.name} className="object-cover w-full h-full pointer-events-none" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-white text-3xl">fullscreen</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1 pointer-events-none">
                <p className="text-[8px] font-mono-data text-white/50 truncate">{img.name}</p>
              </div>
            </div>
          ))}
          {loadedCount < images.length && (
            <button
              onClick={() => setLoadedCount(prev => Math.min(prev + 20, images.length))}
              className="col-span-2 md:col-span-3 py-2 text-[10px] font-label-caps tracking-widest text-primary-fixed-dim/60 border border-primary-fixed-dim/20 rounded hover:bg-primary-fixed-dim/10 transition-colors mt-2"
            >
              LOAD MORE ({images.length - loadedCount})
            </button>
          )}
        </div>
      )}

      {/* Full-screen Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in p-4">
          <div className="absolute top-20 right-6 flex gap-3">
            <button 
              onClick={() => downloadImage(selectedImage)}
              className="w-12 h-12 rounded-full bg-primary-fixed-dim/20 text-primary-fixed-dim flex items-center justify-center hover:bg-primary-fixed-dim hover:text-black transition-all"
            >
              <span className="material-symbols-outlined">download</span>
            </button>
            <button 
              onClick={() => {
                deleteImage(selectedImage.name)
                setSelectedImage(null)
              }}
              className="w-12 h-12 rounded-full bg-error/20 text-error flex items-center justify-center hover:bg-error hover:text-white transition-all"
            >
              <span className="material-symbols-outlined">delete</span>
            </button>
            <button 
              onClick={() => setSelectedImage(null)}
              className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/30 transition-all"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <img 
            src={selectedImage.data} 
            alt={selectedImage.name} 
            className="max-w-full max-h-[80vh] object-contain rounded border border-white/10 shadow-2xl" 
          />
          <p className="mt-4 font-mono-data text-xs text-white/50">{selectedImage.name}</p>
        </div>
      )}
    </div>
  )
}
