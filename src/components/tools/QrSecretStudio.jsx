import React, { useState, useEffect, useRef } from 'react'

export default function QrSecretStudio({ glassBg }) {
  const [activeTab, setActiveTab] = useState('QR_GEN') // 'QR_GEN' | 'ENCRYPT' | 'DECRYPT'
  
  // QR State
  const [qrText, setQrText] = useState('https://iris.launcher')
  const [qrType, setQrType] = useState('TEXT') // 'TEXT' | 'WIFI' | 'SECRET'
  const [wifiSsid, setWifiSsid] = useState('')
  const [wifiPass, setWifiPass] = useState('')
  const [wifiType, setWifiType] = useState('WPA')
  const qrImageRef = useRef(null)

  // Secret Text State
  const [plainText, setPlainText] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [cipherText, setCipherText] = useState('')
  const [decryptInput, setDecryptInput] = useState('')
  const [decryptKey, setDecryptKey] = useState('')
  const [decryptedResult, setDecryptedResult] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Compute final QR content
  const getQrContent = () => {
    if (qrType === 'WIFI') {
      return `WIFI:S:${wifiSsid};T:${wifiType};P:${wifiPass};;`
    }
    return qrText
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getQrContent() || 'IRIS')}&color=00f2ff&bgcolor=020617`

  // AES-GCM Encryption
  const handleEncrypt = async () => {
    setErrorMsg('')
    if (!plainText || !secretKey) {
      setErrorMsg('Please enter both text and a secret encryption passphrase.')
      return
    }
    try {
      const enc = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(secretKey), { name: 'PBKDF2' }, false, ['deriveKey']
      )
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
      )
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv }, key, enc.encode(plainText)
      )

      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
      combined.set(salt, 0)
      combined.set(iv, salt.length)
      combined.set(new Uint8Array(encrypted), salt.length + iv.length)

      const b64 = btoa(String.fromCharCode(...combined))
      setCipherText(`IRIS_ENC::${b64}`)
    } catch (e) {
      setErrorMsg('Encryption failed: ' + e.message)
    }
  }

  // AES-GCM Decryption
  const handleDecrypt = async () => {
    setErrorMsg('')
    setDecryptedResult('')
    if (!decryptInput || !decryptKey) {
      setErrorMsg('Please enter both the encrypted cipher and passphrase.')
      return
    }
    try {
      const rawB64 = decryptInput.replace(/^IRIS_ENC::/, '').trim()
      const binary = atob(rawB64)
      const combined = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) combined[i] = binary.charCodeAt(i)

      const salt = combined.slice(0, 16)
      const iv = combined.slice(16, 28)
      const data = combined.slice(28)

      const enc = new TextEncoder()
      const keyMaterial = await crypto.subtle.importKey(
        'raw', enc.encode(decryptKey), { name: 'PBKDF2' }, false, ['deriveKey']
      )
      const key = await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
        keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
      )
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv }, key, data
      )
      const dec = new TextDecoder()
      setDecryptedResult(dec.decode(decrypted))
    } catch (_) {
      setErrorMsg('Decryption failed: Incorrect passphrase or corrupted cipher.')
    }
  }

  const copyText = (t) => {
    navigator.clipboard?.writeText(t)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-4 font-mono-data text-xs">
      {/* Sub Navigation Tabs */}
      <div className="flex bg-black/40 border border-white/10 rounded-xl p-1 gap-1">
        {[
          { id: 'QR_GEN', label: 'QR STUDIO', icon: 'qr_code_2' },
          { id: 'ENCRYPT', label: 'SECRET ENCRYPT', icon: 'enhanced_encryption' },
          { id: 'DECRYPT', label: 'DECRYPT CIPHER', icon: 'lock_open' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setErrorMsg('') }}
            className={`flex-1 py-2 rounded-lg text-[10px] tracking-wider uppercase font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow'
                : 'text-white/40 hover:text-white border border-transparent'
            }`}
          >
            <span className="material-symbols-outlined text-xs">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-[10px] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-xs">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ─── TAB 1: QR STUDIO ─────────────────────────────── */}
      {activeTab === 'QR_GEN' && (
        <div className="p-4 rounded-xl border border-white/10 space-y-4" style={{ backgroundColor: glassBg }}>
          <div className="flex gap-2 border-b border-white/10 pb-3">
            {[
              { id: 'TEXT', label: 'URL / TEXT' },
              { id: 'WIFI', label: 'WI-FI CREDENTIALS' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setQrType(t.id)}
                className={`px-3 py-1 rounded text-[10px] uppercase font-bold border transition-all ${
                  qrType === t.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'bg-black/20 border-white/5 text-white/40'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {qrType === 'TEXT' ? (
            <div className="space-y-1.5">
              <label className="text-[9px] text-white/50 tracking-widest uppercase">CONTENT / URL</label>
              <textarea
                value={qrText}
                onChange={e => setQrText(e.target.value)}
                placeholder="Enter URL, text, or crypto address..."
                rows={2}
                className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-mono"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] text-white/50 tracking-widest uppercase">NETWORK NAME (SSID)</label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  placeholder="MyHome_WiFi"
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-white/50 tracking-widest uppercase">PASSWORD</label>
                <input
                  type="password"
                  value={wifiPass}
                  onChange={e => setWifiPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                />
              </div>
            </div>
          )}

          {/* QR Preview Box */}
          <div className="flex flex-col items-center justify-center p-4 bg-black/60 rounded-xl border border-cyan-500/30 gap-3">
            <div className="p-3 bg-[#020617] rounded-xl border border-cyan-400/40 shadow-2xl">
              <img
                ref={qrImageRef}
                src={qrUrl}
                alt="QR Code"
                className="w-44 h-44 rounded-lg object-contain"
              />
            </div>
            <p className="text-[9px] text-white/40 font-mono tracking-wider">Scan with any camera or IRIS Optics Vision</p>
          </div>
        </div>
      )}

      {/* ─── TAB 2: SECRET ENCRYPT ────────────────────────── */}
      {activeTab === 'ENCRYPT' && (
        <div className="p-4 rounded-xl border border-white/10 space-y-3" style={{ backgroundColor: glassBg }}>
          <div className="space-y-1.5">
            <label className="text-[9px] text-white/50 tracking-widest uppercase">SECRET MESSAGE / TEXT</label>
            <textarea
              value={plainText}
              onChange={e => setPlainText(e.target.value)}
              placeholder="Confidential data or private notes..."
              rows={3}
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] text-white/50 tracking-widest uppercase">ENCRYPTION PASSPHRASE</label>
            <input
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              placeholder="Secret passkey..."
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <button
            onClick={handleEncrypt}
            className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-widest text-[10px] rounded-lg transition-all"
          >
            ENCRYPT WITH AES-256 GCM
          </button>

          {cipherText && (
            <div className="p-3 bg-black/60 rounded-xl border border-cyan-500/30 space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">ENCRYPTED CIPHER OUTPUT:</span>
                <button
                  onClick={() => copyText(cipherText)}
                  className="text-[9px] text-cyan-300 hover:text-white px-2 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/30 font-bold"
                >
                  {copied ? 'COPIED!' : 'COPY'}
                </button>
              </div>
              <p className="font-mono text-[9px] text-white/70 break-all p-2 rounded bg-white/5 border border-white/5">{cipherText}</p>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: DECRYPT CIPHER ────────────────────────── */}
      {activeTab === 'DECRYPT' && (
        <div className="p-4 rounded-xl border border-white/10 space-y-3" style={{ backgroundColor: glassBg }}>
          <div className="space-y-1.5">
            <label className="text-[9px] text-white/50 tracking-widest uppercase">ENCRYPTED CIPHER STRING</label>
            <textarea
              value={decryptInput}
              onChange={e => setDecryptInput(e.target.value)}
              placeholder="Paste IRIS_ENC::... cipher here"
              rows={3}
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 resize-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] text-white/50 tracking-widest uppercase">PASSPHRASE</label>
            <input
              type="password"
              value={decryptKey}
              onChange={e => setDecryptKey(e.target.value)}
              placeholder="Enter secret passkey..."
              className="w-full bg-black/50 border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
            />
          </div>

          <button
            onClick={handleDecrypt}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold uppercase tracking-widest text-[10px] rounded-lg transition-all"
          >
            DECRYPT SECRET
          </button>

          {decryptedResult && (
            <div className="p-3 bg-black/60 rounded-xl border border-emerald-500/30 space-y-2 mt-2">
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">DECRYPTED REVEAL:</span>
              <p className="font-mono text-xs text-emerald-200 p-2.5 rounded bg-emerald-950/30 border border-emerald-500/20">{decryptedResult}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
