with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

old_submit = """    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: entrySubject,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryPaidBy,
      paidByJon, paidByJune,
      forJon, forJune,
      category: entryCategory,
      zone: entryZone === 'custom' ? customZoneText : entryZone,
      timestamp: Date.now(),
      day: entryDay,
    };
    
    setExpenses(prev => [newExpense, ...prev]);
    setIsFabOpen(false);
    setEntrySubject('');
    setEntryAmount('');
    setCustomBeneficiaryJonAmount('');
  };"""

new_submit = """    const newExpense: Expense = {
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
  };"""
panel = panel.replace(old_submit, new_submit)

# History buttons
old_history_buttons = """                          <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <X className="w-4 h-4" />
                          </button>"""
new_history_buttons = """                          <div className="flex gap-1 items-center">
                            <button onClick={() => handleEdit(e)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">修改</button>
                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>"""
panel = panel.replace(old_history_buttons, new_history_buttons)

# Header
old_header = """            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setIsFabOpen(false)} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black tracking-widest">记壹笔</h2>
            </div>"""
new_header = """            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => {setIsFabOpen(false); setEditExpenseId(null);}} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black tracking-widest">{editExpenseId ? "修改记录" : "记壹笔"}</h2>
            </div>"""
panel = panel.replace(old_header, new_header)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)
