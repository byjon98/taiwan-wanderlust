with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

# Add edit state
panel = panel.replace(
    "const [viewMode, setViewMode] = useState<'dashboard'|'add'|'split'|'burn'>('dashboard');",
    "const [viewMode, setViewMode] = useState<'dashboard'|'add'|'split'|'burn'>('dashboard');\n  const [editExpenseId, setEditExpenseId] = useState<string | null>(null);"
)

# Replace handleSubmit logic to support updating
old_submit = """    const newExpense: Expense = {
      id: Date.now().toString(),
      subject: entryDesc.trim() || categoryLabel,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryPaidBy,
      paidByJon,
      paidByJune,
      forJon,
      forJune,
      category: entryCategory,
      day: entryDay,
      timestamp: Date.now()
    };
    
    setExpenses([newExpense, ...expenses]);
    setViewMode('dashboard');"""

new_submit = """    const newExpense: Expense = {
      id: editExpenseId || Date.now().toString(),
      subject: entryDesc.trim() || categoryLabel,
      amount: amountNum,
      currency: entryCurrency,
      paymentMethod: entryPaidBy,
      paidByJon,
      paidByJune,
      forJon,
      forJune,
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
    setEditExpenseId(null);"""
panel = panel.replace(old_submit, new_submit)

# Add edit handler
edit_handler = """  const handleEdit = (expense: Expense) => {
    setEditExpenseId(expense.id);
    setEntryAmount(expense.amount.toString());
    setEntryDesc(expense.subject);
    setEntryCurrency(expense.currency);
    setEntryCategory(expense.category);
    setEntryPaidBy(expense.paymentMethod);
    setEntryDay(expense.day);
    
    // Reverse engineer forWho
    if (expense.forJon > 0 && expense.forJune === 0) setEntryForWho('jon_100');
    else if (expense.forJune > 0 && expense.forJon === 0) setEntryForWho('june_100');
    else if (expense.forJon === expense.forJune && expense.forJon > 0) setEntryForWho('split_50');
    else {
      setEntryForWho('custom');
      setCustomForJonAmount(expense.forJon.toString());
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
"""
panel = panel.replace("const handleDelete = (id: string) => {", edit_handler + "const handleDelete = (id: string) => {")

# Add Edit button in History tab
old_history_buttons = """<button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                            <X className="w-4 h-4" />
                          </button>"""
new_history_buttons = """<div className="flex gap-1">
                            <button onClick={() => handleEdit(e)} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">修改</button>
                            <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>"""
panel = panel.replace(old_history_buttons, new_history_buttons)

# Also change header from "记壹笔" to "修改记录" if editExpenseId exists
panel = panel.replace(
    '<h2 className="text-xl font-black tracking-widest">记壹笔</h2>',
    '<h2 className="text-xl font-black tracking-widest">{editExpenseId ? "修改记录" : "记壹笔"}</h2>'
)
panel = panel.replace(
    '<button onClick={() => setViewMode(\'dashboard\')} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">',
    '<button onClick={() => {setViewMode(\'dashboard\'); setEditExpenseId(null);}} className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">'
)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)
