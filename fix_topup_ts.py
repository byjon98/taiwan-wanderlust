with open('src/components/ExpensePanel.tsx', 'r') as f:
    panel = f.read()

old_state = "const [topUpSource, setTopUpSource] = useState<'cash_jon' | 'cash_june' | 'card' | 'myr_cash'>('cash_jon');"
new_state = "const [topUpSource, setTopUpSource] = useState<'cash_jon' | 'cash_june' | 'card_jon' | 'card_june' | 'myr_cash'>('cash_jon');"

panel = panel.replace(old_state, new_state)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(panel)
