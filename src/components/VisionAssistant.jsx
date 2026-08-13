import React, { useState, useRef, useEffect, useCallback } from 'react'
import { SecureStorage } from '../utils/secureStorage'
import { useAIStore } from '../stores/aiStore'

export default function VisionAssistant({ glassBg, onClose, speakTextFn }) {
  const [mode, setMode] = useState('CAMERA') // 'CAMERA' | 'UPLOAD'
  const [imagePreview, setImagePreview] = useState(null) // base64
  const [prompt, setPrompt] = useState('Explain what is visible in this image in detail.')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const geminiModel = useAIStore(s => s.geminiModel) || 'gemini-1.5-flash'

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
    } catch (err) {
      console.warn("Camera access failed:", err)
      setCameraError("Camera unavailable. Upload an image instead.")
      setMode('UPLOAD')
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  useEffect(() => {
    if (mode === 'CAMERA') {
      startCamera()
    } else {
      stopCamera()
    }
    return () => stopCamera()
  }, [mode, startCamera, stopCamera])

  // Capture frame from live video
  const captureCameraFrame = () => {
    const video = videoRef.current
    if (!video) return
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)
    setImagePreview(base64)
  }

  // File upload handler
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      setImagePreview(event.target.result)
    }
    reader.readAsDataURL(file)
  }

  // Vision Analysis API Call
  const runVisionAnalysis = async () => {
    const targetImage = imagePreview || (() => { captureCameraFrame(); return imagePreview })()
    if (!targetImage) {
      setAnalysisResult("Error: Please capture or upload an image first.")
      return
    }

    setAnalyzing(true)
    setAnalysisResult('')

    try {
      const apiKey = await SecureStorage.getItem('gemini_api_key')
      if (!apiKey) {
        setAnalysisResult("API KEY REQUIRED: Please configure your Gemini API Key in Core Settings -> API Keys.")
        setAnalyzing(false)
        return
      }

      // Extract raw base64 data and mime type
      const mimeType = targetImage.split(';')[0].split(':')[1] || 'image/jpeg'
      const base64Data = targetImage.split(',')[1]

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`

      const payload = {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              }
            ]
          }
        ]
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (data.error) {
        setAnalysisResult(`API Error (${data.error.code}): ${data.error.message}`)
      } else {
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No analysis output returned."
        setAnalysisResult(textResponse)
        if (speakTextFn) {
          speakTextFn(textResponse)
        }
      }
    } catch (err) {
      console.error("Vision API Error:", err)
      setAnalysisResult(`Execution Error: ${err.message || 'Vision inference failed.'}`)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 font-mono-data text-xs select-none">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400 animate-pulse text-lg">center_focus_strong</span>
          <div>
            <h3 className="font-bold text-cyan-300 text-xs tracking-widest uppercase">IRIS // OPTICS VISION ASSISTANT</h3>
            <p className="text-[8px] text-on-surface-variant/40">Multimodal AI Camera & Screenshot Analysis Engine</p>
          </div>
        </div>

        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant/40 hover:text-white hover:bg-white/5">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2">
        <button
          onClick={() => { setMode('CAMERA'); setImagePreview(null) }}
          className={`flex-1 py-2 rounded-lg border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            mode === 'CAMERA' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-black/30 border-white/10 text-on-surface-variant/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">photo_camera</span>
          Live Camera
        </button>

        <button
          onClick={() => { setMode('UPLOAD'); setImagePreview(null) }}
          className={`flex-1 py-2 rounded-lg border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            mode === 'UPLOAD' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-black/30 border-white/10 text-on-surface-variant/50'
          }`}
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Upload Screenshot
        </button>
      </div>

      {/* Viewport Frame */}
      <div className="relative w-full aspect-video rounded-xl border border-cyan-500/30 bg-black/60 overflow-hidden flex items-center justify-center">
        {mode === 'CAMERA' && !imagePreview && (
          <>
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Sci-Fi Target Bounding Box Overlay */}
            <div className="absolute inset-4 border border-cyan-400/30 rounded pointer-events-none flex flex-col justify-between p-2">
              <div className="flex justify-between">
                <span className="w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
                <span className="w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              </div>
              <div className="text-center">
                <span className="text-[8px] text-cyan-400/60 font-mono tracking-widest uppercase bg-black/60 px-2 py-0.5 rounded border border-cyan-500/20">
                  SYSTEM_OPTICS_LIVE
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
                <span className="w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              </div>
            </div>
          </>
        )}

        {mode === 'UPLOAD' && !imagePreview && (
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer w-full h-full p-4 hover:bg-white/5 transition-all">
            <span className="material-symbols-outlined text-3xl text-cyan-400/60">add_a_photo</span>
            <span className="text-[10px] text-on-surface-variant/60 uppercase">Click or Drag Screenshot Here</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        )}

        {imagePreview && (
          <div className="relative w-full h-full">
            <img src={imagePreview} alt="Optics Frame" className="w-full h-full object-contain" />
            <button
              onClick={() => setImagePreview(null)}
              className="absolute top-2 right-2 px-2 py-1 bg-black/80 border border-red-500/40 text-red-400 text-[8px] font-bold rounded uppercase tracking-wider"
            >
              Retake / Reset
            </button>
          </div>
        )}
      </div>

      {/* Preset Prompts */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {[
          "Explain what is visible in detail",
          "Identify and solve code/error",
          "Translate text in image",
          "Summarize key data points"
        ].map(p => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className={`px-2.5 py-1 rounded text-[8.5px] font-bold tracking-wider shrink-0 transition-all ${
              prompt === p ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300' : 'bg-black/20 border border-white/10 text-on-surface-variant/50 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Custom Prompt Input & Execute */}
      <div className="flex gap-2">
        <input
          type="text"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Ask anything about this image..."
          className="flex-1 bg-black/40 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface-variant focus:outline-none focus:border-cyan-500/50"
        />

        <button
          onClick={() => {
            if (mode === 'CAMERA' && !imagePreview) captureCameraFrame()
            runVisionAnalysis()
          }}
          disabled={analyzing}
          className="px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 text-cyan-300 font-bold text-[10px] uppercase tracking-wider hover:bg-cyan-500/30 active:scale-95 disabled:opacity-40 transition-all flex items-center gap-1.5 shrink-0"
        >
          {analyzing ? (
            <>
              <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span>ANALYZING</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>ANALYZE</span>
            </>
          )}
        </button>
      </div>

      {/* Analysis Output Box */}
      {analysisResult && (
        <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-black/50 space-y-2">
          <div className="flex justify-between items-center border-b border-white/10 pb-1">
            <span className="text-[9px] text-cyan-400 font-bold tracking-wider uppercase flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">psychology</span>
              IRIS OPTICS ANALYSIS OUTPUT
            </span>

            {speakTextFn && (
              <button
                onClick={() => speakTextFn(analysisResult)}
                className="text-[8px] text-cyan-300 hover:text-white flex items-center gap-0.5 uppercase"
              >
                <span className="material-symbols-outlined text-xs">volume_up</span>
                Speak
              </button>
            )}
          </div>

          <div className="text-[10px] text-on-surface-variant/90 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto no-scrollbar font-mono">
            {analysisResult}
          </div>
        </div>
      )}
    </div>
  )
}
