/**
 * Con đường đổi mới - COLYSEUS GAME STATE SCHEMA
 *
 * Defines the synchronized state structure for multiplayer races
 */

import * as schema from '@colyseus/schema';
const { Schema, type, MapSchema } = schema;

/**
 * Player state synchronized across all clients
 */
export class Player extends Schema {
  constructor() {
    super();
    this.name = 'Player';
    this.score = 0;
    this.lane = 0;
    this.posX = 0;
    this.posY = 0;
    this.posZ = -4000;
    this.isJumping = false;
    this.finished = false;
    this.finishTime = 0;
    this.ready = false;
    this.status = 'online';
    this.colorShirt = 0xff0000;
    this.colorShorts = 0x8b0000;
    this.resourcesLoaded = false; // 🎓 Track if player loaded all resources
    this.isSpectator = false; // 🎓 Mark if player is spectator (admin in classroom)
  }
}

type('string')(Player.prototype, 'name');
type('number')(Player.prototype, 'score');
type('number')(Player.prototype, 'lane');
type('number')(Player.prototype, 'posX');
type('number')(Player.prototype, 'posY');
type('number')(Player.prototype, 'posZ');
type('boolean')(Player.prototype, 'isJumping');
type('boolean')(Player.prototype, 'finished');
type('number')(Player.prototype, 'finishTime');
type('boolean')(Player.prototype, 'ready');
type('string')(Player.prototype, 'status'); // 'online', 'offline'
type('number')(Player.prototype, 'colorShirt');
type('number')(Player.prototype, 'colorShorts');
type('boolean')(Player.prototype, 'resourcesLoaded'); // 🎓 NEW
type('boolean')(Player.prototype, 'isSpectator'); // 🎓 NEW

/**
 * Main game room state
 */
export class GameState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.state = 'waiting';
    this.countdown = 3;
    this.startTime = 0;
    this.hostId = '';
    this.maxPlayers = 50;
    this.isClassroomMode = false; // 🎓 NEW: Classroom mode flag
    this.canReplay = true; // 🎓 NEW: Allow replay (false in classroom mode)
  }
}

type({ map: Player })(GameState.prototype, 'players');
type('string')(GameState.prototype, 'state');
type('number')(GameState.prototype, 'countdown');
type('number')(GameState.prototype, 'startTime');
type('string')(GameState.prototype, 'hostId');
type('number')(GameState.prototype, 'maxPlayers');
type('boolean')(GameState.prototype, 'isClassroomMode'); // 🎓 NEW
type('boolean')(GameState.prototype, 'canReplay'); // 🎓 NEW
