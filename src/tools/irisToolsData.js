export const TOOLS = [
  { id: 'pw_gen', name: 'Password Gen', icon: 'password', desc: 'Generate secure passwords', color: 'rgba(45,212,191,0.15)', borderColor: 'rgba(45,212,191,0.3)', accent: '#2dd4bf',
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
  { id: 'hash_gen', name: 'Hash Generator', icon: 'token', desc: 'SHA-256 / SHA-1 any text', color: 'rgba(251,146,60,0.15)', borderColor: 'rgba(251,146,60,0.3)', accent: '#fb923c',
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
  { id: 'crypto', name: 'Crypto Converter', icon: 'swap_horiz', desc: 'Base64, URL encode / decode', color: 'rgba(147,130,220,0.15)', borderColor: 'rgba(147,130,220,0.3)', accent: '#9382dc',
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
  { id: 'ip_info', name: 'IP Info', icon: 'language', desc: 'Geolocation & ISP details', color: 'rgba(250,204,21,0.15)', borderColor: 'rgba(250,204,21,0.3)', accent: '#facc15',
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
      } catch (e1) {
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
  { id: 'censys', name: 'Censys', icon: 'search', desc: 'Internet-wide host search engine', color: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.3)', accent: '#6366f1', browserUrl: 'https://search.censys.io' },
  { id: 'shodan', name: 'Shodan', icon: 'router', desc: 'IoT device search engine', color: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', accent: '#ef4444', browserUrl: 'https://www.shodan.io' },
  { id: 'virustotal', name: 'VirusTotal', icon: 'verified_user', desc: 'File & URL malware scanner', color: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.3)', accent: '#a855f7', browserUrl: 'https://www.virustotal.com' },
  { id: 'exploitdb', name: 'ExploitDB', icon: 'bug_report', desc: 'Exploit database & PoC archive', color: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', accent: '#eab308', browserUrl: 'https://www.exploit-db.com' },
  { id: 'cve', name: 'CVE Search', icon: 'security', desc: 'CVE vulnerability lookup', color: 'rgba(249,115,22,0.15)', borderColor: 'rgba(249,115,22,0.3)', accent: '#f97316', browserUrl: 'https://cve.circl.lu' },
  { id: 'chrono_key', name: 'Chrono Key', icon: 'password', desc: 'Vault PIN lock & authentication', color: 'rgba(168,85,247,0.15)', borderColor: 'rgba(168,85,247,0.3)', accent: '#a855f7',
    inputs: [],
    execute: async () => {
      return { navigate: 'chrono_lock', target: 'optics' }
    }
  },
  { id: 'iris_vault', name: 'Iris Vault', icon: 'database', desc: 'Manage locked apps & secure files', color: 'rgba(234,179,8,0.15)', borderColor: 'rgba(234,179,8,0.3)', accent: '#eab308',
    inputs: [],
    execute: async () => {
      return { navigate: 'vault' }
    }
  },
  { id: 'private_vault', name: 'Private Vault', icon: 'visibility_off', desc: 'Encrypted private storage', color: 'rgba(239,68,68,0.15)', borderColor: 'rgba(239,68,68,0.3)', accent: '#ef4444',
    inputs: [],
    execute: async () => {
      return { navigate: 'chrono_lock', target: 'private' }
    }
  },
  { id: 'threat_dashboard', name: 'Threat Dashboard', icon: 'shield', desc: 'Security posture & threat intel', color: 'rgba(0,242,255,0.15)', borderColor: 'rgba(0,242,255,0.3)', accent: '#00f2ff',
    inputs: [],
    custom: true,
    execute: async () => {
      return { custom: 'threat_dashboard' }
    }
  },
  { id: 'permission_auditor', name: 'Permission Auditor', icon: 'admin_panel_settings', desc: 'App privacy risk score & permission scanner', color: 'rgba(56,189,248,0.15)', borderColor: 'rgba(56,189,248,0.3)', accent: '#38bdf8',
    inputs: [],
    custom: true,
    execute: async () => {
      return { custom: 'permission_auditor' }
    }
  },
  { id: 'wifi_inspector', name: 'Wi-Fi Inspector', icon: 'wifi_find', desc: 'Network security & MITM ARP scanner', color: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', accent: '#22c55e',
    inputs: [],
    custom: true,
    execute: async () => {
      return { custom: 'wifi_inspector' }
    }
  },
  { id: 'iris_optics', name: 'IRIS Optics Vision', icon: 'center_focus_strong', desc: 'AI camera & screenshot vision analysis', color: 'rgba(0,242,255,0.15)', borderColor: 'rgba(0,242,255,0.3)', accent: '#00f2ff',
    inputs: [],
    custom: true,
    execute: async () => {
      return { custom: 'iris_optics' }
    }
  },
  { id: 'unlock_iris', name: 'Unlock IRIS', icon: 'lock_open', desc: 'Voice command reference (vault-locked)', color: 'rgba(0,229,255,0.15)', borderColor: 'rgba(0,229,255,0.3)', accent: '#00e5ff',
    inputs: [],
    custom: true,
    locked: true,
    execute: async () => {
      return { custom: 'command_reference' }
    }
  },
]
