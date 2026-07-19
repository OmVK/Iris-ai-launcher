export default function HomeClockBanner({ weather, batteryLevel }) {
  return (
    <div 
      className="relative z-20 w-full flex flex-col items-center my-6 shrink-0 select-none cursor-pointer"
      title="Time is muted. Displays real-time meteorology nodes"
    >
      <div className="flex items-center gap-2 font-mono-data text-[10px] text-primary-fixed-dim border border-primary-fixed-dim/40 bg-primary-fixed-dim/10 px-5 py-2 rounded-full shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] backdrop-blur-md">
        <span className="material-symbols-outlined text-xs">satellite_alt</span>
        <span className="tracking-widest font-bold">{weather} // PWR: {batteryLevel}%</span>
      </div>
    </div>
  )
}
