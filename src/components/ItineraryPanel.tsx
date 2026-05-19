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
  RotateCcw,
  Undo2,
  Redo2,
  CheckCircle2,
  Search,
  X,
  Navigation
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
        { time: "10:30", name: "搭 Uber 前往高铁台中站/干城站 (6670 高铁台中站 3月台)", type: "transport" },
        { time: "11:00", name: "搭乘台湾好行 6670 路线直达日月潭水社", type: "transport" },
        { time: "13:00", name: "水社 ➔ 伊达邵 (⚠️ 叫计程车直达，约 NT$400，绝对不拖行李坐船)", type: "transport" },
        { time: "14:00", name: "入住 ItaThao Smart Stay (现场现金支付)", type: "hotel" },
        { time: "15:00", name: "玄光码头 (步行前往，阿嬷香菇茶叶蛋 / 赏湖面倒影)", type: "food" },
        { time: "17:00", name: "水社码头夕阳 (计程车前往，约 NT$200)", type: "spot" },
        { time: "18:30", name: "伊达邵老街 (烤香鱼/糯米粑粑/小米酒/饭饭鸡翅)", type: "food" }
      ]
    },
    {
      day: 4,
      title: "Klook 三合一 + 直奔台北主基地",
      date: "5/26 (Tue)",
      items: [
        { time: "09:00", name: "ItaThao 退房，大厅寄存大件行李", type: "hotel" },
        { time: "09:30", name: "搭乘日月潭缆车跨山空降 (Klook 凭证·第1项)", type: "transport" },
        { time: "10:00", name: "九族文化村 (由上往下纯玩，Klook 凭证·第2项)", type: "spot" },
        { time: "14:00", name: "搭乘缆车原路返回日月潭", type: "transport" },
        { time: "14:30", name: "步行回 ItaThao 提取所有行李", type: "hotel" },
        { time: "15:00", name: "伊达邵码头搭乘游船至水社 (Klook 凭证·第3项)", type: "spot" },
        { time: "15:30", name: "水社换搭 6670 客运前往高铁台中站", type: "transport" },
        { time: "18:00", name: "高铁台中站站内晚餐 (避开牛羊)", type: "food" },
        { time: "19:36", name: "搭乘高铁 850次 前往台北 (4车 10D/10E)", type: "transport" },
        { time: "20:45", name: "入住 City Suites Beimen (北门)", type: "hotel" }
      ]
    },
    {
      day: 5,
      title: "淡水老街夕阳突击 + 士林夜市大轰炸",
      date: "5/27 (Wed)",
      items: [
        { time: "11:00", name: "大稻埕鲁肉饭 或 味鼎蛋饼 (早午餐抉择)", type: "food" },
        { time: "13:00", name: "搭乘捷运红线直达淡水", type: "transport" },
        { time: "14:30", name: "文化阿给 & 许义鱼酥 (战备口粮)", type: "food" },
        { time: "15:30", name: "麻吉奶奶鲜奶麻糬 或 福哥石头饼", type: "food" },
        { time: "16:30", name: "搭乘交通船直达渔人码头", type: "transport" },
        { time: "17:00", name: "渔人码头日落 或 朝日夫妇刨冰", type: "spot" },
        { time: "19:00", name: "搭乘红线回撤至剑潭站", type: "transport" },
        { time: "19:40", name: "士林夜市 (无骨鸡腿排/胡椒饼/生煎包)", type: "food" },
        { time: "20:30", name: "士林夜市 (家乡炭烤鸡排/胖老爹)", type: "food" },
        { time: "21:30", name: "士林夜市 (海友十全药炖排骨/辛发亭)", type: "food" },
        { time: "22:30", name: "搭捷运返回北门大本营", type: "transport" }
      ]
    },
    {
      day: 6,
      title: "九份山城攻略 + 基隆庙口大环线",
      date: "5/28 (Thu)",
      items: [
        { time: "11:00", name: "北门休整 或 金狮楼港式早午餐", type: "food" },
        { time: "14:00", name: "搭乘 965 路快速巴士直达九份", type: "transport" },
        { time: "15:30", name: "阿柑姨芋圆 (无敌海景座位)", type: "food" },
        { time: "16:30", name: "九份扫荡 (红糟肉圆/花生卷冰淇淋/鱼丸伯仔)", type: "food" },
        { time: "17:30", name: "阿妹茶楼 (海悦楼取景) & 买护理长卤味", type: "spot" },
        { time: "18:40", name: "搭乘 788 路客运前往基隆港", type: "transport" },
        { time: "19:40", name: "基隆庙口 (营养三明治/吴记螃蟹羹)", type: "food" },
        { time: "21:00", name: "基隆庙口 (天一香/纪家猪脚/泡泡冰)", type: "food" },
        { time: "22:30", name: "搭乘台铁区间快车撤离基隆", type: "transport" },
        { time: "23:20", name: "抵达台北车站，搭 Uber 回饭店", type: "transport" }
      ]
    },
    {
      day: 7,
      title: "迪化街 + 西门町 + 师大夜市",
      date: "5/29 (Fri)",
      items: [
        { time: "10:00", name: "大稻埕迪化街 (霞海城隍庙)", type: "spot" },
        { time: "11:30", name: "大稻埕鲁肉饭 (加半熟鸭蛋)", type: "food" },
        { time: "13:00", name: "西门町万年商业大楼 (金园排骨)", type: "shopping" },
        { time: "15:30", name: "DON DON DONKI 唐吉诃德", type: "shopping" },
        { time: "17:30", name: "师大夜市 (牛魔王牛排)", type: "food" },
        { time: "19:00", name: "师大夜市 (师园盐酥鸡)", type: "food" },
        { time: "20:00", name: "师大夜市 (好好味/许记/阿诺)", type: "food" }
      ]
    },
    {
      day: 8,
      title: "板桥古园与 101 大环线",
      date: "5/30 (Sat)",
      items: [
        { time: "09:30", name: "黄石市场 (高记生炒鱿鱼/炸萝卜糕)", type: "food" },
        { time: "11:00", name: "小潘蛋糕坊 (手提裸装凤凰酥)", type: "shopping" },
        { time: "12:00", name: "林本源园邸 (小苏州复古人像)", type: "spot" },
        { time: "14:00", name: "台北101观景台 (客制化雷雕筷)", type: "spot" },
        { time: "16:00", name: "信义甜点狩猎 (承继/微热山丘/COMEME)", type: "shopping" },
        { time: "17:00", name: "信义连通空桥 (都市光影取景)", type: "spot" },
        { time: "18:00", name: "刁民酸菜鱼 (信义ATT/松仁)", type: "food" },
        { time: "20:30", name: "饶河夜市 (胡椒饼/药炖排骨)", type: "food" },
        { time: "21:30", name: "饶河夜市 (加贺鱿鱼大王/小胖子糖饼)", type: "food" }
      ]
    },
    {
      day: 9,
      title: "大采购收网与中坜轰炸",
      date: "5/31 (Sun)",
      items: [
        { time: "07:30", name: "阜杭豆浆 (厚烧饼夹蛋/咸豆浆)", type: "food" },
        { time: "10:00", name: "京站时尚广场 (GU / Mia C'bon 扫货)", type: "shopping" },
        { time: "12:00", name: "京站地下美食街 (继光香香鸡 或 海寿司)", type: "food" },
        { time: "13:00", name: "搭乘 Uber 转移至城市商旅桃园航空馆", type: "transport" },
        { time: "15:00", name: "华泰名品城 GLORIA OUTLETS (最后扫货)", type: "shopping" },
        { time: "17:30", name: "张丰盛商行 (花生芝麻双色霜淇淋)", type: "food" },
        { time: "18:30", name: "中坜夜市 (简师父臭豆腐/瑞记排骨酥)", type: "food" },
        { time: "20:00", name: "中坜夜市 (曾记水煎包/混蛋爆虾/温记豆花)", type: "food" },
        { time: "21:30", name: "第三航厦咖啡 (飞机降落压迫感)", type: "spot" }
      ]
    },
    {
      day: 10,
      title: "极速撤离",
      date: "6/1 (Mon)",
      items: [
        { time: "06:00", name: "退房 城市商旅桃园航空馆", type: "hotel" },
        { time: "06:30", name: "搭乘专车接送前往桃园机场", type: "transport" },
        { time: "06:45", name: "抵达桃园机场 T1 (办理托运，确保不超重)", type: "transport" },
        { time: "08:45", name: "搭乘中华航空 CI 0721 准时起飞", type: "transport" },
        { time: "13:25", name: "落地吉隆坡国际机场 (KUL) - 行动圆满结束", type: "spot" }
      ]
    }
];

