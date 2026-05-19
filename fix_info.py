with open('src/components/InfoPanel.tsx', 'r') as f:
    panel = f.read()

# 1. Add state
old_state = "const [newPackingItems, setNewPackingItems] = useState<Record<number, string>>({});"
new_state = "const [newPackingItems, setNewPackingItems] = useState<Record<number, string>>({});\n  const [isPolicyOpen, setIsPolicyOpen] = useState(false);"
panel = panel.replace(old_state, new_state)

# 2. Add button
old_button = """                  <a href="tel:+60327856565" className="text-xl font-black text-red-600 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
                    +603 2785 6565
                  </a>
                </div>
              </div>
            </div>
          </section>"""
new_button = """                  <a href="tel:+60327856565" className="text-xl font-black text-red-600 flex items-center gap-2 hover:opacity-80 transition-opacity w-fit">
                    +603 2785 6565
                  </a>
                  <button onClick={() => setIsPolicyOpen(true)} className="mt-3 w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    查看完整保单 Policy
                  </button>
                </div>
              </div>
            </div>
          </section>"""
panel = panel.replace(old_button, new_button)

# 3. Add Modal
modal_code = """      {isPolicyOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPolicyOpen(false)}></div>
          
          <div className="bg-white w-full rounded-t-[2rem] shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
            <div className="shrink-0 bg-white/90 backdrop-blur pb-4 pt-6 px-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-xl text-gray-800">TripCare 360 Platinum</h3>
                <div className="text-xs font-bold text-gray-500 mt-1">Etiqa 旅游保险保单</div>
              </div>
              <button onClick={() => setIsPolicyOpen(false)} className="p-2 bg-gray-50 rounded-full text-gray-500 hover:text-gray-800"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-6 overflow-y-auto no-scrollbar space-y-6 bg-gray-50">
              
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">基本信息 Basic Info</h4>
                <div className="space-y-2 text-sm font-bold text-gray-700">
                  <div className="flex justify-between"><span className="text-gray-400">保单号 Policy No.</span><span>PU582185</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">受保人 Insured</span><span className="text-right">PANG EN SZE<br/>LOH ZI JIA</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">承保日期 Period</span><span>2026/05/23 - 2026/06/01</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">目的地 Destination</span><span>Taiwan (Region 1)</span></div>
                  <div className="flex justify-between"><span className="text-gray-400">保费 Premium</span><span>RM 129.50</span></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-sm border-l-4 border-l-red-500">
                <h4 className="text-xs font-black text-red-400 uppercase tracking-widest mb-3 border-b border-red-50 pb-2">医疗与救援 Medical & Evacuation</h4>
                <div className="space-y-3 text-sm font-bold text-gray-700">
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">海外医疗费用</span><span className="text-right text-red-600 font-black">RM 500,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">后续在马医疗</span><span className="text-right font-black">RM 50,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">紧急医疗撤离</span><span className="text-right font-black">Unlimited 无上限</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">遗体运返费用</span><span className="text-right font-black">Unlimited 无上限</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">海外陪同/探视津贴</span><span className="text-right font-black">RM 15,000</span></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-orange-400">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">意外与残疾 Personal Accident</h4>
                <div className="space-y-3 text-sm font-bold text-gray-700">
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">意外身故/永久残疾</span><span className="text-right font-black">RM 300,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">公共交通双倍赔偿</span><span className="text-right font-black text-orange-500">RM 600,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">儿童教育基金</span><span className="text-right font-black">RM 10,000</span></div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm border-l-4 border-l-blue-400">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-2">行程不便 Travel Inconvenience</h4>
                <div className="space-y-3 text-sm font-bold text-gray-700">
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">行李与私人物品损坏/遗失</span><span className="text-right font-black">RM 5,000<br/><span className="text-[10px] font-normal text-gray-400">(Max RM 500/item)</span></span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">护照/钱财遗失</span><span className="text-right font-black">RM 5,000 / RM 1,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">行程取消/缩短</span><span className="text-right font-black">RM 20,000</span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">航班延误 (每6小时)</span><span className="text-right font-black">RM 200<br/><span className="text-[10px] font-normal text-gray-400">(Max RM 2,000)</span></span></div>
                  <div className="flex justify-between items-start gap-4"><span className="text-gray-500 shrink-0">行李延误 (每6小时)</span><span className="text-right font-black">RM 200<br/><span className="text-[10px] font-normal text-gray-400">(Max RM 800)</span></span></div>
                </div>
              </div>

              <div className="text-xs text-gray-400 text-center px-4 pb-8 font-medium">
                此为保单重点摘要，理赔时请以 Etiqa 官方条款 (Policy Wordings) 为准。<br/>
                索赔期限：请在回国后 30 天内提交理赔申请。
              </div>

            </div>
          </div>
        </div>
      )}"""

# Replace right before the final closing div/element of InfoPanel
# The file ends with:
#     </div>
#   );
# }

panel = panel.replace("    </div>\n  );\n}", modal_code + "\n    </div>\n  );\n}")

with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(panel)
