import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

import_hook = "import { useFirestoreSync } from './hooks/useFirestoreSync';\n"
code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + import_hook)

old_state = """  const [routeItems, setRouteItems] = useState<RouteItem[]>(() => {
    try {
      const stored = localStorage.getItem('my_app_routeItems');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });"""
new_state = """  const [routeItems, setRouteItems] = useFirestoreSync<RouteItem[]>('routeItems', 'my_app_routeItems', []);"""
code = code.replace(old_state, new_state)

old_effect = """  useEffect(() => {
    localStorage.setItem('my_app_routeItems', JSON.stringify(routeItems));
  }, [routeItems]);"""
new_effect = ""
code = code.replace(old_effect, new_effect)

with open('src/App.tsx', 'w') as f:
    f.write(code)
