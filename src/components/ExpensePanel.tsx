import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, ShieldCheck, Banknote, CreditCard, CheckCircle2, TrendingUp, Plus, X, Calculator, ArrowRightLeft, Clock, History, Search, Undo2, Navigation } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Expense, PAYMENT_METHODS, CATEGORIES, PAYER_TYPES, ZONES, CONSTANTS, INITIAL_SUNK_COSTS } from '../data-expense';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ExpensePanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0.145);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'split'>('dashboard');

  // History & Undo State
  const [deletedHistory, setDeletedHistory] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Entry State
  const [entrySubject, setEntrySubject] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<'TWD' | 'MYR'>('TWD');
  const [entryMethod, setEntryMethod] = useState('cash');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryPayerType, setEntryPayerType] = useState<Expense['payerType']>('split_50');
  const [entryZone, setEntryZone] = useState('taipei');
  
  // Custom Split Input
  const [customJonPaid, setCustomJonPaid] = useState('');
  const [customZoneText, setCustomZoneText] = useState('');

  // Initialize
  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_expenses_v2');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch(e) {}
    } else {
      // First time initialization with sunk costs
      setExpenses(INITIAL_SUNK_COSTS);
    }
    
    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MYR) setExchangeRate(data.rates.MYR);
      }).catch(() => console.log('Failed to fetch rate.'));
  }, []);

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem('taiwan_trip_expenses_v2', JSON.stringify(expenses));
    }
  }, [expenses]);

  const stats = useMemo(() => {
    let spentCashTwd = 0;
    let spentCardMyr = 0;
    let spentMyrCash = 0;
    let paidHotelLocker = false;
    let totalSpentMyr = 0;
    let totalSpentTwd = 0;

    let jonPaidTotal = 0;
    let junePaidTotal = 0;
    let jonSunkPaidTotal = 0; // tracking for the split view
    let juneSunkPaidTotal = 0;

    const categoryTotals: Record<string, number> = {};

    expenses.forEach(e => {
      const amountMyr = e.currency === 'MYR' ? e.amount : e.amount * exchangeRate;
      const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
      
      totalSpentMyr += amountMyr;
      totalSpentTwd += amountTwd;

      if (e.paymentMethod === 'cash') spentCashTwd += amountTwd;
      if (e.paymentMethod === 'card') spentCardMyr += amountMyr;
      if (e.paymentMethod === 'myr_cash') spentMyrCash += amountMyr;

      if (e.category === 'hotel_cash') paidHotelLocker = true;

      // Category tracking (in TWD normalized)
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amountTwd;

      // Payer math
      const jonPaidMyr = e.currency === 'MYR' ? e.jonPaid : e.jonPaid * exchangeRate;
      const junePaidMyr = e.currency === 'MYR' ? e.junePaid : e.junePaid * exchangeRate;

      // For splitwise ledger, we only count non-sunk costs because sunk is already settled
      // Actually, if we track EVERYTHING, we just sum up everything each paid, and see the diff.
      jonPaidTotal += jonPaidMyr;
      junePaidTotal += junePaidMyr;
    });

    const cashRemainingTwd = (CONSTANTS.JON_CASH_TWD + CONSTANTS.JUNE_CASH_TWD) - spentCashTwd;
    const cardRemainingMyr = CONSTANTS.CARD_RESERVE_MYR - spentCardMyr;
    const availableCashAfterLocker = paidHotelLocker ? cashRemainingTwd : cashRemainingTwd - CONSTANTS.LOCKED_HOTEL_TWD;

    const eachOwes = (jonPaidTotal + junePaidTotal) / 2;
    const jonOwesJune = eachOwes - jonPaidTotal; 

    return {
      totalSpentMyr, totalSpentTwd,
      spentCashTwd, cashRemainingTwd, availableCashAfterLocker, paidHotelLocker,
      spentCardMyr, cardRemainingMyr,
      spentMyrCash,
      jonOwesJune, jonPaidTotal, junePaidTotal,
      categoryTotals
    };
  }, [expenses, exchangeRate]);

  // Derived filtered expenses
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const q = searchQuery.toLowerCase();
    return expenses.filter(e => 
      e.subject.toLowerCase().includes(q) || 
      getCategoryLabel(e.category).toLowerCase().includes(q) ||
      e.paymentMethod.toLowerCase().includes(q)
    );
  }, [expenses, searchQuery]);

  const filteredSubtotal = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return filteredExpenses.reduce((sum, e) => {
      return sum + (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
    }, 0);
  }, [filteredExpenses, exchangeRate, searchQuery]);

  // Daily Burn Rate
  const dailyBurn = useMemo(() => {
    const days: Record<number, number> = {};
    for(let i = 1; i <= CONSTANTS.TOTAL_DAYS; i++) days[i] = 0;
    expenses.forEach(e => {
      // exclude pre-trip sunk costs from daily burn
      if (e.timestamp < 100) return; 
      const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
      if (!days[e.day]) days[e.day] = 0;
      days[e.day] += amountTwd;
    });
    return days;
  }, [expenses, exchangeRate]);

  // Submit Expense
  const handleSubmit = () => {
    const amountNum = parseFloat(entryAmount);
    if (!entrySubject || !amountNum || !entryCategory) return alert('请填写标题、金额并选择消费类别！');
    
    let jPaid = 0;
    let juPaid = 0;
    
    if (entryPayerType === 'jon_full') {
      jPaid = amountNum;
    } else if (entryPayerType === 'june_full') {
      juPaid = amountNum;
    } else if (entryPayerType === 'split_50') {
      jPaid = amountNum / 2;
      juPaid = amountNum / 2;
    } else {
      jPaid = parseFloat(customJonPaid) || 0;
      juPaid = amountNum - jPaid;
    }

    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: entrySubject,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryMethod as any,
      category: entryCategory,
      payerType: entryPayerType,
      jonPaid: jPaid,
      junePaid: juPaid,
      zone: entryZone === 'custom' ? customZoneText : entryZone,
      timestamp: Date.now(),
      day: 1,
    };
    
    const tripStart = new Date('2026-05-23T00:00:00+08:00').getTime();
    const diffDays = Math.floor((Date.now() - tripStart) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= 10) newExpense.day = diffDays;
    
    setExpenses(prev => [newExpense, ...prev]);
    setIsFabOpen(false);
    setEntrySubject('');
    setEntryAmount('');
    setCustomJonPaid('');
  };

  const deleteExpense = (id: string) => {
    const toDelete = expenses.find(e => e.id === id);
    if (toDelete) {
      setDeletedHistory(prev => [toDelete, ...prev].slice(0, 10)); // keep last 10
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const undoDelete = () => {
    if (deletedHistory.length === 0) return;
    const toRestore = deletedHistory[0];
    setExpenses(prev => {
      const copy = [...prev, toRestore];
      return copy.sort((a, b) => b.timestamp - a.timestamp);
    });
    setDeletedHistory(prev => prev.slice(1));
  };

  const requestGPS = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        if (latitude > 24.9 && longitude > 121.2) setEntryZone('taipei');
        else if (latitude > 24.0 && latitude < 24.4) setEntryZone('taichung');
        else if (latitude > 23.7 && latitude < 24.0) setEntryZone('nantou');
        else setEntryZone('taipei'); // fallback guess
      }, () => {
        alert("定位失败");
      });
    }
  };

  // Helpers
  function getCategoryLabel(id: string) {
    for (const group of CATEGORIES) {
      const item = group.items.find(i => i.id === id);
      if (item) return `${item.icon} ${item.label}`;
    }
    return '❓ 未知';
  }

  const currentConverted = entryAmount ? (entryCurrency === 'TWD' ? parseFloat(entryAmount) * exchangeRate : parseFloat(entryAmount) / exchangeRate).toFixed(2) : '0.00';
  const oppositeCurrency = entryCurrency === 'TWD' ? 'MYR' : 'TWD';
  const totalCashPoolTwd = CONSTANTS.JON_CASH_TWD + CONSTANTS.JUNE_CASH_TWD;

  return (
    <div className="flex flex-col h-full bg-white pb-20 lg:pb-0 relative text-[#1d1d1f] font-sans antialiased">
      
      {/* HEADER - MINIMALIST */}
      <div className="pt-8 pb-4 px-6 border-b border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight">财务大盘</h1>
            <div className="text-[10px] font-bold text-gray-400 mt-0.5">
              NT$ 100 ≈ MYR {(exchangeRate * 100).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold text-gray-400 mb-0.5 uppercase tracking-widest">Global Remaining</div>
            <div className="text-xl font-black">NT$ {(stats.cashRemainingTwd + (stats.cardRemainingMyr/exchangeRate)).toLocaleString(undefined, {maximumFractionDigits:0})}</div>
          </div>
        </div>

        {/* Minimalist Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full">
          <button onClick={() => setActiveTab('dashboard')} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all", activeTab === 'dashboard' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}>
            仪表盘
          </button>
          <button onClick={() => setActiveTab('history')} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all", activeTab === 'history' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}>
            明细记录
          </button>
          <button onClick={() => setActiveTab('split')} className={cn("flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all", activeTab === 'split' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}>
            分账结算
          </button>
        </div>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32 max-w-2xl mx-auto w-full">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            
            {/* Global Summary */}
            <div className="flex justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">总消费 (Total Spent)</span>
                <span className="block text-lg font-black text-gray-800">MYR {stats.totalSpentMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                <span className="block text-[11px] font-bold text-gray-400 mt-1">≈ NT$ {stats.totalSpentTwd.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">总预算 (Total Budget)</span>
                <span className="block text-lg font-black text-gray-800">MYR 10,000.00</span>
                <span className="block text-[11px] font-bold text-gray-400 mt-1">≈ NT$ {(10000 / exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
            </div>

            {/* Block: Cash Pool */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">台币现金池 (Jon+June)</h3>
                  <p className="text-[10px] font-medium text-gray-400">总共带去台湾的实体纸钞</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-gray-800">NT$ {stats.cashRemainingTwd.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                </div>
              </div>
              
              <div className="relative pt-6">
                {!stats.paidHotelLocker && (
                  <div 
                    className="absolute top-0 right-0 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-t-md border-x border-t border-red-200 z-10"
                    style={{ right: `${(CONSTANTS.LOCKED_HOTEL_TWD / totalCashPoolTwd) * 100}%`, transform: 'translateX(50%)' }}
                  >
                    锁定 NT$ {CONSTANTS.LOCKED_HOTEL_TWD}
                  </div>
                )}
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden relative border border-gray-200">
                  <div 
                    className={cn("h-full rounded-full transition-all duration-500", (stats.cashRemainingTwd / totalCashPoolTwd) < 0.2 ? "bg-red-500" : "bg-black")}
                    style={{ width: `${Math.max(0, (stats.cashRemainingTwd / totalCashPoolTwd) * 100)}%` }}
                  />
                  {!stats.paidHotelLocker && (
                    <div 
                      className="absolute top-0 bottom-0 right-0 bg-red-400/80 border-l-2 border-red-500"
                      style={{ width: `${(CONSTANTS.LOCKED_HOTEL_TWD / totalCashPoolTwd) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="mt-2 text-[10px] font-bold text-gray-400 text-right">
                {!stats.paidHotelLocker ? `可用(扣除锁定): NT$ ${stats.availableCashAfterLocker.toLocaleString()}` : '住宿已付清, 无锁定'}
              </div>
            </div>

            {/* Block: Card Reserve */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">机动刷卡备用金</h3>
                  <p className="text-[10px] font-medium text-gray-400">Apple Pay / 信用卡额度</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-gray-800">MYR {stats.cardRemainingMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-200">
                <div 
                  className="bg-black h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, (stats.cardRemainingMyr / CONSTANTS.CARD_RESERVE_MYR) * 100)}%` }}
                />
              </div>
            </div>
            
            {/* Tag Spending Summary */}
            <div className="pt-2">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">类目花销汇总 (TWD等值)</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(stats.categoryTotals)
                  .sort((a,b) => b[1] - a[1])
                  .slice(0,6) // top 6
                  .map(([catId, val]) => (
                  <div key={catId} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <div className="text-[10px] font-bold text-gray-500 truncate mb-1">{getCategoryLabel(catId)}</div>
                    <div className="text-sm font-black">NT$ {val.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            
            <div className="flex gap-2 mb-4 relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" 
                placeholder="搜索明细 (如: 夜市, Jon)" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:bg-white focus:border-black outline-none transition-all"
              />
              {deletedHistory.length > 0 && (
                <button onClick={undoDelete} className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center transition-colors">
                  <Undo2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery.trim() && filteredSubtotal !== null && (
              <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 flex justify-between items-center">
                <span>过滤结果总计:</span>
                <span>NT$ {filteredSubtotal.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
            )}

            <div className="space-y-3">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-bold">无匹配记录</div>
              ) : filteredExpenses.map(e => (
                <div key={e.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shrink-0 border border-gray-100">
                    {getCategoryLabel(e.category).split(' ')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{e.subject}</div>
                    <div className="text-[10px] text-gray-400 font-bold mt-1 flex items-center gap-2">
                      <span className="uppercase text-gray-600">{e.paymentMethod}</span> • 
                      <span>{e.payerType === 'split_50' ? '平摊' : e.payerType === 'split_custom' ? '自定义拆账' : e.payerType === 'jon_full' ? 'Jon' : 'June'}</span> • 
                      <span>Day {e.day}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-gray-800 text-sm">
                      {e.currency === 'TWD' ? 'NT$ ' : 'MYR '}
                      {e.amount.toLocaleString(undefined, {minimumFractionDigits: e.currency === 'MYR' ? 2 : 0})}
                    </div>
                  </div>
                  <button onClick={() => deleteExpense(e.id)} className="p-1.5 hover:bg-gray-100 text-gray-300 hover:text-red-500 rounded-lg ml-1 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Burn Rate Chart Component */}
            {!searchQuery.trim() && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">每日燃烧率 (TWD等值)</h3>
                <div className="space-y-2">
                  {Object.keys(dailyBurn).map(d => {
                    const day = parseInt(d);
                    const spent = dailyBurn[day];
                    const budget = 3134; // rough per day
                    const pct = Math.min(100, (spent / budget) * 100);
                    const isOver = spent > budget;
                    return (
                      <div key={day} className="flex items-center gap-3 text-xs">
                        <div className="font-black text-gray-400 w-10">D{day}</div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                          <div className={cn("absolute top-0 bottom-0 left-0 rounded-full", isOver ? "bg-red-500" : "bg-gray-400")} style={{ width: `${pct}%`}}></div>
                        </div>
                        <div className={cn("w-16 text-right font-bold", isOver ? "text-red-500" : "text-gray-600")}>
                          {spent.toLocaleString(undefined, {maximumFractionDigits:0})}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SPLIT */}
        {activeTab === 'split' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Calculator className="w-5 h-5 text-gray-400" /> 共同开销分账单 (MYR等值)
              </h3>
              
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-xl mb-2">👦🏻</div>
                  <div className="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Jon 总支付</div>
                  <div className="text-lg font-black text-gray-800">MYR {stats.jonPaidTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>
                
                <div className="text-gray-300">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-xl mb-2">👧🏻</div>
                  <div className="text-[11px] text-gray-500 font-bold mb-1 uppercase tracking-widest">June 总支付</div>
                  <div className="text-lg font-black text-gray-800">MYR {stats.junePaidTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">最终结算 (Final Settle Up)</div>
                {Math.abs(stats.jonOwesJune) < 0.05 ? (
                  <div className="text-lg font-black text-gray-800">账目完美平手 🎉</div>
                ) : stats.jonOwesJune > 0 ? (
                  <div className="text-xl font-black text-gray-800">👦🏻 Jon 需给 👧🏻 June<br/><span className="text-2xl mt-1 block">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                ) : (
                  <div className="text-xl font-black text-gray-800">👧🏻 June 需给 👦🏻 Jon<br/><span className="text-2xl mt-1 block">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed font-medium">
              *结算逻辑：将系统内所有记账记录 (含沉没成本) 按实际支付人汇总，再将总花销除以二得出每人应付额，多退少补。<br/>所有 TWD 支付会在内部以记录时刻的汇率折算为 MYR 结算。
            </p>
          </div>
        )}

      </div>

      {/* FAB */}
      {!isFabOpen && (
        <button 
          onClick={() => setIsFabOpen(true)}
          className="fixed lg:absolute bottom-24 lg:bottom-10 right-6 lg:right-10 w-14 h-14 bg-black hover:bg-gray-800 text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] flex items-center justify-center z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* QUICK ENTRY MODAL */}
      {isFabOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsFabOpen(false)}></div>
          
          <div className="bg-white w-full rounded-t-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="shrink-0 bg-white/90 backdrop-blur pb-2 pt-5 px-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-lg text-gray-800">记一笔</h3>
              <button onClick={() => setIsFabOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-800"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto no-scrollbar pb-10">
              
              {/* Subject & Amount */}
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="项目名称 (如: 逢甲大肠包小肠)" 
                  value={entrySubject}
                  onChange={e => setEntrySubject(e.target.value)}
                  className="w-full text-lg font-bold text-gray-800 placeholder-gray-300 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-black px-0 py-2 bg-transparent transition-colors"
                />
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <div className="absolute left-0 bottom-2 text-2xl font-black text-gray-300">{entryCurrency === 'TWD' ? 'NT$' : 'RM'}</div>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={entryAmount}
                      onChange={e => setEntryAmount(e.target.value)}
                      className="w-full text-5xl font-black text-gray-800 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-black pl-[60px] pr-0 py-2 bg-transparent"
                    />
                  </div>
                  <button 
                    onClick={() => setEntryCurrency(c => c === 'TWD' ? 'MYR' : 'TWD')}
                    className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold text-xs px-4 py-3 rounded-xl transition-colors mb-2 shrink-0"
                  >
                    切换为 {entryCurrency === 'TWD' ? 'MYR' : 'TWD'}
                  </button>
                </div>
                {entryAmount && (
                   <div className="text-[11px] font-bold text-gray-400">
                   ≈ {oppositeCurrency} {currentConverted} (汇率 1:{entryCurrency === 'MYR' ? (1/exchangeRate).toFixed(2) : exchangeRate.toFixed(4)})
                 </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="space-y-6">
                
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. 支付方式 (扣减哪个钱包)</div>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => setEntryMethod(m.id)}
                        className={cn("px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col gap-1", 
                          entryMethod === m.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        <div>{m.icon} {m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">2. 消费类别</div>
                  <div className="space-y-4">
                    {CATEGORIES.map((group, idx) => (
                      <div key={idx}>
                        <div className="text-[9px] font-bold text-gray-300 mb-2 uppercase tracking-wider">{group.group}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => setEntryCategory(c.id)}
                              className={cn("px-3 py-2 rounded-xl text-xs font-bold border transition-all", 
                                entryCategory === c.id ? "bg-black text-white border-black shadow-md" : "bg-white text-gray-500 border-gray-200"
                              )}
                            >
                              {c.icon} {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">3. 拆账逻辑 (谁付的钱)</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {PAYER_TYPES.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setEntryPayerType(p.id as any)}
                        className={cn("px-3 py-2 rounded-xl text-xs font-bold border transition-all", 
                          entryPayerType === p.id ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"
                        )}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                  {entryPayerType === 'split_custom' && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500">👦🏻 Jon 付了:</span>
                      <input 
                        type="number" 
                        value={customJonPaid}
                        onChange={e => setCustomJonPaid(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-black"
                      />
                      <span className="text-xs font-bold text-gray-500">
                        (剩余 👧🏻: {entryAmount ? (parseFloat(entryAmount) - (parseFloat(customJonPaid)||0)).toFixed(2) : 0})
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">4. 战区 (GPS)</div>
                    <button onClick={requestGPS} className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                      <Navigation className="w-3 h-3" /> 获取当前位置
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ZONES.map(z => (
                      <button 
                        key={z.id}
                        onClick={() => setEntryZone(z.id)}
                        className={cn("px-3 py-2 rounded-xl text-xs font-bold border transition-all", 
                          entryZone === z.id ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"
                        )}
                      >
                        {z.icon} {z.label}
                      </button>
                    ))}
                  </div>
                  {entryZone === 'custom' && (
                    <input 
                      type="text" 
                      value={customZoneText}
                      onChange={e => setCustomZoneText(e.target.value)}
                      placeholder="输入自定义地点..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-black"
                    />
                  )}
                </div>

              </div>

              <button 
                onClick={handleSubmit}
                className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg transition-all active:scale-95"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
