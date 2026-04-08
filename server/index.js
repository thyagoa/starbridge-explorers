'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');

const {
  createSession,
  getSession,
  joinSession,
  removePlayer,
  broadcast,
  gameStateSnapshot,
  handleMessage,
} = require('./session');

const { MAP_SYSTEMS, MAP_ROUTES } = require('./mission1');

const PORT = process.env.PORT || 3000;

// ─── Express app ───────────────────────────────────────────────────────────

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Landing page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Station pages — serve the same index.html per station; client reads URL to determine role
app.get('/captain/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'captain', 'index.html'));
});
app.get('/helm/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'helm', 'index.html'));
});
app.get('/engineering/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'engineering', 'index.html'));
});
app.get('/viewscreen/:code', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'viewscreen', 'index.html'));
});

// REST: create new session
app.post('/api/sessions', (req, res) => {
  const session = createSession();
  res.json({ code: session.code });
});

// REST: get map data for a session
app.get('/api/sessions/:code/map', (req, res) => {
  const session = getSession(req.params.code.toUpperCase());
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json({ systems: MAP_SYSTEMS, routes: MAP_ROUTES });
});

// REST: generate QR code for a URL
app.get('/api/qr', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 1 });
    res.json({ dataUrl });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ─── HTTP + WebSocket server ───────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  // Parse role and code from URL path: /ws/<role>/<code>
  const parts = req.url.split('/').filter(Boolean);
  // Expected: ['ws', role, code]
  if (parts.length < 3 || parts[0] !== 'ws') {
    ws.close(1008, 'Invalid WS path');
    return;
  }

  const role = parts[1].toLowerCase();
  const code = parts[2].toUpperCase();

  const session = getSession(code);
  if (!session) {
    ws.send(JSON.stringify({ type: 'error', reason: 'Session not found' }));
    ws.close(1008, 'Session not found');
    return;
  }

  const result = joinSession(session, role, ws);
  if (!result.ok) {
    ws.send(JSON.stringify({ type: 'error', reason: result.reason }));
    ws.close(1008, result.reason);
    return;
  }

  // Confirm role assignment + send current game state
  ws.send(JSON.stringify({
    type: 'role_assigned',
    role,
    code,
    mapData: { systems: MAP_SYSTEMS, routes: MAP_ROUTES },
    ...gameStateSnapshot(session),
  }));

  // Notify everyone of updated connected roles
  broadcast(session, { type: 'players_update', connectedRoles: Object.keys(session.players) });

  ws.on('message', (raw) => {
    handleMessage(session, role, raw.toString());
  });

  ws.on('close', () => {
    const removedRole = removePlayer(session, ws);
    if (removedRole) {
      broadcast(session, { type: 'players_update', connectedRoles: Object.keys(session.players) });
    }
  });
});

// ─── Start ─────────────────────────────────────────────────────────────────

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Starbridge Explorers running at http://localhost:${PORT}`);
  });
}

module.exports = { app, server, wss };
