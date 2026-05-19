with open('src/components/ExpensePanel.tsx', 'r') as f:
    code = f.read()

# 1. Global Remaining
global_old = """            <div className="text-xl font-black text-indigo-600">MYR {(10000 - stats.totalSpentMyr).toLocaleString(undefined, {maximumFractionDigits:0})}</div>"""
global_new = """            <div className="text-xl font-black text-indigo-600 flex items-baseline justify-end gap-2">
              MYR {(10000 - stats.totalSpentMyr).toLocaleString(undefined, {maximumFractionDigits:0})}
              <span className="text-xs font-bold text-gray-400">≈ NT$ {((10000 - stats.totalSpentMyr)/exchangeRate).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
            </div>"""
code = code.replace(global_old, global_new)

# 2. Filtered Subtotal
subtotal_old = """            {searchQuery.trim() && filteredSubtotal !== null && (
              <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold border border-indigo-100 flex justify-between items-center">
                <span>过滤结果总计 (剔除充值):</span>
                <span>NT$ {filteredSubtotal.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
              </div>
            )}"""
subtotal_new = """            {searchQuery.trim() && filteredSubtotal !== null && (
              <div className="bg-indigo-50 text-indigo-700 px-4 py-3 rounded-xl text-xs font-bold border border-indigo-100 flex justify-between items-center">
                <span>过滤结果总计 (剔除充值):</span>
                <div className="text-right">
                  <div className="text-sm font-black">NT$ {filteredSubtotal.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
                  <div className="text-[10px] font-bold text-indigo-400 mt-0.5">≈ MYR {(filteredSubtotal * exchangeRate).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</div>
                </div>
              </div>
            )}"""
code = code.replace(subtotal_old, subtotal_new)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(code)
