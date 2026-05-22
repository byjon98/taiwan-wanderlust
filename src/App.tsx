import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from './store';
import { regions } from './data';
import { souvenirModules, groceryModules } from './data/info';
import InfoPanel from './components/InfoPanel';
import ItineraryPanel from './components/ItineraryPanel';
import ExpensePanel from './components/ExpensePanel';
import { Clock as ClockIcon, Search, Map, Filter, ArrowUpDown, Info, Check, Plus, ShoppingBag, MapPin, ExternalLink, Scale, Navigation, Sparkles, ChevronRight, Calendar, Home, Wallet, ArrowUp, X } from 'lucide-react';
import { MapComponent } from './components/MapComponent';
import { Clock } from './components/Clock';
import { WeatherWidget } from './components/WeatherWidget';
import { Store, RouteItem } from './types';
import { ToastContainer, toast } from './components/Toast';
import { motion, AnimatePresence } from 'motion/react';
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

const flattenedInfoLocs = [...souvenirModules, ...groceryModules].flatMap(mod => 
  mod.items.map((item, i) => ({
    ...item,
    t: mod.name,
    f: item.d,
    s: 5,
    zone: mod.name,
    price: item.price.includes('NT$ 800') ? 'exp' : (item.price.includes('NT$ 200') ? 'mid' : 'cheap'),
    eat: item.buy,
    tips: item.tip,
    r: item.eval,
    uid: `info-${mod.id}-${i}`,
    region: '旅行资讯',
    regionId: 'info',
    isInfoItem: true,
    moduleId: mod.id,
    h: [],
    cl: '',
    how: mod.name
  }))
);

