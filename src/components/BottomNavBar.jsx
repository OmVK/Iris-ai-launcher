export default function BottomNavBar({ activePage, setActivePage, showAppLabels = true }) {
  const tabs = [
    { id: 'home', label: 'Home', icon: 'home_app_logo', filled: true },
    { id: 'widgets', label: 'Widgets', icon: 'widgets', filled: false },
    { id: 'assistant', label: 'Iris AI', icon: 'smart_toy', filled: true, center: true },
    { id: 'iris_tools', label: 'IRIS', icon: 'deployed_code', filled: false },
    { id: 'settings', label: 'Settings', icon: 'settings', filled: true }
  ]

  return (
    <nav 
      className="bottom-nav-dock glass-surface fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-gutter py-4 h-20 shadow-[0_-4px_20px_-5px_rgba(var(--primary-rgb),0.3)] rounded-t-xl !border-b-0 !border-x-0 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-[150ms] translate-y-0 opacity-100 pointer-events-auto"
      style={{ backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
    >
      {tabs.map((tab) => {
        const isActive = activePage === tab.id

        if (tab.center) {
          return (
            <button
              key={tab.id}
              onClick={() => setActivePage(tab.id)}
              className={`flex items-center justify-center p-3.5 rounded-full transition-all duration-300 scale-100 active:scale-90 ${
                isActive 
                  ? 'bg-primary-fixed-dim/30 text-primary-fixed-dim shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] border border-primary-fixed-dim/40' 
                  : 'bg-surface-container-high/40 text-on-surface-variant/70 border border-outline-variant/30 hover:text-primary-fixed hover:border-primary-fixed-dim/30 hover:shadow-[0_0_12px_rgba(var(--primary-rgb),0.25)]'
              }`}
            >
              <span 
                className="material-symbols-outlined text-2xl" 
                style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
              >
                {tab.icon}
              </span>
            </button>
          )
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`flex flex-col items-center justify-center py-1 w-16 transition-all duration-200 active:scale-90 ${
              isActive 
                ? 'text-primary-fixed-dim scale-105' 
                : 'text-on-surface-variant/50 hover:text-primary-fixed/80'
            }`}
          >
            <span 
              className="material-symbols-outlined text-xl" 
              style={{ fontVariationSettings: (isActive && tab.filled) ? "'FILL' 1" : "'FILL' 0" }}
            >
              {tab.icon}
            </span>
            <span className={`font-label-caps text-[9px] mt-1 tracking-wider ${isActive ? 'text-primary-fixed-dim' : 'text-on-surface-variant/40'}`}>
              {showAppLabels ? tab.label : <div className="h-2 w-2 rounded-full bg-current opacity-30 mt-1" />}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
