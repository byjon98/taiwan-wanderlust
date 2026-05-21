const fs = require('fs');
const glob = require('glob'); // wait, glob might not be installed globally. Let's just hardcode the files.

const files = [
  'src/data-1.ts',
  'src/data-2.ts',
  'src/data-3.ts',
  'src/data-4.ts',
  'src/data-extra.ts',
  'src/data.ts'
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function geocode(name, zone) {
  const query1 = `${name} ${zone} 台湾`;
  const url1 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query1)}&format=json&limit=1`;
  
  try {
    const res = await fetch(url1, { headers: { 'User-Agent': 'TaiwanTripApp/1.0' }});
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error(`Error 1: ${e.message}`);
  }
  
  await sleep(1100);
  
  const query2 = `${name} 台湾`;
  const url2 = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query2)}&format=json&limit=1`;
  
  try {
    const res = await fetch(url2, { headers: { 'User-Agent': 'TaiwanTripApp/1.0' }});
    const data = await res.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (e) {
    console.error(`Error 2: ${e.message}`);
  }
  
  await sleep(1100);
  return null;
}

async function processFile(filepath) {
  if (!fs.existsSync(filepath)) return;
  console.log(`Processing ${filepath}...`);
  let content = fs.readFileSync(filepath, 'utf-8');
  
  const regex = /\{\s*n:\s*['"]([^'"]+)['"].*?\}/gs;
  
  let match;
  const updates = [];
  
  while ((match = regex.exec(content)) !== null) {
    const objStr = match[0];
    if (objStr.includes('lat:') && objStr.includes('lng:')) continue;
    
    const name = match[1];
    let zone = '';
    const zoneMatch = objStr.match(/zone:\s*['"]([^'"]+)['"]/);
    if (zoneMatch) zone = zoneMatch[1];
    
    const coords = await geocode(name, zone);
    if (coords) {
      console.log(`  Geocoded: ${name} -> ${coords.lat}, ${coords.lng}`);
      const newObjStr = objStr.replace(`n: '${name}',`, `n: '${name}', lat: ${coords.lat}, lng: ${coords.lng},`).replace(`n: "${name}",`, `n: "${name}", lat: ${coords.lat}, lng: ${coords.lng},`);
      updates.push({ old: objStr, new: newObjStr });
    } else {
      console.log(`  FAILED: ${name}`);
    }
  }
  
  for (const update of updates) {
    content = content.replace(update.old, update.new);
  }
  
  fs.writeFileSync(filepath, content);
}

async function run() {
  for (const file of files) {
    await processFile(file);
  }
  console.log("Done!");
}

run();
