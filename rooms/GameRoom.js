/**
 * Con đường đổi mới - COLYSEUS GAME ROOM
 *
 * Main multiplayer room logic
 */

import pkg from 'colyseus';
const { Room } = pkg;
import { GameState, Player } from '../schema/GameState.js';

// Player color palette
const PLAYER_COLORS = [
  { shirt: 0xff0000, shorts: 0x8b0000 }, // Red
  { shirt: 0x0000ff, shorts: 0x00008b }, // Blue
  { shirt: 0x00ff00, shorts: 0x006400 }, // Green
  { shirt: 0xff00ff, shorts: 0x8b008b }, // Magenta
  { shirt: 0xffa500, shorts: 0xff8c00 }, // Orange
  { shirt: 0x00ffff, shorts: 0x008b8b }, // Cyan
  { shirt: 0xffff00, shorts: 0xcccc00 }, // Yellow
  { shirt: 0xff1493, shorts: 0xc71585 }, // Deep Pink
  { shirt: 0x9370db, shorts: 0x663399 }, // Purple
  { shirt: 0x20b2aa, shorts: 0x008b8b } // Light Sea Green
];

export class GameRoom extends Room {
  maxClients = 50;
  reconnectTimeout = 10; // seconds

  onCreate(options) {
    console.log('🎮 GameRoom created:', this.roomId);

    this.setState(new GameState());
    this.state.maxPlayers = this.maxClients;

    // 🎓 Set classroom mode if specified
    if (options.isClassroomMode === true) {
      this.state.isClassroomMode = true;
      this.state.canReplay = false; // No replay in classroom mode
      console.log('🎓 Classroom mode enabled');
    }

    // Set up message handlers
    this.onMessage('playerReady', (client, message) => {
      this.handlePlayerReady(client, message);
    });

    this.onMessage('playerUpdate', (client, message) => {
      this.handlePlayerUpdate(client, message);
    });

    this.onMessage('playerFinished', (client, message) => {
      this.handlePlayerFinished(client, message);
    });

    // 🎓 NEW: Handle resources loaded
    this.onMessage('resourcesLoaded', (client, message) => {
      this.handleResourcesLoaded(client, message);
    });

    // 🎓 NEW: Handle admin start race (only in classroom mode)
    this.onMessage('startRace', (client, message) => {
      this.handleStartRaceRequest(client, message);
    });

    // Auto-start race when all players are ready (only in normal mode)
    this.state.players.onAdd((player, sessionId) => {
      if (!this.state.isClassroomMode) {
        this.checkAutoStart();
      }
    });
  }

  onJoin(client, options) {
    console.log(`👤 ${options.playerName || 'Player'} joined room ${this.roomId}`);

    // Create player with all default values
    const player = new Player();
    player.name = options.playerName || `Player${this.state.players.size + 1}`;
    player.score = 0;
    player.lane = 0;
    player.posX = 0;
    player.posY = 0;
    player.posZ = -4000;
    player.isJumping = false;
    player.finished = false;
    player.finishTime = 0;
    player.ready = false;
    player.status = 'online';
    player.resourcesLoaded = false;

    // Assign color
    const colorIndex = this.state.players.size % PLAYER_COLORS.length;
    const colors = PLAYER_COLORS[colorIndex];
    player.colorShirt = colors.shirt;
    player.colorShorts = colors.shorts;

    // Set host if first player
    if (this.state.players.size === 0) {
      this.state.hostId = client.sessionId;
      console.log(`👑 ${player.name} is the host`);

      // 🎓 In classroom mode, host is spectator (admin)
      if (this.state.isClassroomMode) {
        player.isSpectator = true;
        console.log('🎓 Host is spectator (admin) in classroom mode');
      }
    }

    this.state.players.set(client.sessionId, player);

    // Send welcome message
    this.broadcast(
      'notification',
      {
        type: 'info',
        title: 'Player Joined',
        message: `${player.name} joined the room (${this.getActualPlayerCount()}/${this.maxClients})`,
        duration: 3000
      },
      { except: client }
    );

    client.send('notification', {
      type: 'success',
      title: 'Welcome!',
      message: `You joined room ${this.roomId}${this.state.isClassroomMode ? ' (Classroom Mode)' : ''}`,
      duration: 3000
    });
  }

