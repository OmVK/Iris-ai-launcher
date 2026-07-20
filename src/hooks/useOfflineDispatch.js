import { useRef } from 'react'
import { registerPlugin } from '@capacitor/core'
import { launchApp } from '../components/LauncherPlugin'

const LauncherPlugin = registerPlugin('LauncherPlugin')

const levCache = new Map()
const levenshtein = (a, b) => {
  const key = `${a}|${b}`
  if (levCache.has(key)) return levCache.get(key)
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  const result = dp[m][n]
  if (levCache.size > 200) levCache.clear()
  levCache.set(key, result)
  return result
}

export default function useOfflineDispatch({ appsListRef, pendingSuggestionsRef }) {
  const loadingAppsRef = useRef(false)
  const dispatchCommand = async (command) => {
    const { action, params } = command
    try {
      switch (action) {
        case 'open': {
          if (!params.app) break
          const lowerApp = params.app.toLowerCase().replace(/[.,!?\s']/g, '')
          let apps = appsListRef.current || []

          if (apps.length === 0 && !loadingAppsRef.current) {
            try {
              loadingAppsRef.current = true
              const res = await LauncherPlugin.getInstalledApps()
              apps = res?.apps || []
              appsListRef.current = apps
            } catch (e) { console.warn('[IRIS] Failed to get installed apps for open:', e) }
            finally { loadingAppsRef.current = false }
          }

          let match = apps.find(a =>
            a.label && a.label.toLowerCase().replace(/[\s']/g, '') === lowerApp
          )

          if (!match) {
            match = apps.find(a =>
              (a.label && a.label.toLowerCase().replace(/[\s']/g, '').includes(lowerApp)) ||
              (a.packageId && a.packageId.toLowerCase().replace(/[\s']/g, '').includes(lowerApp))
            )
          }

          if (!match && lowerApp.length >= 2) {
            const scored = apps
              .filter(a => a.label)
              .map(a => {
                const lbl = a.label.toLowerCase().replace(/[\s']/g, '')
                let overlap = 0
                for (const ch of lowerApp) {
                  if (lbl.includes(ch)) overlap++
                }
                const overlapScore = overlap / Math.max(lowerApp.length, lbl.length)
                const dist = levenshtein(lowerApp, lbl)
                const levScore = 1 - dist / Math.max(lowerApp.length, lbl.length)
                const score = overlapScore * 0.3 + levScore * 0.7
                return { app: a, score }
              })
              .filter(x => x.score >= 0.45)
              .sort((a, b) => b.score - a.score)

            if (scored.length > 0) {
              const suggestions = scored.slice(0, 3).map(x => x.app)
              pendingSuggestionsRef.current = suggestions
              const list = suggestions.map((s, i) => `${i + 1}. ${s.label}`).join(', ')
              return {
                response: `I couldn't find "${params.app}". Did you mean: ${list}? Say a number.`,
                requireMoreContext: 'WAITING_FOR_APP_SELECTION',
                keepListening: true
              }
            }
          }

          let launched = false
          if (match) {
            launched = await launchApp(match.packageId, match.label)
          } else {
            launched = await launchApp(params.app)
          }

          if (launched) {
            return { close: true }
          } else {
            return { error: `I couldn't find or open an app called "${params.app}".` }
          }
        }
        case 'close_overlay': {
          return { close: true }
        }
        case 'uninstall':
        case 'app_info': {
          if (!params.app) break
          const lowerApp = params.app.toLowerCase().replace(/[.,!?]/g, '')
          let apps = appsListRef.current || []

          if (apps.length === 0 && !loadingAppsRef.current) {
            try {
              loadingAppsRef.current = true
              const res = await LauncherPlugin.getInstalledApps()
              apps = res?.apps || []
              appsListRef.current = apps
            } catch (e) { console.warn('[IRIS] Failed to get installed apps for uninstall/info:', e) }
            finally { loadingAppsRef.current = false }
          }

          const match = apps.find(a =>
            (a.label && a.label.toLowerCase().includes(lowerApp)) ||
            (a.packageId && a.packageId.toLowerCase().includes(lowerApp))
          )

          let pkg = match ? match.packageId : params.app
          if (action === 'uninstall') {
            try { await LauncherPlugin.uninstallApp({ packageId: pkg }) } catch (_) {}
          } else {
            try { await LauncherPlugin.openAppInfo({ packageId: pkg }) } catch (_) {}
          }
          return { close: true }
        }
        case 'call': {
          let number = params.name
          let contactName = params.name
          try {
            try {
              const { checkAndRequestPermission } = await import('../components/LauncherPlugin')
              await checkAndRequestPermission('READ_CONTACTS')
            } catch (_) {}
            const contact = await LauncherPlugin.lookupContact({ name: params.name })
            if (contact?.number) {
              number = contact.number
              contactName = contact.name || params.name
            }
          } catch (_) {
            try {
              const multiResult = await LauncherPlugin.lookupContactMultiple({ name: params.name })
              if (multiResult?.count > 0) {
                const contacts = JSON.parse(multiResult.contacts)
                pendingSuggestionsRef.current = contacts.map(c => ({ label: c.name, number: c.number }))
                const list = contacts.map((c, i) => `${i + 1}. ${c.name}`).join(', ')
                return {
                  response: `I couldn't find an exact match. Did you mean: ${list}? Say a number.`,
                  requireMoreContext: 'WAITING_FOR_CONTACT_SELECTION',
                  keepListening: true
                }
              }
            } catch (_) {}
            const isNumber = /^[\d\s+\-()]+$/.test(params.name)
            if (!isNumber) {
              return { error: `I couldn't find a contact named "${params.name}".` }
            }
          }
          try {
            await LauncherPlugin.makeCall({ number, speaker: params.speaker })
          } catch (e) {
            try {
              await LauncherPlugin.dialNumber({ number })
            } catch (e2) {
              return { error: `I couldn't call ${params.name}. You may need to grant phone permission.` }
            }
          }
          return { close: true }
        }
        case 'timer': {
          const parsed = parseInt(params.duration)
          if (!parsed || parsed === 0) {
            return { error: "Please specify a duration for the timer." }
          }
          let secs = parsed
          if (params.unit?.startsWith('minute')) secs *= 60
          else if (params.unit?.startsWith('hour')) secs *= 3600
          await LauncherPlugin.setTimer({ seconds: secs })
          break
        }
        case 'alarm': {
          const t = (params.time || '').toLowerCase().trim()
          let h = -1, min = 0
          const m1 = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/)
          if (m1) {
            h = parseInt(m1[1])
            min = m1[2] ? parseInt(m1[2]) : 0
            if (m1[3] === 'pm' && h < 12) h += 12
            if (m1[3] === 'am' && h === 12) h = 0
          }
          if (h === -1) {
            const m2 = t.match(/(\d{1,2}):(\d{2})/)
            if (m2) {
              h = parseInt(m2[1])
              min = parseInt(m2[2])
            }
          }
          if (h === -1) {
            const m3 = t.match(/(\d{1,2})\s*(?:o'?clock|oclock)/i)
            if (m3) {
              h = parseInt(m3[1])
            }
          }
          if (h === -1) {
            const m4 = t.match(/^(\d{1,2})$/)
            if (m4) {
              h = parseInt(m4[1])
            }
          }
          if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
            await LauncherPlugin.setAlarm({ hour: h, minutes: min })
          } else {
            return { error: `I couldn't understand the time "${params.time}". Try saying something like "4 pm" or "7:30 am".` }
          }
          break
        }
        default:
          break
      }
    } catch (e) {
      console.error('[Iris] dispatch error:', action, e)
    }
  }

  return { dispatchCommand }
}
