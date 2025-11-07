/**
 * Con đường đổi mới - COLYSEUS CLIENT NETWORKING
 *
 * Client-side Colyseus networking for multiplayer functionality
 * Note: Colyseus is loaded via CDN and available as window.Colyseus
 */

class NetworkManager {
  constructor() {
    this.client = null;
    this.room = null;
    this.connected = false;
    this.roomId = null;
    this.sessionId = null;
    this.playerName = 'Player';
    this.opponents = new Map();
    this.eventHandlers = new Map();
    this.isMultiplayer = false;
  }

  /**
   * Connect to the Colyseus server
   */
  async connect(serverUrl = '') {
    try {
      // Check if Colyseus is loaded
      if (typeof window.Colyseus === 'undefined') {
        throw new Error('Colyseus client library not loaded. Make sure to include the CDN script.');
      }

      const url = serverUrl || window.location.origin.replace(/^http/, 'ws');

      // Colyseus CDN exports Client directly, not as Colyseus.Client
      const ColyseusClient = window.Colyseus.Client || window.Colyseus;
      this.client = new ColyseusClient(url);
      console.log('✅ Connected to Colyseus server:', url);
      return true;
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  /**
   * Create a new game room
   */
  async createRoom(playerName, options = {}) {
    if (!this.client) {
      await this.connect();
    }

    this.playerName = playerName || 'Player';

    try {
      this.room = await this.client.create('game_room', {
        playerName: this.playerName,
        mode: 'public',
        isClassroomMode: options.isClassroomMode || false // 🎓 NEW
      });

      this.setupRoom();
      console.log('🎉 Room created:', this.room.id, options.isClassroomMode ? '(Classroom)' : '');

      return {
        roomId: this.room.id,
        sessionId: this.room.sessionId
      };
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      throw error;
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(roomId, playerName) {
    if (!this.client) {
      await this.connect();
    }

    this.playerName = playerName || 'Player';

    try {
      this.room = await this.client.joinById(roomId, {
        playerName: this.playerName
      });

      this.setupRoom();
      console.log('✅ Room joined:', this.room.id);

      return {
        roomId: this.room.id,
        sessionId: this.room.sessionId
      };
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      throw error;
    }
  }

  /**
   * Rejoin a room after disconnect/reload
   */
  async rejoinRoom(roomId, sessionId) {
    if (!this.client) {
      await this.connect();
    }

    try {
      this.room = await this.client.reconnect(roomId, sessionId);
      this.setupRoom();
      console.log('✅ Room rejoined:', this.room.id);

      return {
        roomId: this.room.id,
        sessionId: this.room.sessionId
      };
    } catch (error) {
      console.error('❌ Failed to rejoin room:', error);
      throw error;
    }
  }

  /**
   * Get list of available rooms
   */
  async listRooms() {
    if (!this.client) {
      await this.connect();
    }

    try {
      const rooms = await this.client.getAvailableRooms('game_room');
      console.log('📋 Available rooms:', rooms.length);
      return rooms;
    } catch (error) {
      console.error('❌ Failed to list rooms:', error);
      return [];
    }
  }

  /**
   * Set up room event handlers and state listeners
   */
  setupRoom() {
    if (!this.room) return;

    this.roomId = this.room.id;
    this.sessionId = this.room.sessionId;
    this.connected = true;
    this.isMultiplayer = true;

    // Save session for reconnection
    this._saveSession();

    // Listen to state changes
    this.room.state.players.onAdd((player, sessionId) => {
      console.log('👤 Player added:', player.name);

      if (sessionId !== this.sessionId) {
        this.opponents.set(sessionId, player);
      }

      // 🔥 Listen to individual player property changes
      player.onChange(() => {
        console.log('🔄 Player changed:', player.name, 'ready:', player.ready);
        this.emit('playerStateChanged', {
          sessionId: sessionId,
          player: player
        });
      });

      this.emit('playerJoined', {
        sessionId: sessionId,
        playerName: player.name,
        players: this.getAllPlayers()
      });
    });

    this.room.state.players.onRemove((player, sessionId) => {
      console.log('👋 Player removed:', player.name);
      this.opponents.delete(sessionId);

      this.emit('playerLeft', {
        sessionId: sessionId,
        playerName: player.name,
        players: this.getAllPlayers()
      });
    });

    this.room.state.players.onChange((player, sessionId) => {
      if (sessionId !== this.sessionId) {
        this.opponents.set(sessionId, player);
        this.emit('opponentUpdate', {
          sessionId: sessionId,
          data: player
        });
      }
    });

    // Listen to state changes
    this.room.state.onChange(() => {
      this.emit('stateChanged', this.room.state);
    });

    // Listen to messages
    this.room.onMessage('notification', (message) => {
      console.log('🔔 Notification:', message.message);
      this.emit('notification', message);
    });

    this.room.onMessage('raceCountdown', (message) => {
      console.log('⏱️ Race countdown:', message.countdown);
      this.emit('raceCountdown', message);
    });

    this.room.onMessage('raceStart', (message) => {
      console.log('🏁 Race started');
      this.emit('raceStart', message);
    });

    this.room.onMessage('racePaused', (message) => {
      console.log('🛑 Race paused:', message.reason);
      this.emit('racePaused', message);
    });

    this.room.onMessage('raceResumed', (message) => {
      console.log('▶️ Race resumed');
      this.emit('raceResumed', message);
    });

    this.room.onMessage('playerFinished', (message) => {
      console.log('🏆 Player finished:', message.playerName);
      this.emit('playerFinishedRace', message);
    });

    this.room.onMessage('raceEnded', (message) => {
      console.log('🏁 Race ended');
      this.emit('raceEnded', message);
    });

    this.room.onMessage('raceReset', () => {
      console.log('🔄 Race reset');
      this.opponents.clear();
      this.emit('raceReset');
    });

    // Connection events
    this.room.onLeave((code) => {
      console.log('🔌 Left room with code:', code);
      this.connected = false;
      this.emit('disconnected', { code });
    });

    this.room.onError((code, message) => {
      console.error('❌ Room error:', code, message);
      this.emit('error', { code, message });
    });
  }

  /**
   * Send player ready status
   */
  setReady(ready) {
    if (!this.room) {
      console.error('❌ Not in a room');
      return;
    }
    console.log('✅ Setting ready state:', ready);
    this.room.send('playerReady', { ready: ready });
  }

  /**
   * 🎓 NEW: Notify server that resources are loaded
   */
  sendResourcesLoaded(loaded = true) {
    if (!this.room) {
      console.error('❌ Not in a room');
      return;
    }
    console.log(loaded ? '✅ Sending resources loaded' : '⏳ Sending resources unloaded');
    this.room.send('resourcesLoaded', { loaded: loaded });
  }

  /**
   * 🎓 NEW: Request to start race (admin only in classroom mode)
   */
  requestStartRace() {
    if (!this.room) {
      console.error('❌ Not in a room');
      return;
    }
    console.log('✅ Requesting race start');
    this.room.send('startRace', {});
  }

  /**
   * Send player update during race
   */
  sendPlayerUpdate(data) {
    if (!this.isMultiplayer || !this.room) return;

    this.room.send('playerUpdate', {
      position: data.position,
      lane: data.lane,
      isJumping: data.isJumping,
      score: data.score
    });
  }

  /**
   * Notify server that player finished
   */
  sendPlayerFinished(score) {
    if (!this.isMultiplayer || !this.room) return;
    console.log('🏆 Sending finish with score:', score);
    this.room.send('playerFinished', { score: score });
  }

  /**
   * Leave current room
   */
  async leaveRoom() {
    if (this.room) {
      console.log('🚪 Leaving room:', this.roomId);
      await this.room.leave();
      this.room = null;
      this.roomId = null;
      this.sessionId = null;
      this.opponents.clear();
      this.isMultiplayer = false;
      this._clearSession();
    }
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.room) {
      this.leaveRoom();
    }
    this.client = null;
    this.connected = false;
  }

  /**
   * Register event handler
   */
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }

  /**
   * Unregister event handler
   */
  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get all players (self + opponents)
   */
  getAllPlayers() {
    if (!this.room || !this.room.state) return [];

    return Array.from(this.room.state.players.entries()).map(([sessionId, player]) => ({
      sessionId: sessionId,
      name: player.name,
      score: player.score,
      ready: player.ready,
      finished: player.finished,
      status: player.status,
      isSelf: sessionId === this.sessionId
    }));
  }

  /**
   * Get all opponents
   */
  getAllOpponents() {
    return Array.from(this.opponents.entries()).map(([sessionId, player]) => ({
      id: sessionId,
      sessionId: sessionId,
      playerName: player.name,
      name: player.name,
      score: player.score,
      lane: player.lane,
      position: {
        x: player.posX,
        y: player.posY,
        z: player.posZ
      },
      isJumping: player.isJumping,
      colors: {
        shirt: player.colorShirt,
        shorts: player.colorShorts
      },
      status: player.status
    }));
  }

  /**
   * Get opponent by session ID
   */
  getOpponent(sessionId) {
    const player = this.opponents.get(sessionId);
    if (!player) return null;

    return {
      id: sessionId,
      sessionId: sessionId,
      playerName: player.name,
      name: player.name,
      score: player.score,
      lane: player.lane,
      position: {
        x: player.posX,
        y: player.posY,
        z: player.posZ
      },
      isJumping: player.isJumping,
      colors: {
        shirt: player.colorShirt,
        shorts: player.colorShorts
      },
      status: player.status
    };
  }

  /**
   * Check if in multiplayer mode
   */
  isInMultiplayer() {
    return this.isMultiplayer && this.connected && this.roomId !== null;
  }

  /**
   * Get current connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      isMultiplayer: this.isMultiplayer,
      roomId: this.roomId,
      sessionId: this.sessionId,
      playerName: this.playerName,
      opponentCount: this.opponents.size
    };
  }

  /**
   * Save session to sessionStorage for reconnection
   */
  _saveSession() {
    if (this.roomId && this.sessionId && this.playerName) {
      const sessionData = {
        roomId: this.roomId,
        sessionId: this.sessionId,
        playerName: this.playerName,
        timestamp: Date.now()
      };
      sessionStorage.setItem('multiplayerRoom', JSON.stringify(sessionData));
      console.log('💾 Session saved:', sessionData);
    }
  }

  /**
   * Clear saved session
   */
  _clearSession() {
    sessionStorage.removeItem('multiplayerRoom');
    console.log('🗑️ Session cleared');
  }
}

// Create global instance
if (typeof window !== 'undefined') {
  window.NetworkManager = NetworkManager;
  window.networkManager = new NetworkManager();

  console.log('🚀 NetworkManager (Colyseus) class loaded');
}

// ES6 export for SPA
export { NetworkManager as ColyseusNetworkManager };
