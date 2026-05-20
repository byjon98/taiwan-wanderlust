import re

with open('src/components/ItineraryPanel.tsx', 'r') as f:
    code = f.read()

import_hook = "import { useFirestoreSync } from '../hooks/useFirestoreSync';\n"
code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\n" + import_hook)

old_state = """  const [itineraryDays, setItineraryDays] = useState<DayPlan[]>(() => {
    try {
      const saved = localStorage.getItem('taiwan_trip_itinerary_v7');
      return saved ? JSON.parse(saved) : defaultItinerary;
    } catch {
      return defaultItinerary;
    }
  });"""

new_state = """  const [itineraryDays, setItineraryDays] = useFirestoreSync<DayPlan[]>('itinerary', 'taiwan_trip_itinerary_v7', defaultItinerary);"""

code = code.replace(old_state, new_state)

old_effect = """  useEffect(() => {
    localStorage.setItem('taiwan_trip_itinerary_v7', JSON.stringify(itineraryDays));
  }, [itineraryDays, searchQuery]);"""

new_effect = """  // Removed local storage sync effect as it's handled by useFirestoreSync"""

code = code.replace(old_effect, new_effect)

with open('src/components/ItineraryPanel.tsx', 'w') as f:
    f.write(code)
