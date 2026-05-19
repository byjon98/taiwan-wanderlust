import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, ShieldCheck, Banknote, CreditCard, CheckCircle2, TrendingUp, Plus, X, Calculator, ArrowRightLeft, Clock, History } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Expense, PAYMENT_METHODS, CATEGORIES, PAYERS, ZONES, CONSTANTS } from '../data-expense';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ExpensePanel() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number>(0.145); // 1 TWD = 0.145 MYR (1 MYR = 6.9 TWD) fallback
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'split'>('dashboard');

  // Quick Entry State
  const [entrySubject, setEntrySubject] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<'TWD' | 'MYR'>('TWD');
  const [entryMethod, setEntryMethod] = useState('cash');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryPayer, setEntryPayer] = useState<'jon' | 'june' | 'shared'>('shared');
  const [entryZone, setEntryZone] = useState('taipei');
  
  // Load initial data
  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_expenses_v1');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch(e) {}
    }
    
    // Fetch live rate (TWD to MYR)
    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MYR) {
          setExchangeRate(data.rates.MYR);
        }
      }).catch(() => console.log('Failed to fetch rate, using fallback.'));
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('taiwan_trip_expenses_v1', JSON.stringify(expenses));
  }, [expenses]);

  // Derived Stats
  const stats = useMemo(() => {
    let spentCashTwd = 0;
    let spentCardMyr = 0;
    let paidHotelLocker = false;
    let jonPaidShared = 0; // Jon paid for shared stuff in MYR
    let junePaidShared = 0; // June paid for shared stuff in MYR

    expenses.forEach(e => {
      // Calculate split logic
      const amountMyr = e.currency === 'MYR' ? e.amount : e.amount * exchangeRate;
      
      if (e.paymentMethod === 'cash') {
        spentCashTwd += (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
      } else if (e.paymentMethod === 'card') {
        spentCardMyr += amountMyr;
      }

      if (e.category === 'hotel_cash') {
        paidHotelLocker = true;
      }

      // Ledger math: Only count if they paid for 'shared' (or the other person).
      // Simplest logic: If Jon paid for shared, Jon is owed 50%.
      if (e.payer === 'jon' && e.paymentMethod !== 'sunk') {
        jonPaidShared += amountMyr;
      } else if (e.payer === 'june' && e.paymentMethod !== 'sunk') {
        junePaidShared += amountMyr;
      }
    });

    const cashRemaining = CONSTANTS.CASH_POOL_TWD - spentCashTwd;
    const cardRemaining = CONSTANTS.CARD_RESERVE_MYR - spentCardMyr;
    const availableCashAfterLocker = paidHotelLocker ? cashRemaining : cashRemaining - CONSTANTS.LOCKED_HOTEL_TWD;

    // Settlement logic
    const totalSharedSpent = jonPaidShared + junePaidShared;
    const eachOwes = totalSharedSpent / 2;
    const jonOwesJune = eachOwes - jonPaidShared; // If > 0, Jon owes June. If < 0, June owes Jon.

    return {
      spentCashTwd,
      cashRemaining,
      availableCashAfterLocker,
      paidHotelLocker,
      spentCardMyr,
      cardRemaining,
      jonOwesJune, // > 0 means Jon pays June.
      jonPaidShared,
      junePaidShared
    };
  }, [expenses, exchangeRate]);

  // Daily Burn Rate
  const dailyBurn = useMemo(() => {
    const days: Record<number, number> = {};
    for(let i = 1; i <= CONSTANTS.TOTAL_DAYS; i++) days[i] = 0;
    
    expenses.forEach(e => {
      if (e.paymentMethod === 'cash' || e.paymentMethod === 'card') {
        const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
        if (!days[e.day]) days[e.day] = 0;
        days[e.day] += amountTwd;
      }
    });
    return days;
  }, [expenses, exchangeRate]);

  const handleSubmit = () => {
    if (!entrySubject || !entryAmount || !entryCategory) return alert('请填写标题、金额并选择消费类别！');
    
    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: entrySubject,
      amount: parseFloat(entryAmount),
      currency: entryCurrency,
      paymentMethod: entryMethod as any,
      category: entryCategory,
      payer: entryPayer,
      zone: entryZone,
      timestamp: Date.now(),
      day: 1, // simplified for demo, in real life we calculate relative to trip start
    };
    
    // Auto-detect day based on current date vs trip date
    const tripStart = new Date('2026-05-23T00:00:00+08:00').getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - tripStart) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= 10) newExpense.day = diffDays;
    
    setExpenses(prev => [newExpense, ...prev]);
    setIsFabOpen(false);
    setEntrySubject('');
    setEntryAmount('');
    setEntryCategory('');
  };

  const deleteExpense = (id: string) => {
    if(window.confirm('确定删除此记录吗？')) {
      setExpenses(prev => prev.filter(e => e.id !== id));
    }
  };

  const getCategoryLabel = (id: string) => {
    for (const group of CATEGORIES) {
      const item = group.items.find(i => i.id === id);
      if (item) return `${item.icon} ${item.label}`;
    }
    return '❓ 未知';
  };

  const currentConverted = entryAmount ? (entryCurrency === 'TWD' ? parseFloat(entryAmount) * exchangeRate : parseFloat(entryAmount) / exchangeRate).toFixed(2) : '0.00';
  const oppositeCurrency = entryCurrency === 'TWD' ? 'MYR' : 'TWD';

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20 lg:pb-0 relative">
      
      {/* Header & Tabs */}
      <div className="bg-[#1e293b] text-white pt-6 pb-6 px-4 sm:px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden z-10 shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md mb-4 text-xs font-medium">
            <span className="opacity-70">实时汇率</span>
            <span className="font-bold">NT$ 100 ≈ MYR {(exchangeRate * 100).toFixed(2)}</span>
          </div>

          <div className="flex bg-white/10 p-1 rounded-2xl w-full max-w-sm">
            <button onClick={() => setActiveTab('dashboard')} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'dashboard' ? "bg-white text-[#1e293b]" : "text-gray-300 hover:text-white")}>
              大盘仪表盘
            </button>
            <button onClick={() => setActiveTab('history')} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'history' ? "bg-white text-[#1e293b]" : "text-gray-300 hover:text-white")}>
              明细与曲线
            </button>
            <button onClick={() => setActiveTab('split')} className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-all", activeTab === 'split' ? "bg-white text-[#1e293b]" : "text-gray-300 hover:text-white")}>
              分账结算
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 pb-32">
        
        {/* TAB 1: 3-Block Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
            
            {/* Block 1: Sunk Costs */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group">
              <div className="absolute right-0 top-0 w-32 h-32 bg-gray-50 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-gray-100 transition-all"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-gray-400" /> 沉没成本 (已锁死)
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block mb-0.5">已付清</span>
                    <span className="text-xl font-black text-gray-600">MYR 4,000</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div className="bg-gray-400 h-full w-full rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Block 2: Cash Pool (Core) */}
            <div className={cn("bg-white rounded-3xl p-5 shadow-lg border relative overflow-hidden transition-all duration-300", 
              (stats.cashRemaining / CONSTANTS.CASH_POOL_TWD) < 0.2 ? "border-red-400 shadow-red-500/20 bg-red-50/30" : "border-[#00cec9] shadow-[#00cec9]/10"
            )}>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-1">
                      <Banknote className={cn("w-5 h-5", (stats.cashRemaining / CONSTANTS.CASH_POOL_TWD) < 0.2 ? "text-red-500" : "text-[#00cec9]")} /> 
                      台币现金池
                    </h3>
                    <p className="text-[10px] font-bold text-gray-500">实体钞票储备 (夜市/老街专用)</p>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-[10px] font-bold uppercase tracking-widest block mb-0.5", (stats.cashRemaining / CONSTANTS.CASH_POOL_TWD) < 0.2 ? "text-red-500" : "text-[#00cec9]")}>
                      剩余水位
                    </span>
                    <span className="text-2xl font-black text-gray-800 tracking-tight">NT$ {stats.cashRemaining.toLocaleString()}</span>
                  </div>
                </div>
                
                {/* Sinking Funds Locker Visual */}
                <div className="relative pt-6">
                  {/* Locker Label */}
                  {!stats.paidHotelLocker && (
                    <div 
                      className="absolute top-0 right-0 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-t-md border-x border-t border-red-200"
                      style={{ right: `${(CONSTANTS.LOCKED_HOTEL_TWD / CONSTANTS.CASH_POOL_TWD) * 100}%`, transform: 'translateX(50%)' }}
                    >
                      伊达邵房费锁定
                    </div>
                  )}
                  
                  <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden relative border border-gray-200/50">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", (stats.cashRemaining / CONSTANTS.CASH_POOL_TWD) < 0.2 ? "bg-red-500" : "bg-[#00cec9]")}
                      style={{ width: `${Math.max(0, (stats.cashRemaining / CONSTANTS.CASH_POOL_TWD) * 100)}%` }}
                    ></div>
                    
                    {/* Locker Red Line Overlay */}
                    {!stats.paidHotelLocker && (
                      <div 
                        className="absolute top-0 bottom-0 right-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZWUyZTIiLz48cGF0aCBkPSJNMCA0TDQgMFoiIHN0cm9rZT0iI2VmNDQ0NCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-80 border-l-2 border-red-500 shadow-[inset_2px_0_5px_rgba(239,68,68,0.5)]"
                        style={{ width: `${(CONSTANTS.LOCKED_HOTEL_TWD / CONSTANTS.CASH_POOL_TWD) * 100}%` }}
                      ></div>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center text-[11px] font-bold">
                  <span className="text-gray-400">总额 NT$ {CONSTANTS.CASH_POOL_TWD.toLocaleString()}</span>
                  {!stats.paidHotelLocker && (
                    <span className="text-red-500 bg-red-50 px-2 py-1 rounded-md">可用(扣除锁定): NT$ {stats.availableCashAfterLocker.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Block 3: Credit Card Reserve */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-purple-100 relative overflow-hidden group">
               <div className="absolute right-0 top-0 w-32 h-32 bg-purple-50 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2 transition-all"></div>
               <div className="relative z-10">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-purple-500" /> 机动刷卡备用金
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest block mb-0.5">剩余额度</span>
                    <span className="text-xl font-black text-gray-800">MYR {stats.cardRemaining.toFixed(2)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (stats.cardRemaining / CONSTANTS.CARD_RESERVE_MYR) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: History & Burn Rate */}
        {activeTab === 'history' && (
          <div className="space-y-6 max-w-xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> 每日燃烧率 (TWD)</h3>
              <div className="space-y-2">
                {Object.keys(dailyBurn).map(d => {
                  const day = parseInt(d);
                  const spent = dailyBurn[day];
                  const budget = 3134; // 粗略算每日额度
                  const pct = Math.min(100, (spent / budget) * 100);
                  const isOver = spent > budget;

                  return (
                    <div key={day} className="flex items-center gap-3 text-xs">
                      <div className="font-black text-gray-400 w-10">D{day}</div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden relative">
                        <div className={cn("absolute top-0 bottom-0 left-0 rounded-full", isOver ? "bg-red-500" : "bg-indigo-400")} style={{ width: `${pct}%`}}></div>
                      </div>
                      <div className={cn("w-16 text-right font-bold", isOver ? "text-red-500" : "text-gray-600")}>
                        {spent.toFixed(0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-gray-800 ml-1 flex items-center gap-2"><History className="w-4 h-4 text-gray-400" /> 交易明细</h3>
              {expenses.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-gray-400 font-medium text-sm">还没有任何记账记录</p>
                </div>
              ) : expenses.map(e => (
                <div key={e.id} className="bg-white p-3.5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shrink-0">
                    {getCategoryLabel(e.category).split(' ')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{e.subject}</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-0.5 flex items-center gap-2">
                      <span className="uppercase">{e.paymentMethod}</span> • 
                      <span>{e.payer === 'shared' ? '👫 共同' : e.payer === 'jon' ? '👦🏻 Jon' : '👧🏻 June'}</span> • 
                      <span>Day {e.day}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black text-[#2D3436]">
                      {e.currency === 'TWD' ? 'NT$ ' : 'MYR '}
                      {e.amount.toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => deleteExpense(e.id)} className="p-1.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-lg ml-1 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* TAB 3: Split Ledger */}
        {activeTab === 'split' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-500" /> 共同开销分账单 (Splitwise)
              </h3>
              
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-xl mb-2">👦🏻</div>
                  <div className="text-xs text-gray-500 font-bold mb-1">Jon 垫付</div>
                  <div className="text-lg font-black text-gray-800">MYR {stats.jonPaidShared.toFixed(2)}</div>
                </div>
                
                <div className="text-gray-300">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center text-xl mb-2">👧🏻</div>
                  <div className="text-xs text-gray-500 font-bold mb-1">June 垫付</div>
                  <div className="text-lg font-black text-gray-800">MYR {stats.junePaidShared.toFixed(2)}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="text-xs font-bold text-indigo-400 mb-1">最终结算单</div>
                {stats.jonOwesJune === 0 ? (
                  <div className="text-lg font-black text-indigo-900">目前账目平手，无需转账 🎉</div>
                ) : stats.jonOwesJune > 0 ? (
                  <div className="text-xl font-black text-indigo-900">👦🏻 Jon 需要给 👧🏻 June<br/><span className="text-2xl text-indigo-600">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                ) : (
                  <div className="text-xl font-black text-indigo-900">👧🏻 June 需要给 👦🏻 Jon<br/><span className="text-2xl text-indigo-600">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed">
              *此系统仅计算付款人为 Jon 或 June 垫付的非沉没成本花销，按 50/50 平摊。<br/>选为"共同基金(Shared)"或"已预付(Sunk)"的项目不计入此结算单。
            </p>
          </div>
        )}

      </div>

      {/* FAB Quick Entry Button */}
      {!isFabOpen && (
        <button 
          onClick={() => setIsFabOpen(true)}
          className="fixed lg:absolute bottom-24 lg:bottom-10 right-6 lg:right-10 w-14 h-14 bg-[#2D3436] hover:bg-black text-white rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex items-center justify-center z-50 transition-transform active:scale-95"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Quick Entry Modal (Half-screen) */}
      {isFabOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFabOpen(false)}></div>
          
          <div className="bg-white w-full rounded-t-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white/90 backdrop-blur pb-2 pt-4 px-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800">极速记账</h3>
              <button onClick={() => setIsFabOpen(false)} className="p-1.5 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="p-5 space-y-6">
              {/* Subject */}
              <div>
                <input 
                  type="text" 
                  placeholder="你在买什么？(例：大肠包小肠)" 
                  value={entrySubject}
                  onChange={e => setEntrySubject(e.target.value)}
                  className="w-full text-lg font-bold text-gray-800 placeholder-gray-300 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-indigo-500 px-0 py-2 bg-transparent transition-colors"
                />
              </div>
              
              {/* Amount & Currency */}
              <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                  <div className="absolute left-0 bottom-2 text-2xl font-black text-gray-400">{entryCurrency === 'TWD' ? 'NT$' : 'MYR'}</div>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={entryAmount}
                    onChange={e => setEntryAmount(e.target.value)}
                    className="w-full text-4xl font-black text-gray-800 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-indigo-500 pl-14 pr-0 py-2 bg-transparent"
                  />
                </div>
                <button 
                  onClick={() => setEntryCurrency(c => c === 'TWD' ? 'MYR' : 'TWD')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition-colors mb-2 shrink-0"
                >
                  切换为 {entryCurrency === 'TWD' ? 'MYR' : 'TWD'}
                </button>
              </div>
              
              <div className="text-[11px] font-bold text-indigo-400 bg-indigo-50 px-3 py-1.5 rounded-lg inline-block">
                ≈ {oppositeCurrency} {currentConverted} (汇率 1:{entryCurrency === 'MYR' ? (1/exchangeRate).toFixed(2) : exchangeRate.toFixed(4)})
              </div>

              {/* Tags Section */}
              <div className="space-y-4">
                
                {/* Payment Method */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">1. 支付方式 (单选)</div>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => setEntryMethod(m.id)}
                        className={cn("px-3 py-2 rounded-xl text-xs font-bold border transition-all flex flex-col items-start gap-1", 
                          entryMethod === m.id ? "bg-[#2D3436] text-white border-[#2D3436]" : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        <div>{m.icon} {m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">2. 消费类别 (单选)</div>
                  <div className="space-y-3">
                    {CATEGORIES.map((group, idx) => (
                      <div key={idx}>
                        <div className="text-[9px] font-bold text-gray-300 mb-1.5">{group.group}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => setEntryCategory(c.id)}
                              className={cn("px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all", 
                                entryCategory === c.id ? "bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-200" : "bg-white text-gray-500 border-gray-100"
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

                {/* Payer */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">3. 付款归属 (谁付的钱)</div>
                  <div className="flex flex-wrap gap-2">
                    {PAYERS.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setEntryPayer(p.id as any)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", 
                          entryPayer === p.id ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-500 border-gray-100"
                        )}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zone */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">4. 战区位置 (可根据GPS自动选)</div>
                  <div className="flex flex-wrap gap-2">
                    {ZONES.map(z => (
                      <button 
                        key={z.id}
                        onClick={() => setEntryZone(z.id)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold border transition-all", 
                          entryZone === z.id ? "bg-teal-500 text-white border-teal-500" : "bg-white text-gray-500 border-gray-100"
                        )}
                      >
                        {z.icon} {z.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              <button 
                onClick={handleSubmit}
                className="w-full py-4 mt-4 bg-[#2D3436] hover:bg-black text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-gray-200 active:scale-95"
              >
                确认提交
              </button>
              <div className="h-4"></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
