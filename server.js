/**
 * Con đường đổi mới - COLYSEUS MULTIPLAYER SERVER
 *
 * Node.js + Colyseus server for real-time multiplayer racing
 */

import express from 'express';
import { createServer } from 'http';
import pkg from 'colyseus';
const { Server } = pkg;
import monitorPkg from '@colyseus/monitor';
const { monitor } = monitorPkg;
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { GameRoom } from './rooms/GameRoom.js';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS) || 50;

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Default route - serve SPA (Single Page Application)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'multiplayer-spa.html'));
});

// Keep old lobby.html accessible for reference
app.get('/lobby', (req, res) => {
  res.sendFile(path.join(__dirname, 'lobby.html'));
});

// HTTP server
const httpServer = createServer(app);

// Colyseus server
const gameServer = new Server({
  server: httpServer,
  express: app
});

// Register game room
gameServer.define('game_room', GameRoom).filterBy(['mode']).enableRealtimeListing();

// Optional: Colyseus monitoring panel (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use('/colyseus', monitor());
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    rooms: gameServer?.rooms?.size || 0,
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM
  });
});

// API endpoint for server info
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Con đường đổi mới Multiplayer Server',
    version: '3.0.0',
    engine: 'Colyseus',
    maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    activeRooms: gameServer?.rooms?.size || 0
  });
});

// Start server
gameServer.listen(PORT);
console.log(`🚀 Con đường đổi mới server is running on http://localhost:${PORT}`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await gameServer.gracefullyShutdown();
  process.exit(0);
});
