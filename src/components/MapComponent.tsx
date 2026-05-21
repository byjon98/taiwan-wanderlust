import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues with Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// ─── Only fits bounds when the SET of loc UIDs changes (not on every re-render) ───
function MapBounds({ locs, enabled }: { locs: any[], enabled: boolean }) {
  const map = useMap();
  const prevHashRef = useRef('');

  useEffect(() => {
    if (!enabled) return;
    const validLocs = locs.filter(l => l.lat && l.lng);
    const hash = validLocs.map(l => l.uid ?? l.n).join(',');
    if (validLocs.length > 0 && hash !== prevHashRef.current) {
      prevHashRef.current = hash;
      const bounds = L.latLngBounds(validLocs.map(l => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: false });
    }
  }, [locs, map, enabled]);
  return null;
}

// ─── Flies to a focused location once, then never again until focusedLocId changes ───
function MapFocus({ focusedLocId, locs, markerRefs }: {
  focusedLocId?: string | null,
  locs: any[],
  markerRefs: React.MutableRefObject<{ [key: string]: L.Marker | null }>
}) {
  const map = useMap();
  const prevFocusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!focusedLocId || focusedLocId === prevFocusRef.current) return;
    prevFocusRef.current = focusedLocId;
    const loc = locs.find(l => l.uid === focusedLocId);
    if (loc && loc.lat && loc.lng) {
      map.flyTo([loc.lat, loc.lng], 16, { duration: 1.2, animate: true });
      setTimeout(() => {
        const marker = markerRefs.current[focusedLocId];
        if (marker) marker.openPopup();
      }, 1300);
    }
  }, [focusedLocId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ─── Fetches user location once on mount and displays a blue dot ───
function UserLocationMarker() {
  const [position, setPosition] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.error("无法获取当前位置:", err);
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 5000 }
      );
    }
  }, []);

  if (!position) return null;

  const userIcon = L.divIcon({
    className: 'custom-user-icon',
    html: `<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  return (
    <Marker position={position} icon={userIcon}>
      <Popup>
        <div className="font-bold text-xs text-blue-600 text-center tracking-wide">📍 你的当前位置</div>
      </Popup>
    </Marker>
  );
}

// ─── Main export ───
export function MapComponent({
  locs,
  onLocClick,
  onAddToRoute,
  focusedLocId,
  routeMode = false,
  routedUids = [],
}: {
  locs: any[],
  onLocClick: (uid: string) => void,
  onAddToRoute?: (loc: any) => void,
  focusedLocId?: string | null,
  routeMode?: boolean,
  routedUids?: string[],
}) {
  const validLocs = locs.filter(l => l.lat && l.lng);
  const markerRefs = useRef<{ [key: string]: L.Marker | null }>({});
  const [routePath, setRoutePath] = useState<[number, number][] | null>(null);

  // OSRM road routing – only runs when route mode is on and UIDs change
  const routeKey = routeMode ? validLocs.map(l => l.uid ?? l.n).join(',') : '';
  useEffect(() => {
    if (!routeMode || validLocs.length < 2) {
      setRoutePath(null);
      return;
    }
    const coords = validLocs.map(l => `${l.lng},${l.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]) {
          const path = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          setRoutePath(path);
        }
      })
      .catch(err => console.error('OSRM Error:', err));
  }, [routeKey]); // eslint-disable-line react-hooks/exhaustive-deps

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

        {/* Only fit bounds when focusedLocId is NOT set (so flyTo won't fight fitBounds) */}
        <MapBounds locs={validLocs} enabled={!focusedLocId} />
        <MapFocus focusedLocId={focusedLocId} locs={validLocs} markerRefs={markerRefs} />
        
        {/* User's current location dot */}
        <UserLocationMarker />

        {routeMode && routePath && (
          <Polyline
            positions={routePath}
            pathOptions={{ color: '#0984e3', weight: 4, dashArray: '10, 10' }}
          />
        )}

        {validLocs.map((loc, i) => {
          const isInRoute = routedUids.includes(loc.uid ?? loc.n);
          return (
            <Marker
              key={loc.uid ?? i}
              position={[loc.lat, loc.lng]}
              ref={(r) => { if (r && (loc.uid ?? loc.n)) markerRefs.current[loc.uid ?? loc.n] = r; }}
            >
              <Popup>
                <div className="min-w-[160px] font-sans">
                  {routeMode && (
                    <div className="text-[9px] font-black text-blue-600 mb-1 uppercase tracking-widest">
                      {i + 1}. 行程站点
                    </div>
                  )}
                  <h4 className="font-bold text-sm mb-0.5 text-gray-800 leading-tight">{loc.n}</h4>
                  {loc.zone && <p className="text-[10px] text-gray-400 mb-1">📍 {loc.zone}</p>}
                  {loc.price && (
                    <p className="text-[10px] text-gray-500 mb-2">
                      {['cheap', 'mid', 'exp'].includes(loc.price)
                        ? (loc.price === 'cheap' ? 'NT$ 200⬇' : loc.price === 'mid' ? 'NT$ 200~800' : 'NT$ 800⬆')
                        : loc.price}
                    </p>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => onLocClick(loc.uid ?? loc.n)}
                      className="w-full bg-[#2D3436] text-white py-1.5 rounded text-xs font-bold hover:bg-black transition-colors"
                    >
                      查看详情
                    </button>
                    {onAddToRoute && (
                      <button
                        onClick={() => onAddToRoute(loc)}
                        className={`w-full py-1.5 rounded text-xs font-bold transition-colors ${
                          isInRoute
                            ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        {isInRoute ? '✖ 移出行程' : '+ 加入行程'}
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
