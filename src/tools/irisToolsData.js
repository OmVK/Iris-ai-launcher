export const TOOLS = [
  // 1. IRIS VAULT CENTER HUB
  { 
    id: 'iris_vault', 
    name: 'Iris Vault Hub', 
    icon: 'database', 
    desc: 'Chrono Key, Private Vault, Locked Apps & Secure Files', 
    color: 'rgba(234,179,8,0.15)', 
    borderColor: 'rgba(234,179,8,0.3)', 
    accent: '#eab308',
    inputs: [],
    custom: 'iris_vault_hub',
    execute: async () => ({ custom: 'iris_vault_hub' })
  },

  // 2. DEVICE INTEGRITY & ROOT SCANNER
  {
    id: 'device_security',
    name: 'Device Security',
    icon: 'security',
    desc: 'Lock screen, encryption, root & ADB vulnerability scan',
    color: 'rgba(56,189,248,0.15)',
    borderColor: 'rgba(56,189,248,0.3)',
    accent: '#38bdf8',
    inputs: [],
    custom: 'device_security',
    execute: async () => ({ custom: 'device_security' })
  },

  // 3. DNS LOOKUP & PING PROBER
  {
    id: 'dns_prober',
    name: 'DNS & Ping Prober',
    icon: 'travel_explore',
    desc: 'DoH record resolver & real-time roundtrip ping tester',
    color: 'rgba(34,197,94,0.15)',
    borderColor: 'rgba(34,197,94,0.3)',
    accent: '#22c55e',
    inputs: [],
    custom: 'dns_prober',
    execute: async () => ({ custom: 'dns_prober' })
  },

  // 4. QR CODE & SECRET TEXT STUDIO
  {
    id: 'qr_studio',
    name: 'QR & Secret Studio',
    icon: 'qr_code_2',
    desc: 'Wi-Fi/Text QR generator & AES-256 GCM cipher studio',
    color: 'rgba(0,242,255,0.15)',
    borderColor: 'rgba(0,242,255,0.3)',
    accent: '#00f2ff',
    inputs: [],
    custom: 'qr_studio',
    execute: async () => ({ custom: 'qr_studio' })
  },

  // 5. THREAT MONITORING DASHBOARD
  { 
    id: 'threat_dashboard', 
    name: 'Threat Dashboard', 
    icon: 'shield', 
    desc: 'Intruder photo alerts & real-time threat telemetry', 
    color: 'rgba(249,115,22,0.15)', 
    borderColor: 'rgba(249,115,22,0.3)', 
    accent: '#f97316',
    inputs: [],
    custom: 'threat_dashboard',
    execute: async () => ({ custom: 'threat_dashboard' })
  },

  // 6. APP PERMISSION AUDITOR
  { 
    id: 'permission_auditor', 
    name: 'Permission Auditor', 
    icon: 'admin_panel_settings', 
    desc: 'Sensitive permission scanner & app privacy score', 
    color: 'rgba(168,85,247,0.15)', 
    borderColor: 'rgba(168,85,247,0.3)', 
    accent: '#a855f7',
    inputs: [],
    custom: 'permission_auditor',
    execute: async () => ({ custom: 'permission_auditor' })
  },

  // 7. WI-FI INSPECTOR
  { 
    id: 'wifi_inspector', 
    name: 'Wi-Fi Inspector', 
    icon: 'wifi_find', 
    desc: 'Network gateway, RSSI signal & subnet latency prober', 
    color: 'rgba(34,197,94,0.15)', 
    borderColor: 'rgba(34,197,94,0.3)', 
    accent: '#22c55e',
    inputs: [],
    custom: 'wifi_inspector',
    execute: async () => ({ custom: 'wifi_inspector' })
  },

  // 8. IRIS OPTICS VISION
  { 
    id: 'iris_optics', 
    name: 'IRIS Optics Vision', 
    icon: 'center_focus_strong', 
    desc: 'Multimodal AI camera & screenshot intelligence', 
    color: 'rgba(0,242,255,0.15)', 
    borderColor: 'rgba(0,242,255,0.3)', 
    accent: '#00f2ff',
    inputs: [],
    custom: 'iris_optics',
    execute: async () => ({ custom: 'iris_optics' })
  },

  // 9. PASSWORD GENERATOR
  { 
    id: 'pw_gen', 
    name: 'Password Gen', 
    icon: 'password', 
    desc: 'Cryptographic high-entropy password generator', 
    color: 'rgba(45,212,191,0.15)', 
    borderColor: 'rgba(45,212,191,0.3)', 
    accent: '#2dd4bf',
    inputs: [
      { key: 'length', label: 'LENGTH', placeholder: '24', type: 'number', defaultVal: '24' },
    ],
    execute: async (vals) => {
      const rawLen = parseInt(vals.length) || 24
      if (rawLen < 4 || rawLen > 128) return { error: 'Length must be between 4 and 128' }
      const len = Math.min(Math.max(rawLen, 4), 128)
      const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const lower = 'abcdefghijklmnopqrstuvwxyz'
      const digits = '0123456789'
      const symbols = '!@#$%^&*()-_=+[]{}|;:,.<>?'
      const all = upper + lower + digits + symbols
      function secureIndex(max) {
        const limit = Math.floor(256 / max) * max
        let rnd
        do { const buf = new Uint8Array(1); crypto.getRandomValues(buf); rnd = buf[0] } while (rnd >= limit)
        return rnd % max
      }
      const pw = new Array(len)
      pw[0] = upper[secureIndex(upper.length)]
      pw[1] = lower[secureIndex(lower.length)]
      pw[2] = digits[secureIndex(digits.length)]
      pw[3] = symbols[secureIndex(symbols.length)]
      for (let i = 4; i < len; i++) pw[i] = all[secureIndex(all.length)]
      for (let i = pw.length - 1; i > 0; i--) {
        const buf = new Uint8Array(1); crypto.getRandomValues(buf)
        const j = buf[0] % (i + 1);
        [pw[i], pw[j]] = [pw[j], pw[i]]
      }
      return { password: pw.join('') }
    }
  },

  // 10. HASH GENERATOR
  { 
    id: 'hash_gen', 
    name: 'Hash Generator', 
    icon: 'token', 
    desc: 'SHA-256 and SHA-1 cryptographic text digests', 
    color: 'rgba(251,146,60,0.15)', 
    borderColor: 'rgba(251,146,60,0.3)', 
    accent: '#fb923c',
    inputs: [
      { key: 'text', label: 'INPUT TEXT', placeholder: 'Text to hash...', type: 'textarea' },
    ],
    execute: async (vals) => {
      if (!vals.text) return { error: 'Enter text to hash' }
      const encoder = new TextEncoder()
      const data = encoder.encode(vals.text)
      const sha256 = await crypto.subtle.digest('SHA-256', data)
      const sha1 = await crypto.subtle.digest('SHA-1', data)
      const buf2hex = (buf) => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
      return { sha256: buf2hex(sha256), sha1: buf2hex(sha1) }
    }
  },

  // 11. CRYPTO & DATA CONVERTER
  { 
    id: 'crypto', 
    name: 'Crypto Converter', 
    icon: 'swap_horiz', 
    desc: 'Base64 and URL encoding & decoding', 
    color: 'rgba(147,130,220,0.15)', 
    borderColor: 'rgba(147,130,220,0.3)', 
    accent: '#9382dc',
    inputs: [
      { key: 'text', label: 'INPUT TEXT', placeholder: 'Text to convert...', type: 'textarea' },
    ],
    execute: async (vals) => {
      if (!vals.text) return { error: 'Enter text to convert' }
      const t = vals.text
      return {
        b64encode: btoa(unescape(encodeURIComponent(t))),
        b64decode: (() => { try { return decodeURIComponent(escape(atob(t))) } catch { return 'Invalid Base64' } })(),
        urlencode: encodeURIComponent(t),
        urldecode: (() => { try { return decodeURIComponent(t) } catch { return 'Invalid URL encoding' } })(),
      }
    }
  },

  // 12. IP GEOLOCATION INFO
  { 
    id: 'ip_info', 
    name: 'IP Geolocation', 
    icon: 'language', 
    desc: 'Public IP details, ISP, ASN, and geo coordinates', 
    color: 'rgba(250,204,21,0.15)', 
    borderColor: 'rgba(250,204,21,0.3)', 
    accent: '#facc15',
    inputs: [
      { key: 'ip', label: 'IP ADDRESS (leave blank for yours)', placeholder: 'e.g. 8.8.8.8', type: 'text' },
    ],
    execute: async (vals) => {
      const target = vals.ip?.trim() || ''
      try {
        const url = target ? `https://ipinfo.io/${target}/json` : 'https://ipinfo.io/json'
        const res = await fetch(url)
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch { return { error: 'Invalid response from API' } }
        if (data.error) return { error: data.error.reason || 'Lookup failed' }
        return { info: {
          ip: data.ip, city: data.city, region: data.region,
          country_name: data.country, country_code: data.country,
          org: data.org, latitude: data.loc?.split(',')[0] || '—', longitude: data.loc?.split(',')[1] || '—',
          timezone: data.timezone, postal: data.postal,
        }}
      } catch (_) {
        try {
          const url2 = target ? `https://ip-api.com/json/${target}` : 'https://ip-api.com/json/'
          const res2 = await fetch(url2)
          const data2 = await res2.json()
          if (data2.status === 'fail') return { error: data2.message || 'Lookup failed' }
          return { info: {
            ip: data2.query, city: data2.city, region: data2.regionName,
            country_name: data2.country, country_code: data2.countryCode,
            org: `${data2.isp} (${data2.as})`, latitude: data2.lat, longitude: data2.lon,
            timezone: data2.timezone, postal: data2.zip,
          }}
        } catch { return { error: 'All IP lookup services failed. Check your connection.' } }
      }
    }
  },

  // 13. COMMAND REFERENCE SHEET
  { 
    id: 'unlock_iris', 
    name: 'Command Reference', 
    icon: 'lock_open', 
    desc: 'Voice command and stealth trigger reference manual', 
    color: 'rgba(0,229,255,0.15)', 
    borderColor: 'rgba(0,229,255,0.3)', 
    accent: '#00e5ff',
    inputs: [],
    custom: 'command_reference',
    locked: true,
    execute: async () => ({ custom: 'command_reference' })
  },
]
