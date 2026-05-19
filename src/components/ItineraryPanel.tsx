import React, { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Car, 
  Utensils, 
  ShoppingBag, 
  Camera, 
  Home,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  Lightbulb,
  RotateCcw
} from 'lucide-react';
import { regions } from '../data';

// Helper to find a location by name across all regions
const findLocationByName = (name: string) => {
  if (!name) return null;
  
  // Clean name for matching
  const cleanName = name.replace(/[\(\)]/g, ' '); 
  const parts = cleanName.split(/[、& \/]/); 

  for (const part of parts) {
    const trimmedPart = part.trim();
    if (!trimmedPart) continue;

    for (const region of regions) {
      const loc = region.locs.find(l => 
        l.n.includes(trimmedPart) || 
        trimmedPart.includes(l.n) ||
        (l.eat && l.eat.includes(trimmedPart))
      );
      if (loc) {
        return { ...loc, regionId: region.id, regionName: region.name, uid: `${region.id}-${loc.n}` };
      }
    }
  }
  return null;
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'transport': return <Car className="w-3.5 h-3.5" />;
    case 'food': return <Utensils className="w-3.5 h-3.5" />;
    case 'shopping': return <ShoppingBag className="w-3.5 h-3.5" />;
    case 'spot': return <Camera className="w-3.5 h-3.5" />;
    case 'hotel': return <Home className="w-3.5 h-3.5" />;
    default: return <Clock className="w-3.5 h-3.5" />;
  }
};

