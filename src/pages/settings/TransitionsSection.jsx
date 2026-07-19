import SettingsSection from './SettingsSection'
import { SettingSlider } from './SettingControls'

export default function TransitionsSection({ expandedSections, toggleSection, globalIconTheme, setGlobalIconTheme, pageTransitionEffect, setPageTransitionEffect, pageTransitionEasing, setPageTransitionEasing, pageTransitionSpeed, setPageTransitionSpeed }) {
  return (
    <SettingsSection title="GLOBAL SKIN & SCREEN TRANSITIONS" icon="animation" sectionKey="transitions" expandedSections={expandedSections} toggleSection={toggleSection}>
      <div className="space-y-2">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">CHOOSE GLOBAL ICON STYLE PACK</p>
        <div className="grid grid-cols-2 gap-2">
          {[{ id: 'DEFAULT', label: 'Cyberpunk Glow', desc: 'Glassy theme accent glow' }, { id: 'SOLID', label: 'Acid Solid', desc: 'Flat high-contrast fills' }, { id: 'GLYPH_ONLY', label: 'Minimal Outline', desc: 'Icons with no backs/borders' }, { id: 'RETRO', label: 'Retro Terminal', desc: 'Monochrome phosphor green' }, { id: 'CLASSIC', label: 'Glassmorphic Circle', desc: 'Circular blurred backdrops' }].map(pack => (
            <button key={pack.id} onClick={() => setGlobalIconTheme(pack.id)} className={`p-2.5 rounded border text-left transition-all active:scale-95 flex flex-col justify-between h-16 ${pack.id === 'CLASSIC' ? 'col-span-2' : ''} ${globalIconTheme === pack.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim shadow-[0_0_8px_rgba(var(--primary-rgb),0.15)]' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              <span className="font-bold text-[8.5px] truncate">{pack.label}</span>
              <span className="text-[6.5px] text-on-surface-variant/45 truncate uppercase">{pack.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 pt-2.5 border-t border-white/5">
        <p className="text-[7.5px] text-on-surface-variant/40 uppercase">SELECT SCREEN SWITCH EFFECT</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[{ id: 'SLIDE_UP', label: 'Slide Up' }, { id: 'SLIDE_HORIZONTAL', label: 'Horizontal' }, { id: 'FADE', label: 'Fade In' }, { id: 'ZOOM', label: 'Scale Zoom' }, { id: 'FLIP', label: '3D Flip' }, { id: 'NONE', label: 'None (Crisp)' }].map(effect => (
            <button key={effect.id} onClick={() => setPageTransitionEffect(effect.id)} className={`py-1.5 px-1 rounded border text-[8.5px] truncate transition-all active:scale-95 ${pageTransitionEffect === effect.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
              {effect.label}
            </button>
          ))}
        </div>
      </div>

      {pageTransitionEffect !== 'NONE' && (
        <>
          <div className="space-y-2 pt-1 border-t border-transparent">
            <p className="text-[7.5px] text-on-surface-variant/40 uppercase">CHOOSE EFFECT EASING SPEED-CURVE</p>
            <div className="grid grid-cols-3 gap-2">
              {[{ id: 'SMOOTH', label: 'Smooth (Ease-Out)', desc: 'decelerating bezier' }, { id: 'CRISP', label: 'Crisp (Linear)', desc: 'constant acceleration' }, { id: 'SPRING', label: 'Spring (Elastic)', desc: 'dynamic bouncy spring' }].map(curve => (
                <button key={curve.id} onClick={() => setPageTransitionEasing(curve.id)} className={`p-2 rounded border text-left transition-all active:scale-95 flex flex-col justify-between h-14 ${pageTransitionEasing === curve.id ? 'bg-primary-fixed-dim/15 border-primary-fixed-dim text-primary-fixed-dim' : 'bg-black/20 border-outline-variant/30 text-on-surface-variant/70 hover:text-white'}`}>
                  <span className="font-bold text-[8.5px] truncate">{curve.label}</span>
                  <span className="text-[6px] text-on-surface-variant/45 truncate uppercase">{curve.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <SettingSlider label="Transition Speed (Duration)" value={pageTransitionSpeed} onChange={setPageTransitionSpeed} min="100" max="800" step="50" unit="ms" description="CONTROLS THE TOTAL ANIMATION SWEEP TIME IN MILLISECONDS" />
        </>
      )}
    </SettingsSection>
  )
}