export default function App() {
  const {
    viewMode, setViewMode,
    activeRegionId, setActiveRegionId,
    searchQuery, setSearchQuery,
    routeItems, setRouteItems,
    customStores, setCustomStores,
    storeRemarks, setStoreRemarks,
    currentUser, setCurrentUser,
    isAppReady,
    hasVerifiedPin, setHasVerifiedPin
  } = useAppStore();

  const [pinInput, setPinInput] = useState('');

  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [focusedLocId, setFocusedLocId] = useState<string | null>(null);
  const [showRouteOnly, setShowRouteOnly] = useState(false);
  
  const [compareSelected, setCompareSelected] = useState<Store[]>([]);
  // Backward compatibility wrapper
  const handleUserToggle = () => {
    setCurrentUser(currentUser === 'Jon' ? 'June' : 'Jon');
  };

  const [deletedRouteItem, setDeletedRouteItem] = useState<{ item: RouteItem, index: number } | null>(null);
  const [deletedCustomStore, setDeletedCustomStore] = useState<{ item: Store, index: number } | null>(null);

  useEffect(() => {
    let timer1: NodeJS.Timeout;
    if (deletedRouteItem) timer1 = setTimeout(() => setDeletedRouteItem(null), 5000);
    return () => clearTimeout(timer1);
  }, [deletedRouteItem]);

  useEffect(() => {
    let timer2: NodeJS.Timeout;
    if (deletedCustomStore) timer2 = setTimeout(() => setDeletedCustomStore(null), 5000);
    return () => clearTimeout(timer2);
  }, [deletedCustomStore]);

  const getRegionIdForZone = (zone: string) => {
    if (!zone) return 'custom';
    for (const r of regions) {
      if (r.locs.some(l => l.zone === zone)) return r.id;
    }
    for (const r of regions) {
      if (r.locs.some(l => l.zone && (l.zone.includes(zone) || zone.includes(l.zone)))) return r.id;
    }
    return 'custom';
  };

  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [addStoreStep, setAddStoreStep] = useState<1|2>(1);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreZone, setNewStoreZone] = useState('');
  const [newStoreJson, setNewStoreJson] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiModel, setAiModel] = useState(localStorage.getItem('PREFERRED_AI_MODEL') || 'gemini-2.5-flash');

  const handleAddStoreAI = async () => {
    const storeTarget = newStoreName || searchQuery || "值得推荐的店面";
    const prompt = `作为专业的台湾旅游达人，请根据你的知识库为我介绍这家店(或相关推荐)："${storeTarget}"。
了解清楚它的特色、评价和营业时间后，请严格按照以下 JSON 格式输出结果，不要输出任何其他多余的文字或 markdown 标记（例如不要输出 \`\`\`json）：
{
  "n": "${newStoreName || '店名'}",
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
  "hours": "营业时间（如 10:00 - 22:00）",
  "lat": "该店的精准纬度(数字，例如 25.033。不要回答不知道或0，尽全力根据区位估算)",
  "lng": "该店的精准经度(数字，例如 121.564。不要回答不知道或0，尽全力根据区位估算)"
}`;

    let apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      apiKey = window.prompt("请输入您的 Gemini API Key（仅保存在本设备）：");
      if (!apiKey) {
        toast.error('需要 API Key 才能自动获取');
        return;
      }
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    }

    setIsAiLoading(true);
    toast.info('正在请求 AI 生成数据，请稍候...');

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: aiModel,
        contents: prompt
      });
      
      let rawJson = response.text;
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) rawJson = jsonMatch[0];
      
      setNewStoreJson(rawJson);
      setAddStoreStep(2);
      toast.success('AI 数据生成成功！请确认后保存。');
    } catch (e: any) {
      console.error(e);
      toast.error('AI 请求失败: ' + (e.message.includes('undefined') ? 'AI 未返回数据，可能命中安全策略' : e.message));
      if (e.message.includes('API Error 400') || e.message.includes('API Error 401') || e.message.includes('API Error 403')) {
        localStorage.removeItem('GEMINI_API_KEY');
        toast.error('API Key 似乎无效，已自动清除，请重新输入。');
      } else if (e.message.includes('API Error 429')) {
        toast.error('请求太频繁 (Rate Limit)，请稍后再试。');
      }
      // Fallback to manual clipboard
      navigator.clipboard.writeText(prompt).then(() => {
        toast.info('已回退至手动模式：Prompt 已复制，请前往 AI 粘贴');
        setAddStoreStep(2);
      }).catch(() => {
        toast.error('无法自动复制 Prompt，请重试');
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  const [isDiscoveringNearby, setIsDiscoveringNearby] = useState(false);

  const handleDiscoverNearbyAI = async () => {
    if (!nearbyFilter) {
      toast.error('请先使用定位功能');
      return;
    }

    let apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      apiKey = window.prompt("请输入您的 Gemini API Key 以使用 AI 探索功能（仅保存在本设备）：");
      if (!apiKey) {
        toast.error('需要 API Key 才能自动获取');
        return;
      }
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    }

    setIsDiscoveringNearby(true);
    toast.info('AI 正在扫描附近隐藏好店，请稍候...');

    const prompt = `作为专业的台湾旅游达人，用户当前的 GPS 坐标为纬度 ${nearbyFilter.lat}，经度 ${nearbyFilter.lng}。请根据你的知识库，推荐 3 家真实存在于这个位置 ${nearbyFilter.dist >= 1 ? nearbyFilter.dist + '公里' : (nearbyFilter.dist * 1000) + '米'} 范围内的优质店面或景点（最好是隐藏版美食，绝对不要推荐已经太泛滥的连锁店）。请严格按照以下 JSON 数组格式输出，不要输出任何其他文本或 markdown 标记：
[
  {
    "n": "店名",
    "f": "特色简述",
    "do": "必做体验（一句话）",
    "eat": "必吃/必买推荐（逗号分隔，如果没有可留空）",
    "w": "避雷指南（如果没有可留空）",
    "r": "网络评价摘要",
    "tips": "实用提示",
    "price": "cheap或mid或exp",
    "zone": "所属区域",
    "cuisine": "菜系/类型",
    "hours": "营业时间",
    "lat": 具体纬度数值,
    "lng": 具体经度数值,
    "tags": ["AI挖掘"]
  }
]`;

    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: aiModel,
        contents: prompt
      });
      
      let rawJson = response.text;
      const jsonMatch = rawJson.match(/\[[\s\S]*\]/);
      if (jsonMatch) rawJson = jsonMatch[0];
      
      const newItems = JSON.parse(rawJson);
      
      if (Array.isArray(newItems)) {
        const itemsWithUid = newItems.map((item: any) => ({
          ...item,
          uid: 'custom_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          s: 5,
          t: item.cuisine ? '餐厅' : '景点'
        }));
        
        setCustomStores(prev => [...prev, ...itemsWithUid]);
        toast.success(`成功挖掘到 ${itemsWithUid.length} 家附近好店！`);
      } else {
        throw new Error("AI 返回格式错误");
      }
    } catch (e: any) {
      console.error(e);
      toast.error('AI 请求失败: ' + (e.message.includes('undefined') ? 'AI 未返回数据，可能命中安全策略' : e.message));
      if (e.message.includes('API Error 400') || e.message.includes('API Error 401') || e.message.includes('API Error 403')) {
        localStorage.removeItem('GEMINI_API_KEY');
        toast.error('API Key 似乎无效，已自动清除，请重新输入。');
      } else if (e.message.includes('API Error 429')) {
        toast.error('请求太频繁 (Rate Limit)，请稍后再试。');
      }
    } finally {
      setIsDiscoveringNearby(false);
    }
  };

  const handleCopyPromptOnly = () => {
    const storeTarget = searchQuery || "值得推荐的店面";
    const prompt = `作为专业的台湾旅游达人，请根据你的知识库为我介绍这家店(或相关推荐)："${storeTarget}"。
了解清楚它的特色、评价和营业时间后，请严格按照以下 JSON 格式输出结果，不要输出任何其他多余的文字或 markdown 标记（例如不要输出 \`\`\`json）：
{
  "n": "店名",
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
  "hours": "营业时间（如 10:00 - 22:00）",
  "lat": "该店的精准纬度(数字，例如 25.033。不要回答不知道或0，尽全力根据区位估算)",
  "lng": "该店的精准经度(数字，例如 121.564。不要回答不知道或0，尽全力根据区位估算)"
}`;

    navigator.clipboard.writeText(prompt).then(() => {
      toast.success('Prompt 已复制！您可以去任何 AI 工具粘贴询问。');
    }).catch(() => {
      toast.error('自动复制失败，请手动尝试。');
    });
  };

  const saveCustomStore = () => {
    try {
      let rawJson = newStoreJson;
      const jsonMatch = rawJson.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        rawJson = jsonMatch[0];
      }
      const parsed = JSON.parse(rawJson);
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
      toast.success('添加成功！');
    } catch (e) {
      toast.error('JSON 格式错误，请检查是否完全粘贴了 AI 返回的 JSON 代码。');
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
  const [nearbyFilter, setNearbyFilter] = useState<{lat: number, lng: number, dist: number} | null>(null);
  
  useEffect(() => {
    // If user explicitly searches, clear the nearby filter
    if (searchQuery && nearbyFilter) {
      setNearbyFilter(null);
    }
  }, [searchQuery]);

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
      (Array.isArray(customStores) ? customStores : []).forEach(l => { if (l.zone) zones.add(l.zone); });
      return Array.from(zones);
    }
    if (activeRegionId === 'custom') {
      const zones = new Set((Array.isArray(customStores) ? customStores : []).map(l => l.zone).filter(Boolean));
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
    if (!timeStr) return true;
    
    let hours = loc.h;
    
    // Attempt to parse string hours if h is missing (for Custom Stores)
    if ((!hours || hours.length === 0) && loc.hours) {
      const times = [...loc.hours.matchAll(/(\d{1,2})[:：](\d{2})/g)];
      if (times.length >= 2) {
        let start = parseInt(times[0][1]) * 60 + parseInt(times[0][2]);
        let end = parseInt(times[1][1]) * 60 + parseInt(times[1][2]);
        if (end < start) end += 1440;
        hours = [[start, end]];
      }
    }
    
    if (!hours || hours.length === 0) return true;
    
    const [h, m] = timeStr.split(':').map(Number);
    const mins = h * 60 + m;
    
    return hours.some(([start, end]: number[]) => {
      if (end > 1440) {
        return mins >= start || mins <= (end - 1440);
      }
      return mins >= start && mins <= end;
    });
  };

  const filteredLocs = useMemo(() => {
    let allLocs: any[] = [];
    if (activeRegionId === 'all') {
      allLocs = regions.flatMap(r => r.locs.map((l, i) => ({ ...l, region: r.name, regionId: r.id, uid: `${r.id}-${i}-${l.n}` })));
    } else if (activeRegion) {
      allLocs = activeRegion.locs.map((l, i) => ({ ...l, region: activeRegion.name, regionId: activeRegion.id, uid: `${activeRegion.id}-${i}-${l.n}` }));
    }
    
    // Reverse custom stores to put newest first
    // Reverse custom stores to put newest first ONLY for 'custom' view
    const mappedCustoms = [...(Array.isArray(customStores) ? customStores : [])].reverse().map(c => {
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
      // Show ALL custom stores in the "Newly Added" tab, sorted by newest
      sourceLocs = mappedCustoms;
    } else if (activeRegionId === 'all') {
      // Show custom stores at the bottom of the "All" tab in original order
      sourceLocs = [...allLocs, ...mappedCustoms.slice().reverse()];
    } else {
      // Show custom stores at the bottom of their specific region tab in original order
      sourceLocs = [...allLocs, ...mappedCustoms.slice().reverse().filter(c => c.regionId === activeRegionId)];
    }

    // Include Info Items in search results
    if (searchQuery) {
      sourceLocs = [...sourceLocs, ...flattenedInfoLocs];
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

      if (nearbyFilter) {
        if (!loc.lat || !loc.lng) return false;
        const lat1 = nearbyFilter.lat;
        const lon1 = nearbyFilter.lng;
        const lat2 = parseFloat(loc.lat);
        const lon2 = parseFloat(loc.lng);
        if (isNaN(lat2) || isNaN(lon2)) return false;
        
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        if (distance > nearbyFilter.dist) return false;
      }

      return true;
    });
  }, [activeRegionId, activeRegion, activeZone, searchQuery, activeFilters, openAtTime, customStores, nearbyFilter]);

  const toggleCompare = (loc: any) => {
    if (compareSelected.find(c => (c.uid && c.uid === loc.uid) || (!c.uid && c.n === loc.n))) {
      setCompareSelected(prev => prev.filter(c => !((c.uid && c.uid === loc.uid) || (!c.uid && c.n === loc.n))));
    } else {
      if (compareSelected.length >= 4) {
        toast.info("最多只能选择 4 个地点进行对比");
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
      // Show a brief native toast-like feedback
      const el = document.createElement('div');
      toast.success('Prompt 已复制，请前往 AI 粘贴');
    }).catch(() => {
      navigator.clipboard.writeText(prompt).then(() => {
        toast.success('Prompt 已复制，请前往 AI 粘贴');
      });
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
  const generateGoogleMapsUrl = (items: any[]) => {
    if (items.length === 0) return '';
    const encode = (item: any) => {
      // Use name + zone as search string for readability in Google Maps
      const q = `${item.n}${item.zone ? ' ' + item.zone : ''} 台灣`;
      return encodeURIComponent(q);
    };
    if (items.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encode(items[0])}`;
    }
    const origin = encode(items[0]);
    const dest = encode(items[items.length - 1]);
    const waypoints = items.slice(1, -1).map(encode).join('|');
    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`;
    if (waypoints) url += `&waypoints=${waypoints}`;
    return url;
  };

  const optimizeRoute = () => {
    if (routeItems.length < 2) {
      toast.info('您需要至少 2 个地点才能优化路线');
      return;
    }
    
    const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
    };

    const unvisited = [...routeItems];
    const optimized = [unvisited.shift()!];

    while (unvisited.length > 0) {
      const current = optimized[optimized.length - 1];
      let nearestIdx = 0;
      let minDst = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const item = unvisited[i];
        const lat1 = parseFloat(current.lat as any);
        const lon1 = parseFloat(current.lng as any);
        const lat2 = parseFloat(item.lat as any);
        const lon2 = parseFloat(item.lng as any);
        
        let dst = Infinity;
        if (!isNaN(lat1) && !isNaN(lon1) && !isNaN(lat2) && !isNaN(lon2)) {
          dst = getDist(lat1, lon1, lat2, lon2);
        } else {
          dst = current.zone === item.zone ? 0 : 9999;
        }

        if (dst < minDst) {
          minDst = dst;
          nearestIdx = i;
        }
      }

      optimized.push(unvisited.splice(nearestIdx, 1)[0]);
    }

    setRouteItems(optimized);
    toast.success('路线已智能优化（最短距离规划）');
  };

  const handleLocateSelect = (distStr: string) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    const dist = distStr.endsWith('km') ? parseFloat(distStr) : parseFloat(distStr) / 1000;
    
    toast.info("正在获取位置...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setActiveRegionId('all');
        setNearbyFilter({ lat: latitude, lng: longitude, dist });
        setActiveTab('explore');
        setActiveZone(null);
        setShowLocateModal(false);
      },
      (error) => {
        toast.error("无法获取您的当前位置，请检查定位权限。");
        setActiveTab('explore');
        setActiveZone(null);
        setShowLocateModal(false);
      }
    );
  };

  const locateUser = () => {
    setShowLocateModal(true);
  };

  if (!hasVerifiedPin) {
    return (
      <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        <ToastContainer />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-gray-100 to-transparent rounded-full blur-3xl opacity-50 pointer-events-none -z-10" />
        
        <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-8 w-full z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-white border border-gray-100 rounded-3xl flex items-center justify-center shadow-sm">
            <span className="text-4xl">🇹🇼</span>
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-[#2D3436] tracking-tight">旅行暗号</h1>
            <p className="text-xs text-gray-400 font-bold tracking-widest uppercase">PLEASE ENTER PIN TO CONTINUE</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (pinInput === '1968') {
                setHasVerifiedPin(true);
                toast.success('验证成功！欢迎回来。');
              } else {
                toast.error('暗号错误');
                setPinInput('');
              }
            }}
            className="w-full flex flex-col items-center space-y-4"
          >
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-48 text-center text-3xl font-black tracking-[0.5em] p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-indigo-400 outline-none transition-all placeholder:text-gray-300 placeholder:font-normal placeholder:tracking-normal"
              placeholder="••••"
              maxLength={4}
            />
            <button
              type="submit"
              disabled={pinInput.length < 4}
              className="w-48 bg-[#2D3436] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-black active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100"
            >
              验证身份
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAppReady()) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="w-20 h-20 bg-gray-200 rounded-3xl" />
          <div className="space-y-3 flex flex-col items-center">
            <div className="h-6 w-48 bg-gray-200 rounded-full" />
            <div className="h-3 w-32 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen w-full bg-white text-[#2D3436] font-sans flex flex-col items-center justify-center p-6 text-center select-none relative overflow-hidden">
        <ToastContainer />
        
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
                您的终极台湾探索指南 <span className="mx-3 opacity-30 block sm:inline my-2 sm:my-0">|</span> <Clock className="tabular-nums" /> LOCAL TIME
              </p>
            </div>
          </div>

          <WeatherWidget />

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
              className="w-full bg-transparent text-[#2D3436] font-medium border-b-2 border-gray-200 placeholder-gray-400 pb-3 pl-2 pr-16 text-center text-base focus:outline-none focus:border-[#2D3436] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 -mt-1.5 p-1 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button 
              type="submit" 
              className={cn("absolute right-0 top-1/2 -translate-y-1/2 -mt-1.5 text-gray-400 hover:text-[#2D3436] transition-colors", !searchQuery.trim() && "opacity-50 pointer-events-none")}
            >
              <Search className="w-5 h-5" />
            </button>
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
    <div className="h-[100dvh] w-full bg-white text-[#2D3436] font-sans flex flex-col overflow-hidden leading-snug">
      <ToastContainer />
      {/* Header */}
      <header 
        onClick={(e) => {
          // If the user clicks on the header itself (not its children like buttons/inputs)
          if (e.target === e.currentTarget) {
            const main = document.getElementById('scroll-container-main');
            if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className="flex-shrink-0 bg-white border-b border-gray-100 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:h-[calc(4rem+env(safe-area-inset-top))] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 w-full relative gap-3 cursor-pointer md:cursor-default"
      >
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
                TAIWAN WANDERLUST <span className="opacity-30 font-normal mx-1">|</span> <Clock className="text-[9px] md:text-[10px] text-gray-400 font-bold tracking-widest tabular-nums" />
              </h1>
            </div>
            
            {/* Identity Toggle */}
            <div className="hidden md:flex ml-4 bg-gray-100 p-0.5 rounded-full border border-gray-200 shadow-inner items-center flex-shrink-0">
              <button
                onClick={() => { setCurrentUser('Jon'); localStorage.setItem('taiwan_trip_whoami', 'Jon'); }}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest transition-all",
                  currentUser === 'Jon' ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
              >
                🧑🏻 Jon
              </button>
              <button
                onClick={() => { setCurrentUser('June'); localStorage.setItem('taiwan_trip_whoami', 'June'); }}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold tracking-widest transition-all",
                  currentUser === 'June' ? "bg-pink-500 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-200/50"
                )}
              >
                👩🏻 June
              </button>
            </div>
          </div>
          
          <div className="flex md:hidden gap-2 items-center">
            <div className="flex bg-gray-100 p-0.5 rounded-full border border-gray-200 shadow-inner">
              <button
                onClick={() => { setCurrentUser('Jon'); localStorage.setItem('taiwan_trip_whoami', 'Jon'); }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] transition-all",
                  currentUser === 'Jon' ? "bg-blue-500 text-white shadow-sm" : "text-gray-500 grayscale opacity-50"
                )}
              >🧑🏻</button>
              <button
                onClick={() => { setCurrentUser('June'); localStorage.setItem('taiwan_trip_whoami', 'June'); }}
                className={cn(
                  "px-2.5 py-1 rounded-full text-[10px] transition-all",
                  currentUser === 'June' ? "bg-pink-500 text-white shadow-sm" : "text-gray-500 grayscale opacity-50"
                )}
              >👩🏻</button>
            </div>
            <button 
              onClick={locateUser}
              className="p-1.5 rounded-full bg-gray-50 text-gray-400 hover:text-indigo-500 transition-colors border border-gray-200"
            >
              <MapPin className="w-4 h-4" />
            </button>
            <button 
              onClick={scrollToTop}
              className="p-1.5 rounded-full bg-[#2D3436] text-white hover:bg-black transition-colors shadow-sm"
              title="回到顶部"
            >
              <ArrowUp className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 w-full md:max-w-md lg:max-w-lg md:mx-6">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#2D3436] transition-colors" />
            <input 
              type="text" 
              placeholder="搜索餐厅、景点、标签…" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 md:h-10 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-full font-medium focus:outline-none focus:ring-0 focus:border-[#2D3436] focus:bg-white transition-all text-xs md:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="hidden md:flex gap-3 items-center">
          <button 
            onClick={scrollToTop}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2D3436] text-white hover:bg-black transition-colors shadow-sm"
            title="回到顶部"
          >
            <ArrowUp className="w-4 h-4 stroke-[3]" />
          </button>
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

      

      <main id="scroll-container-main" onScroll={handleScroll} className="flex-1 flex flex-col lg:flex-row gap-4 p-2 md:p-4 lg:p-6 overflow-y-auto w-full pb-20 md:pb-6">
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
                  onClick={() => { setActiveRegionId('all'); setActiveTab('explore'); setActiveZone(null); }}
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
                  onClick={() => { setActiveRegionId(r.id); setActiveTab('explore'); setActiveZone(null); }}
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
                  onClick={() => { setActiveRegionId('custom'); setActiveTab('explore'); setActiveZone(null); }}
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
            <div className="pt-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-[#2D3436] flex items-center gap-1.5"><ClockIcon className="w-3.5 h-3.5" /> 营业时间</span>
                {openAtTime && <button onClick={() => setOpenAtTime('')} className="bg-gray-100 px-2 py-0.5 rounded text-[9px] font-bold text-gray-500 hover:bg-gray-200 transition-colors">清除</button>}
              </div>
              <div className="flex gap-1.5">
                <input 
                  type="time" 
                  value={openAtTime}
                  onChange={e => setOpenAtTime(e.target.value)}
                  className="bg-white text-gray-700 font-bold tracking-widest rounded-lg px-2.5 py-1.5 border border-gray-200 shadow-sm focus:border-black focus:ring-1 focus:ring-black text-[11px] flex-1 outline-none transition-all"
                />
                <button 
                  onClick={() => {
                    const d = new Date();
                    setOpenAtTime(`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`);
                  }}
                  className="bg-[#2D3436] text-white hover:bg-black shadow-sm font-bold rounded-lg px-3 py-1.5 text-[10px] transition-colors whitespace-nowrap flex-shrink-0"
                >
                  当前时间
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
                    <div key={r.uid || `${r.n}-${i}`} className="bg-gray-50 p-2 rounded-xl border border-gray-200 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[9px] font-bold text-gray-500 flex-shrink-0 shadow-sm border border-gray-200">
                          {i + 1}
                        </div>
                        <span className="text-[10px] font-bold truncate text-gray-700">{r.n}</span>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (i === 0) return;
                            const next = [...routeItems];
                            [next[i - 1], next[i]] = [next[i], next[i - 1]];
                            setRouteItems(next);
                          }}
                          disabled={i === 0}
                          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors text-[10px]"
                          title="上移"
                        >▲</button>
                        <button
                          onClick={() => {
                            if (i === routeItems.length - 1) return;
                            const next = [...routeItems];
                            [next[i], next[i + 1]] = [next[i + 1], next[i]];
                            setRouteItems(next);
                          }}
                          disabled={i === routeItems.length - 1}
                          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors text-[10px]"
                          title="下移"
                        >▼</button>
                        <button onClick={() => toggleRoute(r)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors text-[10px]">
                          ✖
                        </button>
                      </div>
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
                    清空
                  </button>
                </div>
                
                {/* NEW ROW for Route Actions */}
                {routeItems.length > 0 && (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                    <button 
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-3 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors flex items-center justify-center gap-1"
                      onClick={() => {
                        setShowRouteOnly(true);
                        setShowMap(true);
                      }}
                    >
                      <MapPin className="w-3 h-3" />
                      路线图
                    </button>
                    <button 
                      className="bg-green-50 hover:bg-green-100 text-green-600 px-3 py-2 rounded-xl font-bold text-[10px] uppercase flex-1 transition-colors flex items-center justify-center gap-1"
                      onClick={() => {
                        const url = generateGoogleMapsUrl(routeItems);
                        if (url) window.open(url, '_blank');
                      }}
                    >
                      <Navigation className="w-3 h-3" />
                      导航
                    </button>
                  </div>
                )}
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
                  {nearbyFilter && (
                    <div className="flex flex-col gap-3 mt-2 sm:mt-0 w-full md:w-auto">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 text-xs font-bold shadow-sm animate-in fade-in w-fit">
                        <span>📍 正在显示附近 {nearbyFilter.dist >= 1 ? `${nearbyFilter.dist}km` : `${nearbyFilter.dist * 1000}m`} 内的地点</span>
                        <button onClick={() => setNearbyFilter(null)} className="hover:bg-indigo-200 p-0.5 rounded-full transition-colors"><X className="w-3 h-3" /></button>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 animate-in slide-in-from-top-2">
                        <button 
                          onClick={handleDiscoverNearbyAI}
                          disabled={isDiscoveringNearby}
                          className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          <Sparkles className={cn("w-3.5 h-3.5", isDiscoveringNearby && "animate-spin")} />
                          {isDiscoveringNearby ? "AI 正在挖掘..." : "✨ 让 AI 挖掘真实好店"}
                        </button>
                        
                        <a 
                          href={`https://www.google.com/maps/search/餐厅景点/@${nearbyFilter.lat},${nearbyFilter.lng},16z`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg shadow-sm hover:bg-gray-50 active:scale-95 transition-all"
                        >
                          <MapPin className="w-3.5 h-3.5 text-red-500" />
                          🗺️ 打开 Google Maps 探索
                        </a>
                      </div>
                    </div>
                  )}
                  {!searchQuery && (
                    <div className="flex items-center gap-3">
                      <span className="hidden sm:block text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">Curated Destinations</span>
                                            {/* Map Toggle Button */}
                      <button 
                        onClick={() => {
                          if (showMap) {
                            setShowMap(false);
                            setFocusedLocId(null);
                            setShowRouteOnly(false);
                          } else {
                            setShowMap(true);
                            setShowRouteOnly(false);
                            setFocusedLocId(null);
                          }
                        }} 
                        className={`px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors ${showMap ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'}`}
                      >
                        <Map className="w-3 h-3" /> {showMap ? '返回列表' : '地图模式'}
                      </button>

                      <button onClick={() => setShowAddStoreModal(true)} className="bg-[#2D3436] text-white px-2 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-black transition-colors"><Plus className="w-3 h-3" /> 新增店面</button>
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
              <div id="scroll-container-desktop" className="flex-1 pb-8 pt-1 px-1 relative">
                {filteredLocs.length === 0 ? (
                  searchQuery.trim() !== '' ? (
                    <div className="flex flex-col items-center justify-center p-8 mt-4">
                      <div className="text-4xl mb-4">🔍</div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">没找到与 "{searchQuery}" 相关的结果</h3>
                      <p className="text-sm text-gray-500 mb-6 text-center">数据库里暂时没有这个地点的记录，不过没关系！我们可以去问问 AI。</p>
                      
                      <button 
                        onClick={() => {
                          const prompt = `我正在寻找关于 "${searchQuery}" 的详细信息与指南。\n\n【第一步：确认选项】\n如果该目标有多个分店、地点，或者多个型号、口味、版本系列，请先简单列出主要的选择，向我确认具体指的是哪一个。\n\n【第二步：全方位深度解析】\n当我确认了具体目标（或如果目标是唯一的）后，请根据以下九大模块，为我提供一份极其详细的说明。请根据目标的属性（地点或产品），自动切换最贴切的分析逻辑：\n\n1. 背景故事与核心特色 (这个地点/产品有什么特别之处？核心卖点是什么？如果马来西亚也有类似的品牌/常规版，这个特定目标有什么是本地没有、唯独它才有的？)\n2. 推荐体验/核心功能 (如果是地点：必看、必玩或必须参与的体验是什么？如果是产品：最适合的使用场景、能解决什么痛点？)\n3. 必吃/必买/必搭配 (有哪些限定商品、招牌品项、核心配置或推荐一起入手的周边/配件？)\n4. 避雷与防坑指南 (有哪些已知的产品缺陷、体验槽点、消费陷阱、排队误区或溢价虚高的地方？)\n5. 推荐指数与适合人群 (综合推荐分数，最适合什么样需求、预算或偏好的人群？)\n6. 营业时间/生命周期 (如果是地点：提供开放与营业时间；如果是产品：说明上市时间，目前是现货充足还是绝版限量？)\n7. 实用提示/购买攻略 (如果是地点：入场预约机制、最佳拍照机位或游玩Tips；如果是产品：防伪鉴别、抢购暗号或专属优惠渠道等Tips。)\n8. 地理位置与交通/产地与渠道 (如果是地点：如何前往与最便捷的交通方式；如果是产品：产地在哪里，全球哪些官方渠道/平台最容易买到？)\n9. 其他补充信息\n\n另外，请在报告中额外包含以下关键细节：\n- 预计消费/实际入手成本 (包含门票、基本消费、官方定价或目前的二级市场实际价格估计)\n- 限制规则与门槛 (是否有最低消费、限时停留，或者产品的限购规则、配货/会员门槛)\n- 综合网络评价 (全面客观地总结网络上的褒贬评价，好评与差评/黑点都要有)\n- 相关链接 (如果是地点：提供 Google Map 和 Apple Map 的搜索链接；如果是产品：提供 Google 搜索链接与官方/主流购买平台链接)`;
                          navigator.clipboard.writeText(prompt).then(() => {
                            toast.success('Prompt 已复制，请前往 AI 粘贴');
                          }).catch(() => toast.error('请手动复制 Prompt'));
                        }}
                        className="bg-[#2D3436] hover:bg-black text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
                      >
                        ✨ 复制 AI Prompt
                      </button>
                      <p className="text-[10px] text-gray-400 mt-3">(复制后去 Gemini / ChatGPT 粘贴即可)</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 mt-4 text-center">
                      <h3 className="text-lg font-bold text-gray-800 mb-2">没有符合筛选条件的结果</h3>
                      <p className="text-sm text-gray-500 mb-6">请尝试调整选项或重置过滤条件。</p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                        <button 
                          onClick={handleCopyPromptOnly}
                          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-transform"
                        >
                          <span className="text-xl">✨</span>
                          问问 AI 推荐
                        </button>
                        <button 
                          onClick={() => setShowAddStoreModal(true)}
                          className="flex items-center gap-2 bg-[#2D3436] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:scale-105 transition-transform"
                        >
                          <span className="text-xl">➕</span>
                          自己新增店面
                        </button>
                      </div>
                    </div>
                  ) ) : showMap ? ( <MapComponent 
          currentUser={currentUser}
          locs={showRouteOnly 
            ? routeItems.map(r => {
                const found = filteredLocs.find(l => l.uid === r.uid || l.n === r.n);
                return found ? { ...r, lat: found.lat ?? r.lat, lng: found.lng ?? r.lng } : r;
              })
            : filteredLocs
          } 
          routeMode={showRouteOnly}
          focusedLocId={focusedLocId}
          routedUids={routeItems.map(r => r.uid ?? r.n)}
          onAddToRoute={(loc) => {
            const alreadyIn = routeItems.find(r => (r.uid && r.uid === loc.uid) || r.n === loc.n);
            if (alreadyIn) {
              setRouteItems(prev => prev.filter(r => !((r.uid && r.uid === loc.uid) || r.n === loc.n)));
            } else {
              setRouteItems(prev => [...prev, loc]);
            }
          }}
          onLocClick={(uid) => { 
            setShowMap(false);
            setShowRouteOnly(false);
            setFocusedLocId(null);
            setExpandedCardId(uid);
            setTimeout(() => {
              const el = document.getElementById(`loc-card-${uid}`);
              if (el) {
                const main = document.getElementById('scroll-container-main');
                if (main) {
                  const mainRect = main.getBoundingClientRect();
                  const elRect = el.getBoundingClientRect();
                  main.scrollBy({ top: elRect.top - mainRect.top - 80, behavior: 'smooth' });
                } else {
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }
            }, 300);
          }} 
        /> ) : ( <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-4">
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
                        id={`loc-card-${loc.uid}`} 
                        className={cn("loc-card bg-white p-3 rounded-2xl border flex flex-col justify-between transition-all duration-300", isExpanded ? "col-span-full shadow-md border-gray-200" : "border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200")} 
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea') || target.closest('select')) return;
                          
                          if (loc.isInfoItem) {
                            setActiveTab('info');
                            setSearchQuery('');
                            return;
                          }
                          
                          if (isExpanded) {
                            // Only close if clicking on the header area (card-header) or the card background itself
                            if (target.closest('[data-card-body]')) return;
                            setExpandedCardId(null);
                          } else {
                            setExpandedCardId(loc.uid);
                          }
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
                          
                          {!isExpanded && (
                            <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                              {loc.cuisine && <span className="text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{loc.cuisine}</span>}
                              {loc.tags?.map((t: string) => <span key={t} className="text-[9px] font-bold bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{t}</span>)}
                              {loc.lat && loc.lng && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRouteOnly(false);
                                    setFocusedLocId(loc.uid);
                                    setShowMap(true);
                                  }}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                                >
                                  <MapPin className="w-2.5 h-2.5" /> 地图
                                </button>
                              )}
                            </div>
                          )}

                            <div className="flex items-center gap-1 mt-1 text-xs md:text-sm text-[#FF7675]">
                              {Array.from({length: loc.s || 5}).map((_, i) => <span key={i}>★</span>)}
                              {loc.price && (
                                <span className="ml-1.5 font-black text-[9px] md:text-[10px] text-gray-500 bg-gray-100 px-1 rounded border border-gray-200">
                                  人均: {['cheap', 'mid', 'exp'].includes(loc.price) ? (loc.price === 'cheap' ? 'NT$ 200⬇' : loc.price === 'mid' ? 'NT$ 200~800' : 'NT$ 800⬆') : loc.price}
                                </span>
                              )}
                              {loc.minSpend && (
                                <span className="ml-1 font-bold text-[9px] md:text-[10px] text-red-500 bg-red-50 flex items-center px-1 rounded border border-red-200">
                                  低消: {loc.minSpend}
                                </span>
                              )}
                            </div>
                          
                          {loc.zone && <div className="text-[10px] md:text-[11px] font-bold text-gray-500 mt-1.5 flex items-center gap-1 line-clamp-1"><MapPin className="w-3 h-3 flex-shrink-0"/> {loc.zone}</div>}
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div data-card-body className="mt-4 pt-4 border-t border-gray-100/50 space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {loc.f && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">特 色</span> <span className="leading-snug">{loc.f}</span></div>}
                                    {loc.do && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">必做必买</span> <span className="leading-snug">{loc.do}</span></div>}
                                    {loc.eat && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">招牌必点</span> <span className="leading-snug font-bold text-orange-600">{loc.eat}</span></div>}
                                    {loc.w && <div><span className="font-bold text-red-300 uppercase text-[10px] tracking-widest block mb-0.5">避雷提醒</span> <span className="leading-snug text-red-500">{loc.w}</span></div>}
                                    {loc.tips && <div><span className="font-bold text-blue-300 uppercase text-[10px] tracking-widest block mb-0.5">实用提示</span> <span className="leading-snug text-blue-600">{loc.tips}</span></div>}
                                  </div>
                                  
                                  <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                                    <div className="flex flex-col gap-2">
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

                                    {(loc.isInfoItem || loc.isCustom) && loc.hours && (
                                      <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">营业时间</span> <span className="leading-snug">{loc.hours}</span></div>
                                    )}
                                    {loc.how && !loc.isInfoItem && <div><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest block mb-0.5">怎么去</span> <span className="leading-snug">🚇 {loc.how}</span></div>}
                                  </div>
                                  
                                  <div className="flex gap-2 mt-5">
                                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc.gq || loc.n)}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-blue-500 to-indigo-600 border-transparent text-white shadow-lg shadow-blue-500/20 hover:scale-105 rounded-xl py-3 text-[13px] font-bold transition-all">
                                      📍 Google Maps 导航
                                    </a>
                                    <a href={`https://maps.apple.com/?q=${encodeURIComponent(loc.n)}`} target="_blank" rel="noreferrer" className="flex-1 text-center bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl py-3 text-[11px] font-bold text-gray-700 transition-colors">
                                      🍎 Apple
                                    </a>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
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
                                const prompt = `我正在寻找关于 "${loc.n}" 的详细信息与指南。\n\n【第一步：确认选项】\n如果该目标有多个分店、地点，或者多个型号、口味、版本系列，请先简单列出主要的选择，向我确认具体指的是哪一个。\n\n【第二步：全方位深度解析】\n当我确认了具体目标（或如果目标是唯一的）后，请根据以下九大模块，为我提供一份极其详细的说明。请根据目标的属性（地点或产品），自动切换最贴切的分析逻辑：\n\n1. 背景故事与核心特色 (这个地点/产品有什么特别之处？核心卖点是什么？如果马来西亚也有类似的品牌/常规版，这个特定目标有什么是本地没有、唯独它才有的？)\n2. 推荐体验/核心功能 (如果是地点：必看、必玩或必须参与的体验是什么？如果是产品：最适合的使用场景、能解决什么痛点？)\n3. 必吃/必买/必搭配 (有哪些限定商品、招牌品项、核心配置或推荐一起入手的周边/配件？)\n4. 避雷与防坑指南 (有哪些已知的产品缺陷、体验槽点、消费陷阱、排队误区或溢价虚高的地方？)\n5. 推荐指数与适合人群 (综合推荐分数，最适合什么样需求、预算或偏好的人群？)\n6. 营业时间/生命周期 (如果是地点：提供开放与营业时间；如果是产品：说明上市时间，目前是现货充足还是绝版限量？)\n7. 实用提示/购买攻略 (如果是地点：入场预约机制、最佳拍照机位或游玩Tips；如果是产品：防伪鉴别、抢购暗号或专属优惠渠道等Tips。)\n8. 地理位置与交通/产地与渠道 (如果是地点：如何前往与最便捷的交通方式；如果是产品：产地在哪里，全球哪些官方渠道/平台最容易买到？)\n9. 其他补充信息\n\n另外，请在报告中额外包含以下关键细节：\n- 预计消费/实际入手成本 (包含门票、基本消费、官方定价或目前的二级市场实际价格估计)\n- 限制规则与门槛 (是否有最低消费、限时停留，或者产品的限购规则、配货/会员门槛)\n- 综合网络评价 (全面客观地总结网络上的褒贬评价，好评与差评/黑点都要有)\n- 相关链接 (如果是地点：提供 Google Map 和 Apple Map 的搜索链接；如果是产品：提供 Google 搜索链接与官方/主流购买平台链接)`;
                                navigator.clipboard.writeText(prompt).then(() => {
                                  toast.success('Prompt 已复制，请前往 AI 粘贴');
                                }).catch(() => toast.error('请手动复制 Prompt'));
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
                          const prompt = `我正在寻找关于 "${searchQuery}" 的详细信息与指南。\n\n【第一步：确认选项】\n如果该目标有多个分店、地点，或者多个型号、口味、版本系列，请先简单列出主要的选择，向我确认具体指的是哪一个。\n\n【第二步：全方位深度解析】\n当我确认了具体目标（或如果目标是唯一的）后，请根据以下九大模块，为我提供一份极其详细的说明。请根据目标的属性（地点或产品），自动切换最贴切的分析逻辑：\n\n1. 背景故事与核心特色 (这个地点/产品有什么特别之处？核心卖点是什么？如果马来西亚也有类似的品牌/常规版，这个特定目标有什么是本地没有、唯独它才有的？)\n2. 推荐体验/核心功能 (如果是地点：必看、必玩或必须参与的体验是什么？如果是产品：最适合的使用场景、能解决什么痛点？)\n3. 必吃/必买/必搭配 (有哪些限定商品、招牌品项、核心配置或推荐一起入手的周边/配件？)\n4. 避雷与防坑指南 (有哪些已知的产品缺陷、体验槽点、消费陷阱、排队误区或溢价虚高的地方？)\n5. 推荐指数与适合人群 (综合推荐分数，最适合什么样需求、预算或偏好的人群？)\n6. 营业时间/生命周期 (如果是地点：提供开放与营业时间；如果是产品：说明上市时间，目前是现货充足还是绝版限量？)\n7. 实用提示/购买攻略 (如果是地点：入场预约机制、最佳拍照机位或游玩Tips；如果是产品：防伪鉴别、抢购暗号或专属优惠渠道等Tips。)\n8. 地理位置与交通/产地与渠道 (如果是地点：如何前往与最便捷的交通方式；如果是产品：产地在哪里，全球哪些官方渠道/平台最容易买到？)\n9. 其他补充信息\n\n另外，请在报告中额外包含以下关键细节：\n- 预计消费/实际入手成本 (包含门票、基本消费、官方定价或目前的二级市场实际价格估计)\n- 限制规则与门槛 (是否有最低消费、限时停留，或者产品的限购规则、配货/会员门槛)\n- 综合网络评价 (全面客观地总结网络上的褒贬评价，好评与差评/黑点都要有)\n- 相关链接 (如果是地点：提供 Google Map 和 Apple Map 的搜索链接；如果是产品：提供 Google 搜索链接与官方/主流购买平台链接)`;
                          navigator.clipboard.writeText(prompt).then(() => {
                            toast.success('Prompt 已复制，请前往 AI 粘贴');
                          }).catch(() => toast.error('请手动复制 Prompt'));
                        }}
                        className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4" /> 复制 AI Prompt
                      </button>
                    </div>
                  )}
                </div>
              )}
              </div>
              
              {/* Compare Floating CTA */}
              {compareSelected.length >= 2 && (
                <div className="fixed lg:absolute bottom-[calc(6rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-white text-[#2D3436] px-3 py-2 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 z-20 animate-in slide-in-from-bottom-8 duration-300 border border-gray-100">
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
            onClick={() => {
              if (activeTab === 'explore') {
                setShowMap(false);
              }
              setActiveTab('explore');
            }}
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

        {/* Undo Toast for Route Items */}
        {deletedRouteItem && (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white px-3 py-2 rounded-full shadow-2xl flex items-center justify-between gap-3 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
            <span className="text-xs pr-1">
              已删除 <span className="font-bold">{deletedRouteItem.item.n}</span>
            </span>
            <div className="flex items-center gap-1 border-l border-white/20 pl-3">
              <button 
                onClick={undoDeleteRouteItem}
                className="text-[#00cec9] hover:text-white transition-colors text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
              >
                撤销 Undo
              </button>
              <button onClick={() => setDeletedRouteItem(null)} className="text-gray-400 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">×</button>
            </div>
          </div>
        )}
        
        {/* Undo Toast for Custom Stores */}
        {deletedCustomStore && (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 bg-red-600/95 backdrop-blur-md text-white px-3 py-2 rounded-full shadow-2xl flex items-center justify-between gap-3 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
            <span className="text-xs pr-1">
              彻底删除 <span className="font-bold">{deletedCustomStore.item.n}</span>
            </span>
            <div className="flex items-center gap-1 border-l border-white/20 pl-3">
              <button 
                onClick={() => {
                  setCustomStores(prev => {
                    const newArr = [...prev];
                    newArr.splice(deletedCustomStore.index, 0, deletedCustomStore.item);
                    return newArr;
                  });
                  setDeletedCustomStore(null);
                }}
                className="text-white hover:text-red-100 transition-colors text-xs font-bold uppercase tracking-wider px-2 py-1 rounded"
              >
                撤销 Undo
              </button>
              <button onClick={() => setDeletedCustomStore(null)} className="text-white/70 hover:text-white w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors">×</button>
            </div>
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
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddStoreModal(false);
            }
          }}
        >
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
                
                <div className="flex items-center justify-between mb-1 mt-3">
                  <label className="text-xs font-bold text-gray-500">选择 Gemini 模型</label>
                  <select 
                    value={aiModel} 
                    onChange={e => {
                      setAiModel(e.target.value);
                      localStorage.setItem('PREFERRED_AI_MODEL', e.target.value);
                    }}
                    className="text-xs p-1.5 px-2 border border-gray-200 rounded-lg bg-gray-50 text-indigo-600 font-bold focus:outline-none"
                  >
                    <option value="gemini-2.0-flash">2.0 Flash</option>
                    <option value="gemini-2.5-flash">2.5 Flash</option>
                    <option value="gemini-3.5-flash">3.5 Flash</option>
                  </select>
                </div>
                <button 
                  onClick={handleAddStoreAI}
                  disabled={!newStoreName.trim() || isAiLoading}
                  className={cn(
                    "w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 mt-4 transition-all",
                    isAiLoading 
                      ? "bg-indigo-300 text-white cursor-not-allowed"
                      : "bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98]"
                  )}
                >
                  <Sparkles className={cn("w-5 h-5", isAiLoading && "animate-spin")} /> 
                  {isAiLoading ? 'AI 正在思考...' : '向 Gemini 获取资料'}
                </button>
                <p className="text-[10px] text-gray-400 text-center mt-2 leading-relaxed">
                  需要填入您的 Gemini API Key。
                  <button 
                    onClick={() => { localStorage.removeItem('GEMINI_API_KEY'); toast.success('API Key 已清除，下次将重新询问'); }}
                    className="text-indigo-400 hover:text-indigo-600 underline ml-1"
                  >
                    (重设 API Key)
                  </button>
                  <br/>若未提供，将回退至手动复制 Prompt 模式。
                </p>
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