export default function ItineraryPanel({ onLocationClick }: { onLocationClick: (loc: any) => void }) {
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedItems(prev => prev[id] ? {} : { [id]: true });
  };

  // --- STATE & PERSISTENCE ---
  // Clean up old localStorage keys from previous versions
  React.useEffect(() => {
    ['v1','v2','v3','v4','v5','v6'].forEach(v =>
      localStorage.removeItem(`taiwan_trip_itinerary_${v}`)
    );
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [itineraryDays, setItineraryDays] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_itinerary_v7');
      return saved ? JSON.parse(saved) : defaultItinerary;
    } catch {
      return defaultItinerary;
    }
  });
  const [history, setHistory] = useState<any[][]>([]);
  const [future, setFuture] = useState<any[][]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      let matchedId = '';
      
      for (let dIdx = 0; dIdx < itineraryDays.length; dIdx++) {
        const day = itineraryDays[dIdx];
        if (day.title?.toLowerCase().includes(q) || `day ${day.day}`.includes(q)) {
          matchedId = `day-${dIdx}`;
          break;
        }
        const items = day.items || [];
        for (let iIdx = 0; iIdx < items.length; iIdx++) {
          if (items[iIdx].name?.toLowerCase().includes(q)) {
            // Need to expand the day or item?
            matchedId = `item-${dIdx}-${iIdx}`;
            break;
          }
        }
        if (matchedId) break;
      }
      
      if (matchedId) {
        const el = document.getElementById(matchedId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'transition-all');
          setTimeout(() => el.classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50'), 2000);
          
          if (matchedId.startsWith('item-')) {
             setExpandedItems(prev => prev[matchedId] ? prev : { [matchedId]: true });
          }
        } else {
          // Element might not be rendered yet if virtualization is used, but here we render everything.
        }
      } else {
        alert('未找到相关行程，请尝试其他关键词');
      }
    }
  };

  React.useEffect(() => {
    localStorage.setItem('taiwan_trip_itinerary_v7', JSON.stringify(itineraryDays));
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

      const items = day.items || [];
      items.forEach((item: any, originalIndex: number) => {
        const matched = findLocationByName(item.name || '');
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
  }, [itineraryDays, searchQuery]);

  return (
    <div className="text-gray-800 space-y-6 pb-10 w-full animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {!isEditing && (
              <button 
                onClick={handleUndo}
                disabled={history.length === 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  history.length > 0 
                    ? "bg-white text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm" 
                    : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                )}
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>撤销</span>
              </button>
            )}
            {!isEditing && (
              <button 
                onClick={handleRedo}
                disabled={future.length === 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                  future.length > 0 
                    ? "bg-white text-gray-700 border-gray-200 hover:border-gray-300 shadow-sm" 
                    : "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed"
                )}
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span>重做</span>
              </button>
            )}
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all",
              isEditing ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {isEditing ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            {isEditing ? '完成编辑' : '编辑行程'}
          </button>
        </div>

        {!isEditing && (
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="搜索后按回车跳转 (如 Day 3 或 淡水)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              className="block w-full pl-10 pr-10 py-3 bg-gray-50 border-gray-100 focus:bg-white rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-[#2D3436] placeholder-gray-400"
            />
            {searchQuery && (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-2">
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 mr-1">
                    <span>{searchIndex + 1}/{searchResults.length}</span>
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => scrollToResult(searchIndex - 1)} className="hover:text-indigo-600 bg-gray-200 hover:bg-indigo-50 rounded-sm w-4 h-3 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="18 15 12 9 6 15"></polyline></svg></button>
                      <button onClick={() => scrollToResult(searchIndex + 1)} className="hover:text-indigo-600 bg-gray-200 hover:bg-indigo-50 rounded-sm w-4 h-3 flex items-center justify-center"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"></polyline></svg></button>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                >
                  <X className="h-3 w-3 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-12">
        {itineraryByDay.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
            <span className="text-4xl mb-3 block">🕵️‍♂️</span>
            <p className="text-gray-500 font-bold">没有找到匹配的行程</p>
          </div>
        ) : itineraryByDay.map((day, dIdx) => (
          <div key={dIdx} id={`day-${dIdx}`} className="relative rounded-2xl transition-all duration-500">
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

            <div className="space-y-8 pl-4 sm:pl-6">
              {day.groups.map((group, gIdx) => (
                <div key={gIdx} className="relative">
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
                      <div key={iIdx} id={`item-${dIdx}-${actualIdx}`} className="relative flex flex-col sm:flex-row sm:items-center gap-2 rounded-2xl transition-all duration-500">
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
                                  {isExpanded && !isEditing && matched && (
                                    <div className="mt-2 mb-2 px-4 sm:px-0">
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onLocationClick(matched);
                                        }}
                                        className="flex items-center justify-center gap-1.5 w-full bg-indigo-600 hover:bg-black text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-200"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                        <span>📌 跳转至探索详情</span>
                                      </button>
                                    </div>
                                  )}

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