const defaultItinerary = [
    {
      day: 1,
      title: "登陆、通讯解禁与夜间移动",
      date: "5/23 (Sat)",
      items: [
        { time: "10:30", name: "搭乘 Grab 前往 KLIA T1", type: "transport" },
        { time: "11:45", name: "办理登机与托运 (⚠️电池随身)", type: "transport" },
        { time: "14:45", name: "搭乘中华航空 CI 722 (KUL -> TPE)", type: "transport" },
        { time: "19:35", name: "降落桃园机场 T1 (e-Gate极速通关)", type: "transport" },
        { time: "20:15", name: "购买中华电信 eSIM 开通网络", type: "shopping" },
        { time: "20:30", name: "搭乘统联客运 1623 路线前往台中", type: "transport" },
        { time: "23:30", name: "搭 Uber 入住 台中東旅 Hotel East", type: "hotel" }
      ]
    },
    {
      day: 2,
      title: "台中旧城风华与首场夜市突击",
      date: "5/24 (Sun)",
      items: [
        { time: "09:30", name: "享用台中东旅双人早餐", type: "food" },
        { time: "10:45", name: "台中第二市场 (避开牛羊 / 清心优多绿)", type: "food" },
        { time: "12:45", name: "宫原眼科 & 第四信用合作社", type: "spot" },
        { time: "14:30", name: "审计新村 (暮暮市集)", type: "spot" },
        { time: "17:00", name: "LaLaport 台中 & 大江户町鳗屋", type: "food" },
        { time: "19:30", name: "一中街夜市", type: "food" },
        { time: "22:00", name: "搭 Uber 返回饭店洗衣休息", type: "hotel" }
      ]
    },
    {
      day: 3,
      title: "告别台中，挺进日月潭",
      date: "5/25 (Mon)",
      items: [
        { time: "09:30", name: "台中东旅享用早餐，打包行李退房", type: "hotel" },
        { time: "10:30", name: "搭 Uber 前往高铁台中站/干城站", type: "transport" },
        { time: "11:00", name: "搭乘台湾好行 6670 路线直达日月潭水社", type: "transport" },
        { time: "13:00", name: "水社 ➔ 伊达邵 (接驳方案评估)", type: "transport" },
        { time: "14:00", name: "入住 伊達邵渡假旅店 (现金支付)", type: "hotel" },
        { time: "15:00", name: "伊达邵码头搭乘游船 (Klook凭证)", type: "spot" },
        { time: "16:30", name: "玄光码头 (阿嬷香菇茶叶蛋 / 赏倒影)", type: "food" },
        { time: "18:30", name: "伊达邵老街 (烤香鱼/糯米粑粑/涌泉豆花)", type: "food" }
      ]
    },
    {
      day: 4,
      title: "空降九族，直奔台北主基地",
      date: "5/26 (Tue)",
      items: [
        { time: "09:00", name: "伊达邵退房，大厅寄存大件行李", type: "hotel" },
        { time: "09:30", name: "搭乘日月潭缆车跨山空降", type: "transport" },
        { time: "10:00", name: "九族文化村 (由上往下纯玩约会)", type: "spot" },
        { time: "14:00", name: "搭乘缆车原路返回", type: "transport" },
        { time: "14:20", name: "伊达邵饭店提取所有行李", type: "hotel" },
        { time: "14:45", name: "搭游船或计程车前往水社", type: "transport" },
        { time: "16:00", name: "搭乘 6670 客运前往高铁台中站", type: "transport" },
        { time: "18:00", name: "高铁台中站站内晚餐 (避开牛羊)", type: "food" },
        { time: "19:36", name: "搭乘高铁前往台北 (看高铁换票战术)", type: "transport" },
        { time: "20:30", name: "入住 City Suites Beimen (北门)", type: "hotel" }
      ]
    },
    {
      day: 5,
      title: "淡水夕阳 & 士林夜市",
      date: "5/27 (Wed)",
      items: [
        { time: "11:00", name: "淡水老街 (文化阿给、许义鱼酥)", type: "food" },
        { time: "14:00", name: "渔人码头 ＆ 情人桥", type: "spot" },
        { time: "16:00", name: "麻吉奶奶鲜奶麻糬 & 朝日夫妇", type: "food" },
        { time: "18:00", name: "士林夜市 (无骨鸡腿排、胡椒饼)", type: "food" }
      ]
    },
    {
      day: 6,
      title: "九份山城 & 基隆庙口",
      date: "5/28 (Thu)",
      items: [
        { time: "13:00", name: "搭乘 965 路巴士前往九份", type: "transport" },
        { time: "14:30", name: "九份老街 (阿柑姨、啊珠、金枝)", type: "food" },
        { time: "16:30", name: "九份茶坊 / 阿妹茶楼 (下午茶)", type: "spot" },
        { time: "18:30", name: "搭乘 788 路巴士前往基隆", type: "transport" },
        { time: "19:30", name: "基隆庙口 营养三明治 (螃蟹羹)", type: "food" }
      ]
    },
    {
      day: 7,
      title: "台北城市慢游",
      date: "5/29 (Fri)",
      items: [
        { time: "09:00", name: "味鼎西門 (台式早餐)", type: "food" },
        { time: "11:00", name: "西门町金狮楼 (饮茶)", type: "food" },
        { time: "13:30", name: "大稻埕迪化街 (大稻埕鲁肉饭)", type: "spot" },
        { time: "15:30", name: "萬年商業大樓 (金园排骨)", type: "shopping" },
        { time: "19:00", name: "师园盐酥鸡 & 好好味冰火菠萝油", type: "food" }
      ]
    },
    {
      day: 8,
      title: "板桥美食 & 台北101",
      date: "5/30 (Sat)",
      items: [
        { time: "09:00", name: "黄石市场 (高记生炒鱿鱼)", type: "food" },
        { time: "11:00", name: "小潘蛋糕坊 (裸装凤凰酥)", type: "shopping" },
        { time: "14:00", name: "微热山丘思慕昔", type: "shopping" },
        { time: "16:00", name: "台北101观景台 (雷雕筷)", type: "spot" },
        { time: "18:00", name: "刁民酸菜鱼 (信义店)", type: "food" },
        { time: "20:00", name: "福州世祖胡椒饼 (药炖排骨)", type: "food" }
      ]
    },
    {
      day: 9,
      title: "阜杭豆浆 & 中壢巡礼",
      date: "5/31 (Sun)",
      items: [
        { time: "07:00", name: "阜杭豆浆 (厚饼)", type: "food" },
        { time: "10:30", name: "Comeme 蛋塔 (新光三越A8)", type: "food" },
        { time: "12:00", name: "京站时尚广场 (GU & 扫货)", type: "shopping" },
        { time: "15:00", name: "前往中壢 (入住 Taoyuan Gateway)", type: "transport" },
        { time: "18:00", name: "简师父麻辣臭豆腐 (瑞记、日宝)", type: "food" },
        { time: "21:00", name: "GLORIA OUTLETS 华泰名品城", type: "shopping" }
      ]
    },
    {
      day: 10,
      title: "平安返家",
      date: "6/1 (Mon)",
      items: [
        { time: "06:45", name: "前往桃园机场 (车程 15 分钟)", type: "transport" },
        { time: "08:45", name: "搭乘中华航空 CI 721", type: "transport" }
      ]
    }
];

