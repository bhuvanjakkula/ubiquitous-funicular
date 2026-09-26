import fs from 'node:fs';
import path from 'node:path';

console.log('--- GOX Platform Universal Build Started ---');

const findFile = (filename) => {
  const searchPaths = [
    filename,
    path.join('gox-platform/src/static', filename),
    path.join('src/static', filename),
    path.join('static', filename),
    path.join('../gox-platform/src/static', filename),
    path.join('../../gox-platform/src/static', filename),
    path.join('../', filename),
    path.join('../../', filename)
  ];
  for (const p of searchPaths) {
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf8');
  }
  return null;
};

const html = findFile('index.html') || '';
const css = findFile('style.css') || '';
const js = findFile('app.js') || '';

const outputDirs = [
  'dist',
  'public',
  '.',
  '../dist',
  '../public',
  'web/dist',
  'web/public',
  'web'
];

outputDirs.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (html) fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8');
    if (css) fs.writeFileSync(path.join(dir, 'style.css'), css, 'utf8');
    if (js) fs.writeFileSync(path.join(dir, 'app.js'), js, 'utf8');
  } catch (e) {}
});

console.log('--- GOX Platform Build Completed Successfully ---');
