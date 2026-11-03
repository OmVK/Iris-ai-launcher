import React, { useState, useRef, useCallback, memo } from 'react'
import { STOCK_DB } from '../data/stockData'
import useStockData from '../hooks/useStockData'

const StockChart = memo(function StockChart() {
  const [ticker1, setTicker1] = useState('BTC')
  const [ticker2, setTicker2] = useState('SOL')
  const [hoverIndex, setHoverIndex] = useState(null)
  const [chartType, setChartType] = useState('CANDLE')
  const scrubRef = useRef(null)

  const { liveData1, liveData2, isLoading } = useStockData({ ticker1, ticker2 })

  const historyLen = liveData1.history?.length || 0

  const handleTouchScrub = useCallback(
    (e) => {
      if (!scrubRef.current || historyLen < 2) return
      const touch = e.touches?.[0]
      if (!touch) return
      const rect = scrubRef.current.getBoundingClientRect()
      const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / (rect.width || 1)))
      const idx = Math.round(relX * (historyLen - 1))
      setHoverIndex(idx)
    },
    [historyLen]
  )

  if (!liveData1.history || liveData1.history.length < 2 || !liveData2.history || liveData2.history.length < 2) {
    return null
  }

  const chartWidth = 320
  const chartHeight = 110

  const getMinMaxPath = (history) => {
    const min = Math.min(...history) * 0.99
    const max = Math.max(...history) * 1.01
    const range = max - min
    return { min, max, range }
  }

  const mm1 = getMinMaxPath(liveData1.history)
  const mm2 = getMinMaxPath(liveData2.history)

  const padX = 10
  const usableWidth = chartWidth - padX * 2
  const getLinePoints = (history, mm) => {
    return history.map((val, idx) => {
      const x = padX + (idx / Math.max(1, history.length - 1)) * usableWidth
      const y = chartHeight - ((val - mm.min) / (mm.range || 1)) * (chartHeight - 16) - 8
      return { x, y }
    })
  }

  const p1 = getLinePoints(liveData1.history, mm1)
  const p2 = getLinePoints(liveData2.history, mm2)
  const path1 = p1.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const path2 = p2.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const getLiveCandles = (candles, min, max, range) => {
    if (!candles || candles.length === 0) return []
    return candles.map((c, idx) => {
      const x = padX + (idx / Math.max(1, candles.length - 1)) * usableWidth
      const scaleY = (v) => chartHeight - ((v - min) / (range || 1)) * (chartHeight - 16) - 8

      return {
        x,
        open: c.open,
        close: c.close,
        yOpen: scaleY(c.open),
        yClose: scaleY(c.close),
        yHigh: scaleY(c.high),
        yLow: scaleY(c.low),
        isBullish: c.close >= c.open,
      }
    })
  }

  const candles1 = getLiveCandles(liveData1.candles, mm1.min, mm1.max, mm1.range)
  const activeCandle = hoverIndex !== null ? candles1[hoverIndex] : null

  return (
    <div className="space-y-3.5 font-mono-data text-xs text-[#dfe2ef] w-full">
      <div className="flex flex-col gap-2 pb-2 border-b border-white/10">
        <div className="flex justify-between items-center">
          <h3 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold">
            REAL MARKET FEEDS
          </h3>

          <div className="flex border border-white/10 rounded-md overflow-hidden bg-black/50 text-[8px] font-bold p-0.5">
            <button
              type="button"
              onClick={() => setChartType('LINE')}
              className={`px-2 py-0.5 rounded transition-colors ${
                chartType === 'LINE'
                  ? 'bg-primary-fixed-dim text-black'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              LINE
            </button>
            <button
              type="button"
              onClick={() => setChartType('CANDLE')}
              className={`px-2 py-0.5 rounded transition-colors ${
                chartType === 'CANDLE'
                  ? 'bg-primary-fixed-dim text-black'
                  : 'text-on-surface-variant hover:text-white'
              }`}
            >
              CANDLESTICK
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[7.5px] text-on-surface-variant/60 uppercase">
            {isLoading ? 'REFRESHING MARKET FEEDS...' : 'LIVE TICKER SYNCED'}
          </span>
          <div className="flex items-center gap-1.5">
            <select
              value={ticker1}
              onChange={(e) => setTicker1(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-primary-fixed-dim focus:outline-none cursor-pointer"
            >
              {Object.keys(STOCK_DB).map((tk) => (
                <option key={tk} value={tk}>
                  {tk}
                </option>
              ))}
            </select>
            <span className="text-on-surface-variant/40 text-[9px]">vs</span>
            <select
              value={ticker2}
              onChange={(e) => setTicker2(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-[9px] text-primary-fixed-dim focus:outline-none cursor-pointer"
            >
              {Object.keys(STOCK_DB).map((tk) => (
                <option key={tk} value={tk}>
                  {tk}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="relative bg-black/45 border border-white/5 rounded-xl p-3 flex flex-col items-center w-full overflow-hidden">
        <div
          ref={scrubRef}
          onTouchStart={handleTouchScrub}
          onTouchMove={handleTouchScrub}
          onTouchEnd={() => setHoverIndex(null)}
          className="relative w-full aspect-[320/110] overflow-hidden"
        >
          <svg viewBox="0 0 320 110" className="w-full h-full overflow-hidden" preserveAspectRatio="none">
            <line x1="0" y1="25" x2={chartWidth} y2="25" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="55" x2={chartWidth} y2="55" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="0" y1="85" x2={chartWidth} y2="85" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

            {chartType === 'LINE' ? (
              <>
                <path d={path1} fill="none" stroke="#00f2ff" strokeWidth="2" />
                <path
                  d={`${path1} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`}
                  fill="url(#gradStock)"
                  className="opacity-15 pointer-events-none"
                />
                <path
                  d={path2}
                  fill="none"
                  stroke="#d1bcff"
                  strokeWidth="1.5"
                  strokeDasharray="2,2"
                  className="opacity-70"
                />
              </>
            ) : (
              <>
                {candles1.map((c, i) => {
                  const candleWidth = 6
                  const color = c.isBullish ? '#22c55e' : '#ff1744'
                  return (
                    <g key={i}>
                      <line x1={c.x} y1={c.yHigh} x2={c.x} y2={c.yLow} stroke={color} strokeWidth="1" />
                      <rect
                        x={c.x - candleWidth / 2}
                        y={Math.min(c.yOpen, c.yClose)}
                        width={candleWidth}
                        height={Math.max(2.5, Math.abs(c.yOpen - c.yClose))}
                        fill={color}
                        rx="0.5"
                      />
                    </g>
                  )
                })}

                <path
                  d={path2}
                  fill="none"
                  stroke="rgba(209,188,255,0.35)"
                  strokeWidth="1"
                  strokeDasharray="1,3"
                />
              </>
            )}

            {hoverIndex !== null && p1[hoverIndex] && (
              <>
                <line
                  x1={p1[hoverIndex].x}
                  y1="0"
                  x2={p1[hoverIndex].x}
                  y2={chartHeight}
                  stroke="rgba(0,242,255,0.3)"
                  strokeWidth="1"
                />

                {chartType === 'LINE' ? (
                  <>
                    <circle cx={p1[hoverIndex].x} cy={p1[hoverIndex].y} r="4" fill="#00f2ff" />
                    {p2[hoverIndex] && (
                      <circle cx={p2[hoverIndex].x} cy={p2[hoverIndex].y} r="3.5" fill="#d1bcff" />
                    )}
                  </>
                ) : (
                  activeCandle && (
                    <circle
                      cx={activeCandle.x}
                      cy={activeCandle.yClose}
                      r="4.5"
                      fill={activeCandle.isBullish ? '#22c55e' : '#ff1744'}
                    />
                  )
                )}
              </>
            )}

            <defs>
              <linearGradient id="gradStock" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00f2ff" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute inset-0 flex">
            {liveData1.history.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-full cursor-crosshair"
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            ))}
          </div>
        </div>

        <div className="w-full flex justify-between items-center mt-2.5 pt-2 border-t border-white/5 font-mono-data text-[9px] h-5 text-on-surface-variant">
          {hoverIndex !== null && liveData1.history[hoverIndex] !== undefined ? (
            chartType === 'LINE' || !activeCandle ? (
              <>
                <span className="text-[#00f2ff]">
                  {ticker1}: ${liveData1.history[hoverIndex].toFixed(2)}
                </span>
                <span>DAY_{hoverIndex + 1}</span>
                <span className="text-[#d1bcff]">
                  {ticker2}: ${(liveData2.history[hoverIndex] ?? 0).toFixed(2)}
                </span>
              </>
            ) : (
              <>
                <span className={activeCandle.isBullish ? 'text-green-400' : 'text-error'}>
                  {ticker1} D{hoverIndex + 1} {'//'} O:${activeCandle.open.toFixed(1)} C:$
                  {activeCandle.close.toFixed(1)}
                </span>
                <span className="text-[#d1bcff]">
                  {ticker2}: ${(liveData2.history[hoverIndex] ?? 0).toFixed(2)}
                </span>
              </>
            )
          ) : (
            <span className="w-full text-center text-on-surface-variant/45 italic">
              TOUCH OR HOVER MATRIX TO INSPECT
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 text-[10px] font-mono-data">
        <div className="bg-black/35 p-2.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#00f2ff]">{ticker1}</span>
            <span className={liveData1.change >= 0 ? 'text-green-400 font-bold' : 'text-error font-bold'}>
              {liveData1.change >= 0 ? '▲ +' : '▼ '}
              {liveData1.change}%
            </span>
          </div>
          <div className="text-[8px] text-on-surface-variant/80 leading-relaxed">
            <p className="truncate">NAME: {liveData1.name.toUpperCase()}</p>
            <p>
              PRICE: $
              {liveData1.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </p>
            <p>CAPITAL: {liveData1.cap}</p>
            <p>VOL_24H: {liveData1.volume}</p>
          </div>
        </div>

        <div className="bg-black/35 p-2.5 rounded-xl border border-white/5 space-y-1">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[#d1bcff]">{ticker2}</span>
            <span className={liveData2.change >= 0 ? 'text-green-400 font-bold' : 'text-error font-bold'}>
              {liveData2.change >= 0 ? '▲ +' : '▼ '}
              {liveData2.change}%
            </span>
          </div>
          <div className="text-[8px] text-on-surface-variant/80 leading-relaxed">
            <p className="truncate">NAME: {liveData2.name.toUpperCase()}</p>
            <p>
              PRICE: $
              {liveData2.price.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </p>
            <p>CAPITAL: {liveData2.cap}</p>
            <p>VOL_24H: {liveData2.volume}</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default StockChart
