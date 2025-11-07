# Con đường đổi mới - Colyseus Multiplayer

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start the Colyseus server
npm start

# Development mode with auto-reload
npm run dev
```

### Open in Browser

1. Navigate to `http://localhost:3000`
2. Create or join a room
3. Invite friends to play!

## 📁 New File Structure

```
history-sufers/
├── server.js          # ✅ New Colyseus server
├── schema/
│   └── GameState.js            # ✅ State schema definition
├── rooms/
│   └── GameRoom.js             # ✅ Room logic and lifecycle
├── js/
│   └── network-colyseus.js     # ✅ Colyseus client
├── multiplayer-colyseus.html   # ✅ Template using Colyseus
└── COLYSEUS_MIGRATION.md       # ✅ Full migration guide
```

## ✨ Key Features

### Automatic State Synchronization
```javascript
// Server
player.score = 100;  // Automatically synced to all clients!

// Client
room.state.players.onChange((player) => {
  console.log('Player updated:', player.score);  // Auto-called!
});
```

### Built-in Reconnection
```javascript
// Automatic reconnection with state preservation
await networkManager.rejoinRoom(roomId, sessionId);
```

### Schema-based State
```javascript
// Type-safe, efficient binary serialization
export class Player extends Schema {
  @type("string") name;
  @type("number") score;
  @type("boolean") ready;
}
```

## 🎮 Usage Examples

### Create a Room

```javascript
const { roomId, sessionId } = await networkManager.createRoom('PlayerName');
console.log('Room created:', roomId);

// Save for reconnection
sessionStorage.setItem('roomId', roomId);
sessionStorage.setItem('sessionId', sessionId);
```

### Join a Room

```javascript
const { roomId, sessionId } = await networkManager.joinRoom(roomId, 'PlayerName');
console.log('Joined room:', roomId);
```

### Listen to State Changes

```javascript
// Player joined
networkManager.on('playerJoined', (data) => {
  console.log(data.playerName, 'joined!');
});

// Player left
networkManager.on('playerLeft', (data) => {
  console.log(data.playerName, 'left');
});

// Race started
networkManager.on('raceStart', () => {
  console.log('Race started!');
});

// Opponent updated
networkManager.on('opponentUpdate', (data) => {
  updateOpponentPosition(data.sessionId, data.data);
});
```

### Send Updates

```javascript
// Set ready status
networkManager.setReady(true);

// Send position update (during race)
networkManager.sendPlayerUpdate({
  position: { x: 0, y: 0, z: -100 },
  lane: 1,
  score: 500,
  isJumping: false
});

// Send finish
networkManager.sendPlayerFinished(1000);
```

## 🔄 Reconnection Flow

```javascript
// On page load
window.addEventListener('load', async () => {
  const savedSession = sessionStorage.getItem('multiplayerRoom');

  if (savedSession) {
    const { roomId, sessionId } = JSON.parse(savedSession);

    try {
      // Automatic reconnection
      await networkManager.rejoinRoom(roomId, sessionId);
      console.log('✅ Reconnected successfully');
    } catch (error) {
      console.error('❌ Reconnection failed:', error);
      // Redirect to lobby
      window.location.href = 'lobby.html';
    }
  }
});
```

## 📊 Monitoring

Access the Colyseus monitoring dashboard (development only):

```
http://localhost:3000/colyseus
```

View:
- Active rooms
- Connected clients
- Room state
- Server metrics

## 🧪 Testing

### Unit Tests (Coming Soon)
```bash
npm test
```

### Load Testing (Coming Soon)
```bash
npm run load-test
```

### Manual Testing

1. **Single Player Join:**
   - Open browser
   - Create room
   - Verify room created

2. **Multi Player:**
   - Open 2+ browsers
   - All join same room
   - Verify all see each other

3. **Reconnection:**
   - Join room
   - Refresh page
   - Verify automatic rejoin

4. **Race Flow:**
   - All players ready
   - Countdown starts
   - Race begins
   - Players sync in real-time
   - Race ends with rankings

5. **Disconnect Handling:**
   - Player 1 closes tab
   - Race pauses for 10s
   - Player 1 rejoins
   - Race resumes

## 🐛 Debugging

### Enable Verbose Logging

```javascript
// In browser console
window.networkManager.client.consoleLog = true;
```

### Check Connection Status

```javascript
// Get current status
const status = window.networkManager.getStatus();
console.log(status);
/*
{
  connected: true,
  isMultiplayer: true,
  roomId: 'ABC123',
  sessionId: 'xyz789',
  playerName: 'Player1',
  opponentCount: 2
}
*/
```

### Inspect Room State

```javascript
// Get current room state
const state = window.networkManager.room.state;
console.log('Players:', state.players);
console.log('Game State:', state.state);
console.log('Countdown:', state.countdown);
```

## ⚙️ Configuration

### Server Settings

Edit `server.js`:

```javascript
const PORT = process.env.PORT || 3000;
const MAX_PLAYERS_PER_ROOM = 50;
```

### Room Settings

Edit `rooms/GameRoom.js`:

```javascript
export class GameRoom extends Room {
  maxClients = 50;  // Max players per room
  reconnectTimeout = 10;  // Seconds to allow reconnection
}
```

### Client Settings

Edit `js/network-colyseus.js`:

```javascript
// Connection URL
const url = 'ws://localhost:3000';  // Change for production

// Or use current origin
const url = window.location.origin.replace(/^http/, 'ws');
```

## 📦 Dependencies

### Server
- `colyseus` - Multiplayer framework
- `@colyseus/schema` - State schema
- `express` - HTTP server
- `cors` - CORS middleware

### Client
- `colyseus.js` - Colyseus client SDK (CDN)

## 🚀 Deployment

### Heroku

```bash
# Add Procfile
echo "web: node server.js" > Procfile

# Deploy
git push heroku main
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables

```bash
PORT=3000                 # Server port
NODE_ENV=production       # Environment
MAX_PLAYERS=50           # Max players per room
```

## 📚 Resources

- [Colyseus Documentation](https://docs.colyseus.io/)
- [Colyseus Examples](https://github.com/colyseus/colyseus-examples)
- [Colyseus Discord](https://discord.gg/RY8rRS7)
- [Migration Guide](./COLYSEUS_MIGRATION.md)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Test thoroughly
4. Submit pull request

## 📝 License

MIT License - See LICENSE file

---

**Version:** 3.0.0 (Colyseus)
**Last Updated:** November 3, 2025
**Status:** ✅ Ready for Testing
