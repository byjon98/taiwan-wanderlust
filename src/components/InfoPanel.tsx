import React, { useState, useEffect } from 'react';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { ToastContainer, toast } from './Toast';
import { AlertTriangle, Plane, Train, CheckCircle2, Circle, Navigation, Plus, X, ShoppingBag, Gift, Sparkles, Package, Coffee, Brush, Heart, Footprints, User, Store, Utensils, ChevronRight, ExternalLink, MapPin, Clock, Tag, MessageSquare, Info, Eye, RotateCcw, RotateCw, Trash2, Undo2, Redo2, Smartphone, Cpu, Edit2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { souvenirModules as rawSouvenirModules, groceryModules as rawGroceryModules, packingList as defaultPackingList, InfoModule, InfoItem } from '../data/info';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types for packing list
interface StatefulPackingItem {
  id: string;
  text: string;
  note?: string;
  checked: boolean;
}

interface StatefulPackingCategory {
  title: string;
  items: StatefulPackingItem[];
}


const INITIAL_PACKING_LIST = defaultPackingList.map(cat => ({
  title: cat.title,
  items: cat.items.map((item, i) => ({
    ...item,
    id: `${cat.title}-${i}-${Date.now()}-${Math.random()}`,
    checked: false
  }))
}));

const INITIAL_SOUVENIRS = rawSouvenirModules.map(module => ({
  ...module,
  items: module.items.map((item, i) => ({
    ...item,
    id: `souvenir-${module.id}-${i}`
  }))
}));

const INITIAL_GROCERIES = rawGroceryModules.map(module => ({
  ...module,
  items: module.items.map((item, i) => ({
    ...item,
    id: `grocery-${module.id}-${i}`
  }))
}));

export default function InfoPanel() {
  const [activeTab, setActiveTab] = useState<'logistics' | 'souvenirs' | 'grocery' | 'packing'>('logistics');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Global Edit Mode for Travel Info
  const [isEditMode, setIsEditMode] = useState(false);

  // Reset Edit Mode when activeTab changes
  useEffect(() => {
    setIsEditMode(false);
  }, [activeTab]);

  // Edit Modal State
  const [editorModal, setEditorModal] = useState<{
    isOpen: boolean;
    moduleId: string;
    item: any | null;
  }>({
    isOpen: false,
    moduleId: '',
    item: null
  });

  // Packing List State
  const [userPackingList, setUserPackingList] = useFirestoreSync<StatefulPackingCategory[]>('packing', 'taiwan_trip_packing_v2', INITIAL_PACKING_LIST);
  const [history, setHistory] = useState<StatefulPackingCategory[][]>([]);
  const [future, setFuture] = useState<StatefulPackingCategory[][]>([]);
  const [newPackingItems, setNewPackingItems] = useState<Record<number, string>>({});
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);

  // Souvenirs & Groceries State synced via useFirestoreSync
  const [souvenirDataRaw, setSouvenirData] = useFirestoreSync<InfoModule[]>('souvenirs', 'taiwan_trip_souvenirs_v2', INITIAL_SOUVENIRS);
  const [groceryDataRaw, setGroceryData] = useFirestoreSync<InfoModule[]>('grocery', 'taiwan_trip_grocery_v2', INITIAL_GROCERIES);

  // Souvenirs & Groceries History states
  const [souvenirHistory, setSouvenirHistory] = useState<InfoModule[][]>([]);
  const [souvenirFuture, setSouvenirFuture] = useState<InfoModule[][]>([]);
  const [groceryHistory, setGroceryHistory] = useState<InfoModule[][]>([]);
  const [groceryFuture, setGroceryFuture] = useState<InfoModule[][]>([]);

  // Guarantee every item has an ID runtime-safely
  const souvenirData = souvenirDataRaw.map((module) => ({
    ...module,
    items: module.items.map((item: any, i: number) => ({
      ...item,
      id: item.id || `souvenir-${module.id}-${i}`
    }))
  }));

  const groceryData = groceryDataRaw.map((module) => ({
    ...module,
    items: module.items.map((item: any, i: number) => ({
      ...item,
      id: item.id || `grocery-${module.id}-${i}`
    }))
  }));

  // Migration: merge any new default modules/items that are missing from Firestore data
  // This runs once after data is loaded and adds new items without overwriting user's changes
  useEffect(() => {
    if (!souvenirDataRaw || souvenirDataRaw.length === 0) return;
    let needsUpdate = false;
    const merged = INITIAL_SOUVENIRS.map((defaultModule) => {
      const existing = souvenirDataRaw.find((m: any) => m.id === defaultModule.id);
      if (!existing) { needsUpdate = true; return defaultModule; }
      // Merge any new items that don't exist yet (matched by name)
      const newItems = defaultModule.items.filter(
        (di) => !existing.items.some((ei: any) => ei.n === di.n)
      );
      if (newItems.length > 0) { needsUpdate = true; }
      return { ...existing, items: [...existing.items, ...newItems] };
    });
    // Also keep any user-added modules not in defaults
    const extraModules = souvenirDataRaw.filter((m: any) => !INITIAL_SOUVENIRS.find(d => d.id === m.id));
    if (needsUpdate) setSouvenirData([...merged, ...extraModules]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [souvenirDataRaw.length > 0 ? souvenirDataRaw[0]?.id : null]);

  useEffect(() => {
    if (!groceryDataRaw || groceryDataRaw.length === 0) return;
    let needsUpdate = false;
    const merged = INITIAL_GROCERIES.map((defaultModule) => {
      const existing = groceryDataRaw.find((m: any) => m.id === defaultModule.id);
      if (!existing) { needsUpdate = true; return defaultModule; }
      const newItems = defaultModule.items.filter(
        (di) => !existing.items.some((ei: any) => ei.n === di.n)
      );
      if (newItems.length > 0) { needsUpdate = true; }
      return { ...existing, items: [...existing.items, ...newItems] };
    });
    const extraModules = groceryDataRaw.filter((m: any) => !INITIAL_GROCERIES.find((d: any) => d.id === m.id));
    if (needsUpdate) setGroceryData([...merged, ...extraModules]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groceryDataRaw.length > 0 ? groceryDataRaw[0]?.id : null]);

  // Packing list migration: merge new default items into existing packing list
  useEffect(() => {
    if (!userPackingList || userPackingList.length === 0) return;
    let needsUpdate = false;
    const merged = INITIAL_PACKING_LIST.map((defaultCat) => {
      const existing = userPackingList.find((c: any) => c.title === defaultCat.title);
      if (!existing) { needsUpdate = true; return defaultCat; }
      const newItems = defaultCat.items.filter(
        (di) => !existing.items.some((ei: any) => ei.text === di.text)
      );
      if (newItems.length > 0) { needsUpdate = true; }
      return { ...existing, items: [...existing.items, ...newItems] };
    });
    const extraCats = userPackingList.filter((c: any) => !INITIAL_PACKING_LIST.find((d: any) => d.title === c.title));
    if (needsUpdate) setUserPackingList([...merged, ...extraCats]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPackingList.length > 0 ? userPackingList[0]?.title : null]);

  // Souvenir History Helpers
  const updateSouvenirsWithHistory = (newList: InfoModule[]) => {
    setSouvenirHistory(prev => [...prev.slice(-49), souvenirData]);
    setSouvenirFuture([]);
    setSouvenirData(newList);
  };

  const undoSouvenirs = () => {
    if (souvenirHistory.length === 0) return;
    const previous = souvenirHistory[souvenirHistory.length - 1];
    setSouvenirFuture(prev => [souvenirData, ...prev]);
    setSouvenirHistory(prev => prev.slice(0, -1));
    setSouvenirData(previous);
  };

  const redoSouvenirs = () => {
    if (souvenirFuture.length === 0) return;
    const next = souvenirFuture[0];
    setSouvenirHistory(prev => [...prev, souvenirData]);
    setSouvenirFuture(prev => prev.slice(1));
    setSouvenirData(next);
  };

  const resetSouvenirs = () => {
    if (confirm('确定要重置所有伴手礼数据到默认吗？')) {
      setSouvenirHistory(prev => [...prev.slice(-49), souvenirData]);
      setSouvenirFuture([]);
      setSouvenirData(INITIAL_SOUVENIRS);
    }
  };

  // Grocery History Helpers
  const updateGroceryWithHistory = (newList: InfoModule[]) => {
    setGroceryHistory(prev => [...prev.slice(-49), groceryData]);
    setGroceryFuture([]);
    setGroceryData(newList);
  };

  const undoGrocery = () => {
    if (groceryHistory.length === 0) return;
    const previous = groceryHistory[groceryHistory.length - 1];
    setGroceryFuture(prev => [groceryData, ...prev]);
    setGroceryHistory(prev => prev.slice(0, -1));
    setGroceryData(previous);
  };

  const redoGrocery = () => {
    if (groceryFuture.length === 0) return;
    const next = groceryFuture[0];
    setGroceryHistory(prev => [...prev, groceryData]);
    setGroceryFuture(prev => prev.slice(1));
    setGroceryData(next);
  };

  const resetGrocery = () => {
    if (confirm('确定要重置所有超市便利店数据到默认吗？')) {
      setGroceryHistory(prev => [...prev.slice(-49), groceryData]);
      setGroceryFuture([]);
      setGroceryData(INITIAL_GROCERIES);
    }
  };

  // Delete Item handler
  const handleDeleteItem = (moduleId: string, itemId: string) => {
    if (!confirm('确定要删除这个项目吗？')) return;

    if (activeTab === 'souvenirs') {
      const newList = souvenirData.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          items: m.items.filter((item: any) => item.id !== itemId)
        };
      });
      updateSouvenirsWithHistory(newList);
    } else {
      const newList = groceryData.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          items: m.items.filter((item: any) => item.id !== itemId)
        };
      });
      updateGroceryWithHistory(newList);
    }
  };

  // Edit / Add Item callbacks
  const handleOpenEditItem = (moduleId: string, item: any) => {
    setEditorModal({
      isOpen: true,
      moduleId,
      item
    });
  };

  const handleOpenAddItem = (moduleId: string) => {
    setEditorModal({
      isOpen: true,
      moduleId,
      item: null
    });
  };

  const handleSaveItem = (itemData: any) => {
    const { moduleId, item } = editorModal;

    if (activeTab === 'souvenirs') {
      let newList;
      if (item) {
        // Edit existing item
        newList = souvenirData.map(m => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            items: m.items.map((it: any) => it.id === item.id ? { ...it, ...itemData } : it)
          };
        });
      } else {
        // Add new item
        const newItem = {
          ...itemData,
          id: `souvenir-item-${Date.now()}-${Math.random()}`
        };
        newList = souvenirData.map(m => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            items: [...m.items, newItem]
          };
        });
      }
      updateSouvenirsWithHistory(newList);
    } else {
      let newList;
      if (item) {
        // Edit existing item
        newList = groceryData.map(m => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            items: m.items.map((it: any) => it.id === item.id ? { ...it, ...itemData } : it)
          };
        });
      } else {
        // Add new item
        const newItem = {
          ...itemData,
          id: `grocery-item-${Date.now()}-${Math.random()}`
        };
        newList = groceryData.map(m => {
          if (m.id !== moduleId) return m;
          return {
            ...m,
            items: [...m.items, newItem]
          };
        });
      }
      updateGroceryWithHistory(newList);
    }

    setEditorModal({ isOpen: false, moduleId: '', item: null });
  };

  // Edit category/module handler
  const handleEditModule = (moduleId: string) => {
    const modules = activeTab === 'souvenirs' ? souvenirData : groceryData;
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;

    const newName = prompt('请输入新分类名称：', module.name);
    if (newName === null) return;
    if (!newName.trim()) {
      toast.error('分类名称不能为空');
      return;
    }

    const newDesc = prompt('请输入新分类描述：', module.desc);
    if (newDesc === null) return;

    if (activeTab === 'souvenirs') {
      const newList = souvenirData.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          name: newName.trim(),
          desc: newDesc.trim()
        };
      });
      updateSouvenirsWithHistory(newList);
    } else {
      const newList = groceryData.map(m => {
        if (m.id !== moduleId) return m;
        return {
          ...m,
          name: newName.trim(),
          desc: newDesc.trim()
        };
      });
      updateGroceryWithHistory(newList);
    }
  };

  // Helper to update state with history
  const updateWithHistory = (newList: StatefulPackingCategory[]) => {
    // Limit history to 50 steps to save memory
    setHistory(prev => [...prev.slice(-49), userPackingList]);
    setFuture([]);
    setUserPackingList(newList);
  };

  const undo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [userPackingList, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setUserPackingList(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, userPackingList]);
    setFuture(prev => prev.slice(1));
    setUserPackingList(next);
  };



  const resetPackingList = () => {
    const initialized = defaultPackingList.map(cat => ({
      title: cat.title,
      items: cat.items.map((item, i) => ({
        ...item,
        id: `${cat.title}-${i}-${Date.now()}-${Math.random()}`,
        checked: false
      }))
    }));
    setUserPackingList(initialized);
    setHistory([]);
    setFuture([]);
    setNewPackingItems({});
  };

  const togglePackingItem = (catIdx: number, itemId: string) => {
    const newList = userPackingList.map((cat, idx) => {
      if (idx !== catIdx) return cat;
      return {
        ...cat,
        items: cat.items.map(item => 
          item.id === itemId ? { ...item, checked: !item.checked } : item
        )
      };
    });
    updateWithHistory(newList);
  };

  const addPackingItem = (catIdx: number) => {
    const text = newPackingItems[catIdx];
    if (!text?.trim()) return;

    const newList = userPackingList.map((cat, idx) => {
      if (idx !== catIdx) return cat;
      return {
        ...cat,
        items: [
          ...cat.items, 
          { id: `custom-${Date.now()}-${Math.random()}`, text: text.trim(), checked: false }
        ]
      };
    });
    
    updateWithHistory(newList);
    setNewPackingItems(prev => ({ ...prev, [catIdx]: '' }));
  };

  const deletePackingItem = (catIdx: number, itemId: string) => {
    const newList = userPackingList.map((cat, idx) => {
      if (idx !== catIdx) return cat;
      return {
        ...cat,
        items: cat.items.filter(item => item.id !== itemId)
      };
    });
    updateWithHistory(newList);
  };

  // Logistics Data
  const [flights] = useState([
    { 
      id: 1, 
      from: 'KUL', fromFull: 'Kuala Lumpur', 
      to: 'TPE', toFull: 'Taipei Taoyuan', 
      flight: 'CI722', 
      airline: 'China Airlines',
      time: '14:45 - 19:35', 
      status: 'Scheduled', 
      terminal: 'T1', 
      gate: 'TBA', 
      duration: '4h 50m', 
      booking: 'N7X2Y9',
      baggage: '手提 7kg, 托运 23kg (计件制，以实际票价为准)',
      checkIn: '起飞前3小时开始，起飞前1小时结束',
      link: 'https://www.flightradar24.com/data/flights/ci722'
    },
    { 
      id: 2, 
      from: 'TPE', fromFull: 'Taipei Taoyuan', 
      to: 'KUL', toFull: 'Kuala Lumpur', 
      flight: 'CI721', 
      airline: 'China Airlines',
      time: '08:45 - 13:25', 
      status: 'Scheduled', 
      terminal: 'T1', 
      gate: 'TBA', 
      duration: '4h 40m', 
      booking: 'N7X2Y9',
      baggage: '手提 7kg, 托运 23kg (计件制，以实际票价为准)',
      checkIn: '起飞前3小时开始，起飞前1小时结束',
      link: 'https://www.flightradar24.com/data/flights/ci721'
    }
  ]);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(null);

  const [accommodations] = useState([
    {
      n: '台中東旅 Hotel East Taichung',
      d: '5/23 (Sat) – 5/25 (Mon) · 2晚',
      loc: 'No. 201, Section 1, Taiwan Blvd, Central District, Taichung City 400',
      app: 'Hotel East Taichung',
      gq: 'Hotel East Taichung Taiwan Blvd Taichung',
      color: '#E17055',
      checkIn: '15:00', checkOut: '12:00',
      breakfast: '✅ 含早餐 + 下午茶 + 宵夜，一晚三餐全包！',
      facilities: '免费 Wi-Fi · 24H 前台 · 电梯 · 饮水机 · 合作按摩服务',
      laundry: '✅ 自助洗衣机（收费）',
      luggage: '✅ 可免费寄存',
      review: '地点超好，走路到宫原眼科和夜市超近。房间偏小隔音一般，但含早餐+宵夜性价比极高，是台中最受好评的商务旅店之一。',
      tips: '入住就享用！一晚三餐都含。房间小是正常的，主要用来睡觉。建议备耳塞。'
    },
    {
      n: '日月潭 伊達邵渡假旅店',
      d: '5/25 (Mon) – 5/26 (Tue) · 1晚',
      loc: 'No. 270, Zhongzheng Rd, Yuchi Township, Nantou County 555',
      app: '伊達邵渡假旅店 日月潭',
      gq: '伊達邵渡假旅店 Yuchi Nantou',
      color: '#00B894',
      checkIn: '16:00', checkOut: '11:00',
      breakfast: '✅ 含早餐（中西式：稀饭 / 炒蛋 / 吐司 / 果汁）',
      facilities: '免费 Wi-Fi · 电梯 · 冰箱 · 热水壶 · 电视 · 饮水机 · 微波炉',
      laundry: '⚠️ 未明确提供，建议出发前确认',
      luggage: '✅ 可免费寄存，退房后游码头不用拖行李',
      review: '步行 2 分钟到伊达邵码头和老街。采智能自助入住，无传统柜台。房间有原住民风格装潢，部分房型有阳台可看景。',
      tips: '⚠️ 智能入住！务必提前看入住说明。台湾环保政策不提供牙刷牙膏，请自备！退房后行李可寄存再去搭船游湖。'
    },
    {
      n: 'City Suites Beimen (北门)',
      d: '5/26 (Tue) – 5/31 (Sun) · 5晚',
      loc: "No. 265, Chang'an W Rd, Datong District, Taipei City 103",
      app: 'City Suites Beimen Taipei',
      gq: 'City Suites Beimen Taipei Chang an W Rd',
      color: '#6C5CE7',
      checkIn: '15:00', checkOut: '11:00',
      breakfast: '❌ 无早餐。楼下 7-11，对面全家，方便解决',
      facilities: '免费 Wi-Fi · 24H 前台 · 电梯 · 房内保险箱 · 无障碍设施',
      laundry: '✅ 提供洗衣服务',
      luggage: '✅ 可免费寄存，适合早到或晚退房',
      review: '台北五晚大本营。地点绝佳：步行 4 分钟北门捷运站，8-15 分钟台北车站，宁夏夜市和大稻埕超近。房间偏小部分无窗，但市中心这价位很值。',
      tips: '最靠近机场捷运（北门站），从这里去桃园机场最方便！不提供一次性备品（环保政策），请自带洗漱用品。'
    },
    {
      n: 'City Suites Taoyuan Gateway',
      d: '5/31 (Sun) – 6/1 (Mon) · 1晚',
      loc: 'No. 442, Zhongzheng E Rd, Dayuan District, Taoyuan City 337',
      app: 'City Suites Taoyuan Gateway',
      gq: 'City Suites Taoyuan Gateway Dayuan',
      color: '#0984E3',
      checkIn: '15:00', checkOut: '11:00',
      breakfast: '✅ 含早餐自助吧 06:30–10:00。极早出发可前晚请前台预备早餐盒（三明治+饮料）',
      facilities: '免费 Wi-Fi · 24H 前台 · 电梯 · 冰箱 · 电视 · 茶/咖啡机 · 自动贩卖机 · 餐厅',
      laundry: '✅ 投币式洗衣机',
      luggage: '✅ 可免费寄存',
      review: '专为最后一晚设计的完美落脚点。离桃园机场约 15 分钟，叫计程车约 NT$200。步行 8-10 分钟大园捷运站。部分房间有飞机起降视野！',
      tips: '⚠️ 最后一晚！前一晚请前台预约 06:30 计程车（T1 或 T2 说清楚）。飞机迷可要求飞机视野房。周边便利店不多，提前备好零食。'
    }
  ]);
  const [expandedHotel, setExpandedHotel] = useState<number | null>(null);

  const [transports] = useState([
    { id: 1, title: '桃园机场捷运 (Airport MRT)', brief: '直达车 35分钟到达台北车站', detail: '紫色车厢为直达车，蓝色为普通车。直达车中间不停站，是进入市区最快的方式。', icon: '🚇' },
    { id: 2, title: '悠游卡 (EasyCard)', brief: '全台通用的交通卡', detail: '可在各大便利店购卡并充值。适用于捷运、公交、台铁、甚至便利店消费。', icon: '💳' },
    { id: 3, title: '台北捷运 (Taipei Metro)', brief: '覆盖台北核心景区', detail: '线路清晰，运营至24:00。板南线(蓝线)和淡水信义线(红线)最常用。', icon: '🚆' }
  ]);
  const [expandedTransport, setExpandedTransport] = useState<number | null>(null);

  const defaultChecklist = [
    { id: 1, text: '申请入台证 (Exit & Entry Permit)', checked: true },
    { id: 2, text: '购买旅游保险', checked: true },
    { id: 3, text: '预订桃园机场接送/接驳', checked: false },
    { id: 4, text: '兑换台币/准备外币卡', checked: false },
    { id: 5, text: '下载 Google Maps 离线地图', checked: false }
  ];

  const [checklist, setChecklist] = useFirestoreSync<{ id: number; text: string; checked: boolean }[]>('checklist', 'taiwan_trip_checklist_v1', defaultChecklist);
  const [checklistHistory, setChecklistHistory] = useState<typeof checklist[]>([]);
  const [checklistFuture, setChecklistFuture] = useState<typeof checklist[]>([]);
  const [newItem, setNewItem] = useState('');



  const updateChecklistWithHistory = (newList: typeof checklist) => {
    setChecklistHistory(prev => [...prev.slice(-49), checklist]);
    setChecklistFuture([]);
    setChecklist(newList);
  };

  const undoChecklist = () => {
    if (checklistHistory.length === 0) return;
    const previous = checklistHistory[checklistHistory.length - 1];
    setChecklistFuture(prev => [checklist, ...prev]);
    setChecklistHistory(prev => prev.slice(0, -1));
    setChecklist(previous);
  };

  const redoChecklist = () => {
    if (checklistFuture.length === 0) return;
    const next = checklistFuture[0];
    setChecklistHistory(prev => [...prev, checklist]);
    setChecklistFuture(prev => prev.slice(1));
    setChecklist(next);
  };

  const toggleCheck = (id: number) => {
    updateChecklistWithHistory(checklist.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const addItem = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newItem.trim()) {
      updateChecklistWithHistory([...checklist, { id: Date.now(), text: newItem.trim(), checked: false }]);
      setNewItem('');
    }
  };

  const deleteItem = (id: number) => {
    updateChecklistWithHistory(checklist.filter(item => item.id !== id));
  };

  // Map icons back to the modules
  const souvenirModules = souvenirData.map(m => {
    let icon;
    switch(m.id) {
      case 'food': icon = <Utensils className="w-5 h-5 text-orange-500" />; break;
      case 'tea': icon = <Coffee className="w-5 h-5 text-emerald-700" />; break;
      case 'skincare': icon = <Brush className="w-5 h-5 text-pink-500" />; break;
      case 'contacts': icon = <Eye className="w-5 h-5 text-sky-500" />; break;
      case 'life_creative': icon = <Sparkles className="w-5 h-5 text-purple-500" />; break;
      case 'bags': icon = <ShoppingBag className="w-5 h-5 text-indigo-500" />; break;
      case 'shoes': icon = <Footprints className="w-5 h-5 text-amber-700" />; break;
      case 'mens': icon = <User className="w-5 h-5 text-blue-700" />; break;
      case 'fashion_brands': icon = <Tag className="w-5 h-5 text-rose-500" />; break;
      case '3c_accessories': icon = <Smartphone className="w-5 h-5 text-slate-700" />; break;
      default: icon = <Gift className="w-5 h-5 text-gray-500" />;
    }
    return { ...m, icon };
  });

  const groceryModules = groceryData.map(m => {
    let icon;
    switch(m.id) {
      case 'store_711':
      case 'store_family': icon = <Store className="w-5 h-5 text-green-600" />; break;
      case 'super_px':
      case 'super_carrefour': icon = <Package className="w-5 h-5 text-blue-800" />; break;
      default: icon = <Store className="w-5 h-5 text-gray-500" />;
    }
    if (m.id === 'store_family') icon = <Store className="w-5 h-5 text-blue-600" />;
    if (m.id === 'super_carrefour') icon = <Package className="w-5 h-5 text-red-600" />;
    return { ...m, icon };
  });

  return (
    <div className="text-gray-800 space-y-6 pb-10 w-full animate-in fade-in duration-500">
      
      <div className="flex bg-gray-100 p-1 rounded-2xl mb-8">
        <button 
          onClick={() => setActiveTab('logistics')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'logistics' ? 'bg-white text-[#2D3436] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Navigation className="w-3.5 h-3.5" /> 基地
        </button>
        <button 
          onClick={() => setActiveTab('souvenirs')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'souvenirs' ? 'bg-white text-[#2D3436] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Gift className="w-3.5 h-3.5" /> 伴手礼
        </button>
        <button 
          onClick={() => setActiveTab('grocery')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'grocery' ? 'bg-white text-[#2D3436] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Store className="w-3.5 h-3.5" /> 超市便利店
        </button>
        <button 
          onClick={() => setActiveTab('packing')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${activeTab === 'packing' ? 'bg-white text-[#2D3436] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> 打包清单
        </button>
      </div>

      {activeTab === 'logistics' && (
        <div className="space-y-8">
          {/* Insurance & Emergency */}
          <section className="mb-6">
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> 紧急保险与救援
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full blur-2xl transform translate-x-1/3 -translate-y-1/2"></div>
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-red-900 font-bold">TripCare 360 Platinum</div>
                  <div className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest uppercase">Etiqa</div>
                </div>
                <div className="text-sm font-medium text-red-800">
                  <span className="opacity-70">受保人:</span> PANG EN SZE, LOH ZI JIA
                </div>
                <div className="text-sm font-medium text-red-800">
                  <span className="opacity-70">保单号:</span> PU582185
                </div>
                <div className="text-sm font-medium text-red-800">
                  <span className="opacity-70">承保日期:</span> 2026/05/23 - 2026/06/01
                </div>
                <div className="mt-2 pt-3 border-t border-red-200/50">
                  <div className="text-xs font-bold text-red-900 mb-1 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> 24小时全球医疗救援专线
                  </div>
                  <a href="tel:+60327856565" className="text-xl font-black text-red-600 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
                    +603 2785 6565
                  </a>
                  <button onClick={() => window.open((import.meta as any).env.BASE_URL + 'policy.pdf?v=2', '_blank')} className="mt-3 w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    查看完整保单 Policy
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Flights */}
          <section>
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-800">
              <Plane className="w-5 h-5" /> 航班信息
            </h3>
            <div className="space-y-3">
              {flights.map(f => (
                <div 
                  key={f.id} 
                  className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm cursor-pointer hover:border-gray-300 transition-colors" 
                  onClick={() => setExpandedFlight(expandedFlight === f.id ? null : f.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{f.from}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">{f.fromFull}</div>
                    </div>
                    <div className="text-center px-4">
                      <div className="text-gray-300 mb-1">
                        <Plane className={f.id === 2 ? "w-4 h-4 mx-auto rotate-180" : "w-4 h-4 mx-auto"} />
                      </div>
                      <div className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full mb-1">{f.flight}</div>
                      <div className="text-sm font-medium text-gray-700">{f.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-800">{f.to}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">{f.toFull}</div>
                    </div>
                  </div>
                  
                  {expandedFlight === f.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 animate-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-1">Status</span>
                          <span className={`font-semibold ${f.status === 'On Time' ? 'text-green-600' : 'text-blue-600'}`}>{f.status}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-1">Terminal/Gate</span>
                          <span className="font-semibold">{f.terminal} / {f.gate}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-1">Duration</span>
                          <span className="font-semibold text-gray-800">{f.duration}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px] uppercase tracking-wider mb-1">Booking Ref</span>
                          <span className="font-mono font-semibold text-gray-800">{f.booking}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-4">
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">💼 行李额度 (Baggage)</div>
                           <p className="text-gray-700 font-medium leading-relaxed">{(f as any).baggage}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🎫 报到时间 (Check-in)</div>
                           <p className="text-gray-700 font-medium leading-relaxed">{(f as any).checkIn}</p>
                        </div>
                      </div>

                      <div className="flex">
                        <a href={(f as any).link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 text-blue-600 font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                          <Plane className="w-3 h-3" /> 实时航班追踪 (Flightradar24)
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Accommodation */}
          <section>
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-800">
              📍 住宿安排
            </h3>
            <div className="space-y-3">
              {accommodations.map((h, i) => {
                const hx = h as any;
                const isOpen = expandedHotel === i;
                return (
                  <div
                    key={h.n}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setExpandedHotel(isOpen ? null : i)}
                  >
                    <div className="p-4 flex items-start gap-3">
                      <div className="w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: h.color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-0.5">{h.d}</div>
                        <div className="text-base font-black text-gray-800 leading-tight">{h.n}</div>
                        <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-2 flex-wrap">
                          <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg font-bold">入住 {hx.checkIn}</span>
                          <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-lg font-bold">退房 {hx.checkOut}</span>
                        </div>
                      </div>
                      <div className={cn("text-gray-300 transition-transform duration-300 flex-shrink-0 mt-1", isOpen ? "rotate-180" : "")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="px-4 pb-4 border-t border-gray-100 animate-in slide-in-from-top-2 duration-200">
                        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs mb-4">
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🍳 早餐</div>
                            <p className="text-gray-700 font-medium leading-relaxed">{hx.breakfast}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🧺 洗衣</div>
                            <p className="text-gray-700 font-medium leading-relaxed">{hx.laundry}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🧳 行李寄存</div>
                            <p className="text-gray-700 font-medium leading-relaxed">{hx.luggage}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">🏨 设施</div>
                            <p className="text-gray-700 font-medium leading-relaxed">{hx.facilities}</p>
                          </div>
                          <div className="col-span-full bg-amber-50 border border-amber-100 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">⭐ 网友评价</div>
                            <p className="text-amber-900 font-medium leading-relaxed italic">{hx.review}</p>
                          </div>
                          <div className="col-span-full bg-blue-50 border border-blue-100 p-3 rounded-xl">
                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">💡 Tips</div>
                            <p className="text-blue-900 font-medium leading-relaxed">{hx.tips}</p>
                          </div>
                          <div className="col-span-full text-[10px] text-gray-400 px-1">{h.loc}</div>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <a href={`https://maps.apple.com/?q=${encodeURIComponent(h.app)}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-blue-600 font-bold text-xs hover:underline bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                            🍎 Apple Maps
                          </a>
                          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hx.gq || h.app)}`} target="_blank" rel="noreferrer"
                            className="flex items-center gap-1.5 text-green-600 font-bold text-xs hover:underline bg-green-50 px-3 py-1.5 rounded-xl border border-green-100">
                            <Navigation className="w-3 h-3" /> Google Maps
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Transportation */}

          <section>
            <h3 className="font-bold text-xl mb-3 flex items-center gap-2 text-gray-800">
              <Train className="w-5 h-5" /> 交通连接
            </h3>
            <div className="space-y-2">
              {transports.map(t => (
                <div 
                  key={t.id} 
                  className="bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-gray-300 transition-colors shadow-sm"
                  onClick={() => setExpandedTransport(expandedTransport === t.id ? null : t.id)}
                >
                  <div className="flex gap-4 items-start">
                    <span className="text-xl bg-gray-50 p-2 rounded-xl border border-gray-100">{t.icon}</span>
                    <div className="flex-1 mt-1">
                      <div className="font-bold text-sm text-gray-800">{t.title}</div>
                      
                      {expandedTransport !== t.id ? (
                        <div className="text-sm text-gray-500 mt-1 truncate pr-4">{t.brief}</div>
                      ) : (
                        <div className="text-sm text-gray-600 mt-2 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100 animate-in slide-in-from-top-1">
                          {t.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Checklist */}
          <section className="pb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-xl text-gray-800">☑️ 备选清单</h3>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={undoChecklist}
                  disabled={checklistHistory.length === 0}
                  title="撤销"
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                    checklistHistory.length === 0
                      ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <Undo2 className="w-3 h-3" /> 撤销
                </button>
                <button
                  onClick={redoChecklist}
                  disabled={checklistFuture.length === 0}
                  title="重做"
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                    checklistFuture.length === 0
                      ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                  )}
                >
                  <Redo2 className="w-3 h-3" /> 重做
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <ul className="text-sm font-medium space-y-4">
                {checklist.map(item => (
                  <li key={item.id} className="flex items-center gap-3 group">
                    <div 
                      className={`flex-shrink-0 transition-colors cursor-pointer ${item.checked ? 'text-green-500' : 'text-gray-300 group-hover:text-gray-400'}`}
                      onClick={() => toggleCheck(item.id)}
                    >
                      {item.checked ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </div>
                    <span 
                      className={`flex-1 transition-all cursor-pointer ${item.checked ? "line-through text-gray-400 italic" : "text-gray-700"}`}
                      onClick={() => toggleCheck(item.id)}
                    >
                      {item.text}
                    </span>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
                <li className="flex items-center gap-3 pt-2">
                  <div className="text-gray-300 mx-0.5"><Plus className="w-4 h-4" /></div>
                  <input 
                    type="text" 
                    placeholder="添加待办事项..." 
                    value={newItem}
                    onChange={e => setNewItem(e.target.value)}
                    onKeyDown={addItem}
                    className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400 text-gray-700 py-1"
                  />
                </li>
              </ul>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'souvenirs' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-orange-50 border border-orange-100 p-5 rounded-3xl flex items-start gap-4 mb-4">
            <div className="bg-orange-500 p-2 rounded-2xl text-white shadow-sm">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <p className="text-orange-900 text-sm font-black leading-relaxed">
                台湾精选伴手礼
              </p>
              <p className="text-xs text-orange-600 mt-1 leading-relaxed">从地道美食到精品文创，为你甄选最值得带回家的宝藏。</p>
            </div>
          </div>

          {/* Premium Control Bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h4 className="font-black text-gray-800 text-sm flex items-center gap-1.5">
              🌸 伴手礼清单
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                onClick={undoSouvenirs}
                disabled={souvenirHistory.length === 0}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                  souvenirHistory.length === 0
                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                )}
                title="撤销"
              >
                <Undo2 className="w-3 h-3" /> 撤销
              </button>
              <button
                onClick={redoSouvenirs}
                disabled={souvenirFuture.length === 0}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                  souvenirFuture.length === 0
                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                )}
                title="重做"
              >
                <Redo2 className="w-3 h-3" /> 重做
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                  isEditMode
                    ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                    : "bg-white text-orange-600 border-orange-200 hover:bg-orange-50"
                )}
              >
                {isEditMode ? '退出编辑' : '编辑模式'}
              </button>
              <button
                onClick={resetSouvenirs}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="重置默认"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {souvenirModules.map(module => (
              <ModuleCard 
                key={module.id} 
                module={module} 
                expandedModule={expandedModule} 
                setExpandedModule={setExpandedModule}
                expandedItem={expandedItem}
                setExpandedItem={setExpandedItem}
                isEditMode={isEditMode}
                onEditItem={handleOpenEditItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleOpenAddItem}
                onEditModule={handleEditModule}
              />
            ))}
          </div>

          <SouvenirTips />
        </div>
      )}

      {activeTab === 'grocery' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="bg-green-50 border border-green-100 p-5 rounded-3xl flex items-start gap-4 mb-4">
            <div className="bg-green-600 p-2 rounded-2xl text-white shadow-sm">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <p className="text-green-900 text-sm font-black leading-relaxed">
                超市与便利店指南
              </p>
              <p className="text-xs text-green-600 mt-1 leading-relaxed">深入台湾日常生活，扫货必买零食与民生好物。</p>
            </div>
          </div>

          {/* Premium Control Bar */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h4 className="font-black text-gray-800 text-sm flex items-center gap-1.5">
              🛒 超市便利店清单
            </h4>
            <div className="flex items-center gap-1.5">
              <button
                onClick={undoGrocery}
                disabled={groceryHistory.length === 0}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                  groceryHistory.length === 0
                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                )}
                title="撤销"
              >
                <Undo2 className="w-3 h-3" /> 撤销
              </button>
              <button
                onClick={redoGrocery}
                disabled={groceryFuture.length === 0}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border",
                  groceryFuture.length === 0
                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-800"
                )}
                title="重做"
              >
                <Redo2 className="w-3 h-3" /> 重做
              </button>
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all border shadow-sm",
                  isEditMode
                    ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                    : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                )}
              >
                {isEditMode ? '退出编辑' : '编辑模式'}
              </button>
              <button
                onClick={resetGrocery}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                title="重置默认"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {groceryModules.map(module => (
              <ModuleCard 
                key={module.id} 
                module={module} 
                expandedModule={expandedModule} 
                setExpandedModule={setExpandedModule}
                expandedItem={expandedItem}
                setExpandedItem={setExpandedItem}
                isEditMode={isEditMode}
                onEditItem={handleOpenEditItem}
                onDeleteItem={handleDeleteItem}
                onAddItem={handleOpenAddItem}
                onEditModule={handleEditModule}
              />
            ))}
          </div>

          <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden mt-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h5 className="font-black text-2xl mb-4">⚠️ 带回马来西亚注意</h5>
                <p className="text-green-100 text-sm leading-relaxed opacity-90 space-y-2">
                  1. <strong>托运限制：</strong> 液体调味料(酱油膏、沙茶酱、鹅油)必须托运品。建议气泡膜严实包裹。<br/>
                  2. <strong>带不走的：</strong> 鲜食(泡芙、大福)和18天生啤只能当场吃，严禁带回国。<br/>
                  3. <strong>肉类警报：</strong> 肉松、猪肉纸等加工品入境大马有限制，过关请确认清楚。<br/>
                  4. <strong>袋子与退税：</strong> 超市塑料袋需付费；单次满NT$2000记得去家乐福办退税(5%)。
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-sm min-w-[140px]">
                <div className="text-[10px] font-black tracking-widest text-green-300 uppercase">实时汇率参考</div>
                <div className="text-3xl font-black">1 : 7.5+</div>
                <div className="text-[10px] text-white/50 tracking-tighter">RM 1 ≈ NT$ 7.58</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'packing' && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-blue-50 border border-blue-100 p-5 rounded-3xl mb-4 gap-4">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 p-2 rounded-2xl text-white shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-blue-900 text-sm font-black leading-relaxed">
                  旅行必备打包清单
                </p>
                <p className="text-xs text-blue-600 mt-1 leading-relaxed">细化到每一件单品，确保旅程无忧。</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button 
                onClick={undo}
                disabled={history.length === 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm border",
                  history.length === 0 
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                    : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                )}
              >
                <Undo2 className="w-3.5 h-3.5" /> 撤销
              </button>
              <button 
                onClick={redo}
                disabled={future.length === 0}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm border",
                  future.length === 0 
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed" 
                    : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                )}
              >
                <Redo2 className="w-3.5 h-3.5" /> 重做
              </button>
              <button 
                onClick={() => {
                  if(confirm('确定要彻底重置打包清单吗？')) resetPackingList();
                }}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="重置全部"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userPackingList.map((cat, idx) => (
              <div key={idx} className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col">
                <h4 className="font-black text-gray-800 mb-4 pb-2 border-b border-gray-50 flex items-center gap-2">
                  {cat.title}
                </h4>
                <ul className="space-y-3 flex-1">
                  {cat.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 group">
                      <button 
                        onClick={() => togglePackingItem(idx, item.id)}
                        className={cn(
                          "mt-1 flex-shrink-0 w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center",
                          item.checked ? "bg-green-500 border-green-500" : "border-gray-200 group-hover:border-blue-300"
                        )}
                      >
                        {item.checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0" onClick={() => togglePackingItem(idx, item.id)}>
                        <div className={cn("text-xs font-bold transition-all cursor-pointer", item.checked ? "text-gray-400 line-through italic" : "text-gray-700")}>
                          {item.text}
                        </div>
                        {item.note && <div className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.note}</div>}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePackingItem(idx, item.id);
                        }}
                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-2">
                  <div className="text-gray-300"><Plus className="w-3.5 h-3.5" /></div>
                  <input 
                    type="text" 
                    placeholder="添加项目..." 
                    value={newPackingItems[idx] || ''}
                    onChange={e => setNewPackingItems(prev => ({ ...prev, [idx]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addPackingItem(idx)}
                    className="flex-1 text-[11px] outline-none bg-transparent placeholder:text-gray-300 text-gray-600 py-1"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Special Notes & Reminders */}
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl space-y-4">
             <h5 className="font-black text-red-800 flex items-center gap-2">
               <Info className="w-5 h-5" /> ⚠️ 高风险提醒
             </h5>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/60 p-4 rounded-2xl border border-red-100">
                   <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">插头与电压</div>
                   <p className="text-xs text-red-900 leading-relaxed font-medium">
                     台湾110V两脚扁插。必须携带转换头。自带吹风筒需确认支持双电压(100-240V)，否则会烧掉。
                   </p>
                </div>
                <div className="bg-white/60 p-4 rounded-2xl border border-red-100">
                   <div className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">回程与安检</div>
                   <p className="text-xs text-red-900 leading-relaxed font-medium">
                     小潘凤凰酥易碎且裸装，建议手提上机。承继起司蛋糕无法带回大马，请当场吃完。
                   </p>
                </div>
             </div>
             <div className="bg-white/60 p-4 rounded-2xl border border-red-100 italic text-xs text-red-800 leading-relaxed">
                “止泻药：10天夜市之旅，这是最高使用率的药。” —— 过来人的建议
             </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-3xl">
             <div className="flex items-start gap-4">
                <div className="bg-gray-800 p-2 rounded-xl text-white">
                   <Coffee className="w-4 h-4" />
                </div>
                <div>
                   <h6 className="font-bold text-gray-800 text-sm mb-1">关于吹风筒的建议</h6>
                   <p className="text-xs text-gray-500 leading-relaxed">
                     台湾饭店几乎 100% 有提供，建议直接用饭店的省重量。如果 June 发量很多，建议买一个旅行专用双电压款。
                   </p>
                </div>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}

function ModuleCard({ 
  module, 
  expandedModule, 
  setExpandedModule, 
  expandedItem, 
  setExpandedItem,
  isEditMode,
  onEditItem,
  onDeleteItem,
  onAddItem,
  onEditModule
}: any) {
  return (
    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <button 
        onClick={() => setExpandedModule(expandedModule === module.id ? null : module.id)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4 text-left">
          <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-50">
            {module.icon}
          </div>
          <div>
            <div className="font-black text-lg text-gray-800 tracking-tight flex items-center gap-2">
              {module.name}
              {isEditMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditModule(module.id);
                  }}
                  className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded transition-colors"
                  title="重命名分类"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{module.desc}</div>
          </div>
        </div>
        <Plus className={cn("w-5 h-5 text-gray-300 transition-transform duration-300", expandedModule === module.id ? "rotate-45" : "")} />
      </button>

      {expandedModule === module.id && (
        <div className="px-6 pb-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {module.items.map((item: any, idx: number) => (
              <div 
                key={item.id || idx} 
                className={cn(
                  "group cursor-pointer rounded-2xl p-4 border transition-all relative overflow-hidden",
                  expandedItem === `${module.id}-${idx}` 
                    ? "bg-indigo-50 border-indigo-200" 
                    : "bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 shadow-sm"
                )}
                onClick={() => setExpandedItem(expandedItem === `${module.id}-${idx}` ? null : `${module.id}-${idx}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 pr-16">
                    <div className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                      {item.n}
                      <ChevronRight className={cn("w-3 h-3 transition-transform", expandedItem === `${module.id}-${idx}` ? "rotate-90 text-indigo-400" : "text-gray-300")} />
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-relaxed">{item.d}</div>
                  </div>

                  {isEditMode && (
                    <div 
                      className="absolute right-3 top-3 flex items-center gap-1.5 z-10" 
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditItem(module.id, item);
                        }}
                        className="p-1.5 bg-white border border-gray-100 hover:border-indigo-100 text-gray-400 hover:text-indigo-600 rounded-xl shadow-sm hover:shadow transition-all"
                        title="编辑"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteItem(module.id, item.id);
                        }}
                        className="p-1.5 bg-white border border-gray-100 hover:border-red-100 text-gray-400 hover:text-red-500 rounded-xl shadow-sm hover:shadow transition-all"
                        title="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {expandedItem === `${module.id}-${idx}` && (
                  <div className="mt-4 pt-4 border-t border-indigo-100 space-y-4 animate-in slide-in-from-top-1 duration-200">
                    
                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                      {item.link && (
                        <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-indigo-100 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <ExternalLink className="w-3 h-3" /> 链接 (Link)
                        </a>
                      )}
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.n)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-green-100 rounded-lg text-[10px] font-bold text-green-600 hover:bg-green-50 transition-colors">
                        <MapPin className="w-3 h-3" /> 地图搜索
                      </a>
                    </div>

                    {/* Detailed Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/60 p-3 rounded-xl border border-indigo-50">
                        <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1"><Tag className="w-2.5 h-2.5" /> 价格参考 (Price)</div>
                        <p className="text-[11px] text-indigo-900 leading-relaxed font-bold">{item.price || '暂无报价'}</p>
                      </div>
                      <div className="bg-white/60 p-3 rounded-xl border border-indigo-50">
                        <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> 营业时间 (Hours)</div>
                        <p className="text-[11px] text-indigo-900 leading-relaxed font-bold">{item.hours || '暂无时间'}</p>
                      </div>
                      {item.buy && (
                        <div className="col-span-2 bg-white/60 p-3 rounded-xl border border-indigo-50">
                          <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1"><ShoppingBag className="w-2.5 h-2.5" /> 必买推荐 (Buy)</div>
                          <p className="text-[11px] text-indigo-900 leading-relaxed font-medium whitespace-pre-wrap">{item.buy}</p>
                        </div>
                      )}
                      {item.do && (
                        <div className="col-span-2 bg-white/60 p-3 rounded-xl border border-indigo-50">
                          <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> 必去体验 (Do)</div>
                          <p className="text-[11px] text-indigo-900 leading-relaxed font-medium whitespace-pre-wrap">{item.do}</p>
                        </div>
                      )}
                      {item.eval && (
                        <div className="col-span-2 bg-white/60 p-3 rounded-xl border border-indigo-50">
                          <div className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 flex items-center gap-1"><MessageSquare className="w-2.5 h-2.5" /> 网络评价 (Review)</div>
                          <p className="text-[11px] text-indigo-900 leading-relaxed italic">{item.eval}</p>
                        </div>
                      )}
                    </div>

                    {/* Tips */}
                    {item.tip && (
                      <div className="flex items-start gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100">
                        <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5" />
                        <div>
                          <div className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-0.5">内部建议 (Tips)</div>
                          <span className="text-[11px] font-bold text-amber-800 leading-snug">{item.tip}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isEditMode && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddItem(module.id);
                }}
                className="group flex flex-col items-center justify-center border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-2xl p-6 bg-white hover:bg-indigo-50/20 transition-all text-center h-full min-h-[120px]"
              >
                <div className="p-2.5 bg-gray-50 group-hover:bg-indigo-50 rounded-xl transition-all border border-gray-100 group-hover:border-indigo-100 text-gray-400 group-hover:text-indigo-600 mb-2">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-gray-500 group-hover:text-indigo-600 transition-colors">添加新项目</div>
                <div className="text-[10px] text-gray-400 mt-0.5">为该分类添加自定义旅游资讯</div>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function SouvenirTips() {
  return (
    <div className="bg-gray-900 rounded-3xl p-8 text-white relative overflow-hidden mt-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h5 className="font-black text-2xl mb-4">💡 深度探索小贴士</h5>
          <p className="text-indigo-100 text-sm leading-relaxed opacity-90 space-y-2">
            1. <strong>退税流程：</strong> 单次购物满NT$2000即可申请退税(5%)。大型百货可现场退。携带护照原件！<br/>
            2. <strong>支付建议：</strong> 百货柜位基本全线对手马币信用卡、Apple Pay。<br/>
            3. <strong>快递回国：</strong> 液体或易碎品建议仔细打包，或询问顺丰代寄。
          </p>
        </div>
        <div className="flex flex-col items-center gap-2 bg-white/10 p-5 rounded-3xl border border-white/10 backdrop-blur-sm min-w-[140px]">
          <div className="text-[10px] font-black tracking-widest text-indigo-300 uppercase">实时汇率参考</div>
          <div className="text-3xl font-black">1 : 7.5+</div>
          <div className="text-[10px] text-white/50 tracking-tighter">RM 1 ≈ NT$ 7.58</div>
        </div>
      </div>
    </div>
  );
}

function ItemEditorModal({ item, onClose, onSave }: { item: any | null; onClose: () => void; onSave: (data: any) => void }) {
  const [name, setName] = useState(item?.n || '');
  const [desc, setDesc] = useState(item?.d || '');
  const [price, setPrice] = useState(item?.price || '');
  const [hours, setHours] = useState(item?.hours || '');
  const [buy, setBuy] = useState(item?.buy || '');
  const [doExp, setDoExp] = useState(item?.do || '');
  const [evalStr, setEvalStr] = useState(item?.eval || '');
  const [tip, setTip] = useState(item?.tip || '');
  const [link, setLink] = useState(item?.link || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('项目名称不能为空');
      return;
    }
    onSave({
      n: name.trim(),
      d: desc.trim(),
      price: price.trim(),
      hours: hours.trim(),
      buy: buy.trim(),
      do: doExp.trim(),
      eval: evalStr.trim(),
      tip: tip.trim(),
      link: link.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-gray-800 tracking-tight">
              {item ? '📝 编辑项目资讯' : '✨ 添加新项目'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {item ? `正在修改 ${item.n} 的详细旅游攻略` : '为你的台湾行程增添自定义吃喝玩乐推荐'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">基本信息 (Basic Info)</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  项目名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="如：微热山丘凤梨酥"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  简短描述
                </label>
                <input
                  type="text"
                  placeholder="如：超人气土凤梨酥，附免费奉茶体验"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" /> 价格参考 (Price)
                </label>
                <input
                  type="text"
                  placeholder="如：NT$420 / 盒 (10个装)"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" /> 营业时间 (Hours)
                </label>
                <input
                  type="text"
                  placeholder="如：10:00 - 20:00 (无休)"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Detailed Guide */}
          <div className="space-y-4 pt-2 border-t border-gray-50">
            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">深度攻略 (Travel Guide)</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" /> 必买推荐 / 特色介绍 (What to Buy)
                </label>
                <textarea
                  rows={2}
                  placeholder="推荐购买什么口味、规格或特产详情..."
                  value={buy}
                  onChange={e => setBuy(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> 必去体验 / 玩法推荐 (What to Do)
                </label>
                <textarea
                  rows={2}
                  placeholder="如何获得最佳体验、避坑玩法或点单攻略..."
                  value={doExp}
                  onChange={e => setDoExp(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> 网络评价 / 口碑 (Reviews)
                </label>
                <input
                  type="text"
                  placeholder="如：台北凤梨酥天花板，皮酥馅酸甜，茶香极浓"
                  value={evalStr}
                  onChange={e => setEvalStr(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-amber-500" /> 内部贴心建议 (Tips)
                </label>
                <input
                  type="text"
                  placeholder="如：民生社区店可以免费喝茶吃一整块凤梨酥，建议下午去"
                  value={tip}
                  onChange={e => setTip(e.target.value)}
                  className="w-full px-4 py-3 bg-amber-50/40 border border-amber-100/50 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" /> 官方链接 / 参考网址 (Link)
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-medium focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-gray-400 text-gray-800"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:scale-95 transition-all"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-2xl text-xs font-black text-white shadow-md shadow-indigo-100 hover:shadow-lg transition-all"
          >
            保存项目
          </button>
        </div>
      </div>
    </div>
  );
}
