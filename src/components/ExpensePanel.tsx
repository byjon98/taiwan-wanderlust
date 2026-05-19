import React, { useState } from 'react';
import { Wallet, ShieldCheck, Banknote, CreditCard, CheckCircle2, ChevronRight, TrendingUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ExpensePanel() {
  const [activeTab, setActiveTab] = useState<'sunk' | 'cash' | 'card'>('sunk');

  const sunkCostItems = [
    { item: '机票 (Flights)', desc: '中华航空 (CI0722 / CI0721) 双人来回', status: '✅ 已结清', amount: '(依实际刷卡额为准)', isConfirmed: true },
    { item: '住宿 (Hotel 1)', desc: '台中东旅 Hotel East (2晚)', status: '✅ 已结清', amount: 'MYR 551.28', isConfirmed: true },
    { item: '住宿 (Hotel 3)', desc: '城市商旅 - 北门馆 (5晚)', status: '✅ 已结清', amount: 'MYR 1,308.47', isConfirmed: true },
    { item: '住宿 (Hotel 4)', desc: '城市商旅 - 航空馆 (1晚)', status: '✅ 已结清', amount: 'MYR 312.59', isConfirmed: true },
    { item: '票务 (Tickets)', desc: 'Klook 九族门票 + 日月潭缆车/游船', status: '✅ 已结清', amount: 'MYR 263.58', isConfirmed: true },
    { item: '通讯 (Telecom)', desc: '中华电信 eSIM (10天) x2', status: '✅ 已结清', amount: '(依实际购买额为准)', isConfirmed: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-20">
      {/* Header Section */}
      <div className="bg-[#1e293b] text-white pt-8 pb-10 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
        {/* Abstract Background pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-4 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <TrendingUp className="w-6 h-6 text-[#00cec9]" />
          </div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-gray-300 mb-1">Total Operation Budget</h2>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-medium text-gray-400">MYR</span>
            <span className="text-5xl font-black tracking-tight text-white drop-shadow-md">10,000</span>
          </div>
          <p className="text-xs text-indigo-200/80 font-medium tracking-wide">
            台湾专案终极财务大盘
          </p>
        </div>
      </div>

      <div className="px-5 -mt-6 relative z-20 flex-1 flex flex-col gap-5">
        {/* Block 1: Sunk Costs */}
        <div 
          onClick={() => setActiveTab('sunk')}
          className={cn(
            "bg-white rounded-3xl p-5 shadow-sm border transition-all cursor-pointer",
            activeTab === 'sunk' ? "border-indigo-500 shadow-[0_8px_30px_rgba(99,102,241,0.12)] scale-[1.02]" : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-3 items-center">
              <div className={cn("p-2.5 rounded-xl", activeTab === 'sunk' ? "bg-indigo-50 text-indigo-600" : "bg-gray-50 text-gray-400")}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2D3436] text-sm">沉没成本 Sunk Costs</h3>
                <p className="text-[10px] text-gray-400 font-medium">已刷卡付清的"硬装甲"</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block font-black text-lg text-[#2D3436]">~ MYR 4,000</span>
              <span className="block text-[10px] font-bold text-green-500">40% of Budget</span>
            </div>
          </div>

          {activeTab === 'sunk' && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-3">
                {sunkCostItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold text-[#2D3436]">{item.item}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.desc}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-xs font-black text-[#2D3436]">{item.amount}</div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 px-1 flex items-center justify-between text-xs font-bold text-gray-500">
                  <span>事前结清总计 (已知额度)</span>
                  <span className="text-[#2D3436]">~ MYR 2,435.92</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Block 2: Physical Cash Pool */}
        <div 
          onClick={() => setActiveTab('cash')}
          className={cn(
            "bg-white rounded-3xl p-5 shadow-sm border transition-all cursor-pointer",
            activeTab === 'cash' ? "border-[#00cec9] shadow-[0_8px_30px_rgba(0,206,201,0.12)] scale-[1.02]" : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3 items-center">
              <div className={cn("p-2.5 rounded-xl", activeTab === 'cash' ? "bg-[#00cec9]/10 text-[#00b8b2]" : "bg-gray-50 text-gray-400")}>
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2D3436] text-sm">实体现金池 Cash Pool</h3>
                <p className="text-[10px] text-gray-400 font-medium">战术分配资金区</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block font-black text-lg text-[#2D3436]">NT$ 33,000</span>
              <span className="block text-[10px] font-bold text-[#00cec9]">Locked Amount</span>
            </div>
          </div>
          
          {activeTab === 'cash' && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                <h4 className="text-xs font-bold text-orange-800 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                  战术分配目标 (Tactical Allocation)
                </h4>
                <ul className="space-y-2 text-xs font-medium text-orange-700/80">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />
                    <span>专攻无法刷卡的夜市小吃、大稻埕鲁肉饭等传统老店</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />
                    <span>购买客运车票、交通接驳费 (如水社往返伊达邵计程车)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50 text-red-500" />
                    <span className="text-red-700 font-bold">必须现场付现的 伊达邵 旅宿房费 (NT$ 1,652)</span>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Block 3: Credit Card Reserve */}
        <div 
          onClick={() => setActiveTab('card')}
          className={cn(
            "bg-white rounded-3xl p-5 shadow-sm border transition-all cursor-pointer mb-6",
            activeTab === 'card' ? "border-purple-500 shadow-[0_8px_30px_rgba(168,85,247,0.12)] scale-[1.02]" : "border-gray-100 hover:border-gray-200"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3 items-center">
              <div className={cn("p-2.5 rounded-xl", activeTab === 'card' ? "bg-purple-50 text-purple-600" : "bg-gray-50 text-gray-400")}>
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#2D3436] text-sm">机动刷卡备用金</h3>
                <p className="text-[10px] text-gray-400 font-medium">Credit Card Reserve</p>
              </div>
            </div>
            <div className="text-right">
              <span className="block font-black text-lg text-[#2D3436]">MYR 1,852</span>
              <span className="block text-[10px] font-bold text-purple-500">Remaining Firepower</span>
            </div>
          </div>

          {activeTab === 'card' && (
            <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
               <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <h4 className="text-xs font-bold text-purple-800 mb-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  火力覆盖范围 (Tactical Targets)
                </h4>
                <p className="text-[11px] leading-relaxed text-purple-700/80 font-medium mb-3">
                  这是总预算扣除“沉没成本”与“现金池”后的最后弹性额度。必须严格保留给接受信用卡/Apple Pay 的高价值目标。
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Adam Elements / Innergie 100W 插头', '华泰名品城 Outlet 扫货', 'DON DON DONKI', '微热山丘伴手礼', '突发 Uber 叫车'].map((tag, i) => (
                    <span key={i} className="inline-block px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-purple-700 border border-purple-200 shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
