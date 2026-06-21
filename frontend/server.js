import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, 'dist');
const port = Number(process.env.PORT || 4173);

function resolveBackendUrl() {
  const raw = process.env.VITE_API_URL || process.env.API_URL || '';
  let url = raw.trim().replace(/\/$/, '');
  if (url.endsWith('/api')) {
    url = url.slice(0, -4);
  }
  return url;
}

const backendUrl = resolveBackendUrl();
if (!backendUrl) {
  console.error(
    'Missing VITE_API_URL. Set it on the Railway frontend service to your backend public URL (e.g. https://xxx.up.railway.app).'
  );
  process.exit(1);
}

const proxy = createProxyMiddleware({
  target: backendUrl,
  changeOrigin: true,
});

const app = express();

app.get('/_eddit/config', (_req, res) => {
  res.json({
    apiUrl: backendUrl,
    note: 'Backend URL used by the server proxy. The browser calls /api on this same host.',
  });
});

app.use('/api', proxy);
app.use('/uploads', proxy);
app.use(express.static(distDir));

app.get(/^(?!\/api|\/uploads|\/_eddit).*/, (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Listening on 0.0.0.0:${port}`);
  console.log(`Proxying /api and /uploads -> ${backendUrl}`);
});
