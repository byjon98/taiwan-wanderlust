import re

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
      day: entryDay,
      timestamp: Date.now()
    };
    
    setExpenses([newExpense, ...expenses]);
    setViewMode('dashboard');
  };

  const handleDelete = (id: string) => {"""

new_submit = """    const newExpense: Expense = {
      id: editExpenseId || Date.now().toString(),
      subject: entrySubject,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryPaidBy,
      paidByJon, paidByJune,
      forJon, forJune,
      category: entryCategory,
      day: entryDay,
      timestamp: Date.now()
    };
    
    if (editExpenseId) {
      setExpenses(expenses.map(e => e.id === editExpenseId ? newExpense : e));
    } else {
      setExpenses([newExpense, ...expenses]);
    }
    
    setViewMode('dashboard');
    setEditExpenseId(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditExpenseId(expense.id);
    setEntryAmount(expense.amount.toString());
    setEntrySubject(expense.subject);
    setEntryCurrency(expense.currency);
    setEntryCategory(expense.category);
    setEntryPaidBy(expense.paymentMethod);
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
    
    setViewMode('add');
  };

  const handleDelete = (id: string) => {"""

if old_submit in panel:
    panel = panel.replace(old_submit, new_submit)
else:
    print("WARNING: Could not find old_submit string")

# 4. Add Edit button to History list
old_history_buttons = """                          <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <X className="w-4 h-4" />
                          </button>"""
new_history_buttons = """                          <div className="flex gap-1">
                            <button onClick={() => handleEdit(e)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">修改</button>
                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>"""

if old_history_buttons in panel:
    panel = panel.replace(old_history_buttons, new_history_buttons)
else:
    print("WARNING: Could not find old_history_buttons")

# 5. Change UI text
old_header = """            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setViewMode('dashboard')} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black tracking-widest">记壹笔</h2>
            </div>"""

new_header = """            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => {setViewMode('dashboard'); setEditExpenseId(null);}} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-black tracking-widest">{editExpenseId ? "修改记录" : "记壹笔"}</h2>
            </div>"""

if old_header in panel:
    panel = panel.replace(old_header, new_header)
else:
    print("WARNING: Could not find old_header")

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)
