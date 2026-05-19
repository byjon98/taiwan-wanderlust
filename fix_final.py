with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

old_day = """                  <select 
                    value={entryDay} 
                    onChange={e => setEntryDay(parseInt(e.target.value))}
                  >
                    {[...Array(CONSTANTS.TOTAL_DAYS)].map((_, i) => (
                      <option key={i} value={i+1}>Day {i+1}</option>
                    ))}
                  </select>"""
new_day = """                  <select 
                    value={entryDay} 
                    onChange={e => setEntryDay(parseInt(e.target.value))}
                    className="w-20 bg-gray-50 border-none rounded-lg text-xs font-bold text-gray-600 px-2 outline-none"
                  >
                    <option value={0}>N/A</option>
                    {[...Array(CONSTANTS.TOTAL_DAYS)].map((_, i) => (
                      <option key={i} value={i+1}>Day {i+1}</option>
                    ))}
                  </select>"""

if old_day in panel:
    panel = panel.replace(old_day, new_day)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)

# Fix App.tsx
with open('src/App.tsx', 'r') as f:
    app = f.read()

app = app.replace('bottom-8 left-1/2', 'bottom-[110px] left-1/2')
app = app.replace('bottom-24 right-1/2', 'bottom-[110px] right-1/2')

with open('src/App.tsx', 'w') as f:
    f.write(app)
