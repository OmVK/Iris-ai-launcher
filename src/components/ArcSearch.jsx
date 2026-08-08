import React, { useState, useEffect, useRef, useCallback } from 'react'
import { IRIS_ICON_PACK } from '../utils/IrisIconPack'
import HudFallbackIcon from './HudFallbackIcon'
import { useSearchViewModel } from '../utils/SearchViewModel'
import { safeEvaluate } from '../utils/safeMath'

function InteractiveCalculator({ initialExpr = '', onClose }) {
  const [expr, setExpr] = useState(initialExpr)
  
  const handleBtn = (val) => setExpr(p => p + val)
  const calc = () => { 
    const result = safeEvaluate(expr)
    setExpr(Number.isFinite(result) ? String(result) : 'Error')
  }
  const copyAndClose = () => {
    if (expr && expr !== 'Error') {
      navigator.clipboard?.writeText(expr)
      onClose()
    }
  }

  return (
    <div className="glass-surface p-4 rounded-2xl border border-primary-fixed/20 shadow-lg flex flex-col animate-fade-in">
       <div className="text-right text-3xl font-mono-data mb-4 bg-black/30 p-4 rounded-xl text-primary-fixed break-words min-h-[72px] flex items-center justify-end overflow-x-auto shadow-inner border border-white/5">
         {expr || '0'}
       </div>
       <div className="grid grid-cols-4 gap-2">
         {['7','8','9','/','4','5','6','*','1','2','3','-','C','0','=','+'].map(btn => (
            <button 
              key={btn} 
              onClick={() => {
                if (btn === 'C') setExpr('')
                else if (btn === '=') calc()
                else handleBtn(btn)
              }} 
              className="bg-white/5 hover:bg-white/10 active:bg-primary-fixed/20 text-white p-4 rounded-xl font-mono-data text-2xl transition-colors active:scale-95 border border-white/5 hover:border-white/10"
            >
              {btn}
            </button>
         ))}
       </div>
       <div className="mt-4 flex gap-2">
         <button onClick={copyAndClose} className="flex-1 p-3 rounded-xl bg-primary-fixed/20 text-primary-fixed font-mono-data text-sm hover:bg-primary-fixed/30 transition-colors border border-primary-fixed/30">COPY RESULT</button>
       </div>
    </div>
  )
}

