import React, { useState, useEffect, useMemo } from 'react';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import { regions } from './data';
import { souvenirModules, groceryModules } from './data/info';
import InfoPanel from './components/InfoPanel';
import ItineraryPanel from './components/ItineraryPanel';
import ExpensePanel from './components/ExpensePanel';
import { Clock, Search, Map, Filter, ArrowUpDown, Info, Check, Plus, ShoppingBag, MapPin, ExternalLink, Scale, Navigation, Sparkles, ChevronRight, Calendar, Home, Wallet } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const hrsStr = (h: number[][]) => {
  if (!h || !h.length) return '';
  return h.map(([s, e]) => {
    const fmt = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    return `${fmt(s)}–${fmt(e > 1440 ? e - 1440 : e)}`;
  }).join('，');
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [viewMode, setViewMode] = useState<'landing' | 'itinerary'>('landing');
  const [activeRegionId, setActiveRegionId] = useState('all');
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [compareSelected, setCompareSelected] = useState<any[]>([]);
  const [routeItems, setRouteItems] = useFirestoreSync<any[]>('routeItems', 'my_app_routeItems', []);
  const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: any, index: number } | null>(null);
  const [deletedCustomStore, setDeletedCustomStore] = useState<{ item: any, index: number } | null>(null);

  const [customStores, setCustomStores] = useFirestoreSync<any[]>('custom_stores', 'taiwan_trip_custom_stores_v1', []);
  
  const getRegionIdForZone = (zone: string) => {
    if (!zone) return 'custom';
    for (const r of regions) {
      if (r.locs.some(l => l.zone === zone)) return r.id;
    }
    // Handle partial matches (e.g. "信义区" matches "台北市信义区" or vice versa)
    for (const r of regions) {
      if (r.locs.some(l => l.zone && (l.zone.includes(zone) || zone.includes(l.zone)))) return r.id;
    }
    return 'custom';
  };

  const [storeRemarks, setStoreRemarks] = useFirestoreSync<Record<string, {text: string, history: string[], future: string[]}>>('store_remarks', 'taiwan_trip_remarks_v1', {});
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [addStoreStep, setAddStoreStep] = useState<1|2>(1);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreZone, setNewStoreZone] = useState('');
  const [newStoreJson, setNewStoreJson] = useState('');

  const handleAddStoreAI = () => {
    const prompt = `我需要在我的旅游App中添加一家新店："${newStoreName}"。
请搜索这家店的资料，并严格按照以下 JSON 格式输出，不要输出任何其他多余的文字或 markdown 标记（例如不要输出 \`\`\`json）：
{
  "n": "${newStoreName}",
  "f": "店面特色、背景与必买简述",
  "do": "必做体验（一句话）",
  "eat": "必吃/必买推荐（逗号分隔）",
  "w": "避雷指南（如果有）",
  "r": "网络评价摘要",
  "tips": "实用提示（一句话）",
  "price": "消费预估",
  "minSpend": "低消限制",
  "zone": "所属区域（例如台北信义区、台西、或者是你认为最合适的区域名）",
  "cuisine": "菜系/类型",
  "hours": "营业时间（如 10:00 - 22:00）"
}`;
    navigator.clipboard.writeText(prompt).then(() => {
      alert('Prompt 已复制！将自动打开 Gemini，请粘贴并让其生成 JSON，复制生成的 JSON 后回到 App 继续。');
      window.open('https://gemini.google.com/app', '_blank');
      setAddStoreStep(2);
    }).catch(() => {
      alert('自动复制失败，请重试');
    });
  };

  const saveCustomStore = () => {
    try {
      const parsed = JSON.parse(newStoreJson);
      const newLoc = {
        ...parsed,
        uid: `custom-${Date.now()}-${parsed.n}`,
        zone: newStoreZone || parsed.zone || '新添加',
      };
      setCustomStores(prev => [...prev, newLoc]);
      setShowAddStoreModal(false);
      setAddStoreStep(1);
      setNewStoreName('');
      setNewStoreJson('');
      setNewStoreZone('');
      alert('添加成功！');
    } catch (e) {
      alert('JSON 格式错误，请检查是否完全粘贴了 AI 返回的 JSON 代码。');
    }
  };

  const handleRemarkUpdate = (locUid: string, text: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid] || { text: '', history: [], future: [] };
      return {
        ...prev,
        [locUid]: {
          text,
          history: [...existing.history.slice(-49), existing.text],
          future: []
        }
      };
    });
  };

  const handleRemarkUndo = (locUid: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid];
      if (!existing || existing.history.length === 0) return prev;
      const prevText = existing.history[existing.history.length - 1];
      return {
        ...prev,
        [locUid]: {
          text: prevText,
          history: existing.history.slice(0, -1),
          future: [existing.text, ...existing.future]
        }
      };
    });
  };

  const handleRemarkRedo = (locUid: string) => {
    setStoreRemarks(prev => {
      const existing = prev[locUid];
      if (!existing || existing.future.length === 0) return prev;
      const nextText = existing.future[0];
      return {
        ...prev,
        [locUid]: {
          text: nextText,
          history: [...existing.history, existing.text],
          future: existing.future.slice(1)
        }
      };
    });
  };



  
  const [openAtTime, setOpenAtTime] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  const filterGroups = useMemo(() => [
    {
      id: 'explore',
      name: '地点探索',
      label: 'EXPLORE',
      color: 'bg-[#2D3436]',
      items: ['市场', '夜市', '商场', '超市', '景点', '伴手礼', '餐厅', 'Cafe']
    },
    {
      id: 'food',
      name: '分类精选',
      label: 'CATEGORY',
      color: 'bg-orange-500',
      items: ['小吃', '饮料', '甜品', '港式点心', '西餐', '快餐', '米其林', '科技用品', '酒', '全台最大门店']
    },
    {
      id: 'time',
      name: '时段属性',
      label: 'TIME',
      color: 'bg-blue-500',
      items: ['早餐', '午餐', '晚餐', '宵夜', '24H']
    }
  ], []);

  const [activeTab, setActiveTab] = useState<'explore' | 'info' | 'itinerary' | 'expense'>('explore');
  const [time, setTime] = useState(new Date());
  const [showLocateModal, setShowLocateModal] = useState(false);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  useEffect(() => {
    const main = document.getElementById('scroll-container-main');
    if (main) main.scrollTop = 0;
    const desktop = document.getElementById('scroll-container-desktop');
    if (desktop) desktop.scrollTop = 0;
  }, [activeTab, activeRegionId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.currentTarget.scrollTop > 300) {
      setShowTopBtn(true);
    } else {
      setShowTopBtn(false);
    }
  };

  const scrollToTop = () => {
    document.getElementById('scroll-container-main')?.scrollTo({ top: 0, behavior: 'smooth' });
    document.getElementById('scroll-container-desktop')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (expandedCardId) {
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target && !target.closest('.loc-card')) {
          setExpandedCardId(null);
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [expandedCardId]);

  const activeRegion = useMemo(() => regions.find(r => r.id === activeRegionId), [activeRegionId]);
  
  const zonesInRegion = useMemo(() => {
    if (activeRegionId === 'all') {
      const zones = new Set<string>();
      regions.forEach(r => r.locs.forEach(l => { if (l.zone) zones.add(l.zone); }));
      (customStores || []).forEach(l => { if (l.zone) zones.add(l.zone); });
      return Array.from(zones);
    }
    if (activeRegionId === 'custom') {
      const zones = new Set((customStores || []).map(l => l.zone).filter(Boolean));
      return Array.from(zones) as string[];
    }
    if (!activeRegion) return [];
    const zones = new Set(activeRegion.locs.map(l => l.zone).filter(Boolean));
    return Array.from(zones) as string[];
  }, [activeRegion, activeRegionId]);

  const availableTypes = useMemo(() => {
    const s = new Set<string>();
    regions.forEach(r => r.locs.forEach(l => { 
      if (l.t) {
        l.t.split('/').forEach(t => s.add(t));
      }
    }));
    return Array.from(s);
  }, []);

  const matchesFilter = (loc: any, filterValue: string) => {
    const t = loc.t || '';
    const n = loc.n || '';
    const zone = loc.zone || '';
    const tags = loc.tags || [];
    const f = loc.f || '';
    const eat = loc.eat || '';
    const cuisine = loc.cuisine || '';
    const h = loc.h || [];

    const textMatch = [t, n, zone, ...tags, f, eat, cuisine].join(' ');
    const overlaps = (start: number, end: number) => h.some(([s, e]: [number, number]) => s < end && e > start);

    switch (filterValue) {
      case '市场': return zone.includes('市场') || t.includes('市场') || n.includes('市场');
      case '夜市': return zone.includes('夜市') || t.includes('夜市') || n.includes('夜市');
      case '饮料': return t.includes('饮料') || tags.includes('饮料') || textMatch.includes('饮品');
      case '小吃': return t.includes('小吃') || tags.includes('小吃');
      case '景点': return t.includes('景点') || tags.includes('景点') || textMatch.includes('文创');
      case '伴手礼': return t.includes('伴手礼') || tags.includes('伴手礼') || textMatch.includes('名产');
      case '甜品': return t.includes('甜点') || t.includes('冰品') || textMatch.includes('甜品') || textMatch.includes('下午茶') || textMatch.includes('蛋糕');
      case '商场': return t.includes('购物') || n.includes('百货') || n.includes('广场') || f.includes('购物') || n.includes('三越') || n.includes('三创') || tags.includes('商场') || textMatch.includes('Outlet');
      case 'Cafe': return textMatch.includes('Cafe') || textMatch.includes('咖啡') || t.includes('咖啡');
      case '米其林': return tags.includes('米其林') || f.includes('米其林') || textMatch.includes('必比登');
      case '餐厅': return t.includes('餐厅') || textMatch.includes('餐厅') || textMatch.includes('内用') || textMatch.includes('座位');
      case '港式点心': return textMatch.includes('港式') || n.includes('点心') || cuisine.includes('港式') || textMatch.includes('茶餐厅');
      case '科技用品': return tags.includes('科技') || textMatch.includes('3C') || textMatch.includes('科技') || textMatch.includes('键盘');
      case '超市': return t.includes('超市') || f.includes('超市') || textMatch.includes('家福');
      case '西餐': return cuisine.includes('西餐') || cuisine.includes('美式') || cuisine.includes('义式') || textMatch.includes('西餐');
      case '快餐': return textMatch.includes('快餐') || textMatch.includes('速食') || textMatch.includes('汉堡');
      case '全台最大门店': return textMatch.includes('全台最大') || textMatch.includes('最大旗舰店');
      case '酒': return textMatch.includes('酒') || t.includes('酒吧') || textMatch.includes('啤酒');
      case '早餐': return tags.includes('早餐') || overlaps(360, 630);
      case '午餐': return overlaps(690, 840);
      case '晚餐': return overlaps(1050, 1200);
      case '宵夜': return tags.includes('宵夜') || h.some(([s, e]: [number, number]) => e > 1320 || (e < 300 && e > 0));
      case '24H': return h.some(([s, e]: [number, number]) => e - s >= 1430);
      default: return false;
    }
  };

  const checkIsOpenAt = (loc: any, timeStr: string) => {
    if (!timeStr || !loc.h || loc.h.length === 0) return true;
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    
    return loc.h.some(([start, end]: number[]) => {
      if (end > 1440) {
        return mins >= start || mins <= (end - 1440);
      }
      return mins >= start && mins <= end;
    });
  };

  const filteredLocs = useMemo(() => {
    let allLocs: any[] = [];
    if (activeRegionId === 'all' || searchQuery) {
      allLocs = regions.flatMap(r => r.locs.map((l, i) => ({ ...l, region: r.name, regionId: r.id, uid: `${r.id}-${i}-${l.n}` })));
    } else if (activeRegion) {
      allLocs = activeRegion.locs.map((l, i) => ({ ...l, region: activeRegion.name, regionId: activeRegion.id, uid: `${activeRegion.id}-${i}-${l.n}` }));
    }
    
    // Reverse custom stores to put newest first
    // Reverse custom stores to put newest first
    const mappedCustoms = [...(customStores || [])].reverse().map(c => {
      const detectedRegionId = getRegionIdForZone(c.zone);
      const detectedRegionName = regions.find(r => r.id === detectedRegionId)?.name || '自定义';
      return {
        ...c, 
        t: c.t || c.cuisine || '新添加',
        region: detectedRegionName, 
        regionId: detectedRegionId, 
        isCustom: true
      };
    });
    
    let sourceLocs: any[] = [];
    if (activeRegionId === 'custom') {
      // Show ALL custom stores in the "Newly Added" tab
      sourceLocs = mappedCustoms;
    } else {
      // Show custom stores at the TOP of the "All" tab or specific region tab
      sourceLocs = [...mappedCustoms.filter(c => c.regionId !== 'custom'), ...allLocs];
    }

    // Include Info Items in search results
    if (searchQuery) {
      const infoLocs = [...souvenirModules, ...groceryModules].flatMap(mod => 
        mod.items.map((item, i) => ({
          ...item,
          t: mod.name,
          f: item.d,
          s: 5,
          zone: mod.name,
          // Map mid/cheap/exp logic or just use mid
          price: item.price.includes('NT$ 800') ? 'exp' : (item.price.includes('NT$ 200') ? 'mid' : 'cheap'),
          eat: item.buy,
          tips: item.tip,
          r: item.eval,
          uid: `info-${mod.id}-${i}`,
          region: '旅行资讯',
          regionId: 'info',
          isInfoItem: true,
          moduleId: mod.id,
          h: [], // We'll display hours string instead of number range for these
          cl: '',
          how: mod.name
        }))
      );
      sourceLocs = [...sourceLocs, ...infoLocs];
    }

    return sourceLocs.filter(loc => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = [loc.n, loc.f, loc.eat, loc.tips].join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      
      if (activeZone && loc.zone !== activeZone) return false;
      
      let pass = true;
      if (activeFilters.length > 0) {
        pass = activeFilters.every(f => matchesFilter(loc, f));
      }
      if (!pass) return false;
      
      if (openAtTime && !checkIsOpenAt(loc, openAtTime)) return false;

      return true;
    });
  }, [activeRegionId, activeRegion, activeZone, searchQuery, activeFilters, openAtTime, customStores]);

  const toggleCompare = (loc: any) => {
    if (compareSelected.find(c => (c.uid && c.uid === loc.uid) || (!c.uid && c.n === loc.n))) {
      setCompareSelected(prev => prev.filter(c => !((c.uid && c.uid === loc.uid) || (!c.uid && c.n === loc.n))));
    } else {
      if (compareSelected.length >= 4) {
        alert("Max 4 items to compare");
        return;
      }
      setCompareSelected(prev => [...prev, loc]);
    }
  };

  const executeCompare = () => {
    if (compareSelected.length < 2) return;
    const prompt = `你是我的台湾旅行顾问。请帮我深度分析和对比这 ${compareSelected.length} 家店（包含特色、食物、避雷、总体评价等维度），并给出你的最终推荐结论：\n\n` + 
      compareSelected.map(c => `[${c.n}]: (位于${c.zone || '未知'}) - ${c.f || ''} - 价位${c.price || ''} - 必吃: ${c.eat || '无'} - 评价: ${c.r || '无'}`).join('\n');
    
    navigator.clipboard.writeText(prompt).then(() => {
      const userCopy = window.confirm("已将对比提示词复制到剪贴板！\n\n即将跳转至 Gemini AI，请在输入框直接粘贴即可。");
      if (userCopy !== null) {
        window.open('https://gemini.google.com/app', '_blank');
      }
    });
  };

  const toggleRoute = (loc: any) => {
    if (routeItems.find(r => (r.uid && r.uid === loc.uid) || (!r.uid && r.n === loc.n))) {
      const index = routeItems.findIndex(r => (r.uid && r.uid === loc.uid) || (!r.uid && r.n === loc.n));
      setDeletedRouteItem({ item: loc, index });
      setRouteItems(prev => prev.filter(r => !((r.uid && r.uid === loc.uid) || (!r.uid && r.n === loc.n))));
      
      setTimeout(() => {
        setDeletedRouteItem(prev => ((prev?.item.uid && prev.item.uid === loc.uid) || (!prev?.item.uid && prev?.item.n === loc.n) ? null : prev));
      }, 5000);
    } else {
      setRouteItems(prev => [...prev, loc]);
      setDeletedRouteItem(null);
    }
  };

  const undoDeleteRouteItem = () => {
    if (deletedRouteItem) {
      setRouteItems(prev => {
        const newArr = [...prev];
        newArr.splice(deletedRouteItem.index, 0, deletedRouteItem.item);
        return newArr;
      });
      setDeletedRouteItem(null);
    }
  };

  const optimizeRoute = () => {
    if (routeItems.length < 2) {
      alert('You need at least 2 locations to optimize the route.');
      return;
    }
    
    // Sort by zone string logically
    const sorted = [...routeItems].sort((a, b) => {
      const zoneA = a.zone || '';
      const zoneB = b.zone || '';
      return zoneA.localeCompare(zoneB);
    });
    setRouteItems(sorted);
  };

  const handleLocateSelect = (dist: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    
    // Simulate real behavior
    navigator.geolocation.getCurrentPosition(
      (position) => {
        alert(`[Prototype] Simulated finding locations within ${dist} of your current position (${position.coords.latitude.toFixed(2)}, ${position.coords.longitude.toFixed(2)})`);
        setActiveRegionId('taipei');
        setSearchQuery(`距离约 ${dist}`);
        setActiveTab('explore');
        setActiveZone(null);
        setShowLocateModal(false);
      },
      (error) => {
        alert(`[Prototype] Simulated finding locations within ${dist} (Fallback mode without actual GPS)`);
        setActiveRegionId('taipei');
        setSearchQuery(`距离约 ${dist}`);
        setActiveTab('explore');
        setActiveZone(null);
        setShowLocateModal(false);
      }
    );
  };

  const locateUser = () => {
    setShowLocateModal(true);
  };

  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen w-full bg-[#FAFAFA] text-[#2D3436] font-sans flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        
        {/* Subtle background decoration to give premium feel without clutter */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-gray-100 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none -z-10" />

        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto space-y-16 w-full">
          
          <div className="space-y-8 flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white border border-gray-100 rounded-2xl flex items-center justify-center shadow-sm -rotate-3 hover:rotate-0 transition-transform cursor-pointer">
              <span className="text-3xl md:text-4xl">🇹🇼</span>
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em] md:tracking-[0.6em]">Curated Experiences & Independent Exploration</span>
              <h1 onClick={() => setViewMode('landing')} className="text-4xl md:text-6xl font-black text-[#2D3436] tracking-tighter cursor-pointer hover:opacity-80 transition-opacity">
                TAIWAN WANDERLUST
              </h1>
              <p className="text-[10px] md:text-xs font-semibold text-[#636E72] uppercase tracking-[0.2em] md:tracking-[0.3em] leading-relaxed mt-2 text-center">
                您的终极台湾探索指南 <span className="mx-3 opacity-30 block sm:inline my-2 sm:my-0">|</span> {time.toLocaleTimeString('en-US', { timeZone: 'Asia/Taipei', hour12: false })} LOCAL TIME
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 text-[11px] font-bold text-gray-500 uppercase tracking-widest">
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> 北部 22-26°C</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span> 中南部 26-30°C</span>
            <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> 建议携雨具</span>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            if (searchQuery.trim()) {
              setViewMode('itinerary');
            }
          }} className="w-full max-w-md relative group">
            <input 
              type="text" 
              placeholder="搜索台北101、夜市等景点..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[#2D3436] font-medium border-b-2 border-gray-200 placeholder-gray-400 pb-3 pl-2 pr-10 text-center text-base focus:outline-none focus:border-[#2D3436] transition-colors"
            />
            {searchQuery.trim() && (
              <button 
                type="submit" 
                className="absolute right-0 top-1/2 -translate-y-1/2 -mt-1.5 text-gray-400 hover:text-[#2D3436] transition-colors"
              >
                <Search className="w-5 h-5" />
              </button>
            )}
          </form>
          
          <div className="flex gap-6 md:gap-10 w-full justify-center pt-4 overflow-x-auto no-scrollbar px-4">
            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('explore'); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Map className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">地点探索</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Explore</span>
              </div>
            </button>

            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('itinerary'); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Calendar className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">我的行程</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Itinerary</span>
              </div>
            </button>

            <button 
              onClick={() => { setViewMode('itinerary'); setShowLocateModal(true); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">定位周边</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Locate Me</span>
              </div>
            </button>

            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('expense'); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-[#2D3436] transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-[#2D3436] flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Wallet className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-[#2D3436]">财务大盘</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Expense</span>
              </div>
            </button>

            <button 
              onClick={() => { setViewMode('itinerary'); setActiveTab('expense'); setTimeout(() => window.dispatchEvent(new Event('open-expense-fab')), 100); }}
              className="group flex flex-col items-center gap-4 text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
            >
              <div className="w-14 h-14 rounded-full border border-gray-200 group-hover:border-blue-500 flex items-center justify-center transition-all group-hover:scale-105 bg-white shadow-sm group-hover:shadow-md">
                <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-500" />
              </div>
              <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-bold uppercase tracking-widest text-blue-500">快捷记账</span>
                 <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Quick Entry</span>
              </div>
            </button>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] w-full bg-[#FAFAFA] text-[#2D3436] font-sans flex flex-col overflow-hidden leading-snug">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:h-[calc(4rem+env(safe-area-inset-top))] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-20 w-full relative gap-3">
        <div className="flex items-center w-full md:w-auto justify-between md:justify-start gap-4">
          <div className="flex items-center gap-3">
            <div 
              onClick={() => setViewMode('landing')}
              className="w-8 h-8 md:w-10 md:h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm md:text-xl">🇹🇼</span>
            </div>
            <div>
              <h1 
                onClick={() => setViewMode('landing')} 
                className="text-sm md:text-base font-black text-[#2D3436] tracking-tight cursor-pointer hover:opacity-80"
              >
                TAIWAN WANDERLUST <span className="opacity-30 font-normal mx-1">|</span> <span className="text-[9px] md:text-[10px] text-gray-400 font-bold tracking-widest">{time.toLocaleTimeString('en-US', { timeZone: 'Asia/Taipei', hour12: false })}</span>
              </h1>
            </div>
          </div>
          
          <button 
            onClick={locateUser}
            className="md:hidden p-2 rounded-full bg-gray-50 text-gray-400 hover:text-indigo-500 transition-colors"
          >
            <MapPin className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 w-full md:max-w-md lg:max-w-lg md:mx-6">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#2D3436] transition-colors" />
            <input 
              type="text" 
              placeholder="搜索餐厅、景点、标签…" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 md:h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full font-medium focus:outline-none focus:ring-0 focus:border-[#2D3436] focus:bg-white transition-all text-xs md:text-sm"
            />
          </div>
        </div>

        <div className="hidden md:flex gap-3 items-center">
          <button 
            onClick={locateUser}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-gray-50 text-gray-600 font-bold text-[11px] transition-colors border border-gray-200"
            title="Locate me and find nearby spots"
          >
            <MapPin className="w-3.5 h-3.5" /> 定位周边
          </button>
          
          <button 
            onClick={() => setActiveTab(activeTab === 'info' ? 'explore' : 'info')}
            className={cn(
              "px-3 py-1.5 rounded-full border font-bold text-[11px] transition-colors shadow-sm",
              activeTab === 'info' ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            旅行资讯
          </button>
          
          <button 
            onClick={() => setActiveTab(activeTab === 'itinerary' ? 'explore' : 'itinerary')}
            className={cn(
              "px-3 py-1.5 rounded-full border font-bold text-[11px] transition-colors shadow-sm",
              activeTab === 'itinerary' ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            我的行程
          </button>
          
          <button 
            onClick={() => setActiveTab(activeTab === 'expense' ? 'explore' : 'expense')}
            className={cn(
              "px-3 py-1.5 rounded-full border font-bold text-[11px] transition-colors shadow-sm",
              activeTab === 'expense' ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            <Wallet className="w-3.5 h-3.5 inline-block mr-1" />
            财务
          </button>
        </div>
      </header>

      <main id="scroll-container-main" onScroll={handleScroll} className="flex-1 flex flex-col lg:flex-row gap-4 p-2 md:p-4 lg:p-6 overflow-y-auto no-scrollbar w-full max-w-[1400px] mx-auto pb-20 md:pb-6">
        {/* LEFT SIDEBAR (Regions + Op Hours + Filters + Route) */}
        {activeTab === 'explore' && (
          <aside className="flex flex-col gap-3 flex-shrink-0 pb-4 lg:pb-10 w-full lg:w-[240px] mt-2 md:mt-0">
            
            <div className="hidden lg:flex flex-col gap-1 px-1 mt-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em]">Destinations</span>
              <h3 className="text-lg font-black text-[#2D3436] tracking-tight">探索区域</h3>
            </div>

            {/* Regions navigation */}
            <div className="flex flex-row lg:flex-col gap-1 lg:gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-2 lg:pb-0 px-1 lg:px-0 mt-1">
              <button 
                  onClick={() => { setActiveRegionId('all'); setActiveTab('explore'); setSearchQuery(''); setActiveZone(null); }}
                  className={cn(
                    "py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-[80px] lg:min-w-0 relative group",
                    activeRegionId === 'all' && activeTab === 'explore'
                      ? "bg-[#2D3436] text-white shadow-xl shadow-[#2D3436]/10 transform lg:translate-x-1"
                      : "bg-transparent text-gray-500 hover:bg-white hover:text-[#2D3436] hover:shadow-sm"
                  )}
                >
                  <span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">🌍</span>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none whitespace-nowrap">全部区域</span>
                </button>
              {regions.map(r => (
                  <button 
                  key={r.id}
                  onClick={() => { setActiveRegionId(r.id); setActiveTab('explore'); setSearchQuery(''); setActiveZone(null); }}
                  className={cn(
                    "py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-[80px] lg:min-w-0 relative group",
                    activeRegionId === r.id && activeTab === 'explore'
                      ? "bg-[#2D3436] text-white shadow-xl shadow-[#2D3436]/10 transform lg:translate-x-1"
                      : "bg-transparent text-gray-500 hover:bg-white hover:text-[#2D3436] hover:shadow-sm"
                  )}
                >
                  <span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">{r.em}</span>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none whitespace-nowrap">{r.name}</span>
                </button>
              ))}
              <button 
                  onClick={() => { setActiveRegionId('custom'); setActiveTab('explore'); setSearchQuery(''); setActiveZone(null); }}
                  className={cn(
                    "py-2 px-4 lg:py-3 lg:h-14 flex-shrink-0 rounded-2xl flex flex-col lg:flex-row items-center justify-center lg:justify-start transition-all gap-1 lg:gap-4 min-w-[80px] lg:min-w-0 relative group",
                    activeRegionId === 'custom' && activeTab === 'explore'
                      ? "bg-[#2D3436] text-white shadow-xl shadow-[#2D3436]/10 transform lg:translate-x-1"
                      : "bg-transparent text-gray-500 hover:bg-white hover:text-[#2D3436] hover:shadow-sm"
                  )}
                >
                  <span className="text-xl lg:text-2xl flex-shrink-0 leading-none group-hover:scale-110 transition-transform">🌟</span>
                  <span className="text-[10px] md:text-[11px] font-black uppercase tracking-widest leading-none whitespace-nowrap">新加店面</span>
                </button>
            </div>

            {/* Operating Hours */}
            <div className="pt-2 flex flex-col gap-3">
              <h4 className="font-bold tracking-widest text-xs opacity-80 text-gray-500 flex items-center justify-between px-1">
                <span className="flex flex-col">
                  <span className="text-[#2D3436]">营业时间查询</span>
                  <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-0.5">Operating Hours</span>
                </span>
                {openAtTime && <button onClick={() => setOpenAtTime('')} className="bg-gray-100 px-2 py-0.5 rounded text-[10px] hover:bg-gray-200">清除</button>}
              </h4>
              <div className="flex gap-2">
                <input 
                  type="time" 
                  value={openAtTime}
                  onChange={e => setOpenAtTime(e.target.value)}
                  className="bg-white text-gray-700 font-bold tracking-widest rounded-xl px-3 py-2 border-transparent shadow-sm focus:border-[#2D3436] focus:ring-1 focus:ring-[#2D3436] text-sm flex-1 outline-none transition-all"
                />
                <button 
                  onClick={() => {
                    const d = new Date();
                    setOpenAtTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                  }}
                  className="bg-white text-gray-500 hover:text-gray-800 shadow-sm font-bold rounded-xl px-3 py-2 text-xs transition-colors flex flex-col items-center justify-center whitespace-nowrap min-w-[70px]"
                >
                  <span>当前时间</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 scale-90">Now</span>
                </button>
              </div>
            </div>

            {/* Smart Filters */}
            <div className="pt-4 flex flex-col gap-4">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="font-bold text-sm border-b border-gray-200/50 pb-2 flex items-center justify-between gap-2 w-full text-left px-1"
              >
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400"/> 
                  <span className="flex flex-col">
                    <span className="text-[#2D3436]">智能筛选</span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-0.5">Smart Filters</span>
                  </span>
                </div>
                <span className="text-gray-400 text-xs">{showFilters ? '▲' : '▼'}</span>
              </button>
              
              {showFilters && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                  {filterGroups.map(group => (
                    <div key={group.id} className="bg-gray-50/50 p-2.5 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-1.5 mb-2.5 px-1">
                        <div className={cn("w-1.5 h-3.5 rounded-full", group.color)}></div>
                        <span className="text-[10px] font-black text-[#2D3436] uppercase tracking-widest">{group.name} / {group.label}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map(item => {
                          const isActive = activeFilters.includes(item);
                          return (
                            <button 
                              key={item} 
                              onClick={() => {
                                setActiveFilters(prev => prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]);
                              }}
                              className={cn(
                                "px-3 py-1.5 text-[11px] font-bold rounded-xl transition-all duration-200 border", 
                                isActive 
                                  ? `${group.color} text-white shadow-md border-transparent` 
                                  : "bg-white text-gray-500 hover:bg-white hover:text-[#2D3436] border-transparent hover:border-gray-200 hover:shadow-sm"
                              )}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {activeFilters.includes('酒') && (
                    <div className="bg-red-50/50 p-2.5 rounded-2xl border border-red-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                      <div className="text-red-500 font-bold mt-0.5">!</div>
                      <div className="text-[10px] text-red-600 font-bold leading-tight">
                        <p>未滿十八歲禁止飲酒。</p>
                        <p>飲酒過量，有害（礙）健康。</p>
                        <p>酒後不開車，安全有保障。</p>
                      </div>
                    </div>
                  )}

                  <button onClick={() => setActiveFilters([])} className="mt-2 text-[11px] font-bold text-gray-400 text-center w-full block hover:text-gray-600 focus:outline-none transition-colors">
                    重置所有筛选 (Clear Filters)
                  </button>
                </div>
              )}
            </div>

            {/* Route Builder */}
            {routeItems.length > 0 && (
              <div className="pt-4 flex flex-col flex-shrink-0 max-h-[300px]">
                <h4 className="font-bold text-sm border-b border-gray-200/50 pb-2 flex items-center gap-2 mb-3 text-[#2D3436] px-1">
                  <Map className="w-4 h-4 text-[#2D3436]"/> 
                  <span className="flex flex-col">

                    <span>行程构建器</span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400 mt-0.5">Route Builder ({routeItems.length})</span>
                  </span>
                </h4>
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-4">
                  {routeItems.map((r, i) => (
                    <div key={r.uid || `${r.n}-${i}`} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0 shadow-sm border border-gray-200">
                          {i + 1}
                        </div>
                        <span className="text-[11px] font-bold truncate text-gray-700">{r.n}</span>
                      </div>
                      <button onClick={() => toggleRoute(r)} className="text-gray-400 hover:text-red-500 ml-2">
                        ✖
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-auto pt-2">
                  <button 
                    className="bg-[#2D3436] text-white hover:bg-black px-4 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors whitespace-nowrap"
                    onClick={optimizeRoute}
                  >
                    智能排列 ✨
                  </button>
                  <button 
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors whitespace-nowrap"
                    onClick={() => setRouteItems([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        <div id="scroll-container-mobile" className="flex-1 flex flex-col min-w-0 no-scrollbar gap-4 relative">
          {/* Central Content */}
          <section className="relative flex-1 flex flex-col gap-4 min-w-0 lg:pr-2">
          {activeTab === 'explore' ? (
            <>
              {/* Region Header & Zone Filter */}
              <div className="flex-shrink-0 pt-2 pb-4 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl md:text-3xl font-black text-[#2D3436] tracking-tight">{searchQuery ? 'Search Results' : (activeRegionId === 'all' ? '全部区域' : activeRegion?.name)}</h2>
                    {!searchQuery && activeRegionId !== 'all' && <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest border border-gray-200 rounded px-1.5 py-0.5">{activeRegion?.day}</span>}
                  </div>
                  {!searchQuery && (
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Curated Destinations</span>
                      <button onClick={() => setShowAddStoreModal(true)} className="bg-[#2D3436] text-white px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors"><Plus className="w-3 h-3" /> 新增店面</button>
                    </div>
                  )}
                </div>
                
                {!searchQuery && zonesInRegion.length > 1 && (
                  <div className="mt-2">
                    <button 
                      onClick={() => setShowZones(!showZones)}
                      className="flex items-center gap-2 text-[11px] font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5" /> 区域筛选 (Zone Filter) <span className="opacity-50">{showZones ? '▲' : '▼'}</span>
                    </button>
                    {showZones && (
                      <div className="flex flex-wrap gap-1.5 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <button 
                          onClick={() => setActiveZone(null)}
                          className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border", activeZone === null ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}
                        >
                          全部 (All Zones)
                        </button>
                        {zonesInRegion.map(z => (
                          <button 
                            key={z}
                            onClick={() => setActiveZone(z)}
                            className={cn("px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border", activeZone === z ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-500 border-gray-200 hover:border-gray-300")}
                          >
                            {z}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cards Grid */}
              <div id="scroll-container-desktop" className="flex-1 no-scrollbar pb-8 pt-1 px-1 relative">
                {filteredLocs.length === 0 ? (
                  searchQuery.trim() !== '' ? (
                    <div className="flex flex-col items-center justify-center p-8 mt-4">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">没找到与 "{searchQuery}" 相关的结果</h3>
                      <p className="text-sm text-gray-500 mb-6 text-center">数据库里暂时没有这个地点的记录，不过没关系！我们可以去问问 AI。</p>
                      
                      <button 
                        onClick={() => {
                          const prompt = `我正在寻找关于 "${searchQuery}" 的地点信息。\n\n【如果这是一个连锁品牌或有多个分店】：请先简单列出主要的分店选项，向我确认是哪一家。\n【当我说出具体分店后（或如果只有一家店）】：请根据以下九大模块，给我一份极其详细的说明：\n1. 店面背景与特色 (有什么特别的？人家都介绍什么？如果马来西亚也有这个店，有什么是马来西亚没有这边有的)\n2. 推荐体验与必做什么 (What to do)\n3. 必吃/必买 (Must eat/buy)\n4. 避雷指南 (Pitfalls to avoid)\n5. 推荐指数 (Recommendation index)\n6. 营业时间\n7. 实用提示 (Tips)\n8. 地理位置与交通 (How to go)\n9. 其他补充\n\n另外，我还需要你提供：\n- 人均消费估计\n- 是否有抵消（低消）规则及具体金额\n- 综合的网络评价（褒贬都要有）\n- Google Map 的搜索链接\n- Apple Map 的搜索链接`;
                          navigator.clipboard.writeText(prompt).then(() => {
                            alert('Prompt 已复制！现在带你去 Gemini 询问！请在输入框粘贴 (Ctrl+V 或 Cmd+V)。');
                            window.open('https://gemini.google.com/app', '_blank');
                          }).catch(() => {
                            const userCopy = window.prompt('自动复制失败 😢 因为浏览器安全限制，请手动复制（Cmd+C 或 Ctrl+C）以下文字，然后按确定：', prompt);
                            if (userCopy !== null) {
                              window.open('https://gemini.google.com/app', '_blank');
                            }
                          });
                        }}
                        className="bg-[#2D3436] hover:bg-black text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                      >
                        ✨ 去 Gemini AI 问问看！
                      </button>
                      <p className="text-[10px] text-gray-400 mt-3">(会自动复制专属 Prompt)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 mt-4 text-center">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">没有符合筛选条件的结果</h3>
                      <p className="text-sm text-gray-500">请尝试调整选项或重置过滤条件。</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {filteredLocs.map((loc, idx) => {
                      const isCompared = compareSelected.find(c => (c.uid && c.uid === loc.uid) || (!c.uid && c.n === loc.n));
                      const isRouted = routeItems.find(r => (r.uid && r.uid === loc.uid) || (!r.uid && r.n === loc.n));
                      const isExpanded = expandedCardId === loc.uid;
                    
                    const borderColors = ['rgba(253,121,168,1)', 'rgba(116,185,255,1)', 'rgba(162,155,254,1)', 'rgba(250,177,160,1)', 'rgba(85,239,196,1)'];
                    const shadowColor = borderColors[idx % borderColors.length];
                    const tagBg = ['#FD79A8', '#74B9FF', '#A29BF6', '#FAB1A0', '#00B894'][idx % 5];
                    
                    return (
                      <div 
                        key={loc.uid} 
                        className={cn("loc-card bg-white p-3 rounded-2xl border flex flex-col justify-between transition-all duration-300", isExpanded ? "col-span-full shadow-md border-gray-200" : "border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200")} 
                        onClick={(e) => {
                          if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                          
                          if (loc.isInfoItem) {
                            setActiveTab('info');
                            setSearchQuery('');
                            return;
                          }
                          setExpandedCardId(isExpanded ? null : loc.uid);
                        }}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-white px-2 py-0.5 rounded uppercase" style={{ backgroundColor: tagBg }}>
                              {loc.t}
                            </span>
                            <button 
                              onClick={() => toggleCompare(loc)}
                              className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors", isCompared ? "bg-[#2D3436] text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200")}
                            >
                              {isCompared ? '✓' : '📊 VS'}
                            </button>
                          </div>
                          
                          <div className="flex flex-col mb-2">
                            <h3 className="text-[15px] md:text-lg font-black leading-tight line-clamp-2 pr-2">{loc.n} {loc.closed && <span className="text-[10px] font-bold text-red-500 ml-1 rounded border border-red-500 px-1 inline-block whitespace-nowrap align-middle">已关闭</span>}</h3>
                            {!isExpanded && loc.f && (
                              <p className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-2">{loc.f}</p>
                            )}
                          </div>
                          
                          {(!isExpanded && (loc.cuisine || (loc.tags && loc.tags.length > 0))) && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                              {loc.cuisine && <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{loc.cuisine}</span>}
                              {loc.tags?.map(t => <span key={t} className="text-[9px] font-bold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{t}</span>)}
                            </div>
                          )}

                            <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-[#FF7675]">
                              {Array.from({length: loc.s || 5}).map((_, i) => <span key={i}>★</span>)}
                              {loc.price && (
                                <span className="ml-1.5 font-black text-[9px] md:text-[10px] text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">
                                  人均: {loc.price === 'cheap' ? 'NT$ 200⬇' : loc.price === 'mid' ? 'NT$ 200~800' : 'NT$ 800⬆'}
                                </span>
                              )}
                              {loc.minSpend && (
                                <span className="ml-1 font-bold text-[9px] md:text-[10px] text-red-500 bg-red-50 flex items-center px-1 rounded border border-red-200">
                                  低消: {loc.minSpend}
                                </span>
                              )}
                            </div>
                          
                          {loc.zone && <div className="text-[10px] md:text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1 line-clamp-1"><MapPin className="w-3 h-3 flex-shrink-0"/> {loc.zone}</div>}
                          
                          {isExpanded && (
                            <div className="mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="text-sm font-medium text-[#2D3436] space-y-2">

                                {loc.f && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">特 色</span> <span className="leading-snug">{loc.f}</span></div>}
                                {loc.do && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">干 啥</span> <span className="leading-snug">{loc.do}</span></div>}
                                {loc.eat && (
                                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                    <span className="font-bold text-gray-500 uppercase text-[10px] tracking-widest block mb-0.5">必吃推荐</span>
                                    <span className="leading-snug font-medium text-gray-700">{loc.eat}</span>
                                  </div>
                                )}
                                {loc.how && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">🚗 怎么去</span> <span className="leading-snug">{loc.how}</span></div>}
                                {loc.w && (
                                  <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                                    <span className="font-bold text-red-500 uppercase text-[10px] tracking-widest block mb-0.5">避雷</span>
                                    <span className="text-red-700 leading-snug">{loc.w}</span>
                                  </div>
                                )}
                                {loc.r && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">网络评价</span> <span className="italic text-gray-500 leading-snug">{loc.r}</span></div>}
                                {(loc.h || loc.cl) && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">营业时间</span> <span className="leading-snug">{hrsStr(loc.h)} {loc.cl ? `· 🚫 ${loc.cl}` : ''}</span></div>}
                                
                                {loc.tips && (
                                  <div className="bg-sky-50 p-3 rounded-xl border border-sky-100">
                                    <span className="font-bold text-sky-600 uppercase text-[10px] tracking-widest block mb-0.5">Tips</span>
                                    <span className="text-sky-800 leading-snug">{loc.tips}</span>
                                  </div>
                                )}
                                
                                <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-xl relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold text-gray-600 text-[11px] flex items-center gap-1">✏️ 我的备注 (可实时同步)</span>
                                    <div className="flex gap-2 items-center">
                                      <div className="flex gap-1">
                                        <button onClick={() => handleRemarkUndo(loc.uid)} disabled={!storeRemarks[loc.uid]?.history?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50 hover:bg-gray-100">撤销</button>
                                        <button onClick={() => handleRemarkRedo(loc.uid)} disabled={!storeRemarks[loc.uid]?.future?.length} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[9px] disabled:opacity-50 hover:bg-gray-100">重做</button>
                                      </div>
                                      {loc.isCustom && (
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const index = customStores.findIndex(c => c.uid === loc.uid);
                                            setDeletedCustomStore({ item: loc, index });
                                            setCustomStores(prev => prev.filter(c => c.uid !== loc.uid));
                                          }}
                                          className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-[9px] font-bold hover:bg-red-100"
                                        >
                                          🗑️ 删除店面
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <textarea 
                                    className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm text-gray-700 min-h-[60px] focus:outline-none focus:border-indigo-300 resize-none"
                                    placeholder="在这里记录你的专属评价、想买的东西、或者任何 Markdown 笔记..."
                                    value={storeRemarks[loc.uid]?.text || ''}
                                    onChange={(e) => handleRemarkUpdate(loc.uid, e.target.value)}
                                  />
                                </div>

                                {loc.isInfoItem && loc.hours && (
                                   <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">营业时间</span> <span className="leading-snug">{loc.hours}</span></div>
                                )}
                                {loc.how && !loc.isInfoItem && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">怎么去</span> <span className="leading-snug">🚇 {loc.how}</span></div>}
                              </div>
                              
                              <div className="flex gap-2 mt-5">
                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.gq || loc.n)}`} target="_blank" rel="noreferrer" className="flex-1 text-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-2 text-[11px] font-bold text-gray-700 transition-colors">
                                  🗺️ Google
                                </a>
                                <a href={`https://maps.apple.com/?q=${encodeURIComponent(loc.n)}`} target="_blank" rel="noreferrer" className="flex-1 text-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-2 text-[11px] font-bold text-gray-700 transition-colors">
                                  🍎 Apple
                                </a>
                              </div>
    
                              {loc.chain && (
                                <a href={`https://www.google.com/maps/search/${encodeURIComponent(loc.n + ' 分店')}`} target="_blank" rel="noreferrer" 
                                   className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 py-2 rounded-xl w-full transition-colors">
                                  <Search className="w-3 h-3"/> Find Nearby Branches
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-5 border-t border-gray-100 pt-4">
                          <div className="flex flex-wrap gap-1 max-w-[65%]">
                            {(loc.tags || []).slice(0,2).map((t: string) => (
                              <span key={t} className="bg-gray-50 text-gray-500 text-[10px] font-bold px-2 py-1 rounded border border-gray-200">
                                {t}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const prompt = `我正在寻找关于 "${loc.n}" 的地点信息，请根据以下九大模块，给我一份极其详细的说明：\n1. 店面背景与特色 (有什么特别的？人家都介绍什么？如果马来西亚也有这个店，有什么是马来西亚没有这边有的)\n2. 推荐体验与必做什么 (What to do)\n3. 必吃/必买 (Must eat/buy)\n4. 避雷指南 (Pitfalls to avoid)\n5. 推荐指数 (Recommendation index)\n6. 营业时间\n7. 实用提示 (Tips)\n8. 地理位置与交通 (How to go)\n9. 其他补充\n\n另外，我还需要你提供：\n- 人均消费估计\n- 是否有抵消（低消）规则及具体金额\n- 综合的网络评价（褒贬都要有）\n- Google Map 的搜索链接\n- Apple Map 的搜索链接`;
                                navigator.clipboard.writeText(prompt).then(() => {
                                  alert('Prompt 已复制！现在带你去 Gemini 询问！请在输入框粘贴 (Ctrl+V 或 Cmd+V)。');
                                  window.open('https://gemini.google.com/app', '_blank');
                                }).catch(() => {
                                  const userCopy = window.prompt('自动复制失败 😢 因为浏览器安全限制，请手动复制（Cmd+C 或 Ctrl+C）以下文字，然后按确定：', prompt);
                                  if (userCopy !== null) {
                                    window.open('https://gemini.google.com/app', '_blank');
                                  }
                                });
                              }}
                              className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-500 border border-indigo-200"
                              title="问 AI 这个店的详情"
                            >
                              <Sparkles className="w-5 h-5 stroke-[2.5]" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (loc.isInfoItem) {
                                  setActiveTab('info');
                                  setSearchQuery('');
                                  return;
                                }
                                toggleRoute(loc);
                              }}
                              className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                                isRouted ? "bg-[#2D3436] text-white shadow-sm" : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                                , loc.isInfoItem && "bg-indigo-50 border-indigo-200 text-indigo-500 hover:bg-indigo-100"
                              )}
                            >
                              {loc.isInfoItem ? <ChevronRight className="w-5 h-5" /> : (isRouted ? <Check className="w-5 h-5 stroke-[3]" /> : <Plus className="w-5 h-5 stroke-[3]" />)}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Append a Gemini AI prompt card if user searches */}
                  {searchQuery.trim() !== '' && (
                    <div className="loc-card bg-indigo-50/50 p-6 flex flex-col items-center justify-center text-center transition-all duration-300 border-2 border-dashed border-indigo-200 rounded-2xl hover:bg-indigo-50">
                      <div className="text-3xl mb-3 border bg-white w-14 h-14 rounded-full flex items-center justify-center shadow-sm">✨</div>
                      <h4 className="text-indigo-900 font-bold mb-2 text-sm md:text-base">没找到心仪的选项？</h4>
                      <p className="text-[11px] md:text-sm text-indigo-700/80 mb-5 px-2">想发掘更多关于 "{searchQuery}" 的隐藏宝藏地点？让 AI 帮您深度搜索吧！</p>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const prompt = `我正在寻找关于 "${searchQuery}" 的地点信息。\n\n【如果这是一个连锁品牌或有多个分店】：请先简单列出主要的分店选项，向我确认是哪一家。\n【当我说出具体分店后（或如果只有一家店）】：请根据以下九大模块，给我一份极其详细的说明：\n1. 店面背景与特色 (有什么特别的？人家都介绍什么？如果马来西亚也有这个店，有什么是马来西亚没有这边有的)\n2. 推荐体验与必做什么 (What to do)\n3. 必吃/必买 (Must eat/buy)\n4. 避雷指南 (Pitfalls to avoid)\n5. 推荐指数 (Recommendation index)\n6. 营业时间\n7. 实用提示 (Tips)\n8. 地理位置与交通 (How to go)\n9. 其他补充\n\n另外，我还需要你提供：\n- 人均消费估计\n- 是否有抵消（低消）规则及具体金额\n- 综合的网络评价（褒贬都要有）\n- Google Map 的搜索链接\n- Apple Map 的搜索链接`;
                          navigator.clipboard.writeText(prompt).then(() => {
                            alert('Prompt 已复制！现在带你去 Gemini 询问！请在输入框粘贴 (Ctrl+V 或 Cmd+V)。');
                            window.open('https://gemini.google.com/app', '_blank');
                          }).catch(() => {
                            const userCopy = window.prompt('自动复制失败 😢 因为浏览器安全限制，请手动复制（Cmd+C 或 Ctrl+C）以下文字，然后按确定：', prompt);
                            if (userCopy !== null) {
                              window.open('https://gemini.google.com/app', '_blank');
                            }
                          });
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" /> 去 Gemini AI 问问看
                      </button>
                    </div>
                  )}
                </div>
              )}
              </div>
              
              {/* Compare Floating CTA */}
              {compareSelected.length >= 2 && (
                <div className="fixed lg:absolute bottom-[110px] left-1/2 -translate-x-1/2 bg-white text-[#2D3436] px-3 py-2 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 z-20 animate-in slide-in-from-bottom-8 duration-300 border border-gray-100">
                  <div className="pl-3 pr-1">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 whitespace-nowrap">已选 {compareSelected.length} 项</span>
                  </div>
                  
                  <div className="w-px h-3 bg-gray-200"></div>
                  
                  <button onClick={executeCompare} className="flex items-center gap-1.5 hover:text-[#2D3436] text-gray-500 transition-colors text-[11px] font-bold whitespace-nowrap bg-gray-50 hover:bg-gray-100 border border-gray-100 px-4 py-1.5 rounded-full">
                    <Sparkles className="w-3.5 h-3.5 text-gray-600" />
                    AI 智能对比
                  </button>
                  
                  <button onClick={() => setCompareSelected([])} className="w-7 h-7 rounded-full bg-white hover:bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors border border-transparent hover:border-gray-100">
                    <span className="text-[10px] font-bold">✕</span>
                  </button>
                </div>
              )}
            </>
           ) : activeTab === 'info' ? (
             <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:h-full lg:overflow-y-auto no-scrollbar shadow-sm">
                <InfoPanel />
             </div>
           ) : activeTab === 'expense' ? (
             <div className="bg-white rounded-2xl border border-gray-100 lg:h-full lg:overflow-y-auto no-scrollbar shadow-sm">
                <ExpensePanel />
             </div>
           ) : activeTab === 'itinerary' ? (
             <div className="bg-white rounded-2xl border border-gray-100 p-6 lg:h-full lg:overflow-y-auto no-scrollbar shadow-sm">
                <ItineraryPanel onLocationClick={(loc) => {
                  setActiveRegionId(loc.regionId || 'all');
                  setSearchQuery(loc.n);
                  setActiveTab('explore');
                  // Give UI time to render results before expanding
                  setTimeout(() => setExpandedCardId(loc.uid), 100);
                }} />
             </div>
           ) : null}
        </section>
        </div>

        {/* Bottom Nav for Mobile */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex items-center justify-around h-[calc(4rem+env(safe-area-inset-bottom))] pb-[env(safe-area-inset-bottom)] px-4 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
          <button 
            onClick={() => setViewMode('landing')}
            className="flex flex-col items-center gap-1 flex-1 transition-all text-gray-400 hover:text-[#2D3436]"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-tighter">首页</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('explore')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 transition-all",
              activeTab === 'explore' ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <Map className={cn("w-5 h-5", activeTab === 'explore' ? "fill-indigo-50" : "")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">探索</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('itinerary')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 transition-all",
              activeTab === 'itinerary' ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <Calendar className={cn("w-5 h-5", activeTab === 'itinerary' ? "fill-indigo-50" : "")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">我的行程</span>
          </button>

          <button 
            onClick={() => setActiveTab('info')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 transition-all",
              activeTab === 'info' ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <Info className={cn("w-5 h-5", activeTab === 'info' ? "fill-indigo-50" : "")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">旅行资讯</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('expense')}
            className={cn(
              "flex flex-col items-center gap-1 flex-1 transition-all",
              activeTab === 'expense' ? "text-indigo-600" : "text-gray-400"
            )}
          >
            <Wallet className={cn("w-5 h-5", activeTab === 'expense' ? "fill-indigo-50" : "")} />
            <span className="text-[10px] font-black uppercase tracking-tighter">财务</span>
          </button>
        </div>

        {/* Back to Top */}
        {showTopBtn && (
          <button 
            onClick={scrollToTop}
            className="fixed bottom-20 right-6 md:bottom-8 md:right-8 w-12 h-12 bg-[#2D3436] text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex flex-col items-center justify-center z-50 hover:bg-black hover:-translate-y-1 transition-all duration-300 group animate-in fade-in slide-in-from-bottom-5"
          >
            <div className="w-2 h-2 border-t-2 border-l-2 border-white transform rotate-45 mt-1 group-hover:-translate-y-0.5 transition-transform"></div>
            <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-1">Top</span>
          </button>
        )}

        {/* Undo Toast */}
        {deletedRouteItem && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300 sm:min-w-[300px]">
            <span className="text-sm font-medium pr-2">
              已删除 <span className="font-bold">{deletedRouteItem.item.n}</span>
            </span>
            <button 
              onClick={undoDeleteRouteItem}
              className="text-[#00cec9] hover:text-white transition-colors text-sm font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              撤销 Undo
            </button>
          </div>
        )}
      </main>
      {/* Locate Me Modal Redesign */}
      {showLocateModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setShowLocateModal(false)}
        >
          <div 
            className="bg-white rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl relative overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Map Background Pattern */}
            <div className="absolute top-0 left-0 w-full h-32 bg-gray-50 flex items-center justify-center overflow-hidden">
              <div className="absolute w-64 h-64 border border-gray-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '3s' }} />
              <div className="absolute w-40 h-40 border border-gray-200 rounded-full animate-ping opacity-50" style={{ animationDuration: '2s' }} />
              <div className="w-16 h-16 bg-[#2D3436] rounded-full flex items-center justify-center shadow-lg relative z-10">
                <Navigation className="w-6 h-6 text-white fill-current" />
              </div>
            </div>
            
            <div className="mt-28 mb-6 text-center">
              <h3 className="text-2xl font-black text-[#2D3436] mb-2 tracking-tight">定位探索</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed px-4">
                我们将扫描您的附近区域，并优先推荐符合距离限制的精选地点。
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {['100m (步行)', '500m (附近)', '1km (探索)', '3km (开车)'].map((distLabel, i) => {
                const dist = distLabel.split(' ')[0];
                const label = distLabel.split(' ')[1].replace(/[()()]/g, '');
                return (
                  <button 
                    key={distLabel}
                    onClick={() => handleLocateSelect(dist)}
                    className={cn(
                      "group flex flex-col items-center justify-center py-4 rounded-2xl border transition-all duration-300",
                      "bg-white border-gray-100 text-gray-600 hover:text-[#2D3436] hover:border-gray-300 hover:shadow-sm"
                    )}
                  >
                    <span className="text-xl font-black mb-1 text-[#2D3436]">{dist}</span>
                    <span className="text-[11px] font-bold tracking-wider opacity-90">{label}</span>
                  </button>
                )
              })}
            </div>
            <button 
              onClick={() => setShowLocateModal(false)}
              className="w-full bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-600 font-bold py-3 rounded-xl transition-colors border border-gray-100"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Add Custom Store Modal */}
      {showAddStoreModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-[#2D3436] mb-4">✨ 新增店面 / 地点</h3>
            
            {addStoreStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">店面/地点名称</label>
                  <input type="text" value={newStoreName} onChange={e => setNewStoreName(e.target.value)} placeholder="例如：一兰拉面 (台北本店)" className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">所属区域 (可选)</label>
                  <input type="text" value={newStoreZone} onChange={e => setNewStoreZone(e.target.value)} placeholder="例如：信义区 (留空则使用 AI 判断)" className="w-full p-3 border-2 border-gray-100 rounded-xl bg-gray-50 focus:bg-white focus:border-indigo-300 outline-none transition-all font-medium text-sm" />
                </div>
                <button 
                  onClick={handleAddStoreAI}
                  disabled={!newStoreName.trim()}
                  className="w-full bg-indigo-500 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 hover:bg-indigo-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  <Sparkles className="w-5 h-5" /> 向 Gemini 获取资料
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2 leading-relaxed">点击后会自动复制特定的提示词并打开 Gemini。<br/>请在 Gemini 粘贴后将回复的 JSON 代码带回这里。</p>
              </div>
            )}

            {addStoreStep === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="flex items-center gap-2 mb-2">
                  <button onClick={() => setAddStoreStep(1)} className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">返回</button>
                  <span className="text-xs font-bold text-indigo-500">第二步：粘贴 JSON 结果</span>
                </div>
                <textarea 
                  value={newStoreJson}
                  onChange={e => setNewStoreJson(e.target.value)}
                  placeholder='在这里粘贴 Gemini 回复的 { "n": "..." } 格式代码'
                  className="w-full h-48 p-3 border-2 border-indigo-100 rounded-xl bg-indigo-50/30 focus:bg-white focus:border-indigo-300 outline-none transition-all font-mono text-xs"
                />
                <button 
                  onClick={saveCustomStore}
                  disabled={!newStoreJson.trim()}
                  className="w-full bg-[#2D3436] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-2 hover:bg-black active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  <Check className="w-5 h-5" /> 保存新店面
                </button>
              </div>
            )}

            <button onClick={() => setShowAddStoreModal(false)} className="mt-4 w-full text-center text-xs font-bold text-gray-400 hover:text-gray-600 p-2">
              取消并关闭
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

