import SettingsSection from './SettingsSection'
import { SettingSlider } from './SettingControls'

export default function LayoutConfigSection({ expandedSections, toggleSection, dpiScale, setDpiScale, gridColumns, setGridColumns, gridRows, setGridRows, layoutStyle, setLayoutStyle, homeIconSize, setHomeIconSize, drawerIconSize, setDrawerIconSize, drawerTextSize, setDrawerTextSize, homeTextSize, setHomeTextSize, drawerLayout, setDrawerLayout }) {
  return (
    <SettingsSection title="INTERFACE LAYOUT & CUSTOM GRID CONFIG" icon="grid_goldenratio" sectionKey="layoutConfig" expandedSections={expandedSections} toggleSection={toggleSection}>
      <SettingSlider label="Global DPI Scale (Zoom)" value={dpiScale} onChange={setDpiScale} min="70" max="130" unit="%" description="SCALES ALL LAYOUTS, FONTS, AND MARGINS NATIVELY" />
      <SettingSlider label="Custom Grid Columns" value={gridColumns} onChange={setGridColumns} min="3" max="8" unit=" Columns" />
      <SettingSlider label="Custom Grid Rows" value={gridRows} onChange={setGridRows} min="3" max="8" unit=" Rows" />

      <div className="space-y-2">
        <label className="text-[9px] text-on-surface-variant block">HOME_CORE_PLACEMENT</label>
        <div className="grid grid-cols-3 gap-2">
          {[{ id: 'CENTERED', label: 'Center Focus' }, { id: 'CORE_BOTTOM', label: 'Core Bottom' }].map(style => (
            <button key={style.id} onClick={() => setLayoutStyle(style.id)} className={`py-1.5 px-1 rounded border text-[9px] truncate transition-all active:scale-95 ${layoutStyle === style.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <SettingSlider label="Home Icon Scale" value={homeIconSize} onChange={setHomeIconSize} min="80" max="120" unit="%" />
      <SettingSlider label="Drawer Icon Scale" value={drawerIconSize} onChange={setDrawerIconSize} min="60" max="200" unit="%" />
      <SettingSlider label="Drawer Text Scale" value={drawerTextSize} onChange={setDrawerTextSize} min="60" max="200" unit="%" />
      <SettingSlider label="Home Text Scale" value={homeTextSize} onChange={setHomeTextSize} min="80" max="120" unit="%" />

      <div className="space-y-2">
        <label className="text-[9px] text-on-surface-variant block">DRAWER_LAYOUT_MODE</label>
        <div className="grid grid-cols-4 gap-2">
          {[{ id: 'GRID', label: 'Grid', icon: 'grid_view' }, { id: 'RING', label: 'Ring', icon: 'public' }, { id: 'LIST', label: 'List', icon: 'view_list' }, { id: 'CATEGORIES', label: 'Folders', icon: 'folder_open' }].map(layout => (
            <button key={layout.id} onClick={() => setDrawerLayout(layout.id)} className={`py-1.5 px-1 rounded border text-[9px] truncate transition-all active:scale-95 ${drawerLayout === layout.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              <span className="material-symbols-outlined text-[11px] block mb-0.5">{layout.icon}</span>
              {layout.label}
            </button>
          ))}
        </div>
      </div>
    </SettingsSection>
  )
}
