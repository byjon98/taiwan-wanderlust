import re

with open('src/components/ExpensePanel.tsx', 'r') as f:
    code = f.read()

# Add import
import_hook = "import { useFirestoreSync } from '../hooks/useFirestoreSync';\n"
code = code.replace("import { Expense, PAYMENT_METHODS", import_hook + "import { Expense, PAYMENT_METHODS")

# Replace useState
old_state = "  const [expenses, setExpenses] = useState<Expense[]>([]);"
new_state = "  const [expenses, setExpenses] = useFirestoreSync<Expense[]>('expenses', 'taiwan_trip_expenses_v3', INITIAL_SUNK_COSTS);"
code = code.replace(old_state, new_state)

# Remove old useEffects for load/save
old_effects = """  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_expenses_v3');
    if (saved) {
      try {
        setExpenses(JSON.parse(saved));
      } catch(e) {}
    } else {
      setExpenses(INITIAL_SUNK_COSTS);
    }
    
    // Auto calculate current day based on trip start
    const tripStart = new Date('2026-05-23T00:00:00+08:00').getTime();
    const diffDays = Math.floor((Date.now() - tripStart) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= 10) setEntryDay(diffDays);

    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MYR) setExchangeRate(data.rates.MYR);
      }).catch(() => console.log('Failed to fetch rate.'));
  }, []);

  useEffect(() => {
    if (expenses.length > 0) {
      localStorage.setItem('taiwan_trip_expenses_v3', JSON.stringify(expenses));
    }
  }, [expenses]);"""

new_effects = """  useEffect(() => {
    // Auto calculate current day based on trip start
    const tripStart = new Date('2026-05-23T00:00:00+08:00').getTime();
    const diffDays = Math.floor((Date.now() - tripStart) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays >= 1 && diffDays <= 10) setEntryDay(diffDays);

    fetch('https://api.exchangerate-api.com/v4/latest/TWD')
      .then(res => res.json())
      .then(data => {
        if (data && data.rates && data.rates.MYR) setExchangeRate(data.rates.MYR);
      }).catch(() => console.log('Failed to fetch rate.'));
  }, []);"""

code = code.replace(old_effects, new_effects)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(code)