  async onLeave(client, consented) {
    const player = this.state.players.get(client.sessionId);

    if (!player) return;

    console.log(`👋 ${player.name} left room ${this.roomId} (consented: ${consented})`);

    if (consented) {
      // Player intentionally left
      this.removePlayer(client.sessionId);
    } else {
      // Player disconnected - allow reconnection
      player.status = 'offline';

      this.broadcast('notification', {
        type: 'warning',
        title: 'Player Disconnected',
        message: `${player.name} disconnected. Waiting for reconnection...`,
        duration: 5000
      });

      // Pause race if in progress
      if (this.state.state === 'racing') {
        this.state.state = 'paused';
        this.broadcast('racePaused', {
          reason: 'player_disconnected',
          playerName: player.name,
          message: `Waiting for ${player.name} to reconnect...`
        });
      }

      try {
        // Wait for reconnection
        await this.allowReconnection(client, this.reconnectTimeout);

        // Player reconnected
        player.status = 'online';
        console.log(`✅ ${player.name} reconnected`);

        this.broadcast('notification', {
          type: 'success',
          title: 'Player Reconnected',
          message: `${player.name} is back!`,
          duration: 3000
        });

        // Resume race if all players are online
        if (this.state.state === 'paused' && this.allPlayersOnline()) {
          this.state.state = 'racing';
          this.broadcast('raceResumed', {
            message: 'All players reconnected! Race resumed.'
          });
        }
      } catch (e) {
        // Reconnection timeout - remove player
        console.log(`⏰ ${player.name} did not reconnect in time`);
        this.removePlayer(client.sessionId);

        // Resume race if it was paused
        if (this.state.state === 'paused') {
          this.state.state = 'racing';
          this.broadcast('raceResumed', {
            message: `Race resumed without ${player.name}`
          });
        }
      }
    }
  }

  onDispose() {
    console.log('🗑️ GameRoom disposed:', this.roomId);
  }

  // Message handlers

  handlePlayerReady(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // 🎓 Spectators (admin in classroom) cannot be ready
    if (player.isSpectator) {
      console.log('🎓 Spectator cannot be ready');
      return;
    }

    player.ready = message.ready;
    console.log(`${player.name} is ${message.ready ? 'ready' : 'not ready'}`);

    const readyCount = this.getReadyCount();
    const totalPlayers = this.getActualPlayerCount();

    this.broadcast('notification', {
      type: 'info',
      title: message.ready ? 'Player Ready' : 'Player Not Ready',
      message: `${player.name} is ${message.ready ? 'ready' : 'not ready'} (${readyCount}/${totalPlayers})`,
      duration: 2000
    });

    // 🎓 In normal mode, check auto-start
    if (!this.state.isClassroomMode) {
      this.checkAutoStart();
    }
  }

  // 🎓 NEW: Handle resources loaded notification
  handleResourcesLoaded(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.isSpectator) return;

    const loaded = message.loaded !== false; // Default to true
    player.resourcesLoaded = loaded;

    if (loaded) {
      console.log(`✅ ${player.name} finished loading resources`);
    } else {
      console.log(`⏳ ${player.name} unloaded resources`);
    }

    const loadedCount = this.getResourcesLoadedCount();
    const totalPlayers = this.getActualPlayerCount();

