import React, { useState, useEffect, useCallback } from 'react'
import { OEM_INSTRUCTIONS } from '../data/oemData'
import PermissionsStep from './PermissionsStep'
import SetupWelcomeStep from './setup/SetupWelcomeStep'
import SetupOemStep from './setup/SetupOemStep'
import SetupNodeStep from './setup/SetupNodeStep'
import SetupVaultStep from './setup/SetupVaultStep'
import SetupReadyStep from './setup/SetupReadyStep'

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [city, setCity] = useState('Neo Tokyo')
  const [oemInfo, setOemInfo] = useState({ manufacturer: 'unknown', model: 'unknown', sdkVersion: 0 })
  const [oemBatteryDone, setOemBatteryDone] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [permissionsGranted, setPermissionsGranted] = useState({
    defaultLauncher: false,
    location: false,
    mic: false,
    camera: false,
    storage: false,
    notifications: false,
  })

  useEffect(() => {
    (async () => {
      try {
        const { getDeviceOemInfo, batchCheckPermissions, isStorageAccessGranted } = await import('./LauncherPlugin')
        const info = await getDeviceOemInfo()
        setOemInfo(info)

        const storageOk = await isStorageAccessGranted()
        const checked = await batchCheckPermissions([
          'RECORD_AUDIO',
          'CAMERA',
          'ACCESS_FINE_LOCATION',
          'READ_EXTERNAL_STORAGE',
          'POST_NOTIFICATIONS',
        ])
        const permMap = { storage: storageOk }
        checked.forEach((c) => {
          if (c.permission === 'RECORD_AUDIO' && c.granted) permMap.mic = true
          if (c.permission === 'CAMERA' && c.granted) permMap.camera = true
          if (c.permission === 'ACCESS_FINE_LOCATION' && c.granted) permMap.location = true
          if (c.permission === 'READ_EXTERNAL_STORAGE' && (c.granted || storageOk)) permMap.storage = true
          if (c.permission === 'POST_NOTIFICATIONS' && c.granted) permMap.notifications = true
        })
        setPermissionsGranted((p) => ({ ...p, ...permMap }))
      } catch (e) {
        console.error('Failed to initialize device setup telemetry', e)
      }
    })()
  }, [])

  const manufacturer = (oemInfo.manufacturer || '').toLowerCase().trim()
  const oemData = OEM_INSTRUCTIONS[manufacturer]
  const needsOemStep = !!oemData

  const handleNext = useCallback(() => {
    setStep((s) => {
      const next = s + 1
      if (next === 2 && !needsOemStep) return 3
      return next
    })
  }, [needsOemStep])

  const handleDetectLocation = useCallback(async () => {
    setDetectingLocation(true)
    try {
      const { Geolocation } = await import('@capacitor/geolocation')
      const pos = await Geolocation.getCurrentPosition({ timeout: 8000, enableHighAccuracy: false })
      const lat = pos.coords.latitude
      const lon = pos.coords.longitude
      localStorage.setItem('iris_weather_lat', lat)
      localStorage.setItem('iris_weather_lon', lon)

      const res = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
      )
      const data = await res.json()
      const detected = data.city || data.locality || data.principalSubdivision
      if (detected) setCity(detected)
      setPermissionsGranted((p) => ({ ...p, location: true }))
    } catch (e) {
      console.warn('Manual GPS detect error:', e)
    } finally {
      setDetectingLocation(false)
    }
  }, [])

  const requestPermission = useCallback(
    async (type) => {
      if (type === 'mic') {
        try {
          const { checkAndRequestPermission } = await import('./LauncherPlugin')
          const res = await checkAndRequestPermission('RECORD_AUDIO')
          if (res?.granted) {
            setPermissionsGranted((p) => ({ ...p, mic: true }))
            return
          }
        } catch {}
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach((t) => t.stop())
          setPermissionsGranted((p) => ({ ...p, mic: true }))
        } catch {
          setPermissionsGranted((p) => ({ ...p, mic: false }))
        }
      } else if (type === 'camera') {
        try {
          const { checkAndRequestPermission } = await import('./LauncherPlugin')
          const res = await checkAndRequestPermission('CAMERA')
          if (res?.granted) {
            setPermissionsGranted((p) => ({ ...p, camera: true }))
            return
          }
        } catch {}
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach((t) => t.stop())
          setPermissionsGranted((p) => ({ ...p, camera: true }))
        } catch {
          setPermissionsGranted((p) => ({ ...p, camera: false }))
        }
      } else if (type === 'storage') {
        try {
          const { checkAndRequestPermission, requestStorageAccess, isStorageAccessGranted } = await import(
            './LauncherPlugin'
          )
          await checkAndRequestPermission('READ_MEDIA_IMAGES')
          await requestStorageAccess()
          const granted = await isStorageAccessGranted()
          setPermissionsGranted((p) => ({ ...p, storage: granted }))
        } catch (e) {
          console.error('Storage request error:', e)
        }
      } else if (type === 'location') {
        try {
          const { Geolocation } = await import('@capacitor/geolocation')
          const perm = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] })
          const isGranted = perm?.location === 'granted' || perm?.coarseLocation === 'granted'
          if (isGranted) {
            setPermissionsGranted((p) => ({ ...p, location: true }))
            handleDetectLocation()
          } else {
            setPermissionsGranted((p) => ({ ...p, location: false }))
          }
        } catch (err) {
          console.error('Location request failed:', err)
          setPermissionsGranted((p) => ({ ...p, location: false }))
        }
      } else if (type === 'defaultLauncher') {
        try {
          const { requestDefaultLauncher } = await import('./LauncherPlugin')
          await requestDefaultLauncher()
        } catch {}
        setTimeout(() => setPermissionsGranted((p) => ({ ...p, defaultLauncher: true })), 1500)
      } else if (type === 'notifications') {
        try {
          const { checkAndRequestPermission } = await import('./LauncherPlugin')
          await checkAndRequestPermission('POST_NOTIFICATIONS')
        } catch {}
        setPermissionsGranted((p) => ({ ...p, notifications: true }))
      }
    },
    [handleDetectLocation]
  )

  const handleGrantAll = useCallback(async () => {
    const sequence = ['defaultLauncher', 'location', 'mic', 'camera', 'storage', 'notifications']
    for (const key of sequence) {
      if (!permissionsGranted[key]) {
        await requestPermission(key)
      }
    }
  }, [permissionsGranted, requestPermission])

  const handleBatteryOptimization = useCallback(async () => {
    try {
      const { requestIgnoreBatteryOptimizations } = await import('./LauncherPlugin')
      await requestIgnoreBatteryOptimizations()
    } catch {}
  }, [])

  const handleOpenOemSettings = useCallback(async () => {
    try {
      const { openOemBatterySettings } = await import('./LauncherPlugin')
      await openOemBatterySettings(oemInfo.manufacturer)
      setOemBatteryDone(true)
    } catch {
      setOemBatteryDone(true)
    }
  }, [oemInfo.manufacturer])

  const finalizeSetup = useCallback(
    (options = {}) => {
      localStorage.setItem('iris_weather_city', city)
      localStorage.setItem('iris_setup_complete', 'true')
      localStorage.setItem('iris_oem_battery_prompted', 'true')
      onComplete(options)
    },
    [city, onComplete]
  )

  const permissionRows = [
    { id: 'defaultLauncher', icon: 'home', label: 'Default Home OS', desc: 'Set IRIS as primary system launcher' },
    { id: 'location', icon: 'my_location', label: 'GPS Telemetry', desc: 'Orbital weather synchronization' },
    { id: 'mic', icon: 'mic', label: 'Audio Input', desc: 'Voice assistant & hands-free engine' },
    { id: 'camera', icon: 'videocam', label: 'Optical Sensor', desc: 'Vision scanner & Vault intrusion alerts' },
    { id: 'storage', icon: 'folder_open', label: 'Storage Access', desc: 'Secure files & custom wallpapers' },
  ]
  if (oemInfo.sdkVersion >= 33) {
    permissionRows.push({
      id: 'notifications',
      icon: 'notifications',
      label: 'Notifications',
      desc: 'Task reminders & launcher badges',
    })
  }

  const stepLabels = ['BOOT', 'AUTH', 'OEM', 'NODE', 'VAULT', 'READY']

  return (
    <div className="fixed inset-0 z-[9999] bg-[#03060a] text-white flex flex-col justify-center items-center overflow-hidden font-mono-data select-none px-4">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [transform:perspective(500px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-60" />

      <div className="relative z-10 max-w-sm w-full p-5 glass-surface border border-primary-fixed-dim/30 rounded-2xl shadow-[0_0_60px_rgba(var(--primary-rgb),0.15)] backdrop-blur-xl">
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10 text-[9px] text-primary-fixed-dim font-bold tracking-widest">
          <span>PROTOCOL // 0{step + 1}</span>
          <div className="flex gap-1.5 items-center">
            {stepLabels.map((lbl, idx) => {
              if (idx === 2 && !needsOemStep) return null
              const isCurrent = step === idx
              const isPast = step > idx
              return (
                <div
                  key={lbl}
                  className={`h-1.5 rounded-full transition-all ${
                    isCurrent
                      ? 'w-4 bg-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.6)]'
                      : isPast
                      ? 'w-1.5 bg-success'
                      : 'w-1.5 bg-white/20'
                  }`}
                  title={lbl}
                />
              )
            })}
          </div>
          <span>INIT</span>
        </div>

        {step === 0 && <SetupWelcomeStep oemInfo={oemInfo} onNext={handleNext} />}

        {step === 1 && (
          <PermissionsStep
            permissionsGranted={permissionsGranted}
            permissionRows={permissionRows}
            requestPermission={requestPermission}
            onGrantAll={handleGrantAll}
            onNext={handleNext}
            onBatteryOptimization={handleBatteryOptimization}
          />
        )}

        {step === 2 && needsOemStep && (
          <SetupOemStep
            oemData={oemData}
            oemBatteryDone={oemBatteryDone}
            onOpenOemSettings={handleOpenOemSettings}
            onBatteryOptimization={handleBatteryOptimization}
            onNext={handleNext}
          />
        )}

        {step === 3 && (
          <SetupNodeStep
            city={city}
            setCity={setCity}
            locationGranted={permissionsGranted.location}
            onDetectLocation={handleDetectLocation}
            detectingLocation={detectingLocation}
            onNext={handleNext}
          />
        )}

        {step === 4 && <SetupVaultStep onNext={handleNext} />}

        {step === 5 && <SetupReadyStep city={city} onComplete={finalizeSetup} />}
      </div>
    </div>
  )
}
