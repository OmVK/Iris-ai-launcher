import React, { useState, useEffect } from 'react';
import { OEM_INSTRUCTIONS } from '../data/oemData';
import PermissionsStep from './PermissionsStep';

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [city, setCity] = useState('Neo Tokyo');
  const [oemInfo, setOemInfo] = useState({ manufacturer: 'unknown', model: 'unknown', sdkVersion: 0 });
  const [oemBatteryDone, setOemBatteryDone] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState({
    mic: false,
    camera: false,
    location: false,
    storage: false,
    defaultLauncher: false,
    notifications: false
  });

  // Detect device OEM info on mount
  useEffect(() => {
    (async () => {
      try {
        const { getDeviceOemInfo } = await import('./LauncherPlugin');
        const info = await getDeviceOemInfo();
        setOemInfo(info);
      } catch (e) {
        console.error("Failed to detect OEM info", e);
      }
    })();
  }, []);

  const handleNext = () => setStep(s => s + 1);

  const manufacturer = (oemInfo.manufacturer || '').toLowerCase().trim();
  const oemData = OEM_INSTRUCTIONS[manufacturer];
  // Skip OEM step for stock Android (Google, etc.)
  const needsOemStep = !!oemData;

  // Auto-advance past OEM step for non-OEM devices
  useEffect(() => {
    if (step === 2 && !needsOemStep) {
      handleNext()
    }
  }, [step, needsOemStep])

  const requestPermission = (type) => {
    // In a real native Capacitor app, we would use native plugins here.
    // For pure HTML5 / Web, we prompt using browser standard APIs to trigger Android OS permission dialogs.
    if (type === 'mic') {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop())
          setPermissionsGranted(p => ({ ...p, mic: true }))
        })
        .catch(() => setPermissionsGranted(p => ({ ...p, mic: false })));
    } else if (type === 'camera') {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop())
          setPermissionsGranted(p => ({ ...p, camera: true }))
        })
        .catch(() => setPermissionsGranted(p => ({ ...p, camera: false })));
    } else if (type === 'storage') {
      import('./LauncherPlugin').then(m => {
        m.requestStorageAccess().then(success => {
          if (!success) throw new Error('Fallback');
          setPermissionsGranted(p => ({ ...p, storage: true }));
        }).catch(() => {
          // Fallback to Capacitor standard permission
          import('@capacitor/filesystem').then(({ Filesystem }) => {
            Filesystem.requestPermissions().then(() => {
              setPermissionsGranted(p => ({ ...p, storage: true }));
            }).catch(() => setPermissionsGranted(p => ({ ...p, storage: true })));
          }).catch(() => setPermissionsGranted(p => ({ ...p, storage: true })));
        });
      });
    } else if (type === 'location') {
      const runLocationLogic = async () => {
        try {
          const { Geolocation } = await import('@capacitor/geolocation');
          const perm = await Geolocation.requestPermissions();
          if (perm.location !== 'granted') throw new Error('Permission denied');
          
          const pos = await Geolocation.getCurrentPosition();
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          
          let detectedCity = 'Local Node';
          try {
            const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            const data = await res.json();
            detectedCity = data.city || data.locality || data.principalSubdivision || 'Local Node';
          } catch(e) {
            console.error("Reverse geocode failed", e);
          }
          
          localStorage.setItem('iris_weather_lat', lat);
          localStorage.setItem('iris_weather_lon', lon);
          
          setCity(detectedCity);
          setPermissionsGranted(p => ({ ...p, location: true }));
        } catch (e) {
          console.error("Location request failed:", e);
          setPermissionsGranted(p => ({ ...p, location: true })); // Auto-fail safe
        }
      };
      runLocationLogic();
    } else if (type === 'defaultLauncher') {
      import('./LauncherPlugin').then(m => {
        m.requestDefaultLauncher();
        // Since we can't easily wait for the native intent result in this demo, we assume success or attempt.
        setTimeout(() => setPermissionsGranted(p => ({ ...p, defaultLauncher: true })), 1500);
      });
    } else if (type === 'notifications') {
      import('./LauncherPlugin').then(m => {
        m.checkAndRequestPermission('POST_NOTIFICATIONS').then(result => {
          setPermissionsGranted(p => ({ ...p, notifications: true }));
        }).catch(() => setPermissionsGranted(p => ({ ...p, notifications: true })));
      });
    }
  };

  const handleBatteryOptimization = async () => {
    try {
      const { requestIgnoreBatteryOptimizations } = await import('./LauncherPlugin');
      await requestIgnoreBatteryOptimizations();
    } catch (e) {
      console.error("Battery optimization request failed", e);
    }
  };

  const handleOpenOemSettings = async () => {
    try {
      const { openOemBatterySettings } = await import('./LauncherPlugin');
      await openOemBatterySettings(oemInfo.manufacturer);
      setOemBatteryDone(true);
    } catch (e) {
      console.error("OEM battery settings open failed", e);
      setOemBatteryDone(true);
    }
  };

  const finalizeSetup = () => {
    localStorage.setItem('iris_weather_city', city);
    localStorage.setItem('iris_setup_complete', 'true');
    localStorage.setItem('iris_oem_battery_prompted', 'true');
    onComplete();
  };

  // Build the permission rows dynamically based on SDK version
  const permissionRows = [
    { id: 'defaultLauncher', icon: 'home', label: 'Default Home OS', desc: 'Set IRIS as system launcher' },
    { id: 'location', icon: 'my_location', label: 'GPS Telemetry', desc: 'Required for weather & radar' },
    { id: 'mic', icon: 'mic', label: 'Audio Input', desc: 'Required for voice commands' },
    { id: 'camera', icon: 'videocam', label: 'Optical Sensor', desc: 'Required for vision models' },
    { id: 'storage', icon: 'folder_open', label: 'Storage Access', desc: 'Required for file system access' },
  ];
  // Only show notification permission row for SDK 33+ (Android 13+)
  if (oemInfo.sdkVersion >= 33) {
    permissionRows.push({ id: 'notifications', icon: 'notifications', label: 'Notifications', desc: 'Required for alerts (Android 13+)' });
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070a] text-white flex flex-col justify-center items-center overflow-hidden font-mono-data select-none">
      {/* Background Cyber grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,242,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,242,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] [transform:perspective(500px)_rotateX(60deg)_translateY(-100px)_translateZ(-200px)] opacity-50" />
      
      <div className="relative z-10 max-w-sm w-full p-6 glass-surface border border-primary-fixed-dim/30 rounded-2xl shadow-[0_0_50px_rgba(var(--primary-rgb),0.1)]">
        
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-24 h-24 mx-auto rounded-full border border-primary-fixed-dim flex items-center justify-center animate-[pulse_3s_infinite] shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-primary-fixed-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-headline-lg tracking-widest text-primary-fixed-dim neon-glow">IRIS OS</h1>
            <p className="text-xs text-on-surface-variant/70 leading-relaxed uppercase">
              Neural interface initialized. Welcome to your new high-performance personal computing environment.
            </p>
            <button 
              onClick={handleNext}
              className="w-full py-3 bg-primary-fixed-dim/20 border border-primary-fixed-dim/50 text-primary-fixed-dim font-bold rounded-lg hover:bg-primary-fixed-dim/30 transition-all active:scale-95 uppercase tracking-widest mt-4"
            >
              INITIALIZE BOOT
            </button>
          </div>
        )}

        {/* Step 1: Hardware Permissions */}
        {step === 1 && (
          <PermissionsStep
            permissionsGranted={permissionsGranted}
            permissionRows={permissionRows}
            requestPermission={requestPermission}
            onNext={handleNext}
            onBatteryOptimization={handleBatteryOptimization}
          />
        )}

        {/* Step 2: OEM Battery Optimization (only for OEM devices) */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in text-center">
            {needsOemStep ? (
              <>
                <h2 className="text-lg font-bold text-[#ff9800] uppercase tracking-widest border-b border-white/10 pb-3">
                  Background Protection
                </h2>
                <div className="w-16 h-16 mx-auto bg-[#ff9800]/10 rounded-full border border-[#ff9800]/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-[#ff9800]">battery_alert</span>
                </div>
                <div className="text-left bg-black/40 border border-[#ff9800]/20 rounded-lg p-4 space-y-3">
                  <p className="text-[10px] text-[#ff9800] uppercase font-bold tracking-widest">
                    {oemData.brand} Detected
                  </p>
                  <p className="text-[10px] text-on-surface-variant/80 leading-relaxed">
                    Your device manufacturer aggressively kills background apps to save battery. 
                    To keep Iris running smoothly for voice commands, alarms, and notifications, 
                    please whitelist Iris from battery optimization:
                  </p>
                  <div className="bg-[#ff9800]/5 border border-[#ff9800]/15 rounded-md p-3">
                    <p className="text-[10px] text-[#ff9800]/90 leading-relaxed font-bold">
                      {oemData.steps}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={handleOpenOemSettings}
                  className="w-full py-3 bg-[#ff9800]/20 border border-[#ff9800]/50 text-[#ff9800] font-bold rounded-lg hover:bg-[#ff9800]/30 transition-all active:scale-95 uppercase tracking-widest"
                >
                  <span className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">settings</span>
                    OPEN SETTINGS
                  </span>
                </button>

                {oemBatteryDone && (
                  <p className="text-[9px] text-success uppercase tracking-widest animate-fade-in">
                    ✓ Settings opened — follow the steps above then return here
                  </p>
                )}

                <button 
                  onClick={handleNext}
                  className="w-full py-2 bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 text-primary-fixed-dim/70 font-bold rounded-lg hover:bg-primary-fixed-dim/20 transition-all active:scale-95 uppercase tracking-widest text-[10px]"
                >
                  {oemBatteryDone ? 'CONTINUE' : 'SKIP FOR NOW'}
                </button>
              </>
            ) : (
              // Stock Android (Google/Pixel) — skip the OEM card, auto-advance
              null
            )}
          </div>
        )}

        {/* Step 3: Location Setup */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in text-center">
            <h2 className="text-lg font-bold text-primary-fixed-dim uppercase tracking-widest border-b border-white/10 pb-3">
              Meteorological Link
            </h2>
            <div className="w-16 h-16 mx-auto bg-primary-fixed-dim/10 rounded-full border border-primary-fixed-dim/30 flex items-center justify-center animate-pulse">
              <span className="material-symbols-outlined text-3xl text-primary-fixed-dim">satellite_alt</span>
            </div>
            <p className="text-[10px] text-on-surface-variant/70 uppercase">
              {permissionsGranted.location 
                ? "Primary node auto-detected via GPS telemetry." 
                : "Select your primary node for orbital weather synchronization."}
            </p>
            
            {permissionsGranted.location ? (
              <div className="w-full bg-success/10 border border-success/40 rounded-lg px-4 py-3 text-xs text-success font-bold uppercase tracking-widest text-center shadow-[0_0_15px_rgba(0,255,100,0.1)]">
                {city}
              </div>
            ) : (
              <input 
                type="text"
                value={city} 
                onChange={e => setCity(e.target.value)}
                placeholder="Enter City Name"
                className="w-full bg-black/60 border border-primary-fixed-dim/40 rounded-lg px-4 py-3 text-xs text-primary-fixed-dim focus:outline-none uppercase tracking-widest text-center"
              />
            )}

            <button 
              onClick={finalizeSetup}
              className="w-full py-3 bg-[#00f2ff]/20 border border-[#00f2ff]/60 text-[#00f2ff] font-bold rounded-lg hover:bg-[#00f2ff]/30 shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-all active:scale-95 uppercase tracking-widest mt-4"
            >
              FINALIZE BOOT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
