import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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

// ─── Real-time Multiplayer Location Tracking ───
function LivePlayersMarker({ currentUser }: { currentUser: string }) {
  const [players, setPlayers] = useState<Record<string, { lat: number, lng: number, timestamp: number }>>({});

  // 1. Listen to Firebase for all players' locations
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'trip', 'live_locations'), (docSnap) => {
      if (docSnap.exists()) {
        setPlayers(docSnap.data() as any);
      }
    });
    return () => unsub();
  }, []);

  // 2. Watch own position and push to Firebase
  useEffect(() => {
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const locData = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: Date.now() };
          setDoc(doc(db, 'trip', 'live_locations'), {
            [currentUser]: locData
          }, { merge: true }).catch(err => console.error("Live loc update failed", err));
        },
        (err) => console.error("无法获取当前位置:", err),
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [currentUser]);

  const now = Date.now();

  return (
    <>
      {Object.entries(players).map(([playerName, data]) => {
        const isOffline = (now - data.timestamp) > 15 * 60 * 1000; // 15 mins offline
        const isJon = playerName === 'Jon';
        let emoji = isJon ? '🧑🏻' : '👩🏻';
        
        let bgColor = isOffline ? 'bg-gray-400' : (isJon ? 'bg-blue-500' : 'bg-pink-500');
        let shadowColor = isOffline ? 'rgba(156,163,175,0.8)' : (isJon ? 'rgba(59,130,246,0.8)' : 'rgba(236,72,153,0.8)');

        const userIcon = L.divIcon({
          className: 'custom-user-icon',
          html: `<div class="w-4 h-4 ${bgColor} border-2 border-white rounded-full shadow-[0_0_8px_${shadowColor}]"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        // 如果是当前使用者，将图层提至最上层，避免重叠时被覆盖
        const zIndexOffset = playerName === currentUser ? 1000 : 0;

        return (
          <Marker key={playerName} position={[data.lat, data.lng]} icon={userIcon} zIndexOffset={zIndexOffset}>
            <Popup>
              <div className="font-bold text-xs text-center tracking-wide text-gray-700">
                {emoji} {playerName} {isOffline ? '(已离线)' : '(目前位置)'}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

// ─── Native Leaflet Control to jump to User's Location ───
function LocateMeButton({ currentUser }: { currentUser: string }) {
  const map = useMap();
  const myIcon = currentUser === 'Jon' ? '🧑🏻' : '👩🏻';
  const myName = currentUser;

  useEffect(() => {
    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.cursor = 'pointer';
        container.style.transition = 'background-color 0.2s';
        
        container.innerHTML = `<span style="font-size: 15px;">${myIcon}</span>`;
        container.title = `定位我的位置 (${myName})`;
        
        container.onmouseover = () => container.style.backgroundColor = '#f9fafb';
        container.onmouseout = () => container.style.backgroundColor = 'white';
        
        container.onclick = function(e) {
          e.stopPropagation();
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              map.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.2 });
            },
            (error) => {
              let msg = "无法获取当前位置。";
              if (error.code === 1) msg += "请检查您的浏览器/设备是否允许了网页的定位权限。";
              else if (error.code === 2) msg += "由于室内无GPS讯号或网络问题，当前位置不可用。";
              else msg += "定位超时或发生未知错误。";
              alert(msg);
            },
            { enableHighAccuracy: true, timeout: 5000 }
          );
        }
        return container;
      }
    });

    const control = new LocateControl();
    map.addControl(control);
    
    return () => {
      map.removeControl(control);
    };
  }, [map, myIcon, myName]);

  return null;
}

// ─── Native Leaflet Control to jump to Partner's Location ───
function LocatePartnerButton({ currentUser }: { currentUser: string }) {
  const map = useMap();
  const partnerName = currentUser === 'Jon' ? 'June' : 'Jon';
  const partnerIcon = currentUser === 'Jon' ? '👩🏻' : '🧑🏻';

  useEffect(() => {
    let partnerLoc: { lat: number, lng: number, timestamp: number } | null = null;
    
    // Listen to partner location
    const unsub = onSnapshot(doc(db, 'trip', 'live_locations'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data[partnerName]) {
          partnerLoc = data[partnerName];
        }
      }
    });

    const LocateControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        container.style.backgroundColor = 'white';
        container.style.width = '34px';
        container.style.height = '34px';
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.cursor = 'pointer';
        container.style.transition = 'background-color 0.2s';
        container.style.marginBottom = '8px'; // Space between buttons
        
        container.innerHTML = `<span style="font-size: 15px;">${partnerIcon}</span>`;
        container.title = `定位 ${partnerName}`;
        
        container.onmouseover = () => container.style.backgroundColor = '#f9fafb';
        container.onmouseout = () => container.style.backgroundColor = 'white';
        
        container.onclick = function(e) {
          e.stopPropagation();
          if (partnerLoc) {
            const isOffline = (Date.now() - partnerLoc.timestamp) > 15 * 60 * 1000;
            if (isOffline) {
              alert(`${partnerName} 已离线超过15分钟，位置可能不准确。`);
            }
            map.flyTo([partnerLoc.lat, partnerLoc.lng], 16, { duration: 1.2 });
          } else {
            alert(`暂无 ${partnerName} 的位置信息`);
          }
        }
        return container;
      }
    });

    const control = new LocateControl();
    map.addControl(control);
    
    return () => {
      map.removeControl(control);
      unsub();
    };
  }, [map, currentUser, partnerName, partnerIcon]);

  return null;
}

// ─── Main export ───
export function MapComponent({
  currentUser = 'Jon',
  locs,
  onLocClick,
  onAddToRoute,
  focusedLocId,
  routeMode = false,
  routedUids = [],
}: {
  currentUser?: string,
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
        
        {/* Multiplayer location tracking */}
        <LivePlayersMarker currentUser={currentUser} />
        
        {/* Locate Controls */}
        <LocatePartnerButton currentUser={currentUser} />
        <LocateMeButton currentUser={currentUser} />

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
