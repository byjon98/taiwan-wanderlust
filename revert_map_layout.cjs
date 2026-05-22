const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'App.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Extract the Global MapComponent block
const globalMapRegex = /\{\/\* GLOBAL BACKGROUND MAP \(Apple Maps Style\) \*\/\}\s*<div className="fixed inset-0 z-0 pointer-events-auto">\s*(<MapComponent[\s\S]*?onLocClick=\{.*?\}\s*\/>)\s*<\/div>/;
const match = content.match(globalMapRegex);

if (!match) {
  console.error("Global map not found!");
  process.exit(1);
}
const mapCode = match[1];

// Remove global map
content = content.replace(globalMapRegex, '');

// 2. Revert `<main>` classes
const mainTagRegex = /<main id="scroll-container-main"[\s\S]*?>\s*\{\/\* Bottom Sheet Drag Handle \*\/\}\s*<div\s*className="md:hidden w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer shrink-0"\s*onClick=\{\(\) => setShowMap\(!showMap\)\}\s*\/>/;

content = content.replace(mainTagRegex, '<main id="scroll-container-main" onScroll={handleScroll} className="flex-1 flex flex-col lg:flex-row gap-4 p-2 md:p-4 lg:p-6 overflow-y-auto no-scrollbar w-full max-w-[1400px] mx-auto pb-20 md:pb-6">');

// 3. Re-inject `showMap ? Map : List` on mobile
// In the current file, it just says: `) : (\n  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">`
const listRegex = /\)\s*:\s*\(\s*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">/;
content = content.replace(listRegex, `) : showMap ? (
                  ${mapCode}
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">`);

// 4. Re-inject `RIGHT MAP PANEL` at the bottom of the section
// The section ends around line 1500: `</section>\n        </div>\n\n        {/* Bottom Nav for Mobile */}`
// Actually, it's before `</main>` but inside the `flex-1` flex row container.
// Right after `</section>`, there is a closing `</div>`. That `</div>` closes the left/center column container!
// After that `</div>`, we should put the RIGHT MAP PANEL.
const sectionEndRegex = /<\/section>\s*<\/div>/;
const rightMapPanel = `</section>
        </div>

        {/* RIGHT MAP PANEL */}
        <div className={cn(
          "hidden md:block w-full relative shrink-0 overflow-hidden rounded-3xl shadow-sm border border-gray-100",
          activeTab === 'explore' ? "md:max-w-[400px] xl:max-w-[500px]" : "md:flex-1",
          activeTab === 'explore' ? "min-h-[500px]" : "min-h-0",
          "h-full"
        )}>
          ${mapCode}
        </div>`;

content = content.replace(sectionEndRegex, rightMapPanel);

fs.writeFileSync(file, content);
console.log("Successfully reverted Map layout!");
