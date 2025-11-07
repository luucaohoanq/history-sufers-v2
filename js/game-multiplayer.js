/**
 * Con đường đổi mới - MULTIPLAYER MODE
 */

import { KEYCODE } from '../scripts/keycode.js';
import { WorldMap } from '../scripts/maps.js';
import { MultiplayerStrategy } from '../scripts/network-strategy.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

var networkManager = null;
var gameInitialized = false;
var audioInitialized = false;
var gameStarted = false; // 🔥 NEW: Prevent multiple game starts

/**
 * Auto-reconnect to multiplayer room on page load
 */
async function reconnectToRoom() {
  const roomData = sessionStorage.getItem('multiplayerRoom');

  if (!roomData) {
    console.log('❌ No room data found, redirecting to lobby...');
    window.location.href = 'lobby.html';
    return false;
  }

  try {
    const { roomId, playerId, playerName, players } = JSON.parse(roomData);

    console.log('🔄 Reconnecting to room:', roomId);

    // Đợi network manager khởi tạo
    if (!window.networkManager) {
      console.log('⏳ Waiting for network manager...');
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    networkManager = window.networkManager;

    // Kết nối lại server nếu chưa connect
    if (!networkManager.connected) {
      console.log('🔌 Connecting to server...');
      await networkManager.connect();
    }

    // Rejoin room
    networkManager.socket.emit('rejoinRoom', {
      roomId: roomId,
      playerName: playerName
    });

    // Set lại các thuộc tính
    networkManager.roomId = roomId;
    networkManager.playerName = playerName;
    networkManager.isMultiplayer = true;

    console.log('✅ Reconnected successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to reconnect:', error);
    sessionStorage.removeItem('multiplayerRoom');

    showNotification('Failed to reconnect. Returning to lobby...', 'error');
    setTimeout(() => {
      window.location.href = 'lobby.html';
    }, 2000);

    return false;
  }
}

/**
 * Initialize the multiplayer game
 */
async function initGame() {
  if (gameInitialized) {
    console.warn('⚠️ Game already initialized');
    return;
  }

  console.log('🎮 Initializing multiplayer game...');

  // Step 1: Reconnect to room first
  const reconnected = await reconnectToRoom();
  if (!reconnected) {
    return;
  }

  // Step 2: Setup event handlers
  setupMultiplayerEventHandlers();

  // Step 3: Wait for network to be fully ready
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (networkManager && networkManager.isInMultiplayer()) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);

    // Timeout after 10s
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 10000);
  });

  gameInitialized = true;
  console.log('✅ Game initialization complete');

  // 🔥 Auto-start game vì đã vào multiplayer.html
  // (lobby đã emit raceStart trước khi navigate)
  console.log('🏁 Preparing to start multiplayer race...');
  setTimeout(() => {
    startMultiplayerGame();
  }, 1000); // Đợi 1s để network hoàn toàn ready
}

/**
 * Setup multiplayer event handlers
 */
function setupMultiplayerEventHandlers() {
  if (!networkManager) {
    console.error('❌ Network manager not available');
    return;
  }

  console.log('📡 Setting up multiplayer event handlers...');

  // Listen for room joined event (rejoin confirmation)
  networkManager.on('roomJoined', function (data) {
    console.log('✅ Joined room:', data.roomId);
    showNotification('Reconnected to room: ' + data.roomId, 'success');

    // 🔥 If race is already in progress, start immediately
    if (data.raceInProgress) {
      console.log('🏁 Race already in progress, starting now...');
      setTimeout(() => {
        startMultiplayerGame();
      }, 500);
    }
  });

  // Listen for player joined
  networkManager.on('playerJoined', function (data) {
    console.log('👤 Player joined:', data.playerName || data.name);
    showNotification((data.playerName || data.name) + ' joined the room', 'info');
  });

  // Listen for player left
  networkManager.on('playerLeft', function (data) {
    console.log('👋 Player left:', data.playerId);
    showNotification('A player left the room', 'warning');
  });

  // Listen for countdown
  networkManager.on('raceCountdown', function (data) {
    console.log('⏱️ Countdown:', data.countdown);
    displayCountdown(data.countdown);
  });

  // Note: raceStart event đã được xử lý ở lobby.html
  // Khi vào multiplayer.html, game sẽ tự động start sau reconnect

  // Listen for race ended
  networkManager.on('raceEnded', function (data) {
    console.log('🏁 Race ended:', data.rankings);

    // Play game over music (ONLY once here)
    if (typeof AudioManager !== 'undefined') {
      AudioManager.playGameOver();
    }

    displayRaceResults(data.rankings);
  });

  // Listen for errors
  networkManager.on('error', function (data) {
    console.error('❌ Network error:', data.message);
    showNotification('Error: ' + data.message, 'error');
  });

  // Listen for disconnection
  networkManager.on('disconnected', function () {
    console.log('🔌 Disconnected from server');
    showNotification('Disconnected from server', 'error');

    // Stop audio
    if (typeof AudioManager !== 'undefined') {
      AudioManager.stop();
    }

    // Clean up and redirect
    sessionStorage.removeItem('multiplayerRoom');
    setTimeout(function () {
      window.location.href = 'lobby.html';
    }, 2000);
  });

  console.log('✅ Event handlers registered');
}

