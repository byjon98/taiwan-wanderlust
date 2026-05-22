import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# 1. Extract MapComponent
map_match = re.search(r'\{\/\* GLOBAL BACKGROUND MAP \(Apple Maps Style\) \*\/\}\s*<div className="fixed inset-0 z-0 pointer-events-auto">\s*(<MapComponent.*?/>)\s*</div>', content, re.DOTALL)
if not map_match:
    print("Map match failed!")
    exit(1)

map_code = map_match.group(1)

# Remove Global Map
content = content.replace(map_match.group(0), '')

# 2. Revert <main> tag and remove handle
main_pattern = r'<main id="scroll-container-main" onScroll=\{handleScroll\} className=\{cn\([\s\S]*?\}\)>\s*\{\/\* Bottom Sheet Drag Handle \*\/\}\s*<div\s*className="md:hidden w-12 h-1\.5 bg-gray-300 rounded-full mx-auto mb-4 cursor-pointer shrink-0"\s*onClick=\{\(\) => setShowMap\(!showMap\)\}\s*\/>'
content = re.sub(main_pattern, '<main id="scroll-container-main" onScroll={handleScroll} className="flex-1 flex flex-col lg:flex-row gap-4 p-2 md:p-4 lg:p-6 overflow-y-auto no-scrollbar w-full max-w-[1400px] mx-auto pb-20 md:pb-6">', content)

# 3. Re-inject `showMap ? Map : List`
list_pattern = r'\)\s*\)\s*:\s*\(\s*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">'
# wait, the file has:
"""
                    </div>
                  )
                    ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
"""
content = re.sub(
    r'\)\s*\)\s*:\s*\(\s*<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">',
    ') ) : showMap ? ( ' + map_code + ' ) : ( <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">',
    content
)

# 4. Re-inject RIGHT MAP PANEL
# Find the end of section: `</section>\n        </div>\n\n        {/* Bottom Nav for Mobile */}`
right_map_code = f"""</section>
        </div>

        {{/* RIGHT MAP PANEL */}}
        <div className={{cn(
          "hidden md:block w-full relative shrink-0 overflow-hidden rounded-3xl shadow-sm border border-gray-100",
          activeTab === 'explore' ? "md:max-w-[400px] xl:max-w-[500px]" : "md:flex-1",
          activeTab === 'explore' ? "min-h-[500px]" : "min-h-0",
          "h-full"
        )}}>
          {map_code}
        </div>"""

content = re.sub(r'</section>\s*</div>', right_map_code, content, count=1)

with open('src/App.tsx', 'w') as f:
    f.write(content)

print("Reverted Map Layout successfully!")
