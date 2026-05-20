import re

with open('src/components/InfoPanel.tsx', 'r') as f:
    code = f.read()

# Add hook import
if "useFirestoreSync" not in code:
    code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport { useFirestoreSync } from '../hooks/useFirestoreSync';")

# 1. Packing List Refactor
# Add INITIAL_PACKING_LIST outside component
init_packing = """
const INITIAL_PACKING_LIST = defaultPackingList.map(cat => ({
  title: cat.title,
  items: cat.items.map((item, i) => ({
    ...item,
    id: `${cat.title}-${i}-${Date.now()}-${Math.random()}`,
    checked: false
  }))
}));
"""
if "INITIAL_PACKING_LIST" not in code:
    code = code.replace("export default function InfoPanel() {", init_packing + "\nexport default function InfoPanel() {")

# Replace packing list useState
old_packing_state = """  const [userPackingList, setUserPackingList] = useState<StatefulPackingCategory[]>([]);"""
new_packing_state = """  const [userPackingList, setUserPackingList] = useFirestoreSync<StatefulPackingCategory[]>('packing', 'taiwan_trip_packing_v1', INITIAL_PACKING_LIST);"""
code = code.replace(old_packing_state, new_packing_state)

# Remove the two packing list useEffects
old_packing_effects = """  // Initialize Packing List from Storage or Default
  useEffect(() => {
    const saved = localStorage.getItem('taiwan_trip_packing_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUserPackingList(parsed);
      } catch (e) {
        resetPackingList();
      }
    } else {
      resetPackingList();
    }
  }, []);

  // Save Packing List to Storage
  useEffect(() => {
    if (userPackingList.length > 0) {
      localStorage.setItem('taiwan_trip_packing_v1', JSON.stringify(userPackingList));
    }
  }, [userPackingList]);"""
code = code.replace(old_packing_effects, "")


# 2. Checklist Refactor
old_checklist_state = """  const [checklist, setChecklist] = useState<{ id: number; text: string; checked: boolean }[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_checklist_v1');
      return saved ? JSON.parse(saved) : defaultChecklist;
    } catch {
      return defaultChecklist;
    }
  });"""
new_checklist_state = """  const [checklist, setChecklist] = useFirestoreSync<{ id: number; text: string; checked: boolean }[]>('checklist', 'taiwan_trip_checklist_v1', defaultChecklist);"""
code = code.replace(old_checklist_state, new_checklist_state)

old_checklist_effect = """  // Persist checklist to localStorage
  useEffect(() => {
    localStorage.setItem('taiwan_trip_checklist_v1', JSON.stringify(checklist));
  }, [checklist]);"""
code = code.replace(old_checklist_effect, "")


with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(code)
