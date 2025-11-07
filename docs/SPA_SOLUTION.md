# Single Page Application (SPA) Solution

## 🎯 Problem Statement

**Root Cause**: Serving two different HTML files (`lobby.html` → `multiplayer-colyseus.html`) causes WebSocket connection loss during page navigation.

When a browser navigates from one page to another:
1. **Old page unloads** → JavaScript context destroyed
2. **WebSocket connection terminates** → Colyseus room disconnects
3. **New page loads** → Must reconnect with `reconnectionToken`
4. **Reconnection issues** → Race conditions, token expiration, room disposal

### Previous Attempted Fixes (Workarounds)
- ✅ Fixed race start timing
- ✅ Fixed Colyseus API usage (reconnectionToken)
- ✅ Fixed auto-dispose (`autoDispose = false`)
- ❌ **But**: All attempts to "fix reconnection" couldn't solve the fundamental issue

---

## ✨ Solution: Single Page Application

**Concept**: Use **ONE HTML file** with **view switching** instead of page navigation.

### Architecture

```
┌─────────────────────────────────────┐
│     multiplayer-spa.html            │
│                                     │
│  ┌───────────┐    ┌──────────────┐ │
│  │ Lobby     │    │ Game View    │ │
│  │ View      │◄──►│              │ │
│  │ (visible) │    │ (hidden)     │ │
│  └───────────┘    └──────────────┘ │
│                                     │
│  WebSocket Connection (persistent)  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
└─────────────────────────────────────┘
```

### How It Works

1. **Single HTML file** contains both lobby UI and game UI
2. **View switching** using CSS `display: none/block`
3. **WebSocket persists** throughout entire session
4. **No page navigation** = No connection loss

---

## 📁 File Structure

### New Primary File
- `multiplayer-spa.html` - **Main entry point** (SPA with lobby + game)

### Reference Files (Legacy)
- `lobby.html` - Original lobby (kept for reference)
- `multiplayer-colyseus.html` - Original game page (kept for reference)

### Server Configuration
```javascript
// server.js
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'multiplayer-spa.html')); // ← SPA
});
```

---

## 🔧 Implementation Details

### View Management

```javascript
// Two main views
<div id="lobbyView" class="view active">
  <!-- Lobby UI: Create/Join/Browse Rooms -->
</div>

<div id="gameView" class="view">
  <!-- Game UI: Three.js, HUD, Stats -->
</div>

// Switch views WITHOUT navigation
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(viewId).classList.add('active');
}
```

### Network Event Flow

```javascript
// ❌ OLD: Navigate on race start
networkManager.on('raceStart', () => {
  window.location.href = 'multiplayer-colyseus.html'; // Connection lost!
});

// ✅ NEW: Switch view on race start
networkManager.on('raceStart', () => {
  switchView('gameView'); // Connection persists!
  setTimeout(() => initMultiplayerGame(), 100);
});
```

### WebSocket Lifecycle

```
┌──────────────────────────────────────────────┐
│ SPA Lifecycle (Single Page)                 │
├──────────────────────────────────────────────┤
│ 1. Page loads → Connect to Colyseus         │
│ 2. Join room → WebSocket established        │
│ 3. Race starts → Switch view (NO navigate)  │
│ 4. Race ends → Switch back to lobby view    │
│ 5. Leave room → Disconnect (intentional)    │
└──────────────────────────────────────────────┘

WebSocket: ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           ^ Connected throughout entire session
```

---

## 🎮 User Flow

### 1. Initial Load
```
User visits http://localhost:3000
  ↓
multiplayer-spa.html loads
  ↓
Connect to Colyseus server
  ↓
Show lobby view (mode selection)
```

### 2. Create/Join Room
```
User clicks "Create Room"
  ↓
Call networkManager.createRoom()
  ↓
Show waiting room (still in lobby view)
  ↓
WebSocket: ━━━━━━━━━ (connected)
```

### 3. Race Start
```
Host clicks "Start Race"
  ↓
Server emits 'raceStart' event
  ↓
Client receives event
  ↓
switchView('gameView') ← NO NAVIGATION!
  ↓
Initialize Three.js game
  ↓
WebSocket: ━━━━━━━━━ (still connected)
```

### 4. Race End
```
Race finishes
  ↓
Server emits 'raceEnded' with rankings
  ↓
Display results overlay
  ↓
User clicks "Back to Lobby"
  ↓
switchView('lobbyView')
  ↓
WebSocket: ━━━━━━━━━ (still connected)
```

---

## ✅ Benefits

### 1. **Zero Reconnection Issues**
- No page navigation = No connection loss
- No reconnectionToken expiration
- No race conditions

