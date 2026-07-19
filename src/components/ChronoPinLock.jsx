import React, { useState, useEffect, useRef } from 'react'
import { logNotification, authenticateBiometric } from './LauncherPlugin'
import PinKeypad from './PinKeypad'
import ChronoClockDial from './ChronoClockDial'
import ThreatPhotoCapture from './ThreatPhotoCapture'

export default function ChronoPinLock({ onUnlockSuccess, onClose, source }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [pinInput, setPinInput] = useState('')
  const [logs, setLogs] = useState([])
  const [statusState, setStatusState] = useState('AWAITING_PASSKEY') // 'AWAITING_PASSKEY' | 'VALIDATING' | 'GRANTED' | 'DENIED'
  const [isShaking, setIsShaking] = useState(false)
  const consoleEndRef = useRef(null)

  const logListTemplate = [
    "SYS: [0.0s] CHRONO-PASSKEY NETWORK SYNCHRONIZER ONLINE...",
    "SYS: [0.3s] PAGING SYSTEM REALTIME CLOCK MODULE...",
    "SYS: [0.6s] COGNITIVE CHRONO-ROTATOR ALGORITHM: [HHMM]",
    "SYS: [0.9s] VAULT ENVELOPE ARMED. ENCRYPTED PASSCODE SYNCED.",
    "SYS: [1.2s] AWAITING DYNAMIC CLOCK PIN ENTRY FOR SYSTEM VAULT..."
  ]

  // Live ticking clock syncer (updates time every 1s — sufficient for PIN validation)
  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Initial technical logging sequence
    let currentLogIndex = 0
    const logTimer = setInterval(() => {
      if (currentLogIndex < logListTemplate.length) {
        addLog(logListTemplate[currentLogIndex])
        currentLogIndex++
      } else {
        clearInterval(logTimer)
      }
    }, 200)

    return () => {
      clearInterval(clockTimer)
      clearInterval(logTimer)
    }
  }, [])

  // Silent WebRTC Security Camera Capture
  const captureThreatPhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      const video = document.createElement('video')
      video.srcObject = stream
      video.play()

      // Wait a tiny bit for the camera to auto-expose and focus
      await new Promise(resolve => setTimeout(resolve, 800))

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      
      const dataUri = canvas.toDataURL('image/jpeg', 0.8) // Compressed JPEG
      
      stream.getTracks().forEach(t => t.stop())

      // Save to External Storage via Capacitor
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
      
      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: 'Iris_Threats',
          directory: Directory.Data,
          recursive: true
        })
      } catch(e) {} // Exists

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const prefix = source === 'private' ? 'Private_Threat_' : 'Threat_'
      const fileName = `Iris_Threats/${prefix}${timestamp}.txt`
      
      await Filesystem.writeFile({
        path: fileName,
        data: dataUri,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      })

      addLog(`SYS: [SECURITY] THREAT PHOTO CAPTURED AND STORED.`)

    } catch(err) {
      addLog(`SYS: [WARNING] CAMERA SENSOR ACCESS DENIED OR FAILED.`)
    }
  }

  // Biometric Auth Hook
  useEffect(() => {
    const runBiometric = async () => {
      addLog("SYS: CHECKING BIOMETRIC HARDWARE STATUS...")
      try {
        const { NativeBiometric } = await import('@capgo/capacitor-native-biometric')
        const avail = await NativeBiometric.isAvailable()
        
        if (avail.isAvailable) {
          await NativeBiometric.verifyIdentity({
            reason: "Authenticate to access Iris Vault",
            title: "Iris Security"
          })
          setStatusState('GRANTED')
          addLog("SYS: BIOMETRIC MATCH CONFIRMED!")
          logNotification('BIOMETRIC', 'Access Granted: Fingerprint validation succeeded.', 'success')
          if (navigator.vibrate) navigator.vibrate([100, 50, 100])
          setTimeout(() => {
            if (onUnlockSuccess) onUnlockSuccess()
          }, 1200)
        } else {
          addLog("SYS: BIOMETRIC HARDWARE UNAVAILABLE. FALLING BACK TO PIN.")
          // Don't capture threat if hardware is just unavailable
        }
      } catch (e) {
        addLog(`SYS: BIOMETRIC AUTHENTICATION FAILED OR CANCELLED: ${e.message || 'No match'}`)
        if (e && e.message && (e.message.includes("Too many") || e.message.includes("lockout") || e.message.includes("cancelled"))) {
          logNotification('BIOMETRIC', 'Scanner temporarily locked out. Please use your PIN.', 'error')
        }
        captureThreatPhoto()
      }
    }
    // Delay slightly to let the UI render the lock screen first
    setTimeout(runBiometric, 500)
  }, [])

  // Auto-scroll the terminal logs console to bottom
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  const addLog = (text) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false })
    setLogs(prev => [...prev, `[${timestamp}] ${text}`])
  }

  // Calculate dynamic active PINs based on clock (both 24h and 12h formats)
  const getCorrectPins = () => {
    const h24 = currentTime.getHours()
    const minutes = String(currentTime.getMinutes()).padStart(2, '0')
    
    const h24Str = String(h24).padStart(2, '0')
    
    const h12 = h24 % 12
    const h12Str = String(h12 === 0 ? 12 : h12).padStart(2, '0')
    
    return [
      `${h24Str}${minutes}`,
      `${h12Str}${minutes}`
    ]
  }

  // Monitor PIN entry length to trigger fluid instant verification on 4th digit
  useEffect(() => {
    if (pinInput.length === 4) {
      handleVerifyPin(pinInput)
    }
  }, [pinInput])

  const handleKeyPress = (num) => {
    if (statusState === 'VALIDATING' || statusState === 'GRANTED') return
    if (pinInput.length >= 4) return

    // Trigger haptic rumble feedback if device supports it
    if (navigator.vibrate) navigator.vibrate(35)

    const nextPin = pinInput + num
    setPinInput(nextPin)
    addLog(`KEYPAD: ENTERED NODE DIGIT [${num}]`)
  }

  const handleBackspace = () => {
    if (statusState === 'VALIDATING' || statusState === 'GRANTED') return
    if (pinInput.length === 0) return

    if (navigator.vibrate) navigator.vibrate(25)
    
    setPinInput(prev => prev.slice(0, -1))
    addLog("KEYPAD: ERASED PREVIOUS ENTRY DIGIT")
  }

  const handleClear = () => {
    if (statusState === 'VALIDATING' || statusState === 'GRANTED') return
    if (pinInput.length === 0) return

    if (navigator.vibrate) navigator.vibrate(40)

    setPinInput('')
    addLog("KEYPAD: ENTIRE SECURE BUFFER CLEARED")
  }

  const handleVerifyPin = (input) => {
    setStatusState('VALIDATING')
    addLog("SYS: RUNNING SECURE CHRONO-AUTHENTICATOR PIPELINE...")

    // Capture correct PINs at the moment of entry to avoid time-expiry during the validation delay
    const correctPins = getCorrectPins()

    setTimeout(() => {
      if (correctPins.includes(input)) {
        setStatusState('GRANTED')
        addLog("SYS: COGNITIVE TIME SYNC CONFIRMED!")
        addLog("SYS: ACCESS GRANTED. UNLOCKING VAULT MATRIX INDICES.")
        logNotification('BIOMETRIC', 'Access Granted: Chrono-key validation succeeded.', 'success')
        if (navigator.vibrate) navigator.vibrate([100, 50, 100])
        
        setTimeout(() => {
          if (onUnlockSuccess) onUnlockSuccess()
        }, 1200)
      } else {
        setStatusState('DENIED')
        setIsShaking(true)
        addLog(`SYS: [WARNING] PASSKEY MISMATCH ENCOUNTERED: INPUT='${input}'`)
        addLog(`SYS: [ERROR] SECURE SYNAPSE BLOCKED. ROTATING TIME-KEYS.`)
        logNotification('SECURITY', `Access Denied: Unrecognized passcode node: '${input}'`, 'warning')
        captureThreatPhoto()
        if (navigator.vibrate) navigator.vibrate(300)

        setTimeout(() => {
          setPinInput('')
          setStatusState('AWAITING_PASSKEY')
          setIsShaking(false)
        }, 1000)
      }
    }, 700)
  }

  return (
    <div className="fixed inset-0 bg-[#020617]/95 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <div 
        className={`w-full max-w-sm glass-surface rounded-xl p-5 flex flex-col items-center relative overflow-hidden transition-all duration-300 border border-primary-fixed-dim/40 ${
          statusState === 'GRANTED' 
            ? 'shadow-[0_0_40px_rgba(0,255,102,0.4)] border-[#39ff14]/50 bg-[#0f172a]/95' 
            : statusState === 'DENIED' 
              ? 'shadow-[0_0_40px_rgba(255,23,68,0.4)] border-error/50 bg-[#1c0f14]/95 animate-shake' 
              : 'shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]'
        } ${isShaking ? 'animate-shake' : ''}`}
        style={{
          animation: isShaking ? 'shake 0.4s ease-in-out' : 'none'
        }}
      >
        {/* Animated perimeter scan glow sweep */}
        <div className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-fixed-dim to-transparent animate-pulse`} />

        {/* Close Button */}
        <button 
          onClick={onClose} 
          disabled={statusState === 'GRANTED'}
          className="absolute top-3 right-3 text-on-surface-variant/40 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        {/* Dynamic Chrono Lock Title */}
        <div className="text-center w-full select-none mt-2">
          <h2 className="font-label-caps text-label-caps text-primary-fixed-dim tracking-[0.25em] text-xs font-bold leading-none">
            SECURE AUTHENTICATION REQUIRED
          </h2>
          <p className="font-mono-data text-[7.5px] text-on-surface-variant/40 tracking-wider uppercase mt-1">
            BIOMETRIC OR PASSCODE PROTOCOL // SECURE SECTOR 03
          </p>
        </div>

        <ChronoClockDial
          statusState={statusState}
          onBiometricTap={async () => {
            addLog("SYS: MANUAL BIOMETRIC OVERRIDE TRIGGERED...")
            const res = await authenticateBiometric()
            if (res.success) {
              setStatusState('GRANTED')
              addLog("SYS: BIOMETRIC MATCH CONFIRMED!")
              logNotification('BIOMETRIC', 'Access Granted: Fingerprint validation succeeded.', 'success')
              if (navigator.vibrate) navigator.vibrate([100, 50, 100])
              setTimeout(() => {
                if (onUnlockSuccess) onUnlockSuccess()
              }, 1200)
            } else {
              addLog(`SYS: MANUAL BIOMETRIC FAILED: ${res.error || 'No match'}`)
              captureThreatPhoto()
            }
          }}
          onCaptureThreat={captureThreatPhoto}
        />

        {/* Dynamic Passcode Dot Indicators */}
        <div className="w-full flex items-center justify-center gap-4 mb-4 select-none">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pinInput.length > idx
            const isVerifying = statusState === 'VALIDATING'
            let dotColor = 'border-primary-fixed-dim/40 bg-surface-container/20'

            if (isVerifying) {
              dotColor = 'border-primary-fixed-dim bg-primary-fixed-dim animate-pulse'
            } else if (statusState === 'GRANTED') {
              dotColor = 'border-[#39ff14]/60 bg-[#39ff14] shadow-[0_0_8px_#39ff14]'
            } else if (statusState === 'DENIED') {
              dotColor = 'border-error/60 bg-error shadow-[0_0_8px_rgba(255,23,68,0.7)] animate-bounce'
            } else if (isFilled) {
              dotColor = 'border-primary-fixed-dim bg-primary-fixed-dim shadow-[0_0_10px_rgba(var(--primary-rgb),0.6)]'
            }

            return (
              <div 
                key={idx}
                className={`w-3.5 h-3.5 rounded-full border transition-all duration-200 ${dotColor}`}
              />
            )
          })}
        </div>

        {/* Secure Tech Status Panel */}
        <ThreatPhotoCapture />

        <PinKeypad
          onKeyPress={(num) => handleKeyPress(num)}
          onBackspace={handleBackspace}
          onClear={handleClear}
        />

        {/* Dynamic scrolling Diagnostic Logs panel */}
        <div className="w-full bg-black/60 rounded border border-outline-variant/20 p-2.5 h-20 overflow-y-auto scroll-container font-mono-data text-[7.5px] leading-relaxed text-on-surface-variant flex flex-col gap-1.5">
          {logs.map((log, idx) => (
            <p key={idx} className="truncate select-text">
              {log}
            </p>
          ))}
          <div ref={consoleEndRef} />
        </div>
      </div>

      {/* Styled shake anim CSS injection inside component markup */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  )
}
