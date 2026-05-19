with open('src/components/ExpensePanel.tsx', 'r') as f:
    code = f.read()

burn_old = """  // Daily Burn Rate (Vertical)
  const dailyBurn = useMemo(() => {
    const days: Record<number, Record<string, number>> = {};
    for(let i = 1; i <= CONSTANTS.TOTAL_DAYS; i++) days[i] = {};
    
    expenses.forEach(e => {
      if (e.timestamp < 100 || e.isTransfer || e.isSettlement) return; // skip initial sunk costs and transfers
      const amountTwd = e.currency === 'TWD' ? e.amount : e.amount / exchangeRate;
      if (!days[e.day]) days[e.day] = {};
      days[e.day][e.category] = (days[e.day][e.category] || 0) + amountTwd;
    });
    return days;
  }, [expenses, exchangeRate]);"""

burn_new = """  // Daily Burn Rate (Vertical) grouped by main category
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
  };"""

code = code.replace(burn_old, burn_new)

render_old = """                          {Object.entries(dayCats).sort((a,b)=>b[1]-a[1]).map(([catId, amount]) => {
                            const segmentPct = (amount / totalSpent) * 100;
                            return (
                              <div key={catId} style={{ height: `${segmentPct}%`, backgroundColor: getCategoryColor(catId) }} className="w-full" />
                            );
                          })}"""
render_new = """                          {Object.entries(dayCats).sort((a,b)=>b[1]-a[1]).map(([groupName, amount]) => {
                            const segmentPct = (amount / totalSpent) * 100;
                            return (
                              <div key={groupName} style={{ height: `${segmentPct}%`, backgroundColor: getGroupColor(groupName) }} className="w-full" />
                            );
                          })}"""
code = code.replace(render_old, render_new)

legend_old = """            <div className="flex flex-wrap gap-3 px-2 justify-center">
              {['nightmarket', 'restaurant', 'uber', 'transit', 'shopping_life', 'tickets'].map(id => (
                <div key={id} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCategoryColor(id) }} />
                  {getCategoryLabel(id).split(' ')[1] || getCategoryLabel(id)}
                </div>
              ))}
            </div>"""
legend_new = """            <div className="flex flex-wrap gap-4 px-2 justify-center pt-2">
              {CATEGORIES.map(g => (
                <div key={g.group} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getGroupColor(g.group) }} />
                  {g.group}
                </div>
              ))}
            </div>"""
code = code.replace(legend_old, legend_new)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(code)
