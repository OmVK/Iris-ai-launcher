import React, { useState, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { TOOLS } from '../tools/irisToolsData'
import ResultDisplay from '../components/ToolResultDisplay'
import { useThemeStore } from '../stores/themeStore'
import ThreatDashboard from '../components/ThreatDashboard'
import CommandReference from '../components/CommandReference'
import ChronoPinLock from '../components/ChronoPinLock'
import AppPermissionAuditor from '../components/tools/AppPermissionAuditor'
import WifiInspector from '../components/tools/WifiInspector'
import VisionAssistant from '../components/VisionAssistant'
import IrisVaultHub from '../components/tools/IrisVaultHub'
import DeviceSecurityScanner from '../components/tools/DeviceSecurityScanner'
import DnsProber from '../components/tools/DnsProber'
import QrSecretStudio from '../components/tools/QrSecretStudio'

export default function IrisTools({ onNavigate, onTriggerChronoLock, onTriggerVault }) {
  const [activeTool, setActiveTool] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [inputVals, setInputVals] = useState({})
  const [copied, setCopied] = useState(null)
  const [showVaultLock, setShowVaultLock] = useState(false)
  const [vaultUnlockedForTool, setVaultUnlockedForTool] = useState(false)
  const { setShowVpnBrowser, setVpnBrowserUrl } = useAppStore()
  const glassOpacity = useThemeStore(s => s.glassOpacity)
  const glassBg = `rgba(24, 27, 37, ${glassOpacity / 100})`

  const tool = TOOLS.find(t => t.id === activeTool)

  const handleRun = useCallback(async () => {
    if (!tool) return
    setLoading(true)
    setResult(null)
    try {
      const res = await tool.execute(inputVals)
      if (res && res.navigate) {
        if (res.navigate === 'chrono_lock' && onTriggerChronoLock) onTriggerChronoLock(res.target || 'optics')
        else if (res.navigate === 'vault' && onTriggerVault) onTriggerVault()
        else if (res.navigate === 'page' && onNavigate) onNavigate(res.target)
        setLoading(false)
        return
      }
      setResult(res)
    } catch (e) {
      setResult({ error: e.message || 'Execution failed' })
    } finally {
      setLoading(false)
    }
  }, [tool, inputVals, onNavigate, onTriggerChronoLock, onTriggerVault])

  const handleToolClick = (t) => {
    if (t.browserUrl) {
      setVpnBrowserUrl(t.browserUrl)
      setShowVpnBrowser(true)
    } else if (t.locked && !vaultUnlockedForTool) {
      setActiveTool(t.id)
      setInputVals({})
      setResult(null)
      setShowVaultLock(true)
    } else {
      setActiveTool(t.id)
      setInputVals({})
      setResult(null)
    }
  }

  const handleVaultUnlock = () => {
    setShowVaultLock(false)
    setVaultUnlockedForTool(true)
    setResult(null)
  }

  const handleBack = () => {
    setActiveTool(null)
    setResult(null)
    setInputVals({})
    setCopied(null)
  }

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const setInput = (key, val) => setInputVals(prev => ({ ...prev, [key]: val }))

  // ─── Tool Panel ──────────────────────────────────────────
  if (tool) {
    return (
      <div className="flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden">
        <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/35 via-transparent to-black/45 pointer-events-none" />

        <div className="flex-1 overflow-y-auto pt-12 px-margin pb-28 scroll-container select-none">
          <div className="max-w-xl mx-auto">
            {activeTool === 'unlock_iris' && vaultUnlockedForTool ? (
              <CommandReference glassBg={glassBg} onClose={() => { setActiveTool(null); setVaultUnlockedForTool(false) }} />
            ) : (
              <>
                <button onClick={handleBack} className="flex items-center gap-1 text-on-surface-variant/50 hover:text-on-surface-variant text-xs font-mono-data mb-4 transition-colors">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  TOOLS
                </button>

                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border backdrop-blur-[10px]"
                    style={{ borderColor: tool.borderColor, backgroundColor: glassBg }}>
                    <span className="material-symbols-outlined text-lg" style={{ color: tool.accent }}>{tool.icon}</span>
                  </div>
                  <div>
                    <h2 className="font-mono-data text-sm text-on-surface-variant tracking-wider uppercase">{tool.name}</h2>
                    <p className="font-mono-data text-[9px] text-on-surface-variant/40">{tool.desc}</p>
                  </div>
                </div>

                {tool.inputs.length > 0 && (
                  <div className="space-y-3 mb-4">
                    {tool.inputs.map(inp => (
                      <div key={inp.key} className="flex flex-col gap-1">
                        <label className="font-mono-data text-[9px] text-on-surface-variant/50 tracking-widest uppercase">{inp.label}</label>
                        {inp.type === 'textarea' ? (
                          <textarea
                            value={inputVals[inp.key] || ''}
                            onChange={e => setInput(inp.key, e.target.value)}
                            placeholder={inp.placeholder}
                            rows={3}
                            className="bg-black/40 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface-variant font-mono-data focus:outline-none focus:border-on-surface-variant/50 resize-none placeholder:text-on-surface-variant/20"
                          />
                        ) : (
                          <input
                            type={inp.type}
                            value={inputVals[inp.key] || inp.defaultVal || ''}
                            onChange={e => setInput(inp.key, e.target.value)}
                            placeholder={inp.placeholder}
                            className="bg-black/40 border border-outline-variant/30 rounded-lg px-3 py-2 text-xs text-on-surface-variant font-mono-data focus:outline-none focus:border-on-surface-variant/50 placeholder:text-on-surface-variant/20"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Custom Tool Subviews */}
                {tool.custom === 'iris_vault_hub' && (
                  <IrisVaultHub glassBg={glassBg} onNavigate={onNavigate} onTriggerChronoLock={onTriggerChronoLock} onTriggerVault={onTriggerVault} />
                )}

                {tool.custom === 'device_security' && (
                  <DeviceSecurityScanner glassBg={glassBg} />
                )}

                {tool.custom === 'dns_prober' && (
                  <DnsProber glassBg={glassBg} />
                )}

                {tool.custom === 'qr_studio' && (
                  <QrSecretStudio glassBg={glassBg} />
                )}

                {tool.custom === 'threat_dashboard' && (
                  <ThreatDashboard glassBg={glassBg} />
                )}

                {tool.custom === 'permission_auditor' && (
                  <AppPermissionAuditor glassBg={glassBg} />
                )}

                {tool.custom === 'wifi_inspector' && (
                  <WifiInspector glassBg={glassBg} />
                )}

                {tool.custom === 'iris_optics' && (
                  <VisionAssistant glassBg={glassBg} onClose={() => setActiveTool(null)} />
                )}

                {!tool.custom && (
                <button
                  onClick={handleRun}
                  disabled={loading}
                  className="w-full py-2.5 rounded-lg border font-mono-data text-xs tracking-wider uppercase transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
                  style={{
                    backgroundColor: glassBg,
                    borderColor: tool.borderColor,
                    color: tool.accent,
                  }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      SCANNING...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      RUN
                    </span>
                  )}
                </button>
                )}

                {result && (
                  <div className="mt-4 rounded-xl border border-outline-variant/15 p-4 font-mono-data text-xs" style={{ backgroundColor: glassBg }}>
                    {result.error ? (
                      <div className="flex items-start gap-2 text-red-400">
                        <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                        <span>{result.error}</span>
                      </div>
                    ) : (
                      <ResultDisplay tool={tool.id} result={result} copied={copied} copyToClipboard={copyToClipboard} />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {showVaultLock && <ChronoPinLock onUnlockSuccess={handleVaultUnlock} onClose={() => setShowVaultLock(false)} source="command_ref" />}
      </div>
    )
  }

  // ─── Grid View ───────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-[100lvh] min-h-0 overflow-hidden">
      <div className="fixed inset-0 -z-10 bg-gradient-to-b from-black/35 via-transparent to-black/45 pointer-events-none" />

      <div className="flex-1 overflow-y-auto pt-12 px-margin pb-28 scroll-container select-none">
        <div className="max-w-xl mx-auto mb-6">
          <h1 className="font-mono-data text-lg text-primary-fixed-dim tracking-widest uppercase mb-1">
            IRIS <span className="text-on-surface-variant/40">{'//'}</span> Tools
          </h1>
          <p className="font-mono-data text-[10px] text-on-surface-variant/40 tracking-wider">
            CYBERSECURITY & NETWORK UTILITIES
          </p>
        </div>

        <div className="max-w-xl mx-auto grid grid-cols-2 gap-3">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => handleToolClick(t)}
              className={`group flex flex-col items-start gap-2 p-4 rounded-xl border transition-all duration-200 active:scale-95 hover:border-outline-variant/30 text-left select-none ${t.locked && !vaultUnlockedForTool ? 'border-cyan-500/20' : ''}`}
              style={{ backgroundColor: glassBg, borderColor: t.borderColor }}
            >
              <div className="relative">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-200 group-hover:scale-110"
                  style={{ borderColor: t.borderColor, backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  <span className="material-symbols-outlined text-lg text-on-surface-variant/80 group-hover:text-white">{t.icon}</span>
                </div>
                {t.locked && !vaultUnlockedForTool && (
                  <span className="material-symbols-outlined absolute -top-1 -right-1 text-[10px] text-cyan-400/70">lock</span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-caps text-[10px] font-bold text-on-surface-variant/80 tracking-wider uppercase group-hover:text-white">{t.name}</span>
                <span className="font-mono-data text-[8px] text-on-surface-variant/35 tracking-wide leading-relaxed">{t.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
