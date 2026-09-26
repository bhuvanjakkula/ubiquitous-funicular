import path from 'node:path';
import fs from 'node:fs';

async function start() {
  const possibleServerPaths = [
    './gox-platform/src/server.js',
    '../gox-platform/src/server.js',
    '../../gox-platform/src/server.js',
    './src/server.js',
    '../src/server.js'
  ];
  for (const p of possibleServerPaths) {
    if (fs.existsSync(p)) {
      console.log('Starting GOX server from:', p);
      await import(p);
      return;
    }
  }
  console.error('Could not find gox-platform/src/server.js');
}

start();
