import RemoveButton from './RemoveButton'

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

export default function WeatherWidget({ weatherData, weatherCity, weatherLocalTime, isWeatherLoading, onRemove }) {
  return (
    <section style={{ order: 1 }} className="col-span-2 md:col-span-3 glass-surface rounded-lg p-4 relative flex flex-col justify-between group">
      <RemoveButton onClick={onRemove} />
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5 pb-2 border-b border-white/5">
          <div className="flex justify-between items-center pr-6">
            <h3 className="font-label-caps text-[9.5px] text-primary tracking-widest uppercase">METEO_STATION</h3>
            <span className="bg-black/50 border border-outline-variant/30 rounded px-1.5 py-0.5 text-[9px] text-primary-fixed-dim font-bold uppercase truncate max-w-[120px]">
              {weatherCity}
            </span>
          </div>
          <div className="flex justify-between items-center text-[7.5px] font-mono-data text-on-surface-variant/50">
            <span>SECTOR STATUS SYNC</span>
            <span className="text-[#00f2ff] font-bold">LOCAL_TIME: {weatherLocalTime}</span>
          </div>
        </div>

        {isWeatherLoading ? (
          <div className="py-8 text-center text-primary-fixed-dim font-mono-data text-[9px] animate-pulse">
            RECEIVING METEOROLOGICAL MATRIX...
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-3xl text-primary-fixed-dim animate-pulse">
                  {getWeatherIcon(weatherData.condition)}
                </span>
                <div>
                  <span className="text-2xl font-bold font-mono-data text-white">{weatherData.temp}°C</span>
                  <p className="text-[7.5px] text-on-surface-variant/60 font-mono-data leading-none uppercase mt-0.5">{weatherData.condition}</p>
                </div>
              </div>
              <div className="text-right text-[8px] font-mono-data text-on-surface-variant/80">
                <p>WIND: {weatherData.wind} km/h</p>
                <p>HUMIDITY: {weatherData.humidity}%</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-white/5 text-center font-mono-data text-[8px]">
              {weatherData.forecast.map((fc, idx) => (
                <div key={idx} className="bg-black/20 p-1 rounded border border-white/5 space-y-0.5">
                  <span className="text-on-surface-variant text-[7px] font-bold">{fc.day}</span>
                  <span className="material-symbols-outlined text-xs text-primary-fixed-dim/70 block py-0.5">
                    {getWeatherIcon(fc.cond)}
                  </span>
                  <span className="text-white font-bold">{fc.temp}°C</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <span className="text-[6.5px] text-on-surface-variant/35 uppercase text-center block mt-2 font-mono-data leading-none">
        SATELLITE SYNC STATUS: NOMINAL
      </span>
    </section>
  )
}
