import { useState, useEffect, useCallback, useRef } from 'react'
import { Device } from '@capacitor/device'
import { getSystemStats } from '../components/LauncherPlugin'
import PowerSaveManager from '../utils/PowerSaveManager'
import HapticFeedback from '../utils/HapticFeedback'

export default function useWidgetMetrics({ isAppActive, activePage, powerSaveMode }) {
  const [batteryLevel, setBatteryLevel] = useState(100)
  const [isCharging, setIsCharging] = useState(false)
  const [totalMem, setTotalMem] = useState('8.0')
  const [usedMem, setUsedMem] = useState('3.2')
  const [cpuTemp, setCpuTemp] = useState(35.0)
  const [osVersion, setOsVersion] = useState('IRIS_OS')
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false)
  const timerRef = useRef(null)

  const fetchDeviceMetrics = useCallback(async () => {
    try {
      const info = await Device.getInfo()
      try {
        const stats = await getSystemStats()
        if (stats?.memTotal) {
          setUsedMem((stats.memUsed / 1024 / 1024 / 1024).toFixed(1))
          setTotalMem((stats.memTotal / 1024 / 1024 / 1024).toFixed(1))
        }
        if (stats?.cpuTemp) setCpuTemp(stats.cpuTemp)
      } catch {
        if (info.memUsed) setUsedMem((info.memUsed / (1024 * 1024 * 1024)).toFixed(1))
        if (info.realDiskFree && info.realDiskTotal) {
          setTotalMem((info.realDiskTotal / (1024 * 1024 * 1024)).toFixed(1))
        } else {
          setTotalMem(info.memUsed ? (info.memUsed / (1024 * 1024 * 1024) + 2).toFixed(1) : '8.0')
        }
      }
      if (info.operatingSystem) {
        setOsVersion(`${info.operatingSystem.toUpperCase()} ${info.osVersion || ''}`.trim())
      }
      const battery = await Device.getBatteryInfo()
      if (battery.batteryLevel !== undefined) setBatteryLevel(Math.round(battery.batteryLevel * 100))
      if (battery.isCharging !== undefined) setIsCharging(battery.isCharging)
    } catch {}
  }, [])

  useEffect(() => {
    let interval
    if (isAppActive && activePage === 'widgets') {
      fetchDeviceMetrics()
      const pollMs = PowerSaveManager.getPollingInterval('widgetMetricsPollMs') || 5000
      interval = setInterval(fetchDeviceMetrics, pollMs)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isAppActive, activePage, powerSaveMode, fetchDeviceMetrics])

  const handleCpuClick = useCallback(async () => {
    if (isDiagnosticRunning) return
    HapticFeedback.light()
    setIsDiagnosticRunning(true)
    try {
      const { optimizeMemory } = await import('../components/LauncherPlugin')
      if (optimizeMemory) await optimizeMemory()
    } catch {}
    await fetchDeviceMetrics()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setIsDiagnosticRunning(false)
      HapticFeedback.double()
    }, 1200)
  }, [isDiagnosticRunning, fetchDeviceMetrics])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return {
    batteryLevel,
    isCharging,
    totalMem,
    usedMem,
    cpuTemp,
    osVersion,
    isDiagnosticRunning,
    handleCpuClick,
  }
}
