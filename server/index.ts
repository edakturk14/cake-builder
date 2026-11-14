import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpret, InterpretationError, validateRequest } from './jev';
import { createTopperImageService, DEFAULT_IMAGE_MODEL, estimateImageCostUsd, TopperImageError } from './topperImages';
import { DEFAULT_TEXT_MODEL, fallbackAttempts } from './fallback';

dotenv.config({ path: '.env.local', quiet: true });
const app = express();
const images = createTopperImageService();
app.disable('x-powered-by');
app.use('/api/topper-image/lookup', (_request, response, next) => {
  response.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '16kb' }));
app.get('/api/health', (_request, response) => {
  dotenv.config({ path: '.env.local', quiet: true });
  const imageModel = process.env.OPENROUTER_IMAGE_MODEL || DEFAULT_IMAGE_MODEL;
  response.json({ ok: true, configured: Boolean(process.env.TYPESAFE_API_KEY), model: process.env.TYPESAFE_MODEL || 'jev-1.14.0',
    imageConfigured: Boolean(process.env.OPENROUTER_API_KEY), imageModel, imageEstimatedCostUsd: estimateImageCostUsd(imageModel),
    textModel: process.env.OPENROUTER_TEXT_MODEL || DEFAULT_TEXT_MODEL, fallbackAttempts });
});
app.post('/api/topper-image/lookup', async (request, response) => {
  response.set('Cache-Control', 'no-store');
  try { response.json(await images.lookup(request.body)); }
  catch (error) {
    const known = error instanceof TopperImageError;
    response.status(known ? error.status : 500).json({ error: known ? error.message : 'Could not check the saved topper preview. Please retry.', status: known ? error.status : 500 });
  }
});
app.post('/api/topper-image', async (request, response) => {
  response.set('Cache-Control', 'no-store');
  dotenv.config({ path: '.env.local', quiet: true });
  try { response.json(await images.generate(request.body)); }
  catch (error) {
    const known = error instanceof TopperImageError;
    response.status(known ? error.status : 500).json({ error: known ? error.message : 'Could not generate the topper preview. Your request is saved; please retry.',
      status: known ? error.status : 500, imageGenerationMs: known ? error.imageGenerationMs : undefined });
  }
});
app.get('/api/topper-image/:assetId', (request, response) => {
  try {
    const file = images.file(request.params.assetId);
    response.set('Cache-Control', 'public, max-age=31536000, immutable');
    // Only file()'s validated 64-hex PNG path may pass the hidden cache directory.
    response.sendFile(file, { dotfiles: 'allow' }, error => { if (error && !response.headersSent) response.set('Cache-Control', 'no-store').status(404).json({ error: 'Topper image not found.', status: 404 }); });
  } catch { response.status(404).json({ error: 'Topper image not found.', status: 404 }); }
});
app.post('/api/interpret', async (request, response) => {
  response.set('Cache-Control', 'no-store');
  try {
    response.json(await interpret(validateRequest(request.body)));
  } catch (error) {
    const known = error instanceof InterpretationError;
    response.status(known ? error.status : 500).json({
      error: known ? error.message : 'The server could not interpret this edit. Please retry.',
      status: known ? error.status : 500,
      providerMs: known ? error.providerMs : undefined,
    });
  }
});
app.use('/api', (_request, response) => response.status(404).json({ error: 'Unknown API route.', status: 404 }));
if (process.env.NODE_ENV === 'production') {
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
  app.use(express.static(dist, { dotfiles: 'deny' }));
  app.get('/{*path}', (request, response, next) => {
    if (request.path.split('/').some(segment => segment.startsWith('.'))) { response.sendStatus(404); return; }
    response.sendFile(path.join(dist, 'index.html'), error => { if (error) next(error); });
  });
}
app.use((error: { status?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  response.status(error.status === 413 ? 413 : 400).json({ error: 'Invalid or oversized JSON request. Please retry.', status: error.status === 413 ? 413 : 400 });
});
const port = Number(process.env.API_PORT || 3001);
const server = app.listen(port, '127.0.0.1', () => {
  const address = server.address();
  console.info(`Cake interpretation server: http://127.0.0.1:${typeof address === 'object' && address ? address.port : port}`);
});
