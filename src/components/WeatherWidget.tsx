import React, { useEffect, useState } from 'react';
import { Cloud, Sun, CloudRain, Loader2 } from 'lucide-react';

interface WeatherData {
  city: string;
  temp: number;
  condition: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Taipei (25.033, 121.5654) and Kaohsiung (22.6273, 120.3014)
        const resTpe = await fetch('https://api.open-meteo.com/v1/forecast?latitude=25.033&longitude=121.5654&current=temperature_2m,weather_code');
        const dataTpe = await resTpe.json();

        const resKho = await fetch('https://api.open-meteo.com/v1/forecast?latitude=22.6273&longitude=120.3014&current=temperature_2m,weather_code');
        const dataKho = await resKho.json();

        const mapCodeToCondition = (code: number) => {
          if (code <= 3) return '晴/多云';
          if (code <= 69) return '阴/阵雨';
          return '雨';
        };

        setWeather([
          { city: '台北', temp: Math.round(dataTpe.current.temperature_2m), condition: mapCodeToCondition(dataTpe.current.weather_code) },
          { city: '高雄', temp: Math.round(dataKho.current.temperature_2m), condition: mapCodeToCondition(dataKho.current.weather_code) }
        ]);
      } catch (err) {
        console.error("Weather fetch failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, []);

  if (loading) return <div className="flex items-center gap-2 text-gray-400 text-xs"><Loader2 className="w-3 h-3 animate-spin" /> 获取天气中...</div>;
  if (!weather.length) return null;

  return (
    <div className="flex items-center gap-4 bg-white/50 backdrop-blur px-4 py-2 rounded-2xl border border-gray-100 shadow-sm mt-4">
      {weather.map(w => (
        <div key={w.city} className="flex items-center gap-1.5">
          {w.condition.includes('雨') ? <CloudRain className="w-4 h-4 text-blue-400" /> : 
           w.condition.includes('云') ? <Cloud className="w-4 h-4 text-gray-400" /> : 
           <Sun className="w-4 h-4 text-orange-400" />}
          <span className="text-xs font-bold text-gray-600">{w.city} {w.temp}°C</span>
        </div>
      ))}
    </div>
  );
}
