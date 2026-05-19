with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

old_logic = """    // Whoever pays the source advances the money
    if (topUpSource === 'cash_jon') paidByJon = amountNum;
    else if (topUpSource === 'cash_june') paidByJune = amountNum;
    else paidByJon = amountNum; // card default to jon"""

new_logic = """    // Whoever pays the source advances the money
    if (topUpSource === 'cash_jon' || topUpSource === 'card_jon') paidByJon = amountNum;
    else paidByJune = amountNum;"""

panel = panel.replace(old_logic, new_logic)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)
