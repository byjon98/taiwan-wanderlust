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
    let watchId: number;

    const fetchWeather = async (lat: number, lng: number, cityLabel: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code`);
        const data = await res.json();
        
        const mapCodeToCondition = (code: number) => {
          if (code <= 3) return '晴/多云';
          if (code <= 69) return '阴/阵雨';
          return '雨';
        };

        return {
          city: cityLabel,
          temp: Math.round(data.current.temperature_2m),
          condition: mapCodeToCondition(data.current.weather_code)
        };
      } catch (err) {
        console.error("Weather fetch failed", err);
        return null;
      }
    };

    const loadAllWeather = async (currentLat?: number, currentLng?: number) => {
      setLoading(true);
      const results: WeatherData[] = [];
      
      // Always fetch Taipei
      const tpe = await fetchWeather(25.033, 121.5654, '台北');
      if (tpe) results.push(tpe);

      // Fetch Current Location or Kaohsiung as fallback
      if (currentLat && currentLng) {
        const cur = await fetchWeather(currentLat, currentLng, '当前位置');
        if (cur) results.push(cur);
      } else {
        const kho = await fetchWeather(22.6273, 120.3014, '高雄');
        if (kho) results.push(kho);
      }
      
      setWeather(results);
      setLoading(false);
    };

    // Initial load without location
    loadAllWeather();

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          loadAllWeather(latitude, longitude);
        },
        (error) => {
          console.warn("Geolocation denied or failed, falling back to default.", error);
        },
        { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
      );
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
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
