import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Serves the built frontend (frontend/dist) from the same server as the API,
// so the whole app runs as one process on one port. That is what the desktop
// launcher uses; during development the Vite dev server is still used instead.
//
// Returns true if a built app was found and mounted, false if not (for example
// before `npm run build` has ever been run), in which case nothing changes.
export function mountFrontend(app, dir) {
  const indexFile = path.join(dir, 'index.html');
  if (!existsSync(indexFile)) return false;

  app.use(express.static(dir));

  // Unknown API paths get a JSON 404, never the app shell.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Any other GET is a client-side route: hand it the app shell.
  app.get('*', (req, res) => res.sendFile(indexFile));
  return true;
}
