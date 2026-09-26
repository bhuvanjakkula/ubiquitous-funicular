import fs from 'node:fs';

const app = fs.readFileSync('src/static/app.js', 'utf8');
const server = fs.readFileSync('src/server.js', 'utf8');

const fetchRegex = /fetch\(\s*([`'"][^`'"]*[`'"])/g;
let m;
const fetchUrls = new Set();
while ((m = fetchRegex.exec(app)) !== null) {
  fetchUrls.add(m[1].replace(/[`'"]/g, ''));
}

console.log('--- ALL FETCH URLS IN APP.JS ---');
for (const u of Array.from(fetchUrls).sort()) {
  console.log(u);
}

// Extract all event listeners in app.js
console.log('\n--- ALL EVENT LISTENERS IN APP.JS ---');
const listenerRegex = /(?:getElementById\(['"]([^'"]+)['"]\)|querySelector\(['"]([^'"]+)['"]\)|querySelectorAll\(['"]([^'"]+)['"]\))\s*\.\s*addEventListener\(['"]([^'"]+)['"]/g;
let l;
while ((l = listenerRegex.exec(app)) !== null) {
  console.log(`Target: ${l[1] || l[2] || l[3]} | Event: ${l[4]}`);
}

// Also check delegated clicks (e.g. document.addEventListener('click', ...))
const delegatedRegex = /addEventListener\(['"]click['"],\s*(?:async\s*)?\(([^)]*)\)\s*=>\s*\{([\s\S]*?)\n\}\);/g;
let d;
console.log('\n--- DELEGATED CLICK HANDLERS ---');
while ((d = delegatedRegex.exec(app)) !== null) {
  const body = d[2];
  const matches = [...body.matchAll(/classList\.contains\(['"]([^'"]+)['"]\)|matches\(['"]([^'"]+)['"]\)|target\.closest\(['"]([^'"]+)['"]\)/g)];
  for (const match of matches) {
    console.log(`Delegated click checks for: ${match[1] || match[2] || match[3]}`);
  }
}