export default function ItineraryPanel({ onLocationClick }: { onLocationClick: (loc: any) => void }) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // --- STATE & PERSISTENCE ---
  const [isEditing, setIsEditing] = useState(false);
  const [itineraryDays, setItineraryDays] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_itinerary_v2');
      return saved ? JSON.parse(saved) : defaultItinerary;
    } catch {
      return defaultItinerary;
    }
  });
  const [history, setHistory] = useState<any[][]>([]);
  const [future, setFuture] = useState<any[][]>([]);

  React.useEffect(() => {
    localStorage.setItem('taiwan_trip_itinerary_v2', JSON.stringify(itineraryDays));
  }, [itineraryDays]);

  // --- UNDO / REDO ---
  const saveState = (newState: any[]) => {
    setHistory(prev => [...prev, itineraryDays]);
    setFuture([]);
    setItineraryDays(newState);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture(f => [itineraryDays, ...f]);
    setHistory(h => h.slice(0, h.length - 1));
    setItineraryDays(prev);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(h => [...h, itineraryDays]);
    setFuture(f => f.slice(1));
    setItineraryDays(next);
  };

  const restoreDayToDefault = (dIdx: number) => {
    if (dIdx < defaultItinerary.length) {
      if (window.confirm(`确定要将 Day ${itineraryDays[dIdx].day} 恢复为系统的默认行程吗？这会覆盖您对这一天的所有修改。`)) {
        const next = [...itineraryDays];
        next[dIdx] = JSON.parse(JSON.stringify(defaultItinerary[dIdx]));
        // Keep the day number the same in case they deleted previous days
        next[dIdx].day = itineraryDays[dIdx].day;
        saveState(next);
      }
    } else {
      alert("此天数没有系统预设的默认行程！");
    }
  };

  // --- ACTIONS ---
  const updateDay = (dIdx: number, updates: any) => {
    const next = [...itineraryDays];
    next[dIdx] = { ...next[dIdx], ...updates };
    saveState(next);
  };

  const addDay = () => {
    const next = [...itineraryDays];
    const newDayNum = next.length > 0 ? next[next.length - 1].day + 1 : 1;
    next.push({ day: newDayNum, title: "新行程", date: "日期", items: [] });
    saveState(next);
  };

  const deleteDay = (dIdx: number) => {
    if (window.confirm('确定要删除这一天吗？')) {
      const next = [...itineraryDays];
      next.splice(dIdx, 1);
      // Renumber days
      next.forEach((d, i) => d.day = i + 1);
      saveState(next);
    }
  };

  const addItem = (dIdx: number) => {
    const next = [...itineraryDays];
    next[dIdx].items = [...next[dIdx].items, { time: "12:00", name: "新节点", type: "spot" }];
    // Sort items by time
    next[dIdx].items.sort((a: any, b: any) => a.time.localeCompare(b.time));
    saveState(next);
  };

  const updateItem = (dIdx: number, iIdx: number, updates: any) => {
    const next = [...itineraryDays];
    const items = [...next[dIdx].items];
    items[iIdx] = { ...items[iIdx], ...updates };
    
    // Auto sort if time changes
    if (updates.time !== undefined) {
      items.sort((a: any, b: any) => a.time.localeCompare(b.time));
    }
    
    next[dIdx].items = items;
    saveState(next);
  };

  const deleteItem = (dIdx: number, iIdx: number) => {
    if (window.confirm('确定要删除这个节点吗？')) {
      const next = [...itineraryDays];
      const items = [...next[dIdx].items];
      items.splice(iIdx, 1);
      next[dIdx].items = items;
      saveState(next);
    }
  };

  const itineraryByDay = React.useMemo(() => {
    return itineraryDays.map(day => {
      const groups: { regionId: string | null; regionName: string | null; items: any[]; nearby: any[] }[] = [];
      let currentGroup: { regionId: string | null; regionName: string | null; items: any[]; nearby: any[] } | null = null;

      day.items.forEach((item: any, originalIndex: number) => {
        const matched = findLocationByName(item.name);
        const regionId = matched?.regionId || null;
        const regionName = matched?.regionName || null;

        if (!currentGroup || currentGroup.regionId !== regionId) {
          const regionData = regionId ? regions.find(r => r.id === regionId) : null;
          currentGroup = {
            regionId,
            regionName,
            items: [],
            nearby: regionData ? regionData.locs.slice(0, 4) : []
          };
          groups.push(currentGroup);
        }
        currentGroup.items.push({ ...item, matched, originalIndex });
      });

      return { ...day, groups };
    });
  }, [itineraryDays]);

  return (
    <div className="text-gray-800 space-y-6 pb-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h3 className="font-black text-2xl flex items-center gap-2 text-[#2D3436] tracking-tight">
          <Calendar className="w-6 h-6 text-[#2D3436]" /> 智能互动行程
        </h3>
        
        {/* Editor Controls */}
        <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
          <button 
            onClick={handleUndo} 
            disabled={history.length === 0}
            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-800 disabled:opacity-30 transition-all shadow-sm disabled:shadow-none"
            title="撤销 (Undo)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
          </button>
          <button 
            onClick={handleRedo} 
            disabled={future.length === 0}
            className="p-2 rounded-lg text-gray-500 hover:bg-white hover:text-gray-800 disabled:opacity-30 transition-all shadow-sm disabled:shadow-none"
            title="重做 (Redo)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1"></div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm",
              isEditing ? "bg-indigo-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            {isEditing ? '完成编辑' : '编辑行程'}
          </button>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl mb-6 flex items-start gap-4">
        <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-md">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-indigo-900 text-sm font-medium leading-relaxed">
          已为您将<strong>「每日计划」</strong>与其所在的<strong>「地区周边攻略」</strong>完美结合。
          <br />
          <span className="text-xs text-indigo-600 font-normal">下滑查看每日详情，系统会自动探测你该日所在的区域并推荐热门地点。</span>
        </p>
      </div>

      <div className="space-y-12">
        {itineraryByDay.map((day, dIdx) => (
          <div key={dIdx} className="relative">
            {/* Day Header */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl py-4 mb-6 flex items-center gap-4 border-b border-gray-100">
              <div className="bg-[#2D3436] text-white w-12 h-12 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 shadow-xl shadow-[#2D3436]/20">
                <span className="text-[10px] font-black opacity-60 leading-none">DAY</span>
                <span className="text-xl font-black leading-none">{day.day}</span>
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="flex flex-col gap-1.5 w-full">
                    <input 
                      type="text" 
                      value={day.title} 
                      onChange={(e) => updateDay(dIdx, { title: e.target.value })}
                      className="font-black text-[#2D3436] text-lg sm:text-xl leading-tight bg-white border border-gray-200 rounded-lg px-3 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <input 
                        type="text" 
                        value={day.date} 
                        onChange={(e) => updateDay(dIdx, { date: e.target.value })}
                        className="text-xs font-bold text-gray-600 tracking-widest uppercase bg-white border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all flex-1"
                      />
                      <button onClick={() => restoreDayToDefault(dIdx)} className="text-orange-500 hover:text-orange-700 bg-orange-50 p-1.5 rounded-lg border border-orange-100 flex-shrink-0" title="恢复此天默认行程">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteDay(dIdx)} className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-lg border border-red-100 flex-shrink-0" title="删除此天">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="font-black text-[#2D3436] text-xl leading-tight">{day.title}</div>
                    <div className="text-xs font-bold text-gray-400 tracking-widest flex items-center gap-2 mt-1 uppercase">
                      <Calendar className="w-3.5 h-3.5" /> {day.date}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Region Groups */}
            <div className="space-y-8 pl-4 sm:pl-6">
              {day.groups.map((group, gIdx) => (
                <div key={gIdx} className="relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[-17px] top-6 bottom-[-32px] w-0.5 bg-gray-100" />
                  
                  {group.regionName && (
                    <div className="flex items-center gap-2 mb-4 bg-gray-50/80 self-start px-3 py-1.5 rounded-full border border-gray-100 shadow-sm ml-[-4px]">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-black text-indigo-600 uppercase tracking-tight">{group.regionName}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {group.items.map((item, iIdx) => {
                      const actualIdx = item.originalIndex;
                      return (
                      <div key={iIdx} className="relative flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Dot */}
                        <div className="absolute left-[-22px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-[#2D3436] z-10" />
                        
                        {isEditing ? (
                          <div className="flex-1 bg-white border border-indigo-200 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <input 
                              type="time"
                              value={item.time}
                              onChange={(e) => updateItem(dIdx, actualIdx, { time: e.target.value })}
                              className="w-24 text-xs font-black text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 transition-all"
                            />
                            <div className="flex-1 flex flex-col sm:flex-row gap-2 w-full">
                              <input 
                                type="text"
                                value={item.name}
                                onChange={(e) => updateItem(dIdx, actualIdx, { name: e.target.value })}
                                placeholder="行程名称"
                                className="flex-1 text-sm font-bold text-gray-800 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-500 transition-all"
                              />
                              <select
                                value={item.type || 'spot'}
                                onChange={(e) => updateItem(dIdx, actualIdx, { type: e.target.value })}
                                className="w-full sm:w-28 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-500 transition-all"
                              >
                                <option value="spot">📍 景点</option>
                                <option value="food">🍽️ 餐饮</option>
                                <option value="transport">🚗 交通</option>
                                <option value="shopping">🛍️ 购物</option>
                                <option value="hotel">🏨 住宿</option>
                              </select>
                            </div>
                            <button onClick={() => deleteItem(dIdx, actualIdx)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 flex-shrink-0 self-end sm:self-auto">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="w-12 flex-shrink-0 text-[10px] font-black text-gray-300 font-mono pt-0.5 uppercase tracking-tighter">
                              {item.time}
                            </div>
                            
                            {(() => {
                              const itemId = `${dIdx}-${gIdx}-${iIdx}`;
                              const isExpanded = expandedItems[itemId];
                              const matched = item.matched;

                              return (
                                <div 
                                  className={cn(
                                    "flex-1 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden",
                                    isExpanded && "border-indigo-100 shadow-lg ring-1 ring-indigo-50"
                                  )} 
                                  onClick={() => toggleExpand(itemId)}
                                >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "transition-colors",
                                      isExpanded || matched ? "text-indigo-500" : "text-gray-400"
                                    )}>
                                      {getTypeIcon(item.type)}
                                    </span>
                                    <div className={cn(
                                      "font-bold text-sm sm:text-base leading-snug transition-colors",
                                      isExpanded ? "text-indigo-900" : "text-gray-800"
                                    )}>
                                      {item.name}
                                    </div>
                                    <div className="ml-auto flex items-center gap-2">
                                      {matched && !isExpanded && (
                                        <div className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded uppercase tracking-widest border border-indigo-100 hidden sm:block">
                                          已匹配详情
                                        </div>
                                      )}
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-400" /> : <ChevronDown className="w-4 h-4 text-gray-300" />}
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                      {matched ? (
                                        <>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            {matched.f && (
                                              <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                  <Sparkles className="w-3 h-3" /> 核心特色
                                                </div>
                                                <p className="text-gray-700 leading-relaxed">{matched.f}</p>
                                              </div>
                                            )}
                                            {matched.eat && (
                                              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                                                <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                  <Utensils className="w-3 h-3" /> 必吃建议
                                                </div>
                                                <p className="text-orange-900 leading-relaxed font-medium">{matched.eat}</p>
                                              </div>
                                            )}
                                          </div>

                                          <div className="space-y-3">
                                            {matched.tips && (
                                              <div className="flex gap-2 text-xs">
                                                <div className="bg-blue-100 p-1.5 rounded-lg h-fit text-blue-600">
                                                  <Lightbulb className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                  <span className="font-bold text-blue-900">实用 Tips：</span>
                                                  <span className="text-gray-600 leading-relaxed">{matched.tips}</span>
                                                </div>
                                              </div>
                                            )}
                                            {matched.w && (
                                              <div className="flex gap-2 text-xs">
                                                <div className="bg-red-100 p-1.5 rounded-lg h-fit text-red-500">
                                                  <AlertTriangle className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                  <span className="font-bold text-red-900">防雷提醒：</span>
                                                  <span className="text-gray-600 leading-relaxed">{matched.w}</span>
                                                </div>
                                              </div>
                                            )}
                                            {(matched.h || matched.cl) && (
                                              <div className="flex gap-2 text-xs">
                                                <div className="bg-gray-100 p-1.5 rounded-lg h-fit text-gray-500">
                                                  <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <div>
                                                  <span className="font-bold text-gray-700">营业时间：</span>
                                                  <span className="text-gray-500 leading-relaxed">
                                                    {matched.h ? matched.h.map(([s, e]: [number, number]) => {
                                                      const fmt = (m: number) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                                                      return `${fmt(s)}–${fmt(e > 1440 ? e - 1440 : e)}`;
                                                    }).join('，') : ''}
                                                    {matched.cl && ` (🚫 ${matched.cl})`}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>

                                          <div className="pt-2 flex flex-wrap gap-2">
                                            <button 
                                              onClick={(e) => { e.stopPropagation(); onLocationClick(matched); }} 
                                              className="text-[10px] font-black bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-200 hover:bg-black transition-all"
                                            >
                                              <MapPin className="w-3 h-3" /> 在地图中定位
                                            </button>
                                            <a 
                                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matched.n)}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-[10px] font-black bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 transition-all"
                                            >
                                              <ExternalLink className="w-3 h-3" /> Google Maps
                                            </a>
                                          </div>
                                        </>
                                      ) : (
                                        <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-200 text-center">
                                           <div className="text-gray-400 mb-2">
                                             <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                             <p className="text-xs font-medium">这是一个行程节点，可以包含：</p>
                                           </div>
                                           <div className="flex flex-wrap justify-center gap-2">
                                              <span className="text-[10px] bg-white border border-gray-100 px-2 py-1 rounded-lg text-gray-500">交通衔接</span>
                                              <span className="text-[10px] bg-white border border-gray-100 px-2 py-1 rounded-lg text-gray-500">确认订单</span>
                                              <span className="text-[10px] bg-white border border-gray-100 px-2 py-1 rounded-lg text-gray-500">酒店入住</span>
                                           </div>
                                           <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const prompt = `我正在寻找关于 "${item.name}" 的详细旅行资讯。请帮我搜索并在九大模块中详细说明。`;
                                              navigator.clipboard.writeText(prompt);
                                              window.open('https://gemini.google.com/app', '_blank');
                                            }}
                                            className="mt-4 w-full py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-bold hover:bg-indigo-600 hover:text-white transition-colors"
                                           >
                                             ✨ 去 AI 获取此节点详情
                                           </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                          </>
                        )}
                      </div>
                      );
                    })}
                  </div>

                  {/* Nearby Recommendations for this Region */}
                  {group.regionId && group.regionId !== 'info' && group.regionId !== 'extra' && (
                    <div className="mt-4 mb-2 ml-2 sm:ml-14 p-4 bg-green-50/50 rounded-2xl border border-green-100/50">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-black text-green-700 tracking-wider">正在 {group.regionName} 游玩？</span>
                        </div>
                        <button 
                          onClick={() => onLocationClick({ regionId: group.regionId, n: '' })}
                          className="bg-green-500 text-white px-4 py-2 rounded-xl text-[11px] font-bold shadow-sm hover:bg-green-600 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap w-full sm:w-auto"
                        >
                          探索周边所有地点 <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isEditing && (
              <div className="pl-4 sm:pl-6 mt-4">
                <button 
                  onClick={() => addItem(dIdx)} 
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-gray-500 font-bold hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> 新增行程节点
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isEditing && (
        <div className="mt-8">
          <button 
            onClick={addDay} 
            className="w-full py-4 bg-white border border-gray-200 shadow-sm rounded-2xl text-[#2D3436] font-black text-lg hover:border-[#2D3436] hover:shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> 增加一天 (Add Day)
          </button>
        </div>
      )}
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5v14" />
    </svg>
  );
}

function cn(...inputs: (string | undefined | null | boolean)[]) {
  return inputs.filter(Boolean).join(' ');
}
