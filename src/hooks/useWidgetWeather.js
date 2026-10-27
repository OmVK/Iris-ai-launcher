import { useState, useEffect, useCallback } from 'react'
import { Geolocation } from '@capacitor/geolocation'
import { fetchDetailedWeather } from '../utils/weather'
import PowerSaveManager from '../utils/PowerSaveManager'

export default function useWidgetWeather({ isAppActive, activePage, powerSaveMode }) {
  const [weatherCity, setWeatherCity] = useState(
    () => localStorage.getItem('iris_weather_city') || 'Neo Tokyo'
  )
  const [weatherData, setWeatherData] = useState({
    temp: 24,
    condition: 'CLEAR',
    humidity: 55,
    wind: 12,
    uv: 4,
    forecast: [
      { day: 'TOMORROW', temp: 23, cond: 'PARTLY_CLOUDY' },
      { day: 'NEXT_DAY', temp: 22, cond: 'RAINY' },
      { day: 'THIRD_DAY', temp: 25, cond: 'CLEAR' },
    ],
  })
  const [isWeatherLoading, setIsWeatherLoading] = useState(false)
  const [weatherLocalTime, setWeatherLocalTime] = useState('')

  useEffect(() => {
    let timer
    if (isAppActive && activePage === 'widgets') {
      const updateClock = () => setWeatherLocalTime(new Date().toLocaleTimeString([], { hour12: false }))
      updateClock()
      const pollMs = PowerSaveManager.getPollingInterval('clockPollMs') || 1000
      timer = setInterval(updateClock, pollMs)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAppActive, activePage, powerSaveMode])

  const fetchWeather = useCallback(async () => {
    setIsWeatherLoading(true)
    try {
      const posPromise = Geolocation.getCurrentPosition({ timeout: 6000, enableHighAccuracy: false })
      const pos = await posPromise
      if (pos?.coords) {
        localStorage.setItem('iris_weather_lat', pos.coords.latitude)
        localStorage.setItem('iris_weather_lon', pos.coords.longitude)
        const cachedCity = localStorage.getItem('iris_weather_city')
        if (!cachedCity || cachedCity === 'Neo Tokyo') {
          setWeatherCity('LOCAL STATION')
        }
      }
    } catch {
      const cached = localStorage.getItem('iris_weather_city')
      setWeatherCity(cached || 'OFFLINE CACHE')
    }

    try {
      const data = await fetchDetailedWeather()
      if (data) setWeatherData(data)
    } catch {}
    setIsWeatherLoading(false)
  }, [])

  useEffect(() => {
    let timer
    if (isAppActive && activePage === 'widgets') {
      fetchWeather()
      const pollMs = PowerSaveManager.getPollingInterval('weatherPollMs') || 60000
      timer = setInterval(fetchWeather, pollMs)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isAppActive, activePage, powerSaveMode, fetchWeather])

  return {
    weatherCity,
    weatherData,
    isWeatherLoading,
    weatherLocalTime,
    refreshWeather: fetchWeather,
  }
}
