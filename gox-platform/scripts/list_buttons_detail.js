import fs from 'node:fs';

const html = fs.readFileSync('src/static/index.html', 'utf8');

// Find all buttons
const btnRegex = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
let match;
let i = 1;
while ((match = btnRegex.exec(html)) !== null) {
  const attrs = match[1];
  const inner = match[2].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
  console.log(`[Button ${i++}] "${inner}" | Attrs: ${attrs.trim()}`);
}
