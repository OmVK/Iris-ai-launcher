export default function SettingsSection({ title, icon, sectionKey, expandedSections, toggleSection, children, badge }) {
  const isExpanded = expandedSections[sectionKey]
  return (
    <section className="bg-[#0a0e17]/80 border border-outline-variant/30 glass-border rounded-xl p-4 font-mono-data text-xs">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between font-label-caps text-xs text-on-surface-variant tracking-wider py-1 focus:outline-none"
      >
        <span className="flex items-center gap-1.5 font-semibold text-primary-fixed-dim">
          <span className="material-symbols-outlined text-sm">{icon}</span>
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badge}
          <span className="material-symbols-outlined text-sm text-primary-fixed-dim transition-transform duration-200">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>
      {isExpanded && (
        <div className="pt-4 border-t border-white/5 space-y-4">
          {children}
        </div>
      )}
    </section>
  )
}
