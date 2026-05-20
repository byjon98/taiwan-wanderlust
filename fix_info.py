import re

with open('src/components/InfoPanel.tsx', 'r') as f:
    code = f.read()

import_hook = "import { useFirestoreSync } from '../hooks/useFirestoreSync';\n"
code = code.replace("import React, { useState, useEffect, useRef } from 'react';", "import React, { useState, useEffect, useRef } from 'react';\n" + import_hook)

old_packing_state = """  const [userPackingList, setUserPackingList] = useState<PackingCategory[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_packing_v1');
      return saved ? JSON.parse(saved) : DEFAULT_PACKING_LIST;
    } catch {
      return DEFAULT_PACKING_LIST;
    }
  });"""
new_packing_state = """  const [userPackingList, setUserPackingList] = useFirestoreSync<PackingCategory[]>('packing', 'taiwan_trip_packing_v1', DEFAULT_PACKING_LIST);"""
code = code.replace(old_packing_state, new_packing_state)

old_packing_effect = """  useEffect(() => {
    if (userPackingList !== DEFAULT_PACKING_LIST) {
      localStorage.setItem('taiwan_trip_packing_v1', JSON.stringify(userPackingList));
    }
  }, [userPackingList]);"""
new_packing_effect = ""
code = code.replace(old_packing_effect, new_packing_effect)


old_checklist_state = """  const [checklist, setChecklist] = useState<ChecklistItem[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_checklist_v1');
      return saved ? JSON.parse(saved) : DEFAULT_CHECKLIST;
    } catch {
      return DEFAULT_CHECKLIST;
    }
  });"""
new_checklist_state = """  const [checklist, setChecklist] = useFirestoreSync<ChecklistItem[]>('checklist', 'taiwan_trip_checklist_v1', DEFAULT_CHECKLIST);"""
code = code.replace(old_checklist_state, new_checklist_state)

old_checklist_effect = """  useEffect(() => {
    if (checklist !== DEFAULT_CHECKLIST) {
      localStorage.setItem('taiwan_trip_checklist_v1', JSON.stringify(checklist));
    }
  }, [checklist]);"""
new_checklist_effect = ""
code = code.replace(old_checklist_effect, new_checklist_effect)

with open('src/components/InfoPanel.tsx', 'w') as f:
    f.write(code)