function InteractiveUnitConverter({ initialValue = '', onClose }) {
  const [val, setVal] = useState(initialValue)
  const [fromUnit, setFromUnit] = useState('m')
  const [toUnit, setToUnit] = useState('km')
  const [res, setRes] = useState('')
  
  const units = ['m', 'km', 'cm', 'mm', 'mi', 'yd', 'ft', 'in', 'kg', 'g', 'lb', 'oz', 'c', 'f', 'k']
  
  // A simple unit conversion using the tryUnitConversion logic or custom logic
  useEffect(() => {
    if (!val || isNaN(val)) {
      setRes('')
      return
    }
    // Very simplified generic conversion just for UI completeness. 
    // Usually we would pull tryUnitConversion from SearchViewModel, 
    // but building it standalone makes the UI snappy.
    const conversionRates = {
      m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254,
      kg: 1, g: 0.001, lb: 0.453592, oz: 0.0283495
    }
    
    if (conversionRates[fromUnit] && conversionRates[toUnit]) {
      const inBase = parseFloat(val) * conversionRates[fromUnit]
      const out = inBase / conversionRates[toUnit]
      setRes(out.toPrecision(6).replace(/\.0+$/, ''))
    } else if (['c', 'f', 'k'].includes(fromUnit) && ['c', 'f', 'k'].includes(toUnit)) {
      // Temp
      let c = 0
      const v = parseFloat(val)
      if (fromUnit === 'c') c = v
      else if (fromUnit === 'f') c = (v - 32) * 5/9
      else if (fromUnit === 'k') c = v - 273.15
      
      let out = c
      if (toUnit === 'f') out = c * 9/5 + 32
      else if (toUnit === 'k') out = c + 273.15
      setRes(out.toPrecision(6).replace(/\.0+$/, ''))
    } else {
      setRes('N/A')
    }
  }, [val, fromUnit, toUnit])

  const copyAndClose = () => {
    if (res && res !== 'N/A') {
      navigator.clipboard?.writeText(`${res} ${toUnit}`)
      onClose()
    }
  }

  return (
    <div className="glass-surface p-6 rounded-2xl border border-primary-fixed/20 shadow-lg flex flex-col animate-fade-in gap-4">
       <div className="flex gap-4 items-center">
         <input 
           type="number" 
           value={val} 
           onChange={e => setVal(e.target.value)} 
           placeholder="Value" 
           className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-white text-xl font-mono-data focus:border-primary-fixed/50 focus:outline-none placeholder:text-white/30"
         />
         <select value={fromUnit} onChange={e => setFromUnit(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-primary-fixed font-mono-data text-lg outline-none appearance-none min-w-[80px] text-center cursor-pointer">
           {units.map(u => <option key={u} value={u} className="bg-[#0a0e17]">{u}</option>)}
         </select>
       </div>
       
       <div className="flex justify-center text-primary-fixed/50">
         <span className="material-symbols-outlined">swap_vert</span>
       </div>
       
       <div className="flex gap-4 items-center">
         <div className="flex-1 bg-black/20 border border-white/10 rounded-xl p-4 text-primary-fixed text-2xl font-mono-data overflow-x-auto min-h-[64px] flex items-center shadow-inner">
           {res || '0'}
         </div>
         <select value={toUnit} onChange={e => setToUnit(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl p-4 text-primary-fixed font-mono-data text-lg outline-none appearance-none min-w-[80px] text-center cursor-pointer">
           {units.map(u => <option key={u} value={u} className="bg-[#0a0e17]">{u}</option>)}
         </select>
       </div>

       <div className="mt-2 flex gap-2">
         <button onClick={copyAndClose} className="flex-1 p-3 rounded-xl bg-primary-fixed/20 text-primary-fixed font-mono-data text-sm hover:bg-primary-fixed/30 transition-colors border border-primary-fixed/30">COPY RESULT</button>
       </div>
    </div>
  )
}

export default function ArcSearch({ isOpen, onClose, installedApps, launchApp, activePage, setActivePage, globalIconTheme }) {
  const inputRef = useRef(null)
  const mountTime = useRef(Date.now())

  const { query, results, isSearching, calculatorResult, unitResult, handleQueryChange, clearSearch, executeResult, isExpandedSearch, toggleExpandedSearch, activeSource } = useSearchViewModel({
    installedApps,
    onLaunchApp: (app) => launchApp(app),
    onNavigate: (page) => setActivePage(page)
  })

  useEffect(() => {
    if (isOpen) {
      mountTime.current = Date.now()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      clearSearch()
    }
  }, [isOpen, clearSearch])

  const safeClose = () => {
    if (Date.now() - mountTime.current > 300) onClose()
  }

  const handleResultClick = (result) => {
    if (result.type === 'command') {
      handleQueryChange(result.label + ' ')
      inputRef.current?.focus()
      return
    }
    executeResult(result)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in select-none">
      <div className="absolute inset-0" onClick={safeClose} />

      <div className="w-full max-w-2xl relative z-10 flex flex-col gap-4 animate-slide-up">
        <div className="flex flex-col gap-2">
          <div className="glass-surface rounded-2xl p-2 flex items-center shadow-lg border border-primary-fixed/20">
            <span className="material-symbols-outlined text-primary-fixed px-3">search</span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search apps, settings, contacts, or units..."
              className="flex-1 bg-transparent border-none text-primary-fixed text-xl focus:outline-none focus:ring-0 focus:border-transparent placeholder:text-primary-fixed/30 px-2 font-mono-data"
              onKeyDown={e => {
                if (e.key === 'Enter' && results.length > 0) handleResultClick(results[0])
                else if (e.key === 'Escape') safeClose()
              }}
            />
            {query && (
              <button onClick={() => clearSearch()} className="p-3 text-primary-fixed/50 hover:text-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
          
          <div className="flex justify-end px-1">
            <button 
              onClick={toggleExpandedSearch} 
              className={`flex items-center gap-1.5 text-[10px] font-mono-data px-3 py-1 rounded-full transition-colors ${
                isExpandedSearch ? 'bg-primary-fixed-dim/20 text-primary-fixed border border-primary-fixed/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]' : 'bg-surface-container/50 text-white/50 border border-white/10 hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[12px]">
                {isExpandedSearch ? 'public' : 'public_off'}
              </span>
              {isExpandedSearch ? 'DEEP SEARCH ON' : 'DEEP SEARCH OFF'}
            </button>
          </div>
        </div>

        {isSearching && (
          <div className="glass-surface border border-primary-fixed/20 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 text-[10px] text-primary-fixed/50 font-mono-data">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-pulse" />
              Processing...
            </div>
          </div>
        )}

        {activeSource === 'calculator' ? (
          <InteractiveCalculator 
            initialExpr={query.replace('/calculator', '').trim()} 
            onClose={onClose} 
          />
        ) : activeSource === 'unit' ? (
          <InteractiveUnitConverter 
            initialValue={query.replace('/unit', '').trim().split(' ')[0] || ''} 
            onClose={onClose} 
          />
        ) : (
          <>
            {calculatorResult && (
              <button
                onClick={() => { navigator.clipboard?.writeText(String(calculatorResult.result)); onClose() }}
                className="bg-[#0a0e17]/80 backdrop-blur-xl border border-green-400/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,255,0,0.1)] text-left hover:bg-green-400/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-green-400 text-sm">calculate</span>
                  <span className="text-[9px] text-green-400/60 uppercase font-mono-data tracking-widest">CALCULATOR</span>
                </div>
                <p className="text-sm text-white/90 font-mono-data">{calculatorResult.expression} = <span className="text-green-400 font-bold">{calculatorResult.result}</span></p>
                <p className="text-[9px] text-green-400/40 mt-1">Tap to copy</p>
              </button>
            )}

            {unitResult && (
              <button
                onClick={() => { navigator.clipboard?.writeText(`${unitResult.result} ${unitResult.toUnit}`); onClose() }}
                className="bg-[#0a0e17]/80 backdrop-blur-xl border border-purple-400/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(128,0,255,0.1)] text-left hover:bg-purple-400/10 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-purple-400 text-sm">straighten</span>
                  <span className="text-[9px] text-purple-400/60 uppercase font-mono-data tracking-widest">UNIT CONVERSION</span>
                </div>
                <p className="text-sm text-white/90 font-mono-data">{unitResult.value} {unitResult.fromUnit} = <span className="text-purple-400 font-bold">{unitResult.result} {unitResult.toUnit}</span></p>
                <p className="text-[9px] text-purple-400/40 mt-1">Tap to copy</p>
              </button>
            )}
          </>
        )}

        {results.length > 0 && (
          <div className="glass-surface border border-primary-fixed/20 rounded-2xl overflow-hidden flex flex-col shadow-lg max-h-[50vh] overflow-y-auto">
            {results.map((res, i) => (
              res.type === 'contact' ? (
                <div key={res.id || i} className="flex items-center justify-between p-4 transition-colors border-b border-white/5 last:border-b-0 hover:bg-white/5 group">
                  <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => handleResultClick(res)}>
                    <div className="w-10 h-10 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center flex-shrink-0 border border-primary-fixed/30 group-hover:border-primary-fixed/50 transition-colors">
                      <span className="material-symbols-outlined text-primary-fixed text-[20px]">person</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate flex font-mono-data tracking-wider text-white/90">{res.label}</span>
                      <span className="text-[10px] text-white/40 font-mono-data block truncate">{res.sublabel}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pr-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); res.messageAction?.(); onClose(); }} 
                      className="w-10 h-10 rounded-full bg-[#4facfe]/20 text-[#4facfe] flex items-center justify-center hover:bg-[#4facfe]/40 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">chat</span>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); res.callAction?.(); onClose(); }} 
                      className="w-10 h-10 rounded-full bg-[#00f260]/20 text-[#00f260] flex items-center justify-center hover:bg-[#00f260]/40 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  key={res.id || i}
                  onClick={() => handleResultClick(res)}
                  className={`flex items-center gap-4 p-4 text-left transition-colors border-b border-white/5 last:border-b-0 ${i === 0 ? 'bg-primary-fixed/10' : 'hover:bg-white/5 active:bg-white/10'}`}
                >
                  {res.icon && res.icon.startsWith('data:image') ? (
                    (window.useGlobalHudIcons) ? (
                      IRIS_ICON_PACK[res.id] ? (
                        <div className="w-8 h-8 flex items-center justify-center icon-circle-minimal-outline">
                          {IRIS_ICON_PACK[res.id]}
                        </div>
                      ) : (
                        <HudFallbackIcon src={res.icon} size={32} />
                      )
                    ) : (
                      <img src={res.icon} alt={res.label} className="w-6 h-6 rounded" />
                    )
                  ) : (
                    <span className={`material-symbols-outlined text-xl ${
                      res.type === 'web' ? 'text-primary-fixed' :
                      res.type === 'setting' ? 'text-yellow-400' :
                      res.type === 'app' ? 'text-primary-fixed' : 'text-primary-fixed/70'
                    }`}>{res.icon || 'search'}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-medium truncate flex font-mono-data tracking-wider block ${i === 0 ? 'text-primary-fixed' : 'text-white/80'}`}>{res.label}</span>
                    {res.sublabel && <span className="text-[9px] text-white/30 font-mono-data block truncate">{res.sublabel}</span>}
                  </div>
                  {i === 0 && <span className="text-[9px] font-bold text-[#0a0e17] bg-primary-fixed uppercase tracking-widest px-2 py-0.5 rounded shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]">ENTER</span>}
                </button>
              )
            ))}
          </div>
        )}

        {query && results.length === 0 && !isSearching && !calculatorResult && !unitResult && activeSource !== 'calculator' && activeSource !== 'unit' && (
          <div className="glass-surface border border-primary-fixed/10 rounded-2xl p-6 text-center">
            <span className="material-symbols-outlined text-primary-fixed/30 text-4xl block mb-2">search_off</span>
            <p className="text-[10px] text-primary-fixed/40 font-mono-data uppercase">No results found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
