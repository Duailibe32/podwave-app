import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support image payloads in base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// -------------------------------------------------------------
// API: Fetch External URL to Base64 (CORS helper for Canvas Studio)
// -------------------------------------------------------------
app.post('/api/ai/fetch-url-base64', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return res.status(400).json({ error: 'URL inválida.' });
    }

    const fetched = await fetch(url);
    if (!fetched.ok) {
      return res.status(400).json({ error: `Falha ao carregar imagem externa: ${fetched.statusText}` });
    }

    const contentType = fetched.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await fetched.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    return res.json({ success: true, dataUrl, mimeType: contentType });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro ao converter URL para base64.' });
  }
});

// -------------------------------------------------------------
// Frontend Integration (Vite Middleware in dev / Static in prod)
// -------------------------------------------------------------
async function setupFrontend() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PodWave Server] Servidor ativo na porta ${PORT} (NODE_ENV: ${process.env.NODE_ENV || 'development'})`);
  });
}

setupFrontend().catch((err) => {
  console.error('[PodWave Server] Erro fatal ao iniciar:', err);
  process.exit(1);
});
