import re

# 1. Fix ExpensePanel.tsx
with open('src/components/ExpensePanel.tsx', 'r') as f:
    code = f.read()

code = code.replace("paymentMethod: 'cash_jon', // placeholder", "paymentMethod: 'cash', // placeholder")
code = code.replace("const totalSpent = Object.values(dayCats).reduce((a,b)=>a+b, 0);", "const totalSpent = (Object.values(dayCats) as number[]).reduce((a,b)=>a+b, 0);")
code = code.replace("{Object.entries(dayCats).sort((a,b)=>b[1]-a[1]).map(([groupName, amount]) => {", "{(Object.entries(dayCats) as [string, number][]).sort((a,b)=>b[1]-a[1]).map(([groupName, amount]) => {")

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(code)

# 2. Fix ItineraryPanel.tsx
with open('src/components/ItineraryPanel.tsx', 'r') as f:
    code = f.read()

# add missing imports
code = code.replace("  CheckCircle2\n} from 'lucide-react';", "  CheckCircle2,\n  Search,\n  X,\n  Navigation\n} from 'lucide-react';")

# fix deleteItem
code = code.replace("const deleteItem = (dayIdx: number, itemIdx: number) => {", "const deleteItem = (dayIdx: number, itemIdx: number, e?: any) => {")

with open('src/components/ItineraryPanel.tsx', 'w') as f:
    f.write(code)

