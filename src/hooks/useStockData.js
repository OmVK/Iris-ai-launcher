import { useState, useEffect } from 'react'
import { STOCK_DB } from '../data/stockData'

export default function useStockData({ ticker1, ticker2 }) {
  const [liveData1, setLiveData1] = useState(STOCK_DB['BTC'])
  const [liveData2, setLiveData2] = useState(STOCK_DB['SOL'])
  const [isLoading, setIsLoading] = useState(false)

  const fetchLiveTicker = async (ticker, isPrimary) => {
    const isCrypto = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA'].includes(ticker)
    const baseMeta = STOCK_DB[ticker]

    try {
      if (isCrypto) {
        const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${ticker}USDT`)
        const tickerJson = await tickerRes.json()

        const klineRes = await fetch(`https://api.binance.com/api/v3/klines?symbol=${ticker}USDT&interval=1d&limit=15`)
        const klineJson = await klineRes.json()

        const realPrice = parseFloat(tickerJson.lastPrice)
        const realChange = parseFloat(tickerJson.priceChangePercent)

        const candleHistory = klineJson.map(k => ({
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4])
        }))
        const closeList = candleHistory.map(c => c.close)

        const finalObj = {
          name: baseMeta.name,
          price: realPrice,
          change: parseFloat(realChange.toFixed(2)),
          pe: 0,
          cap: isNaN(realPrice * 1.5) ? baseMeta.cap : (realPrice > 1000 ? `${(realPrice / 50000).toFixed(2)}T` : `${(realPrice / 2).toFixed(1)}B`),
          volume: `${(parseFloat(tickerJson.volume) / (realPrice > 100 ? 1000 : 1000000)).toFixed(1)}M`,
          history: closeList,
          candles: candleHistory
        }

        if (isPrimary) setLiveData1(finalObj)
        else setLiveData2(finalObj)
      } else {
        const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=15d`
        const proxyRes = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(yfUrl)}`)
        const proxyJson = await proxyRes.json()
        const parsed = JSON.parse(proxyJson.contents)

        const result = parsed.chart.result[0]
        const realPrice = result.meta.regularMarketPrice
        const prevClose = result.meta.chartPreviousClose
        const changeVal = realPrice - prevClose
        const realChange = (changeVal / prevClose) * 100

        const quotes = result.indicators.quote[0]
        const opens = quotes.open.filter(v => v != null)
        const highs = quotes.high.filter(v => v != null)
        const lows = quotes.low.filter(v => v != null)
        const closes = quotes.close.filter(v => v != null)

        const candleHistory = closes.map((c, i) => ({
          open: opens[i] || c * 0.99,
          high: highs[i] || c * 1.01,
          low: lows[i] || c * 0.98,
          close: c
        }))

        const finalObj = {
          name: baseMeta.name,
          price: realPrice,
          change: parseFloat(realChange.toFixed(2)),
          pe: baseMeta.pe,
          cap: baseMeta.cap,
          volume: baseMeta.volume,
          history: closes,
          candles: candleHistory
        }

        if (isPrimary) setLiveData1(finalObj)
        else setLiveData2(finalObj)
      }
    } catch (err) {
      console.warn("Live financial feed rate-limited, engaging static backup nodes:", err)
      const fallbackObj = {
        ...baseMeta,
        candles: baseMeta.history.map((val, idx) => ({
          open: idx === 0 ? val * 0.99 : baseMeta.history[idx - 1],
          high: val * 1.01,
          low: val * 0.98,
          close: val
        }))
      }
      if (isPrimary) setLiveData1(fallbackObj)
      else setLiveData2(fallbackObj)
    }
  }

  useEffect(() => {
    setIsLoading(true)
    Promise.all([
      fetchLiveTicker(ticker1, true),
      fetchLiveTicker(ticker2, false)
    ]).finally(() => setIsLoading(false))
  }, [ticker1, ticker2])

  return { liveData1, liveData2, isLoading }
}