/**
 * Display countdown overlay
 */
function displayCountdown(count) {
  var countdownElement = document.getElementById('countdown');
  if (!countdownElement) {
    countdownElement = document.createElement('div');
    countdownElement.id = 'countdown';
    countdownElement.style.cssText =
      'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
      'font-size: 120px; font-weight: bold; color: white; ' +
      'text-shadow: 3px 3px 6px rgba(0,0,0,0.5); z-index: 10000; ' +
      'animation: pulse 0.5s ease-in-out;';
    document.body.appendChild(countdownElement);
  }

  if (count === 0) {
    countdownElement.innerHTML = 'GO!';
    countdownElement.style.color = '#4CAF50';

    // Remove countdown after "GO!"
    setTimeout(() => {
      if (countdownElement && countdownElement.parentNode) {
        countdownElement.parentNode.removeChild(countdownElement);
      }
    }, 1000);
  } else {
    countdownElement.innerHTML = count;
    countdownElement.style.color = '#FFF';
  }
}

/**
 * Start the multiplayer game with network strategy
 */
function startMultiplayerGame() {
  console.log('🎮 Starting multiplayer game...');

  // 🔥 Prevent multiple game starts (audio + world instance)
  if (gameStarted) {
    console.warn('⚠️ Game already started, skipping...');
    return;
  }

  // Prevent multiple world instances
  if (window.currentWorld) {
    console.warn('⚠️ World already exists, skipping...');
    return;
  }

  try {
    // Mark game as started BEFORE doing anything else
    gameStarted = true;

    // Hide game panel
    if (typeof window.hideGamePanel === 'function') {
      window.hideGamePanel();
    } else {
      var panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'none';
    }

    // Hide variable content
    var variableContent = document.getElementById('variable-content');
    if (variableContent) {
      variableContent.style.visibility = 'hidden';
    }

    // Create multiplayer strategy
    const networkStrategy = new MultiplayerStrategy(networkManager);

    // Create world with multiplayer strategy
    const world = new WorldMap(networkStrategy);

    // Store reference globally
    window.currentWorld = world;

    // Show multiplayer HUD
    const multiplayerHud = document.getElementById('multiplayerHud');
    if (multiplayerHud) {
      multiplayerHud.style.display = 'block';
    }

    console.log('✅ Multiplayer game started successfully');
    showNotification('Race started!', 'success');

    // 🎵 Transition audio: intro -> loop (ONLY ONCE)
    if (typeof AudioManager !== 'undefined') {
      var activeAudio = AudioManager._active();

      // Check if loop is already playing
      if (activeAudio.loop) {
        console.log('🎵 Loop already playing, skipping audio transition');
        return; // Don't create another loop
      }

      var activeIntro = activeAudio.intro;

      if (activeIntro && activeIntro.source && activeIntro.source.buffer && activeIntro.startTime) {
        // Intro is playing, wait for it to finish naturally
        var audioCtx = AudioManager._audioCtx();
        var now = audioCtx.currentTime;
        var introDur = activeIntro.source.buffer.duration;
        var playedTime = (now - activeIntro.startTime) % introDur;
        var timeLeft = introDur - playedTime;

        console.log(
          '⏳ Waiting',
          timeLeft.toFixed(2),
          's for intro to finish before starting loop'
        );

        setTimeout(function () {
          // Double check loop is not already playing before transition
          if (!AudioManager._active().loop) {
            AudioManager.play(); // Crossfade intro -> loop
          } else {
            console.log('🎵 Loop started by another call, skipping transition');
          }
        }, timeLeft * 1000);
      } else {
        // No intro or can't calculate, start loop immediately
        console.log('🎵 Starting loop immediately');
        AudioManager.play();
      }
    }
  } catch (error) {
    console.error('❌ Failed to start game:', error);
    showNotification('Failed to start game', 'error');
    gameStarted = false; // Reset flag on error
  }
}

/**
 * Display race results
 */