### 2. **Instant View Transitions**
- No HTTP requests
- No page reload delay
- Smooth UX

### 3. **Simplified Code**
- No reconnection logic needed
- No session storage management
- Fewer edge cases

### 4. **Better Performance**
- No redundant server requests
- Keep game assets in memory
- Faster navigation

---

## 🚀 Testing Guide

### Test Scenario 1: Create Room Flow
```bash
# Terminal 1: Start server
npm run dev

# Browser 1: Host
1. Visit http://localhost:3000
2. Click "Nhiều người chơi"
3. Click "Tạo phòng"
4. Enter name → Create room
5. Copy room ID
6. Check ready → Start race

# Browser 2: Guest
1. Visit http://localhost:3000
2. Click "Nhiều người chơi"
3. Click "Tham gia phòng"
4. Enter name + room ID → Join
5. Check ready
6. Wait for host to start

# Expected Result:
✅ Both players seamlessly switch to game view
✅ Race countdown starts
✅ Game renders correctly
✅ No disconnection errors
✅ Race completes with rankings
```

### Test Scenario 2: Network Stability
```bash
# Open browser console (F12)
1. Join a room
2. Watch WebSocket connection status
3. Start race
4. Verify: WebSocket stays connected (no reconnect logs)
5. Complete race
6. Return to lobby
7. Verify: Same WebSocket connection ID
```

### Test Scenario 3: Multiple Races
```bash
1. Create room with 4 players
2. Complete race #1
3. Return to lobby (all players)
4. Start race #2 immediately
5. Verify: No connection issues
```

---

## 🐛 Debugging

### Check WebSocket Connection
```javascript
// Browser console
console.log('Connected:', networkManager.connected);
console.log('Room:', networkManager.room?.id);
console.log('Session:', networkManager.sessionId);
```

### Monitor View State
```javascript
// Check active view
document.querySelector('.view.active')?.id
// Should be: 'lobbyView' or 'gameView'
```

### Verify Event Listeners
```javascript
// Check registered events
networkManager.events
```

---

## 📊 Comparison: Old vs New

| Aspect | Old (Multi-Page) | New (SPA) |
|--------|-----------------|-----------|
| **Files** | lobby.html + multiplayer-colyseus.html | multiplayer-spa.html |
| **Navigation** | `window.location.href` | `switchView()` |
| **WebSocket** | Disconnects on navigation | Persists throughout |
| **Reconnection** | Required (with token) | Not needed |
| **Complexity** | High (race conditions) | Low (simple view toggle) |
| **Performance** | Slower (HTTP requests) | Faster (instant) |
| **UX** | Page reload visible | Seamless transition |

---

## 🔮 Future Enhancements

### Potential Improvements
1. **Lobby Chat**: Add real-time chat in waiting room
2. **Spectator Mode**: Let disconnected players watch
3. **Race Replays**: Store and replay races
4. **Leaderboards**: Integrate with existing stats system
5. **Matchmaking**: Auto-join best available room

### Advanced Features
```javascript
// Room chat example
networkManager.on('chatMessage', (data) => {
  appendChatMessage(data.playerName, data.message);
});

// Spectator mode
function watchRace(roomId) {
  networkManager.spectate(roomId);
  switchView('gameView');
}
```

---

## 📝 Migration Checklist

For developers updating from old system:

- [x] Create `multiplayer-spa.html` with both views
- [x] Update `server.js` to serve SPA as default
- [x] Implement view switching logic
- [x] Handle `raceStart` event with view switch (no navigation)
- [x] Test full flow: create → join → race → results → lobby
- [x] Remove old `window.location.href` calls
- [x] Update README with new instructions
- [ ] Optional: Remove old files after verification

---

## 🎓 Key Takeaways

### The Problem Was Architectural
- **Not a bug**: Browser WebSocket behavior is correct
- **Design flaw**: Multi-page design incompatible with persistent connections
- **Solution**: Single Page Application pattern

### Why SPA Works
1. **Single JavaScript Context**: No unload/reload
2. **Persistent Connection**: WebSocket never terminates
3. **State Preservation**: Variables stay in memory
4. **Clean Event Flow**: No race conditions

### Lesson Learned
> "Sometimes the solution isn't fixing the bug—it's changing the architecture that created the bug in the first place."

---

## 📚 References

- [Colyseus Documentation](https://docs.colyseus.io/)
- [WebSocket API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Single Page Applications - Wikipedia](https://en.wikipedia.org/wiki/Single-page_application)

---

**Status**: ✅ Implemented and ready for testing

**Last Updated**: 2024

**Author**: Con đường đổi mới Team
