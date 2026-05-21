import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues with Webpack/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

function MapBounds({ locs }: { locs: any[] }) {
  const map = useMap();
  const prevLocsRef = React.useRef('');
  
  useEffect(() => {
    const validLocs = locs.filter(l => l.lat && l.lng);
    const locsHash = validLocs.map(l => l.uid).join(',');
    
    if (validLocs.length > 0 && prevLocsRef.current !== locsHash) {
      prevLocsRef.current = locsHash;
      const bounds = L.latLngBounds(validLocs.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [locs, map]);
  return null;
}

function MapFocus({ focusedLocId, locs, markerRefs }: { focusedLocId?: string | null, locs: any[], markerRefs: React.MutableRefObject<{ [key: string]: L.Marker | null }> }) {
  const map = useMap();
  useEffect(() => {
    if (focusedLocId) {
      const loc = locs.find(l => l.uid === focusedLocId);
      if (loc && loc.lat && loc.lng) {
        map.flyTo([loc.lat, loc.lng], 16, { duration: 1.5 });
        setTimeout(() => {
          const marker = markerRefs.current[focusedLocId];
          if (marker) {
            marker.openPopup();
          }
        }, 1500);
      }
    }
  }, [focusedLocId, locs, map, markerRefs]);
  return null;
}

export function MapComponent({ locs, onLocClick, focusedLocId, routeMode = false }: { locs: any[], onLocClick: (uid: string) => void, focusedLocId?: string | null, routeMode?: boolean }) {
  const validLocs = locs.filter(l => l.lat && l.lng);
  
  const markerRefs = React.useRef<{ [key: string]: L.Marker | null }>({});
  
  const defaultCenter: [number, number] = [23.6978, 120.9605];
  
  if (validLocs.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <span className="text-4xl mb-2">🗺️</span>
        <p className="text-gray-500 font-bold text-sm">当前筛选条件下没有带坐标的店面</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[65vh] min-h-[400px] rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
      <MapContainer center={defaultCenter} zoom={7} className="w-full h-full" zoomControl={true}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapBounds locs={validLocs} />
        <MapFocus focusedLocId={focusedLocId} locs={validLocs} markerRefs={markerRefs} />
        
        {routeMode && validLocs.length > 1 && (
          <Polyline 
            positions={validLocs.map(l => [l.lat, l.lng] as [number, number])} 
            pathOptions={{ color: '#0984e3', weight: 4, dashArray: '10, 10' }} 
          />
        )}
        
        {validLocs.map((loc, i) => (
          <Marker 
            key={loc.uid || i} 
            position={[loc.lat, loc.lng]}
            ref={(r) => { if (r && loc.uid) markerRefs.current[loc.uid] = r; }}
          >
            <Popup>
              <div className="min-w-[150px] font-sans">
                <h4 className="font-bold text-sm mb-1 text-gray-800">{loc.n}</h4>
                {loc.price && <p className="text-[10px] text-gray-500 mb-2">{['cheap', 'mid', 'exp'].includes(loc.price) ? (loc.price === 'cheap' ? 'NT$ 200⬇' : loc.price === 'mid' ? 'NT$ 200~800' : 'NT$ 800⬆') : loc.price}</p>}
                <button 
                  onClick={() => onLocClick(loc.uid)}
                  className="w-full bg-[#2D3436] text-white py-1.5 rounded text-xs font-bold hover:bg-black transition-colors"
                >
                  查看详情
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
