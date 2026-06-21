import fs from 'node:fs';
import path from 'node:path';

const distDir = 'dist';
const raw = process.env.VITE_API_URL || process.env.API_URL || '';
let apiUrl = raw.replace(/\/$/, '');
if (apiUrl.endsWith('/api')) {
  apiUrl = apiUrl.slice(0, -4);
}

const config = { apiUrl };
const configLiteral = JSON.stringify(config);
const inlineScript = `<script>window.__EDDIT_CONFIG__=${configLiteral};</script>`;

fs.writeFileSync(
  path.join(distDir, 'runtime-config.js'),
  `window.__EDDIT_CONFIG__=${configLiteral};\n`
);

const indexPath = path.join(distDir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/\s*<script>window\.__EDDIT_CONFIG__=.*?<\/script>/g, '');
html = html.replace(/\s*<script src="\/runtime-config\.js"><\/script>/g, '');
html = html.replace('<head>', `<head>\n    ${inlineScript}`);

fs.writeFileSync(indexPath, html);
console.log(`Injected API config into ${indexPath} (apiUrl: ${apiUrl || '(empty — set VITE_API_URL)'})`);
