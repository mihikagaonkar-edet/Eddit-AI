import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 4173);

function resolveBackendUrl() {
  // Prefer API_URL — unlike VITE_* vars it is not baked into the browser bundle at build time.
  const raw = process.env.API_URL || process.env.VITE_API_URL || '';
  let url = raw.trim().replace(/\/$/, '');
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  if (!url) return '';

  if (!/^https?:\/\//i.test(url)) {
    const useHttp = /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
    url = `${useHttp ? 'http' : 'https'}://${url}`;
  }

  try {
    new URL(url);
  } catch {
    console.error(`Invalid API_URL: ${raw}`);
    process.exit(1);
  }

  return url;
}

const backendUrl = resolveBackendUrl();
if (!backendUrl) {
  console.error(
    'Missing API_URL. Set it on the Railway frontend service to your backend public URL (e.g. https://xxx.up.railway.app).'
  );
  process.exit(1);
}

const proxy = createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
  // Match full paths — do not mount at app.use('/api', ...) or Express strips the prefix.
  pathFilter: ['/api/**', '/uploads/**'],
  on: {
    error: (err, _req, res) => {
      console.error(`Proxy error (${backendUrl}):`, err.message);
      if (res && !res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Backend unavailable' }));
      }
    },
  },
});

const app = express();

app.get('/_eddit/config', (_req, res) => {
  res.json({
    apiUrl: backendUrl,
    note: 'Backend URL used by the server proxy. The browser calls /api on this same host.',
  });
});

app.use(proxy);
app.use(express.static(distDir));

app.get(/^(?!\/api|\/uploads|\/_eddit).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${port}`);
  console.log(`Proxying /api and /uploads -> ${backendUrl}`);
});
