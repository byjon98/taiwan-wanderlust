import re

filepath = 'src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# Fix 1 & 2 & 3: SourceLocs order, custom filter logic, and missing `loc.t`
sourceLocs_replacement = """
    // Reverse custom stores to put newest first
    const mappedCustoms = [...(customStores || [])].reverse().map(c => {
      const detectedRegionId = getRegionIdForZone(c.zone);
      const detectedRegionName = regions.find(r => r.id === detectedRegionId)?.name || '自定义';
      return {
        ...c, 
        t: c.t || c.cuisine || '新添加',
        region: detectedRegionName, 
        regionId: detectedRegionId, 
        isCustom: true
      };
    });
    
    let sourceLocs: any[] = [];
    if (activeRegionId === 'custom') {
      // Show ALL custom stores in the "Newly Added" tab
      sourceLocs = mappedCustoms;
    } else {
      // Show custom stores at the TOP of the "All" tab or specific region tab
      sourceLocs = [...mappedCustoms.filter(c => c.regionId !== 'custom'), ...allLocs];
    }
"""

content = re.sub(r'// Reverse custom stores to put newest first\s*const mappedCustoms = \[\.\.\.\(customStores \|\| \[\]\)\].reverse\(\)\.map\(c => \{\s*const detectedRegionId = getRegionIdForZone\(c\.zone\);\s*const detectedRegionName = regions\.find\(r => r\.id === detectedRegionId\)\?\.name \|\| \'自定义\';\s*return \{\s*\.\.\.c, \s*region: detectedRegionName, \s*regionId: detectedRegionId, \s*isCustom: true\s*\};\s*\}\);\s*let sourceLocs: any\[\] = \[\];\s*if \(activeRegionId === \'custom\'\) \{\s*sourceLocs = mappedCustoms\.filter\(c => c\.regionId === \'custom\'\);\s*\} else \{\s*sourceLocs = \[\.\.\.allLocs, \.\.\.mappedCustoms\.filter\(c => c\.regionId !== \'custom\'\)\];\s*\}', sourceLocs_replacement.strip(), content)


# Fix 4: Dependency array for filteredLocs
content = content.replace("  }, [activeRegion, activeZone, searchQuery, activeFilters, openAtTime]);", "  }, [activeRegionId, activeRegion, activeZone, searchQuery, activeFilters, openAtTime, customStores]);")

# Make sure the dependency array was actually replaced
if "activeRegionId, activeRegion, activeZone, searchQuery, activeFilters, openAtTime, customStores" not in content:
    print("FAILED TO REPLACE DEPENDENCY ARRAY!")


with open(filepath, 'w') as f:
    f.write(content)

