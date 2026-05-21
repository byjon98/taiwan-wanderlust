import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, CreditCard, Plus, X, Calculator, ArrowRightLeft, History, Search, Undo2, Navigation, Flame, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useFirestoreSync } from '../hooks/useFirestoreSync';
import { Expense, PAYMENT_METHODS, CATEGORIES, BENEFICIARIES, ZONES, CONSTANTS, INITIAL_SUNK_COSTS } from '../data-expense';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ExpensePanel() {
  const [expenses, setExpenses] = useFirestoreSync<Expense[]>('expenses', 'taiwan_trip_expenses_v3', INITIAL_SUNK_COSTS);
  const [exchangeRate, setExchangeRate] = useState<number>(0.145);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'split' | 'burn'>('dashboard');
  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);

  // History & Undo State
  const [deletedHistory, setDeletedHistory] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Entry / Top Up State
  const [isFabOpen, setIsFabOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  // Quick Entry Fields
  const [entrySubject, setEntrySubject] = useState('');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryCurrency, setEntryCurrency] = useState<'TWD' | 'MYR'>('TWD');
  const [entryAdvancedBy, setEntryAdvancedBy] = useState<'jon_100'|'june_100'|'split_50'|'custom'>('jon_100');
  const [customAdvancedJonAmount, setCustomAdvancedJonAmount] = useState('');
  const [entryPaidBy, setEntryPaidBy] = useState<Expense['paymentMethod']>('cash');
  const [entryCategory, setEntryCategory] = useState('');
  const [entryBeneficiary, setEntryBeneficiary] = useState<'jon_100'|'june_100'|'split_50'|'custom'>('split_50');
  const [entryZone, setEntryZone] = useState('taipei');
  const [entryDay, setEntryDay] = useState<number>(1);
  const [customBeneficiaryJonAmount, setCustomBeneficiaryJonAmount] = useState('');
  const [customZoneText, setCustomZoneText] = useState('');

  // Top Up Fields
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpSource, setTopUpSource] = useState<'cash_jon' | 'cash_june' | 'card_jon' | 'card_june' | 'myr_cash'>('cash_jon');
  const [topUpTarget, setTopUpTarget] = useState<'easycard_jon' | 'easycard_june'>('easycard_jon');

  // Initialize
  useEffect(() => {
    const handleOpenFab = () => setIsFabOpen(true);
    window.addEventListener('open-expense-fab', handleOpenFab);
    return () => window.removeEventListener('open-expense-fab', handleOpenFab);
  }, []);

  useEffect(() => {
    // Auto calculate current day based on trip start
    const tripStart = new Date('2026-05-23T00:00:00+08:00').getTime();
    const diffDays = Math.floor((Date.now() - tripStart) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= 10) setEntryDay(diffDays);

    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MYR) setExchangeRate(data.rates.MYR);
      }).catch(() => console.log('Failed to fetch rate.'));
  }, []);

  const stats = useMemo(() => {
    let jonCashSpentTwd = 0;
    let juneCashSpentTwd = 0;
    let jonEasyCardTopupTwd = 0;
    let juneEasyCardTopupTwd = 0;
    let jonEasyCardSpentTwd = 0;
    let juneEasyCardSpentTwd = 0;
    let cardSpentMyr = 0;
    let myrCashSpent = 0;

    let jonTotalSpentMyr = 0;
    let juneTotalSpentMyr = 0;

    let jonPaidTotalMyr = 0;
    let junePaidTotalMyr = 0;
    let jonBenefitTotalMyr = 0;
    let juneBenefitTotalMyr = 0;

    const categoryTotals: Record<string, number> = {};

    expenses.forEach(e => {
      // 1. Calculate base amounts
      const amountMyr = e.currency === 'MYR' ? e.amount : e.amount * exchangeRate;
      const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
      
      const jonPaidMyr = e.currency === 'MYR' ? e.paidByJon : e.paidByJon * exchangeRate;
      const junePaidMyr = e.currency === 'MYR' ? e.paidByJune : e.paidByJune * exchangeRate;
      const forJonMyr = e.currency === 'MYR' ? e.forJon : e.forJon * exchangeRate;
      const forJuneMyr = e.currency === 'MYR' ? e.forJune : e.forJune * exchangeRate;

      // Tracking who actually owes what
      jonPaidTotalMyr += jonPaidMyr;
      junePaidTotalMyr += junePaidMyr;
      jonBenefitTotalMyr += forJonMyr;
      juneBenefitTotalMyr += forJuneMyr;

      if (!e.isTransfer && !e.isSettlement) {
        jonTotalSpentMyr += forJonMyr;
        juneTotalSpentMyr += forJuneMyr;
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amountTwd;
      }

      // Tracking physical pools
      if (e.isTransfer && e.transferTo) {
        if (e.paymentMethod === 'cash') {
            jonCashSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneCashSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;

        if (e.transferTo === 'easycard_jon') jonEasyCardTopupTwd += amountTwd;
        if (e.transferTo === 'easycard_june') juneEasyCardTopupTwd += amountTwd;
      } else if (!e.isSettlement) {
        if (e.paymentMethod === 'cash') {
            jonCashSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneCashSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }
        if (e.paymentMethod === 'easycard_jon') {
            jonEasyCardSpentTwd += (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
        }
        if (e.paymentMethod === 'easycard_june') {
            juneEasyCardSpentTwd += (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
        }
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;
      }
    });

    return {
      jonCashRemainingTwd: CONSTANTS.JON_CASH_TWD - jonCashSpentTwd,
      juneCashRemainingTwd: CONSTANTS.JUNE_CASH_TWD - juneCashSpentTwd,
      jonEasyCardRemainingTwd: CONSTANTS.JON_EASYCARD_TWD + jonEasyCardTopupTwd - jonEasyCardSpentTwd,
      juneEasyCardRemainingTwd: CONSTANTS.JUNE_EASYCARD_TWD + juneEasyCardTopupTwd - juneEasyCardSpentTwd,
      cardRemainingMyr: CONSTANTS.CARD_RESERVE_MYR - cardSpentMyr,
      totalSpentMyr: jonTotalSpentMyr + juneTotalSpentMyr,
      jonTotalSpentMyr, juneTotalSpentMyr,
      jonPaidTotalMyr, junePaidTotalMyr, jonBenefitTotalMyr, juneBenefitTotalMyr,
      jonOwesJune: jonBenefitTotalMyr - jonPaidTotalMyr, // positive means Jon owes June
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
      if (e.isTransfer || e.isSettlement) return sum;
      return sum + (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
    }, 0);
  }, [filteredExpenses, exchangeRate, searchQuery]);

  // Daily Burn Rate (Vertical) grouped by main category
  const dailyBurn = useMemo(() => {
    const days: Record<number, Record<string, number>> = {};
    for(let i = 1; i <= CONSTANTS.TOTAL_DAYS; i++) days[i] = {};
    
    expenses.forEach(e => {
      if (e.timestamp < 100 || e.isTransfer || e.isSettlement) return; // skip initial sunk costs and transfers
      const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
      if (!days[e.day]) days[e.day] = {};
      
      let groupName = '杂项组';
      for (const group of CATEGORIES) {
        if (group.items.some(i => i.id === e.category)) {
          groupName = group.group;
          break;
        }
      }
      
      days[e.day][groupName] = (days[e.day][groupName] || 0) + amountTwd;
    });
    return days;
  }, [expenses, exchangeRate]);

  const getGroupColor = (group: string) => {
    const colors: Record<string, string> = {
      '饮食组': '#FF9F43',
      '交通组': '#546DE5',
      '采买与伴手礼组': '#cf6a87',
      '杂项组': '#a4b0be'
    };
    return colors[group] || '#d1d8e0';
  };

  // Submit Expense
  const handleSubmit = () => {
    const amountNum = parseFloat(entryAmount);
    if (!entrySubject || !amountNum || !entryCategory) return alert('请填写完整信息！');
    
    let paidByJon = 0;
    let paidByJune = 0;
    
    if (entryAdvancedBy === 'jon_100') {
      paidByJon = amountNum;
    } else if (entryAdvancedBy === 'june_100') {
      paidByJune = amountNum;
    } else if (entryAdvancedBy === 'split_50') {
      paidByJon = amountNum / 2;
      paidByJune = amountNum / 2;
    } else {
      paidByJon = parseFloat(customAdvancedJonAmount) || 0;
      paidByJune = amountNum - paidByJon;
    }

    let forJon = 0;
    let forJune = 0;
    
    if (entryBeneficiary === 'jon_100') {
      forJon = amountNum;
    } else if (entryBeneficiary === 'june_100') {
      forJune = amountNum;
    } else if (entryBeneficiary === 'split_50') {
      forJon = amountNum / 2;
      forJune = amountNum / 2;
    } else {
      forJon = parseFloat(customBeneficiaryJonAmount) || 0;
      forJune = amountNum - forJon;
    }

    const newExpense: Expense = {
      id: editExpenseId || Date.now().toString(),
      subject: entrySubject,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryPaidBy,
      paidByJon, paidByJune,
      forJon, forJune,
      category: entryCategory,
      zone: entryZone === 'custom' ? customZoneText : entryZone,
      timestamp: editExpenseId ? (expenses.find(e => e.id === editExpenseId)?.timestamp || Date.now()) : Date.now(),
      day: entryDay,
    };
    
    if (editExpenseId) {
      setExpenses(prev => prev.map(e => e.id === editExpenseId ? newExpense : e));
    } else {
      setExpenses(prev => [newExpense, ...prev]);
    }
    
    setIsFabOpen(false);
    setEntrySubject('');
    setEntryAmount('');
    setCustomBeneficiaryJonAmount('');
    setEditExpenseId(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditExpenseId(expense.id);
    setEntryAmount(expense.amount.toString());
    setEntrySubject(expense.subject);
    setEntryCurrency(expense.currency);
    setEntryCategory(expense.category);
    setEntryPaidBy(expense.paymentMethod as any);
    setEntryDay(expense.day);
    
    // Reverse engineer forWho
    if (expense.forJon > 0 && expense.forJune === 0) setEntryBeneficiary('jon_100');
    else if (expense.forJune > 0 && expense.forJon === 0) setEntryBeneficiary('june_100');
    else if (expense.forJon === expense.forJune && expense.forJon > 0) setEntryBeneficiary('split_50');
    else {
      setEntryBeneficiary('custom');
      setCustomBeneficiaryJonAmount(expense.forJon.toString());
    }

    // Reverse engineer advancedBy
    if (expense.paidByJon > 0 && expense.paidByJune === 0) setEntryAdvancedBy('jon_100');
    else if (expense.paidByJune > 0 && expense.paidByJon === 0) setEntryAdvancedBy('june_100');
    else if (expense.paidByJon === expense.paidByJune && expense.paidByJon > 0) setEntryAdvancedBy('split_50');
    else {
      setEntryAdvancedBy('custom');
      setCustomAdvancedJonAmount(expense.paidByJon.toString());
    }
    
    setIsFabOpen(true);
  };

  const handleTopUpSubmit = () => {
    const amountNum = parseFloat(topUpAmount);
    if (!amountNum) return;

    let paidByJon = 0; let paidByJune = 0;
    let forJon = 0; let forJune = 0;

    // Whoever pays the source advances the money
    if (topUpSource === 'cash_jon' || topUpSource === 'card_jon') paidByJon = amountNum;
    else paidByJune = amountNum;

    // Whoever's card is topped up is the beneficiary
    if (topUpTarget === 'easycard_jon') forJon = amountNum;
    else forJune = amountNum;

    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: `充值 ${topUpTarget === 'easycard_jon' ? 'Jon' : 'June'} 悠游卡`,
      amount: amountNum,
      currency: 'TWD', // top up is in TWD
      paymentMethod: topUpSource,
      paidByJon, paidByJune,
      forJon, forJune,
      category: 'misc',
      zone: 'taipei',
      timestamp: Date.now(),
      day: entryDay,
      isTransfer: true,
      transferTo: topUpTarget
    };

    setExpenses(prev => [newExpense, ...prev]);
    setIsTopUpOpen(false);
    setTopUpAmount('');
  };

  const handleSettleUp = () => {
    if (Math.abs(stats.jonOwesJune) < 0.1) return alert('无需结算，账目已平。');
    
    const amountMyr = Math.abs(stats.jonOwesJune);
    const amountTwd = amountMyr / exchangeRate;
    
    const isJonPaying = stats.jonOwesJune > 0;
    
    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: `✅ 现金结清 (Settle Up)`,
      amount: amountTwd,
      currency: 'TWD',
      paymentMethod: 'cash', // placeholder
      paidByJon: isJonPaying ? amountTwd : 0,
      paidByJune: isJonPaying ? 0 : amountTwd,
      forJon: isJonPaying ? 0 : amountTwd,
      forJune: isJonPaying ? amountTwd : 0,
      category: 'misc',
      zone: 'taipei',
      timestamp: Date.now(),
      day: entryDay,
      isSettlement: true
    };

    setExpenses(prev => [newExpense, ...prev]);
    alert('已生成清账记录！');
  };

  const deleteExpense = (id: string) => {
    const toDelete = expenses.find(e => e.id === id);
    if (toDelete) {
      setDeletedHistory(prev => [toDelete, ...prev].slice(0, 10));
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
        else setEntryZone('taipei');
      }, () => {
        alert("定位失败");
      });
    }
  };

  function getCategoryLabel(id: string) {
    for (const group of CATEGORIES) {
      const item = group.items.find(i => i.id === id);
      if (item) return `${item.icon} ${item.label}`;
    }
    return '❓ 未知';
  }
  
  const getCategoryColor = (id: string) => {
    const colors: Record<string, string> = {
      nightmarket: '#FF9F43', restaurant: '#E15F41', drinks: '#F3A683', convenience: '#778BEB',
      uber: '#546DE5', bus: '#3DC1D3', rail: '#C44569', transit: '#f5cd79',
      souvenir_food: '#e77f67', shopping_life: '#cf6a87', tech: '#574b90',
      hotel_cash: '#63cdda', tickets: '#f78fb3', medical: '#e66767', misc: '#a4b0be'
    };
    return colors[id] || '#d1d8e0';
  }

  const currentConverted = entryAmount ? (entryCurrency === 'TWD' ? parseFloat(entryAmount) * exchangeRate : parseFloat(entryAmount) / exchangeRate).toFixed(2) : '0.00';
  const oppositeCurrency = entryCurrency === 'TWD' ? 'MYR' : 'TWD';

  return (
    <div className="flex flex-col h-full bg-white pb-20 lg:pb-0 relative text-[#1d1d1f] font-sans antialiased">
      
      {/* HEADER */}
      <div className="pt-8 pb-4 px-6 border-b border-gray-100 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
              财务大盘
            </h1>
            <div className="text-[10px] font-bold text-gray-400 mt-0.5">
              NT$ 100 ≈ MYR {(exchangeRate * 100).toFixed(2)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] font-bold text-gray-400 mb-0.5 uppercase tracking-widest leading-tight">
              Budget (10K) - Spent ({stats.totalSpentMyr.toFixed(0)}) = Remaining
            </div>
            <div className="text-xl font-black text-indigo-600 flex items-baseline justify-end gap-2">
              MYR {(10000 - stats.totalSpentMyr).toLocaleString(undefined, {maximumFractionDigits:0})}
              <span className="text-xs font-bold text-gray-400">≈ NT$ {((10000 - stats.totalSpentMyr)/exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
            </div>
          </div>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full">
          {['dashboard', 'history', 'split', 'burn'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={cn("flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase tracking-wider", activeTab === tab ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}>
              {tab === 'dashboard' ? '仪表盘' : tab === 'history' ? '明细记录' : tab === 'split' ? '分账单' : '燃烧率'}
            </button>
          ))}
        </div>
      </div>

      {/* SCROLL AREA */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 pb-32 max-w-2xl mx-auto w-full">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            
            {/* Total Spent Comparison */}
            <div className="flex gap-4">
              <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Jon 总消费</div>
                <div className="text-lg font-black text-gray-800">MYR {stats.jonTotalSpentMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div className="text-[10px] font-bold text-gray-400 mt-0.5">≈ NT$ {(stats.jonTotalSpentMyr/exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              </div>
              <div className="flex-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">June 总消费</div>
                <div className="text-lg font-black text-gray-800">MYR {stats.juneTotalSpentMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                <div className="text-[10px] font-bold text-gray-400 mt-0.5">≈ NT$ {(stats.juneTotalSpentMyr/exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})}</div>
              </div>
            </div>

            {/* EasyCard Block */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 mb-0.5 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" /> 悠游卡余额</h3>
                </div>
                <button onClick={() => setIsTopUpOpen(true)} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">
                  充值 Top Up
                </button>
              </div>
              <div className="flex divide-x divide-gray-100">
                <div className="flex-1 pr-4">
                  <div className="text-[10px] font-bold text-gray-400 mb-1">👦🏻 Jon 卡</div>
                  <div className="text-lg font-black text-gray-800">NT$ {stats.jonEasyCardRemainingTwd.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                </div>
                <div className="flex-1 pl-4">
                  <div className="text-[10px] font-bold text-gray-400 mb-1">👧🏻 June 卡</div>
                  <div className="text-lg font-black text-gray-800">NT$ {stats.juneEasyCardRemainingTwd.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                </div>
              </div>
            </div>

            {/* Cash Pool Block */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-green-500" /> 实体台币现金池</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>👦🏻 Jon (17k)</span>
                    <span className="text-gray-800">NT$ {stats.jonCashRemainingTwd.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", stats.jonCashRemainingTwd/17000 < 0.2 ? "bg-pink-400" : "bg-blue-400")} style={{ width: `${Math.max(0, (stats.jonCashRemainingTwd/17000)*100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                    <span>👧🏻 June (16k)</span>
                    <span className="text-gray-800">NT$ {stats.juneCashRemainingTwd.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div className={cn("h-full rounded-full transition-all duration-1000", stats.juneCashRemainingTwd/16000 < 0.2 ? "bg-red-500" : "bg-pink-400")} style={{ width: `${Math.max(0, (stats.juneCashRemainingTwd/16000)*100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Card Block */}
            <div className="bg-white rounded-2xl p-5 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800 mb-1">机动刷卡备用金</h3>
                  <p className="text-[10px] font-medium text-gray-400">Apple Pay / 信用卡额度</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-gray-800">MYR {stats.cardRemainingMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-black h-full rounded-full" style={{ width: `${Math.max(0, (stats.cardRemainingMyr/CONSTANTS.CARD_RESERVE_MYR)*100)}%` }} />
              </div>
            </div>
            
            {/* Tag Spending Summary */}


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
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:bg-white focus:border-black"
              />
              {deletedHistory.length > 0 && (
                <button onClick={undoDelete} className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl flex items-center justify-center">
                  <Undo2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {searchQuery.trim() && filteredSubtotal !== null && (
              <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-xs font-bold border border-indigo-100 flex justify-between items-center">
                <span>过滤结果总计 (剔除充值):</span>
                <div className="text-right">
                  <div className="text-sm font-black">NT$ {filteredSubtotal.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  <div className="text-[10px] font-bold text-indigo-400 mt-0.5">≈ MYR {(filteredSubtotal * exchangeRate).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm font-bold">无匹配记录</div>
              ) : filteredExpenses.map(e => (
                <div key={e.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-lg shrink-0 border border-gray-100">
                        {e.isSettlement ? '✅' : e.isTransfer ? '🔄' : getCategoryLabel(e.category).split(' ')[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-800 text-sm truncate">{e.subject}</div>
                        <div className="text-[9px] text-gray-400 font-bold mt-1 flex flex-wrap gap-1">
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 uppercase">{e.paymentMethod.replace('_', ' ')}</span>
                          {!e.isTransfer && !e.isSettlement && (
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">属于 {e.forJon > 0 && e.forJune > 0 ? '共同' : e.forJon > 0 ? 'Jon' : 'June'}</span>
                          )}
                          <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">Day {e.day}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-black text-gray-800 text-sm">
                        {e.currency === 'TWD' ? 'NT$ ' : 'MYR '}
                        {e.amount.toLocaleString(undefined, {minimumFractionDigits: e.currency === 'MYR' ? 2 : 0})}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 border-t border-gray-50 pt-2">
                    <button onClick={() => handleEdit(e)} className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-colors">修改 Edit</button>
                    <button onClick={() => deleteExpense(e.id)} className="px-2 py-1 bg-gray-50 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg flex items-center justify-center transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: SPLIT */}
        {activeTab === 'split' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 text-center">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center justify-center gap-2">
                <Calculator className="w-5 h-5 text-gray-400" /> 内部对冲结算单 (MYR等值 ≈ NT$ {(Math.abs(stats.jonOwesJune) * exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})})
              </h3>
              
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-xl mb-2">👦🏻</div>
                  <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">Jon 垫付总额</div>
                  <div className="text-sm font-black text-gray-800">MYR {stats.jonPaidTotalMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-[10px] text-gray-400 mt-2">他应承担: <br/>MYR {stats.jonBenefitTotalMyr.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                </div>
                
                <div className="text-gray-300">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-xl mb-2">👧🏻</div>
                  <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">June 垫付总额</div>
                  <div className="text-sm font-black text-gray-800">MYR {stats.junePaidTotalMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                  <div className="text-[10px] text-gray-400 mt-2">她应承担: <br/>MYR {stats.juneBenefitTotalMyr.toLocaleString(undefined, {minimumFractionDigits:2})}</div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100 relative">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">最终欠款结算</div>
                {Math.abs(stats.jonOwesJune) < 0.1 ? (
                  <div className="text-lg font-black text-green-600 flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5"/> 账目完美平手</div>
                ) : stats.jonOwesJune > 0 ? (
                  <div className="text-lg font-black text-gray-800">👦🏻 Jon 需给 👧🏻 June<br/><span className="text-3xl mt-2 block text-red-500">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                ) : (
                  <div className="text-lg font-black text-gray-800">👧🏻 June 需给 👦🏻 Jon<br/><span className="text-3xl mt-2 block text-red-500">MYR {Math.abs(stats.jonOwesJune).toFixed(2)}</span></div>
                )}
                
                {Math.abs(stats.jonOwesJune) >= 0.1 && (
                  <button onClick={handleSettleUp} className="mt-6 w-full bg-black text-white py-3 rounded-xl font-black text-sm hover:bg-blue-400 transition-colors">
                    ✅ 确认已转账 (Settle Up)
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-gray-400 text-center px-4 leading-relaxed font-medium">
              *此系统采用双式簿记法。记账时你选择的“谁垫付了钱”会增加其垫付总额，选择的“这笔钱算谁的”会增加其应承担额。两者相抵得出绝对欠款。
            </p>
          </div>
        )}

        {/* TAB 4: BURN RATE */}
        {activeTab === 'burn' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white rounded-2xl p-6 border border-gray-200 h-80 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" /> 每日燃烧率 (TWD等值)
                </h3>
                <span className="text-[10px] font-bold text-gray-400">剔除预付/充值</span>
              </div>
              
              <div className="flex-1 flex items-end justify-between gap-1 sm:gap-2">
                {Object.keys(dailyBurn).map(d => {
                  const day = parseInt(d);
                  const dayCats = dailyBurn[day];
                  const totalSpent = (Object.values(dayCats) as number[]).reduce((a,b)=>a+b, 0);
                  const budget = 3134; 
                  const heightPct = Math.min(100, (totalSpent / (budget * 1.5)) * 100);
                  
                  return (
                    <div key={day} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                      <div className="text-[9px] font-black text-gray-600 mb-1 text-center -mt-4 whitespace-nowrap">
                        {totalSpent > 0 ? totalSpent.toLocaleString(undefined, {maximumFractionDigits:0}) : ''}
                      </div>
                      <div className="w-full max-w-[24px] bg-gray-50 rounded-t-md flex flex-col justify-end overflow-hidden relative" style={{ height: '100%' }}>
                        <div className="w-full flex flex-col justify-end" style={{ height: `${heightPct}%` }}>
                          {(Object.entries(dayCats) as [string, number][]).sort((a,b)=>b[1]-a[1]).map(([groupName, amount]) => {
                            const segmentPct = (amount / totalSpent) * 100;
                            return (
                              <div key={groupName} style={{ height: `${segmentPct}%`, backgroundColor: getGroupColor(groupName) }} className="w-full" />
                            );
                          })}
                        </div>
                      </div>
                      <div className="text-[9px] font-bold text-gray-400 mt-2">{day === 0 ? 'N/A' : `D${day}`}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-4 px-2 justify-center pt-2">
              {CATEGORIES.map(g => (
                <div key={g.group} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(g.group) }} />
                  {g.group}
                </div>
              ))}
            </div>

            <div className="pt-4">
              <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">全类目花销汇总</h3>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.flatMap(g => g.items).map(cat => {
                  const valTwd = stats.categoryTotals[cat.id] || 0;
                  const valMyr = valTwd * exchangeRate;
                  return (
                    <div key={cat.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                      <div className="text-[10px] font-bold text-gray-500 mb-2">{cat.icon} {cat.label}</div>
                      <div>
                        <div className="text-sm font-black text-gray-800">NT$ {valTwd.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                        <div className="text-[9px] font-bold text-gray-400">MYR {valMyr.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Floating Add Expense Button */}
      {activeTab === 'dashboard' && (
        <button 
          onClick={() => setIsFabOpen(true)}
          className="fixed bottom-[4.5rem] right-4 md:bottom-6 md:right-6 w-12 h-12 bg-white text-black border border-gray-200 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col items-center justify-center z-[60] hover:bg-gray-50 hover:-translate-y-1 transition-all duration-300 group animate-in fade-in zoom-in"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>
      )}

      {/* QUICK ENTRY MODAL */}
      {isFabOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsFabOpen(false)}></div>
          
          <div 
            className="bg-white w-full rounded-t-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[75vh] flex flex-col"
            onTouchStart={(e) => setTouchStartY(e.touches[0].clientY)}
            onTouchEnd={(e) => {
              const touchEndY = e.changedTouches[0].clientY;
              if (touchEndY - touchStartY > 60) {
                setIsFabOpen(false);
              }
            }}
          >
            <div className="shrink-0 bg-white/90 backdrop-blur pb-2 pt-3 px-6 border-b border-gray-100 flex flex-col items-center justify-between">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-3"></div>
              <div className="w-full flex items-center justify-between">
                <h3 className="font-black text-lg text-gray-800">记壹笔</h3>
                <button onClick={() => setIsFabOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-800"><X className="w-4 h-4"/></button>
              </div>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto no-scrollbar pb-10">
              
              {/* Subject, Date & Amount */}
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="项目名称 (如: 逢甲大肠包小肠)" 
                    value={entrySubject}
                    onChange={e => setEntrySubject(e.target.value)}
                    className="flex-1 text-base font-bold text-gray-800 placeholder-gray-300 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-black px-0 py-2 bg-transparent outline-none"
                  />
                  <select 
                    value={entryDay} 
                    onChange={e => setEntryDay(parseInt(e.target.value))}
                    className="w-20 bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 px-2 outline-none"
                  >
                    <option value={0}>N/A</option>
                    {[...Array(CONSTANTS.TOTAL_DAYS)].map((_, i) => (
                      <option key={i} value={i+1}>Day {i+1}</option>
                    ))}
                  </select>
                </div>
                
                <div className="flex gap-4 items-end">
                  <div className="flex-1 relative">
                    <div className="absolute left-0 bottom-2 text-2xl font-black text-gray-300">{entryCurrency === 'TWD' ? 'NT$' : 'RM'}</div>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={entryAmount}
                      onChange={e => setEntryAmount(e.target.value)}
                      className="w-full text-5xl font-black text-gray-800 border-none border-b-2 border-gray-100 focus:ring-0 focus:border-black pl-[60px] pr-0 py-2 bg-transparent outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => setEntryCurrency(c => c === 'TWD' ? 'MYR' : 'TWD')}
                    className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 font-bold text-xs px-4 py-3 rounded-xl mb-2 shrink-0"
                  >
                    切换 {entryCurrency === 'TWD' ? 'MYR' : 'TWD'}
                  </button>
                </div>
                {entryAmount && (
                   <div className="text-[11px] font-bold text-gray-400">
                   ≈ {oppositeCurrency} {currentConverted} (汇率 1:{entryCurrency === 'MYR' ? (1/exchangeRate).toFixed(2) : exchangeRate.toFixed(4)})
                 </div>
                )}
              </div>

              <div className="space-y-6">
                
                {/* 1. Who Advanced */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">1. 谁先垫付了款项 (影响各自资金池的扣减比例)</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BENEFICIARIES.map(p => (
                      <button 
                        key={`adv_${p.id}`}
                        onClick={() => setEntryAdvancedBy(p.id as any)}
                        className={cn("px-3 py-2 rounded-xl text-[11px] font-bold border", 
                          entryAdvancedBy === p.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        {p.icon} {p.label.replace('100% ', '').replace('Jon', 'Jon 现金垫付').replace('June', 'June 现金垫付')}
                      </button>
                    ))}
                  </div>
                  {entryAdvancedBy === 'custom' && (
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-700">👦🏻 Jon 垫付:</span>
                      <input 
                        type="number" 
                        value={customAdvancedJonAmount}
                        onChange={e => setCustomAdvancedJonAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-black"
                      />
                      <span className="text-xs font-bold text-gray-500">
                        (剩 👧🏻: {entryAmount ? (parseFloat(entryAmount) - (parseFloat(customAdvancedJonAmount)||0)).toFixed(2) : 0})
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Payment Method */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">2. 怎么支付 (决定扣哪个实体钱包)</div>
                  <div className="flex flex-wrap gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button 
                        key={m.id}
                        onClick={() => setEntryPaidBy(m.id as any)}
                        className={cn("px-3 py-2 rounded-xl text-[11px] font-bold border flex flex-col gap-0.5", 
                          entryPaidBy === m.id ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        <div>{m.icon} {m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. For Who (Beneficiary / Debt) */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">3. 这笔钱该算谁的 (影响欠款结算)</div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {BENEFICIARIES.map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setEntryBeneficiary(p.id as any)}
                        className={cn("px-3 py-2 rounded-xl text-[11px] font-bold border", 
                          entryBeneficiary === p.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200"
                        )}
                      >
                        {p.icon} {p.label}
                      </button>
                    ))}
                  </div>
                  {entryBeneficiary === 'custom' && (
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-3">
                      <span className="text-xs font-bold text-indigo-700">👦🏻 Jon 应承担:</span>
                      <input 
                        type="number" 
                        value={customBeneficiaryJonAmount}
                        onChange={e => setCustomBeneficiaryJonAmount(e.target.value)}
                        placeholder="0"
                        className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm font-bold text-gray-800 outline-none focus:border-indigo-500"
                      />
                      <span className="text-xs font-bold text-indigo-500">
                        (剩 👧🏻: {entryAmount ? (parseFloat(entryAmount) - (parseFloat(customBeneficiaryJonAmount)||0)).toFixed(2) : 0})
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Category */}
                <div>
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">4. 消费类别</div>
                  <div className="space-y-4">
                    {CATEGORIES.map((group, idx) => (
                      <div key={idx}>
                        <div className="text-[9px] font-bold text-gray-300 mb-2 uppercase tracking-wider">{group.group}</div>
                        <div className="flex flex-wrap gap-2">
                          {group.items.map(c => (
                            <button 
                              key={c.id}
                              onClick={() => setEntryCategory(c.id)}
                              className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border", 
                                entryCategory === c.id ? "bg-black text-white border-black" : "bg-white text-gray-500 border-gray-200"
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

                {/* 5. GPS */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">5. 战区 (GPS)</div>
                    <button onClick={requestGPS} className="text-[10px] font-bold text-indigo-500 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-md">
                      <Navigation className="w-3 h-3" /> 获取当前位置
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {ZONES.map(z => (
                      <button 
                        key={z.id}
                        onClick={() => setEntryZone(z.id)}
                        className={cn("px-3 py-1.5 rounded-xl text-xs font-bold border", 
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
                className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg active:scale-95 transition-transform"
              >
                确认提交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOP UP MODAL */}
      {isTopUpOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsTopUpOpen(false)}></div>
          <div className="bg-white w-full rounded-t-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 p-6 pb-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-lg text-gray-800 flex items-center gap-2"><RefreshCcw className="w-5 h-5"/> 悠游卡充值</h3>
              <button onClick={() => setIsTopUpOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">充值金额 (NT$)</div>
                <input 
                  type="number" 
                  placeholder="0" 
                  value={topUpAmount}
                  onChange={e => setTopUpAmount(e.target.value)}
                  className="w-full text-4xl font-black text-gray-800 border-b-2 border-gray-200 focus:border-indigo-600 outline-none py-2"
                />
              </div>

              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">资金来源 (扣减谁的实体钱包)</div>
                <div className="flex gap-2">
                  <button onClick={() => setTopUpSource('cash_jon')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold border", topUpSource === 'cash_jon' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>👦🏻 Jon 现金</button>
                  <button onClick={() => setTopUpSource('cash_june')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold border", topUpSource === 'cash_june' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>👧🏻 June 现金</button>
                  <button onClick={() => setTopUpSource('card_jon')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold border", topUpSource === 'card_jon' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>💳 Jon</button>
                  <button onClick={() => setTopUpSource('card_june')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold border", topUpSource === 'card_june' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>💳 June</button>
                </div>
              </div>

              <div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">充入目标 (增加谁的悠游卡)</div>
                <div className="flex gap-2">
                  <button onClick={() => setTopUpTarget('easycard_jon')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold border", topUpTarget === 'easycard_jon' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>👦🏻 Jon 悠游卡</button>
                  <button onClick={() => setTopUpTarget('easycard_june')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold border", topUpTarget === 'easycard_june' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>👧🏻 June 悠游卡</button>
                </div>
              </div>

              <button onClick={handleTopUpSubmit} className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg active:scale-95 transition-transform mt-4">
                确认充值
              </button>
              <p className="text-[10px] text-gray-400 text-center font-medium">充值属于资金转移，不会计入总消费 (Spent) 之中。</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