function displayRaceResults(rankings) {
  if (!rankings || rankings.length === 0) return;

  var resultsHtml =
    '<h2 style="color: #4CAF50;">🏁 Race Results</h2><table style="width: 100%; margin-top: 20px;">';
  resultsHtml += '<tr><th>Rank</th><th>Player</th><th>Score</th></tr>';

  rankings.forEach(function (rank) {
    var rowClass =
      rank.playerId === networkManager.playerId
        ? 'style="background: rgba(76, 175, 80, 0.2);"'
        : '';
    resultsHtml +=
      '<tr ' +
      rowClass +
      '><td>' +
      rank.rank +
      '</td><td>' +
      rank.name +
      '</td><td>' +
      rank.score +
      '</td></tr>';
  });

  resultsHtml += '</table><p style="margin-top: 20px;">Press ESC to return to lobby</p>';

  var variableContent = document.getElementById('variable-content');
  if (variableContent) {
    variableContent.innerHTML = resultsHtml;
    variableContent.style.visibility = 'visible';
  }

  // Listen for ESC key to return to lobby
  document.addEventListener('keydown', function returnToLobby(e) {
    if (e.keyCode === KEYCODE.ESC) {
      // ESC key
      document.removeEventListener('keydown', returnToLobby);

      if (window.currentWorld && typeof window.currentWorld.cleanup === 'function') {
        window.currentWorld.cleanup();
      }

      // Stop audio
      if (typeof AudioManager !== 'undefined') {
        AudioManager.stop();
      }

      // Reset flags
      gameStarted = false;

      sessionStorage.removeItem('multiplayerRoom');
      window.location.href = 'lobby.html';
    }
  });
}

/**
 * Show notification to user
 */
function showNotification(message, type = 'info') {
  // Try using the toast system if available
  if (typeof window.showToast === 'function') {
    window.showToast({
      title: type.toUpperCase(),
      message: message,
      type: type,
      duration: 3000
    });
    return;
  }

  // Fallback notification
  var notification = document.createElement('div');
  notification.style.cssText =
    'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); ' +
    'background: rgba(0,0,0,0.8); color: white; padding: 15px 30px; ' +
    'border-radius: 8px; font-size: 16px; z-index: 10000; ' +
    'animation: fadeInOut 3s ease-in-out;';
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(function () {
    notification.remove();
  }, 3000);

  // Add animation if not exists
  if (!document.getElementById('notification-animation')) {
    var style = document.createElement('style');
    style.id = 'notification-animation';
    style.innerHTML =
      '@keyframes fadeInOut { ' +
      '0% { opacity: 0; transform: translateX(-50%) translateY(-10px); } ' +
      '10% { opacity: 1; transform: translateX(-50%) translateY(0); } ' +
      '90% { opacity: 1; transform: translateX(-50%) translateY(0); } ' +
      '100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } ' +
      '}' +
      '@keyframes pulse { ' +
      '0%, 100% { transform: translate(-50%, -50%) scale(1); } ' +
      '50% { transform: translate(-50%, -50%) scale(1.1); } ' +
      '}';
    document.head.appendChild(style);
  }
}

/**
 * Initialize audio once on page load
 */
function initAudio() {
  if (audioInitialized) {
    console.log('🎵 Audio already initialized');
    return;
  }

  console.log('🎵 Initializing audio...');

  // Initialize audio manager
  if (typeof AudioManager !== 'undefined') {
    AudioManager.init();

    // Preload all audio files
    AudioManager.loadAll()
      .then(function () {
        console.log('✅ Audio loaded successfully');

        // Play intro music ONLY once when entering multiplayer page
        AudioManager.playIntro(); // intro will loop perfectly

        audioInitialized = true;
      })
      .catch(function (e) {
        console.error('❌ Audio preload failed', e);
        // Fallback: audio will be played after user gesture
      });
  }

  // Set up sound toggle button
  var soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    updateSoundButtonUI();

    soundToggleBtn.addEventListener('click', function () {
      AudioManager.toggleMute();
      updateSoundButtonUI();
    });
  }
}

/**
 * Initialize on page load
 */
window.addEventListener('load', function () {
  console.log('🚀 Page loaded, initializing...');

  // Initialize audio ONCE
  initAudio();

  // Start game initialization
  initGame();

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (window.currentWorld && typeof window.currentWorld.cleanup === 'function') {
      window.currentWorld.cleanup();
    }
    if (networkManager && networkManager.isInMultiplayer()) {
      networkManager.leaveRoom();
    }

    // Stop all audio when leaving
    if (typeof AudioManager !== 'undefined') {
      AudioManager.stop();
    }

    // Reset flags
    gameStarted = false;
  });
});

// Call init if DOM already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else if (!gameInitialized) {
  initGame();
}
