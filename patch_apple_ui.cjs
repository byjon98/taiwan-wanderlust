const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. We need to extract the MapComponent block so we can put it globally.
// Look for `<MapComponent ... />`
const mapRegex = /<MapComponent[\s\S]*?onLocClick={.*?\}[\s\S]*?\/>/;
const mapMatch = content.match(mapRegex);

if (!mapMatch) {
  console.error("MapComponent not found!");
  process.exit(1);
}

const mapCode = mapMatch[0];

// 2. Remove the old MapComponent from activeTab === 'explore'
// The old block was: `) : showMap ? ( <MapComponent ... /> ) : ( <List ... /> )`
// Actually, it was:
/*
) : showMap ? (
  <MapComponent ... />
) : (
  <div className="grid...
*/
// It's safer to just replace `showMap ? ( <MapComponent ... /> ) : (` with `(`
const oldMapBlock = `) : showMap ? (\n                  ${mapCode}\n                ) : (`;
content = content.replace(oldMapBlock, ') : (');

// Wait, the outer `showMap ? Map : List` was actually:
// `filteredLocs.length === 0 ? ( <EmptyState> ) : showMap ? ( <Map> ) : ( <div grid> )`
// If I replace `showMap ? Map : ( ` with just ``, then it becomes `filteredLocs.length === 0 ? ( <EmptyState> ) : ( <div grid> )`.
// Let's test this carefully.
const emptyToMapRegex = /\) : showMap \? \([\s\S]*?<MapComponent[\s\S]*?\/>\s*\) : \(/;
content = content.replace(emptyToMapRegex, ') : (');

// 3. Remove the RIGHT MAP PANEL wrapper on desktop (because we will place the map globally for both).
// Actually, wait, on Desktop, the map should still be on the right!
// If I put it globally, I can use CSS grid or flex to position it on desktop, but it might break layout.
// Let's just create TWO map placeholders? No, leaflet hates that.
// Better: place MapComponent in the `App` flex container, but use CSS to position it absolutely on mobile, and relatively on desktop.

// Let's inject MapComponent before Header.
// But MapComponent needs `currentUser`, `routeItems`, `filteredLocs`, `showRouteOnly`, `focusedLocId`.
// All these are available at the top level of `App()`!

const newMapWrapper = `
      {/* GLOBAL BACKGROUND MAP (Absolute on mobile, relative on desktop) */}
      <div className={cn(
        "z-0 overflow-hidden",
        "fixed inset-0 md:hidden", // Mobile: background
        "hidden" // Wait! If I just hide it on desktop, then where is the desktop map?
      )}>
        ${mapCode.replace(/filteredLocs/g, 'filteredLocs')}
      </div>
`;

// Wait, if I hide it on desktop, I need it to appear on desktop.
// Let's use `react-leaflet` properly. It's better to just keep it where it is on desktop, but move it out on mobile? No, React will unmount it.
// The true Apple way: The map is ALWAYS in the background. Even on desktop!
// Apple Maps on macOS: full screen map, with a floating translucent sidebar!
// Let's make Desktop have a floating sidebar too! That would be amazing!
// "全屏地图 + 悬浮侧边栏"

const appleMacLayout = `
      {/* 🍎 Apple Maps Style: Map is always full screen behind everything */}
      <div className="fixed inset-0 z-0 pointer-events-auto">
        ${mapCode.replace(/filteredLocs/g, 'filteredLocs')}
      </div>
`;

// If Map is always fixed inset-0, then Header and Main need to float over it!
// Header: `fixed top-0 inset-x-0 z-50 ... bg-white/70 backdrop-blur-xl`
// Main: 
// On Mobile: `fixed bottom-0 inset-x-0 h-[85dvh] z-40 bg-white/80 backdrop-blur-3xl rounded-t-[2rem]`
// On Desktop: `fixed top-[80px] left-6 w-[400px] bottom-6 z-40 bg-white/80 backdrop-blur-3xl rounded-3xl shadow-2xl overflow-y-auto no-scrollbar`

content = content.replace('{/* Header */}', appleMacLayout + '\n      {/* Header */}');

// Make Header fixed
content = content.replace(
  '<header className="flex-shrink-0 bg-white/70 backdrop-blur-xl border-b border-white/20 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:h-[calc(4rem+env(safe-area-inset-top))] shadow-[0_2px_10px_rgba(0,0,0,0.02)] z-50 w-full relative gap-3">',
  '<header className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-white/20 flex flex-col md:flex-row items-center justify-between px-4 md:px-8 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:h-[calc(4rem+env(safe-area-inset-top))] shadow-sm z-50 gap-3">'
);

// Update main tag
const mainTagRegex = /<main id="scroll-container-main"[\s\S]*?>/;
content = content.replace(
  mainTagRegex,
  `<main id="scroll-container-main" onScroll={handleScroll} className={cn(
    "z-40 overflow-y-auto no-scrollbar transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
    // Mobile Bottom Sheet
    "fixed bottom-0 left-0 right-0 h-[85dvh] bg-white/80 backdrop-blur-3xl rounded-t-[2rem] p-4 pb-24 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]",
    showMap ? "translate-y-[calc(100%-90px)]" : "translate-y-0",
    // Desktop Floating Sidebar
    "md:top-[calc(4rem+env(safe-area-inset-top)+20px)] md:bottom-6 md:left-6 md:w-[420px] md:h-auto md:translate-y-0 md:rounded-3xl md:shadow-2xl md:border md:border-white/40 md:p-6",
    // Hide default background on desktop since it's now a floating panel
    ""
  )}>`
);

// We need to add a "Handle" for the bottom sheet on mobile
content = content.replace(
  '<aside className="flex flex-col gap-3 flex-shrink-0 pb-4 lg:pb-10 w-full lg:w-[240px] mt-2 md:mt-0">',
  `{/* Mobile Bottom Sheet Handle */}
   <div className="md:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer" onClick={() => setShowMap(!showMap)} />
   
   <aside className="flex flex-col gap-3 flex-shrink-0 pb-4 md:pb-6 w-full mt-2 md:mt-0">`
);

// The `<div className="flex-1 min-w-0 flex flex-col h-full ...` needs to be cleaned up
// Since desktop is now just a 400px panel, we don't need flex-row anymore! The sidebar and list are stacked vertically!
// Let's remove the "hidden md:block w-full ... MapComponent" from the bottom of main.
const rightMapRegex = /\{\/\* RIGHT MAP PANEL \*\/\}[\s\S]*?<MapComponent[\s\S]*?\/>\s*<\/div>/;
content = content.replace(rightMapRegex, '');


fs.writeFileSync(file, content);
console.log("Patched App.tsx for Apple UI successfully!");
