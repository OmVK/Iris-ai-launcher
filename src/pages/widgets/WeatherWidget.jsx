import React from 'react'

const getWeatherIcon = (cond) => {
  switch (cond) {
    case 'CLEAR': return 'sunny'
    case 'PARTLY_CLOUDY': return 'partly_cloudy_day'
    case 'FOGGY': return 'foggy'
    case 'RAINY': return 'rainy'
    case 'SNOWY': return 'ac_unit'
    case 'SHOWER_RAIN': return 'thunderstorm'
    default: return 'cloud'
  }
}

export default function WeatherWidget({ weatherData, weatherCity, weatherLocalTime, isWeatherLoading }) {
  return (
    <section className="glass-surface border border-white/10 rounded-2xl p-4 relative flex flex-col justify-between w-full h-full overflow-hidden hover:border-primary-fixed-dim/40 transition-all bg-[#080d16]/85 backdrop-blur-xl">
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <div>
            <h3 className="font-label-caps text-[10px] text-primary-fixed-dim tracking-widest uppercase font-bold">
              METEO STATION
            </h3>
            <p className="text-[8px] font-mono-data text-on-surface-variant/70 uppercase">
              SECTOR CLOCK: {weatherLocalTime}
            </p>
          </div>
          <span className="bg-primary-fixed-dim/10 border border-primary-fixed-dim/30 rounded-lg px-2 py-0.5 text-[9px] text-primary-fixed-dim font-bold uppercase truncate max-w-[130px]">
            {weatherCity}
          </span>
        </div>

        {isWeatherLoading ? (
          <div className="py-7 text-center text-primary-fixed-dim font-mono-data text-[9px] animate-pulse">
            SYNCHRONIZING ORBITAL METEOROLOGICAL DATA...
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-primary-fixed-dim animate-pulse">
                  {getWeatherIcon(weatherData.condition)}
                </span>
                <div>
                  <span className="text-2xl font-bold font-mono-data text-white">{weatherData.temp}°C</span>
                  <p className="text-[8px] text-primary-fixed-dim/80 font-mono-data uppercase font-semibold">
                    {weatherData.condition}
                  </p>
                </div>
              </div>
              <div className="text-right text-[8.5px] font-mono-data text-on-surface-variant/80 space-y-0.5">
                <p>WIND: {weatherData.wind} km/h</p>
                <p>HUMIDITY: {weatherData.humidity}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/5 text-center font-mono-data text-[8.5px]">
              {(weatherData.forecast || []).map((fc, idx) => (
                <div key={idx} className="bg-black/30 p-1.5 rounded-lg border border-white/5 space-y-0.5">
                  <span className="text-on-surface-variant/70 text-[7.5px] font-bold block">{fc.day}</span>
                  <span className="material-symbols-outlined text-sm text-primary-fixed-dim block py-0.5">
                    {getWeatherIcon(fc.cond)}
                  </span>
                  <span className="text-white font-bold block">{fc.temp}°C</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="text-[7px] text-on-surface-variant/40 uppercase text-center block mt-2 font-mono-data">
        SATELLITE SYNC STATUS: NOMINAL
      </span>
    </section>
  )
}
