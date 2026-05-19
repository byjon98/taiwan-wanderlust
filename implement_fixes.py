import re

# 1. Update data-expense.ts
with open('src/data-expense.ts', 'r') as f:
    data = f.read()

data = data.replace(
    "paymentMethod: 'cash' | 'card' | 'myr_cash' | 'easycard';",
    "paymentMethod: 'cash' | 'card' | 'myr_cash' | 'easycard_jon' | 'easycard_june';"
)
data = data.replace(
    "{ id: 'easycard', icon: '🚇', label: '悠游卡', desc: '扣除各自卡余额' },",
    "{ id: 'easycard_jon', icon: '👦🏻🚇', label: 'Jon 悠游卡', desc: '扣除Jon卡余额' },\n  { id: 'easycard_june', icon: '👧🏻🚇', label: 'June 悠游卡', desc: '扣除June卡余额' },"
)
with open('src/data-expense.ts', 'w') as f:
    f.write(data)


# 2. Update ExpensePanel.tsx
with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

# Update EasyCard pool logic
old_stats_easycard = """        if (e.paymentMethod === 'easycard') {
            jonEasyCardSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneEasyCardSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }"""
new_stats_easycard = """        if (e.paymentMethod === 'easycard_jon') {
            jonEasyCardSpentTwd += (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
        }
        if (e.paymentMethod === 'easycard_june') {
            juneEasyCardSpentTwd += (e.currency === 'TWD' ? e.amount : e.amount / exchangeRate);
        }"""
panel = panel.replace(old_stats_easycard, new_stats_easycard)

# Update Dashboard Cash Pool colors
panel = panel.replace('bg-gray-800', 'bg-blue-400') # Jon Cash
panel = panel.replace('bg-red-500', 'bg-pink-400') # June Cash
# Wait, let's be more precise:
# {jonCashPct}% -> bg-blue-400, {juneCashPct}% -> bg-pink-400
# Let's write a regex or just replace the specific lines.
panel = re.sub(
    r'<div className="bg-gray-800 h-full rounded-full transition-all duration-1000" style={{ width: `\$\{jonCashPct\}%` }} />',
    r'<div className="bg-blue-400 h-full rounded-full transition-all duration-1000" style={{ width: `${jonCashPct}%` }} />',
    panel
)
panel = re.sub(
    r'<div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `\$\{juneCashPct\}%` }} />',
    r'<div className="bg-pink-400 h-full rounded-full transition-all duration-1000" style={{ width: `${juneCashPct}%` }} />',
    panel
)

# Split tab title and button
panel = panel.replace('内部对冲结算单 (MYR等值)', '内部对冲结算单 (MYR等值 ≈ NT$ {(Math.abs(netBalance) * exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})})')
panel = panel.replace(
    'className="w-full py-4 bg-black text-white rounded-2xl font-black text-lg active:scale-95 transition-transform mt-4 flex justify-center items-center gap-2"',
    'className="w-full py-4 bg-white text-gray-800 border-2 border-gray-200 rounded-2xl font-black text-lg active:scale-95 transition-transform mt-4 flex justify-center items-center gap-2"'
)

# FAB Position
panel = panel.replace('bottom-24 lg:bottom-10 right-6', 'bottom-24 lg:bottom-10 left-6')

# Top Up Card Options
panel = panel.replace(
    """<button onClick={() => setTopUpSource('card')} className={cn("flex-1 py-3 rounded-xl text-xs font-bold border", topUpSource === 'card' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>💳 信用卡</button>""",
    """<button onClick={() => setTopUpSource('card_jon')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold border", topUpSource === 'card_jon' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>💳 Jon</button>\n                  <button onClick={() => setTopUpSource('card_june')} className={cn("flex-1 py-3 rounded-xl text-[10px] font-bold border", topUpSource === 'card_june' ? "bg-black text-white border-black" : "bg-white text-gray-600 border-gray-200")}>💳 June</button>"""
)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)

# 3. Update ExplorePanel.tsx
with open('src/App.tsx', 'r') as f:
    app_ts = f.read()
# Wait, Explore is in App.tsx!
app_ts = app_ts.replace('bottom-8 right-1/2', 'bottom-24 right-1/2')
with open('src/App.tsx', 'w') as f:
    f.write(app_ts)

