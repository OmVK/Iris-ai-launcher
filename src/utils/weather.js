const WEATHER_CODE_MAP = {
  0: 'CLEAR', 1: 'CLEAR', 2: 'PARTLY_CLOUDY', 3: 'OVERCAST',
  45: 'FOGGY', 48: 'FOGGY',
  51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
  56: 'FREEZING_DRIZZLE', 57: 'FREEZING_DRIZZLE',
  61: 'RAINY', 63: 'RAINY', 65: 'HEAVY_RAIN',
  66: 'FREEZING_RAIN', 67: 'FREEZING_RAIN',
  71: 'SNOWY', 73: 'SNOWY', 75: 'HEAVY_SNOW',
  77: 'SNOW_GRAINS',
  80: 'SHOWER_RAIN', 81: 'SHOWER_RAIN', 82: 'HEAVY_SHOWER',
  85: 'SNOW_SHOWERS', 86: 'HEAVY_SNOW_SHOWERS',
  95: 'THUNDERSTORM', 96: 'THUNDERSTORM_HAIL', 99: 'THUNDERSTORM_HAIL',
}

export function codeToCondition(code) {
  return WEATHER_CODE_MAP[code] || 'CLEAR'
}

export function getCoords() {
  const lat = localStorage.getItem('iris_weather_lat')
  const lon = localStorage.getItem('iris_weather_lon')
  if (lat && lon) return { lat: parseFloat(lat), lon: parseFloat(lon) }
  return { lat: 35.6764, lon: 139.6500 }
}

export async function fetchCurrentWeather() {
  try {
    const { lat, lon } = getCoords()
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    )
    const data = await res.json()
    if (!data?.current_weather) return null
    const temp = Math.round(data.current_weather.temperature)
    const condition = codeToCondition(data.current_weather.weathercode)
    const city = (localStorage.getItem('iris_weather_city') || 'Neo Tokyo').toUpperCase().replace(/\s+/g, '_')
    return { temp, condition, city, displayString: `${city} // ${temp}°C // ${condition}` }
  } catch (e) {
    return null
  }
}

export async function fetchDetailedWeather() {
  try {
    const { lat, lon } = getCoords()
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index,weather_code&daily=temperature_2m_max,weather_code&timezone=auto`
    )
    const data = await res.json()
    if (!data?.current) return null
    const temp = Math.round(data.current.temperature_2m)
    const condition = codeToCondition(data.current.weather_code)
    const forecast = []
    if (data.daily?.time) {
      for (let i = 1; i <= 3; i++) {
        forecast.push({
          day: new Date(data.daily.time[i]).toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
          temp: Math.round(data.daily.temperature_2m_max[i]),
          cond: codeToCondition(data.daily.weather_code[i]),
        })
      }
    }
    return {
      temp, condition,
      humidity: data.current.relative_humidity_2m ?? 50,
      wind: Math.round(data.current.wind_speed_10m),
      uv: Math.round(data.current.uv_index ?? 3),
      forecast: forecast.length > 0 ? forecast : [
        { day: 'TOMORROW', temp: temp - 1, cond: condition },
        { day: 'NEXT_DAY', temp: temp - 2, cond: 'PARTLY_CLOUDY' },
        { day: 'THIRD_DAY', temp: temp + 1, cond: 'CLEAR' },
      ],
    }
  } catch (e) {
    return null
  }
}
