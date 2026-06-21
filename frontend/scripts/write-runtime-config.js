import fs from 'node:fs';
import path from 'node:path';

const apiUrl = (process.env.VITE_API_URL || process.env.API_URL || '').replace(/\/$/, '');
const outPath = path.join('dist', 'runtime-config.js');
const contents = `window.__EDDIT_CONFIG__=${JSON.stringify({ apiUrl })};\n`;

fs.writeFileSync(outPath, contents);
console.log(`Wrote ${outPath} (apiUrl: ${apiUrl || '(empty — set VITE_API_URL on Railway frontend)'})`);
