import { useState, useEffect, useRef } from 'react'
import SettingsSection from './SettingsSection'
import { getDeviceOemInfo, getSystemInfo, isNative } from '../../components/LauncherPlugin'
import { APP_VERSION } from '../../utils/constants'

export default function AboutSection({ expandedSections, toggleSection, onTriggerFeatureTour }) {
  const [deviceInfo, setDeviceInfo] = useState(null)
  const [tapCount, setTapCount] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const tapTimerRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      const oem = await getDeviceOemInfo()
      let sysInfo = null
      if (isNative) sysInfo = await getSystemInfo()
      setDeviceInfo({ ...oem, sysInfo })
    }
    load()
  }, [])

  const handleVersionTap = () => {
    setTapCount(prev => {
      const next = prev + 1
      if (next >= 7) {
        setTapCount(0)
        if (onTriggerFeatureTour) onTriggerFeatureTour()
        return 0
      }
      if (next === 3) {
        setShowHint(true)
        setTimeout(() => setShowHint(false), 2000)
      }
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = setTimeout(() => setTapCount(0), 1500)
      return next
    })
  }

  return (
    <SettingsSection title="ABOUT IRIS LAUNCHER" icon="info" sectionKey="about" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-3 font-mono-data text-xs">
        <div className="flex flex-col gap-2">
          <Row label="App" value="Stitch IRIS AI Launcher" />
          <div className="flex items-center justify-between gap-2 cursor-pointer select-none" onClick={handleVersionTap}>
            <span className="text-on-surface-variant/40 text-[9px] uppercase shrink-0">Version</span>
            <span className="text-on-surface-variant text-right text-[10px] break-all hover:text-cyan-400 transition-colors">v{APP_VERSION}</span>
          </div>
          {showHint && (
            <p className="font-mono-data text-[8px] text-cyan-400/50 text-center animate-pulse">Keep tapping...</p>
          )}
          <Row label="Platform" value={isNative ? `Android ${deviceInfo?.sdkVersion || '—'}` : 'Web Browser'} />
          {deviceInfo && (
            <>
              <Row label="Device" value={`${deviceInfo.manufacturer || '—'} ${deviceInfo.model || '—'}`} />
              {deviceInfo.sysInfo?.screenResolution && <Row label="Screen" value={deviceInfo.sysInfo.screenResolution} />}
              {deviceInfo.sysInfo?.totalStorage && <Row label="Storage" value={deviceInfo.sysInfo.totalStorage} />}
            </>
          )}
          {!isNative && (
            <Row label="User Agent" value={navigator.userAgent.substring(0, 60) + '...'} />
          )}
        </div>

        <div className="border-t border-white/5 pt-3">
          <p className="text-[9px] text-on-surface-variant/40 uppercase leading-relaxed border-l-2 border-primary-fixed-dim/30 pl-2">
            IRIS is an AI-powered Android launcher with offline voice assistance, cybersecurity tools, and deep system integration.
          </p>
        </div>
      </div>
    </SettingsSection>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-on-surface-variant/40 text-[9px] uppercase shrink-0">{label}</span>
      <span className="text-on-surface-variant text-right text-[10px] break-all">{value}</span>
    </div>
  )
}
