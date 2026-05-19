import re

with open('src/components/ExpensePanel.tsx', 'r') as f:
    code = f.read()

# 1. Update states
code = code.replace(
    "const [entryPaidBy, setEntryPaidBy] = useState<Expense['paymentMethod']>('cash_jon');",
    "const [entryAdvancedBy, setEntryAdvancedBy] = useState<'jon_100'|'june_100'|'split_50'|'custom'>('jon_100');\n  const [customAdvancedJonAmount, setCustomAdvancedJonAmount] = useState('');\n  const [entryPaidBy, setEntryPaidBy] = useState<Expense['paymentMethod']>('cash');"
)

# 2. Update stats calculation for cash and easycard
stats_old = """      // Tracking physical pools
      if (e.isTransfer && e.transferTo) {
        if (e.paymentMethod === 'cash_jon') jonCashSpentTwd += amountTwd;
        if (e.paymentMethod === 'cash_june') juneCashSpentTwd += amountTwd;
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;

        if (e.transferTo === 'easycard_jon') jonEasyCardTopupTwd += amountTwd;
        if (e.transferTo === 'easycard_june') juneEasyCardTopupTwd += amountTwd;
      } else if (!e.isSettlement) {
        if (e.paymentMethod === 'cash_jon') jonCashSpentTwd += amountTwd;
        if (e.paymentMethod === 'cash_june') juneCashSpentTwd += amountTwd;
        if (e.paymentMethod === 'easycard_jon') jonEasyCardSpentTwd += amountTwd;
        if (e.paymentMethod === 'easycard_june') juneEasyCardSpentTwd += amountTwd;
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;
      }"""

stats_new = """      // Tracking physical pools
      if (e.isTransfer && e.transferTo) {
        if (e.paymentMethod === 'cash') {
            jonCashSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneCashSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;

        if (e.transferTo === 'easycard_jon') jonEasyCardTopupTwd += amountTwd;
        if (e.transferTo === 'easycard_june') juneEasyCardTopupTwd += amountTwd;
      } else if (!e.isSettlement) {
        if (e.paymentMethod === 'cash') {
            jonCashSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneCashSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }
        if (e.paymentMethod === 'easycard') {
            jonEasyCardSpentTwd += (e.currency === 'TWD' ? e.paidByJon : e.paidByJon / exchangeRate);
            juneEasyCardSpentTwd += (e.currency === 'TWD' ? e.paidByJune : e.paidByJune / exchangeRate);
        }
        if (e.paymentMethod === 'card') cardSpentMyr += amountMyr;
        if (e.paymentMethod === 'myr_cash') myrCashSpent += amountMyr;
      }"""
code = code.replace(stats_old, stats_new)

# 3. Update handleSubmit
submit_old = """    let paidByJon = 0;
    let paidByJune = 0;
    
    if (entryPaidBy === 'cash_jon' || entryPaidBy === 'easycard_jon') paidByJon = amountNum;
    else if (entryPaidBy === 'cash_june' || entryPaidBy === 'easycard_june') paidByJune = amountNum;
    else {
      // card or myr_cash defaults to 50/50 paid advance if not specified, but let's assume Jon swiped the card for tracking unless specified.
      // Actually, if it's card, we can assume it's joint advance (split_50 paidBy), but usually someone physically taps.
      // Let's just assign card payments 50/50 advance to keep it neutral, OR 100% Jon if Jon's card. Let's assume Jon's card.
      paidByJon = amountNum; 
    }"""
submit_new = """    let paidByJon = 0;
    let paidByJune = 0;
    
    if (entryAdvancedBy === 'jon_100') {
      paidByJon = amountNum;
    } else if (entryAdvancedBy === 'june_100') {
      paidByJune = amountNum;
    } else if (entryAdvancedBy === 'split_50') {
      paidByJon = amountNum / 2;
      paidByJune = amountNum / 2;
    } else {
      paidByJon = parseFloat(customAdvancedJonAmount) || 0;
      paidByJune = amountNum - paidByJon;
    }"""
code = code.replace(submit_old, submit_new)

with open('src/components/ExpensePanel.tsx', 'w') as f:
    f.write(code)
