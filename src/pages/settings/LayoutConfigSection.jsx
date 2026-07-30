import SettingsSection from './SettingsSection'
import { SettingSlider } from './SettingControls'
import { useThemeStore } from '../../stores/themeStore'

export default function LayoutConfigSection({ expandedSections, toggleSection, dpiScale, setDpiScale, gridColumns, setGridColumns, gridRows, setGridRows, layoutStyle, setLayoutStyle, homeIconSize, setHomeIconSize, drawerIconSize, setDrawerIconSize, drawerTextSize, setDrawerTextSize, homeTextSize, setHomeTextSize, drawerLayout, setDrawerLayout, iconShape, setIconShape, dockColumns, setDockColumns, dockBackground, setDockBackground, homePages, setHomePages }) {
  const { islandProfile, setIslandProfile, islandWidthScale, setIslandWidthScale, islandHeightScale, setIslandHeightScale, islandTopMargin, setIslandTopMargin } = useThemeStore()

  return (
    <SettingsSection title="INTERFACE LAYOUT & CUSTOM GRID CONFIG" icon="grid_goldenratio" sectionKey="layoutConfig" expandedSections={expandedSections} toggleSection={toggleSection}>
      <SettingSlider label="Global DPI Scale (Zoom)" value={dpiScale} onChange={setDpiScale} min="70" max="130" unit="%" description="SCALES ALL LAYOUTS, FONTS, AND MARGINS NATIVELY" />
      <SettingSlider label="Custom Grid Columns" value={gridColumns} onChange={setGridColumns} min="4" max="10" unit=" Columns" />
      <SettingSlider label="Custom Grid Rows" value={gridRows} onChange={setGridRows} min="4" max="10" unit=" Rows" />
      <SettingSlider label="Home Screen Pages" value={Array.isArray(homePages) ? homePages.length : (typeof homePages === 'number' ? homePages : 1)} onChange={setHomePages} min="1" max="5" unit=" Pages" />

      {/* Dynamic Island Camera Cutout Alignment */}
      <div className="space-y-3 p-3 rounded-lg border border-primary-fixed-dim/20 bg-black/20">
        <label className="text-[10px] font-bold text-primary-fixed-dim block tracking-wider uppercase">DYNAMIC ISLAND CAMERA CUTOUT TUNER</label>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: 'AUTO', label: 'Auto Detect' },
            { id: 'PIXEL', label: 'Pixel Cutout' },
            { id: 'GALAXY', label: 'Galaxy Cutout' },
            { id: 'PILL', label: 'Wide Pill' },
            { id: 'NOTCH', label: 'Teardrop' },
            { id: 'CUSTOM', label: 'Custom Manual' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setIslandProfile(p.id)}
              className={`py-1.5 px-1 rounded border text-[9px] truncate transition-all active:scale-95 ${
                islandProfile === p.id 
                  ? 'bg-primary-fixed-dim/20 border-primary-fixed-dim text-primary-fixed-dim font-bold' 
                  : 'bg-black/30 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <SettingSlider label="Island Width Scale" value={islandWidthScale} onChange={setIslandWidthScale} min="80" max="140" unit="%" />
        <SettingSlider label="Island Height Scale" value={islandHeightScale} onChange={setIslandHeightScale} min="80" max="140" unit="%" />
        <SettingSlider label="Top Offset Margin" value={islandTopMargin} onChange={setIslandTopMargin} min="0" max="24" unit="px" />
      </div>

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
        <label className="text-[9px] text-on-surface-variant block">ICON SHAPE MASK</label>
        <div className="grid grid-cols-5 gap-2">
          {[{ id: 'system', label: 'System' }, { id: 'circle', label: 'Circle' }, { id: 'squircle', label: 'Squircle' }, { id: 'rounded_rect', label: 'Rounded' }, { id: 'teardrop', label: 'Teardrop' }].map(shape => (
            <button key={shape.id} onClick={() => setIconShape(shape.id)} className={`py-1.5 px-1 rounded border text-[8px] truncate transition-all active:scale-95 ${iconShape === shape.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              {shape.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[9px] text-on-surface-variant block">DOCK BACKGROUND STYLE</label>
        <div className="grid grid-cols-4 gap-2">
          {[{ id: 'none', label: 'None' }, { id: 'blur', label: 'Blur' }, { id: 'solid', label: 'Solid' }, { id: 'gradient', label: 'Gradient' }].map(style => (
            <button key={style.id} onClick={() => setDockBackground(style.id)} className={`py-1.5 px-1 rounded border text-[9px] truncate transition-all active:scale-95 ${dockBackground === style.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              {style.label}
            </button>
          ))}
        </div>
      </div>

      <SettingSlider label="Dock Icon Columns" value={dockColumns} onChange={setDockColumns} min="3" max="5" unit=" Icons" />

      <div className="space-y-2">
        <label className="text-[9px] text-on-surface-variant block">DRAWER_LAYOUT_MODE</label>
        <div className="grid grid-cols-4 gap-2">
          {[{ id: 'GRID', label: 'Grid', icon: 'grid_view' }, { id: 'MESH', label: 'Mesh', icon: 'hub' }, { id: 'LIST', label: 'List', icon: 'view_list' }, { id: 'CATEGORIES', label: 'Folders', icon: 'folder_open' }].map(layout => (
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