    if (loaded) {
      this.broadcast('notification', {
        type: 'info',
        title: 'Resources Loaded',
        message: `${player.name} is ready (${loadedCount}/${totalPlayers})`,
        duration: 2000
      });
    }
  }

  // 🎓 NEW: Handle start race request from admin
  handleStartRaceRequest(client, message) {
    // Only host can start
    if (client.sessionId !== this.state.hostId) {
      client.send('notification', {
        type: 'error',
        title: 'Permission Denied',
        message: 'Only the host can start the race',
        duration: 3000
      });
      return;
    }

    // 🎓 In classroom mode, check all players ready and resources loaded
    if (this.state.isClassroomMode) {
      const allReady = this.areAllPlayersReady();
      const allResourcesLoaded = this.areAllResourcesLoaded();

      if (!allReady) {
        client.send('notification', {
          type: 'warning',
          title: 'Not Ready',
          message: 'All players must be ready first',
          duration: 3000
        });
        return;
      }

      if (!allResourcesLoaded) {
        client.send('notification', {
          type: 'warning',
          title: 'Loading Resources',
          message: 'Wait for all players to load resources',
          duration: 3000
        });
        return;
      }
    }

    // Start the race
    this.startRace();
  }

  handlePlayerUpdate(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || this.state.state !== 'racing') return;

    // Update player position and state
    player.posX = message.position?.x ?? player.posX;
    player.posY = message.position?.y ?? player.posY;
    player.posZ = message.position?.z ?? player.posZ;
    player.lane = message.lane ?? player.lane;
    player.isJumping = message.isJumping ?? player.isJumping;
    player.score = message.score ?? player.score;
  }

  handlePlayerFinished(client, message) {
    const player = this.state.players.get(client.sessionId);
    if (!player || player.finished) return;

    player.finished = true;
    player.finishTime = Date.now() - this.state.startTime;
    player.score = message.score || player.score;

    console.log(`🏁 ${player.name} finished with score ${player.score}`);

    this.broadcast('playerFinished', {
      sessionId: client.sessionId,
      playerName: player.name,
      score: player.score,
      time: player.finishTime
    });

    // Check if all players finished
    const allFinished = Array.from(this.state.players.values()).every((p) => p.finished);
    if (allFinished) {
      this.endRace();
    }
  }

  // Helper methods

  checkAutoStart() {
    if (this.state.state !== 'waiting') return;
    if (this.state.players.size < 2) return;

    const allReady = Array.from(this.state.players.values()).every((p) => p.ready);
    if (allReady) {
      this.startRace();
    }
  }

  // 🎓 NEW: Get actual player count (exclude spectators)
  getActualPlayerCount() {
    return Array.from(this.state.players.values()).filter((p) => !p.isSpectator).length;
  }

  // 🎓 NEW: Get ready count (exclude spectators)
  getReadyCount() {
    return Array.from(this.state.players.values()).filter((p) => !p.isSpectator && p.ready).length;
  }

  // 🎓 NEW: Get resources loaded count
  getResourcesLoadedCount() {
    return Array.from(this.state.players.values()).filter(
      (p) => !p.isSpectator && p.resourcesLoaded
    ).length;
  }

  // 🎓 NEW: Check if all players ready (exclude spectators)
  areAllPlayersReady() {
    const actualPlayers = Array.from(this.state.players.values()).filter((p) => !p.isSpectator);
    return actualPlayers.length > 0 && actualPlayers.every((p) => p.ready);
  }

  // 🎓 NEW: Check if all resources loaded (exclude spectators)
  areAllResourcesLoaded() {
    const actualPlayers = Array.from(this.state.players.values()).filter((p) => !p.isSpectator);
    return actualPlayers.length > 0 && actualPlayers.every((p) => p.resourcesLoaded);
  }

  async startRace() {
    if (this.state.state !== 'waiting') return;

    console.log(`🏁 Starting race in room ${this.roomId} with ${this.state.players.size} players`);

    this.state.state = 'countdown';

    // Countdown
    for (let i = 3; i > 0; i--) {
      this.state.countdown = i;
      this.broadcast('raceCountdown', { countdown: i });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    // Start race
    this.state.state = 'racing';
    this.state.startTime = Date.now();
    this.state.countdown = 0;

    // Reset all players
    this.state.players.forEach((player) => {
      player.finished = false;
      player.finishTime = 0;
      player.score = 0;
    });

    this.broadcast('raceStart', {
      startTime: this.state.startTime
    });

    this.broadcast('notification', {
      type: 'success',
      title: 'GO! 🏁',
      message: 'Race has started! Good luck!',
      duration: 2000
    });
  }

  endRace() {
    this.state.state = 'finished';
    console.log(`🏁 Race ended in room ${this.roomId}`);

    // Calculate rankings
    const rankings = Array.from(this.state.players.entries())
      .map(([sessionId, player]) => ({
        rank: 0,
        sessionId: sessionId,
        playerName: player.name,
        score: player.score,
        time: player.finishTime
      }))
      .sort((a, b) => b.score - a.score)
      .map((entry, index) => {
        entry.rank = index + 1;
        return entry;
      });

    this.broadcast('raceEnded', { rankings });

    // Reset after 10 seconds
    setTimeout(() => {
      this.resetRoom();
    }, 10000);
  }

  resetRoom() {
    // 🎓 In classroom mode, don't allow replay
    if (this.state.isClassroomMode) {
      console.log('🎓 Classroom mode: No replay allowed');
      this.broadcast('notification', {
        type: 'info',
        title: 'Race Ended',
        message: 'Classroom mode: Please return to lobby',
        duration: 5000
      });
      return;
    }

    this.state.state = 'waiting';
    this.state.startTime = 0;
    this.state.countdown = 3;

    this.state.players.forEach((player) => {
      player.ready = false;
      player.finished = false;
      player.finishTime = 0;
      player.score = 0;
      player.resourcesLoaded = false;
    });

    this.broadcast('raceReset');
    console.log(`🔄 Room ${this.roomId} reset`);
  }

  removePlayer(sessionId) {
    const player = this.state.players.get(sessionId);
    if (!player) return;

    const playerName = player.name;
    this.state.players.delete(sessionId);

    this.broadcast('notification', {
      type: 'warning',
      title: 'Player Left',
      message: `${playerName} left the room (${this.state.players.size} remaining)`,
      duration: 3000
    });

    // Assign new host if needed
    if (this.state.hostId === sessionId && this.state.players.size > 0) {
      const newHostId = Array.from(this.state.players.keys())[0];
      const newHost = this.state.players.get(newHostId);
      this.state.hostId = newHostId;

      this.broadcast('notification', {
        type: 'info',
        title: 'New Host',
        message: `${newHost.name} is now the room host.`,
        duration: 3000
      });

      console.log(`👑 New host: ${newHost.name}`);
    }
  }

  allPlayersOnline() {
    return Array.from(this.state.players.values()).every((p) => p.status === 'online');
  }
}
