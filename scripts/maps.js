import * as THREE from 'three';
import {
  BallotBox,
  BribeEnvelope,
  LowBarrier,
  CapitalistExpress,
  CorruptedThrone,
  HammerAndSickle,
  MisbalancedScale,
  PuppetManipulation,
  ReformGears,
  RuleOfLawState,
  Tree,
  UnityHands,
  HighBarrier,
  VillageHut,
  BambooTree,
  WaterBuffalo,
  RiceStorage,
  CropField,
  OldFactory,
  House,
  FiveGTower,
  MetroStation,
  Skyscraper,
  Company
} from '../js/object.js';
import { Character } from './characters.js';
import {
  CAMERA_SETTING_LIVE,
  CAMERA_SETTINGS,
  DUONG_CHAY,
  DUONG_DAT,
  DUONG_GACH,
  GAME_CONSTANTS,
  SIDE_OBJECTS_BY_STAGE,
  SIDEWALK_LEFT_CHAY,
  SIDEWALK_LEFT_DAT,
  SIDEWALK_LEFT_GACH,
  SIDEWALK_RIGHT_CHAY,
  SIDEWALK_RIGHT_DAT,
  SIDEWALK_RIGHT_GACH
} from './constants.js';
import { KEYCODE } from './keycode.js';
import { SinglePlayerStrategy, MultiplayerStrategy } from './network-strategy.js';

let cameraModes = ['NORMAL', 'NGANG', 'LIVE', 'HARD_CORE'];
let currentCameraIndex = 0;

export function WorldMap(networkStrategy = null) {
  // Explicit binding of this even in changing contexts.
  var self = this;

  // Scoped variables in this world.
  var element,
    scene,
    camera,
    character,
    renderer,
    light,
    objects,
    paused,
    keysAllowed,
    score,
    difficulty,
    gameOver;

  // LIVE camera override state (when player presses UP/DOWN)
  var cameraLiveOverride = null; // 'UP' | 'DOWN' | null
  var cameraLiveOverrideTimer = null;

  // ===== BUFF STATS =====
  var playerStats = {
    trust: 50,
    justice: 50,
    unity: 50
  };

  var opponents = new Map();

  // ===== SPAWN CONTROL =====
  var rowCounter = 0;
  var lastDeadlySpawn = 0;
  var lastBuffSpawn = 0;
  var lastSideObjectSpawn = 0;
  var minRowsBetweenDeadly = 5;
  var minRowsBetweenBuff = 3;
  var minRowsBetweenSideObject = 1;
  var lastSafeLane = 0;
  var DEBUG_HITBOX = false;

  // ===== DIFFICULTY SCALING =====
  var gameSpeed = 75; // Initial speed
  var deadlySpawnChance = 0.3; // Initial 30%
  var buffSpawnChance = 0.4; // Initial 40%
  var minScale = 2; // Minimum scale for tree spawning
  var maxScale = 4; // Maximum scale for tree spawning

  // Use strategy pattern for network
  var network = networkStrategy || new SinglePlayerStrategy();
  var opponents = new Map();

  const GROUNDS = {
    1: {
      main: DUONG_DAT,
      leftSidewalk: SIDEWALK_LEFT_DAT,
      rightSidewalk: SIDEWALK_RIGHT_DAT
    },
    2: {
      main: DUONG_GACH,
      leftSidewalk: SIDEWALK_LEFT_GACH,
      rightSidewalk: SIDEWALK_RIGHT_GACH
    },
    3: {
      main: DUONG_CHAY,
      leftSidewalk: SIDEWALK_LEFT_CHAY,
      rightSidewalk: SIDEWALK_RIGHT_CHAY
    }
  };

  // Đường hiện tại đang active trong scene
  let activeGround = null;
  let activeSidewalks = { left: null, right: null };
  let groundStage = 1;

  // Initialize the world.
  init();

  /**
   * Builds the renderer, scene, lights, camera, and the character,
   * then begins the rendering loop.
   */
  function init() {
    try {
      // Locate where the world is to be located on the screen.
      element = document.getElementById('world');

      // Initialize the renderer.
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
      });
      renderer.setSize(element.clientWidth, element.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      element.appendChild(renderer.domElement);

      // Initialize the scene.
      scene = new THREE.Scene();
      // fogDistance = 40000;
      // scene.fog = new THREE.Fog(0xbadbe4, 1, fogDistance);

      // Initialize the camera with field of view, aspect ratio,
      // near plane, and far plane.
      camera = new THREE.PerspectiveCamera(
        60,
        element.clientWidth / element.clientHeight,
        1,
        120000
      );
      // Initial camera position
      camera.position.set(
        CAMERA_SETTINGS.NGANG.x,
        CAMERA_SETTINGS.NGANG.y,
        CAMERA_SETTINGS.NGANG.z
      );
      camera.lookAt(new THREE.Vector3(0, 600, -5000));

      // After 2s, transition back to NORMAL
      setTimeout(() => {
        setCameraPosition(CAMERA_SETTINGS.NORMAL, 1500);
      }, 2000);
      window.camera = camera;

      // Set up resizing capabilities.
      window.addEventListener('resize', handleWindowResize, false);

      // Initialize the lights.
      light = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
      scene.add(light);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
      scene.add(ambientLight);

      // Initialize the character and add it to the scene.
      character = new Character();
      scene.add(character.element);

      // Xử lý repeat cho các loại ground/sidewalk/curb phù hợp với kích thước thực tế
      [
        DUONG_DAT, DUONG_GACH, DUONG_CHAY,
        SIDEWALK_LEFT_DAT, SIDEWALK_LEFT_GACH, SIDEWALK_LEFT_CHAY,
        SIDEWALK_RIGHT_DAT, SIDEWALK_RIGHT_GACH, SIDEWALK_RIGHT_CHAY,
      ].forEach((g) => {
        if (g?.material?.map) {
          g.material.map.wrapS = THREE.RepeatWrapping;
          g.material.map.wrapT = THREE.RepeatWrapping;
          g.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200);
        }
      });

      groundStage = 0;
      activeGround = null;
      switchGround(1);

      const background = new THREE.TextureLoader().load('../assets/xp.jpg');
      scene.background = background;

      objects = [];
      for (var i = 10; i < 40; i++) {
        createRowOfObjects(i * -3000);
      }

      gameOver = false;
      paused = true;

      keysAllowed = {};
      document.addEventListener('keydown', function (e) {
        if (!gameOver) {
          var key = e.keyCode;
          if (keysAllowed[key] === false) return;
          keysAllowed[key] = false;

          if (paused && !collisionsDetected() && key > 18) {
            paused = false;
            character.onUnpause();
            document.getElementById('variable-content').style.visibility = 'hidden';
            // document.getElementById('controls').style.display = 'none';

            const panel = document.getElementById('gamePanel');
            if (panel) {
              panel.style.display = 'none';
            }

            // Start playing background music when game starts
            AudioManager.play();
          } else {
            if (key == KEYCODE.ESC) {
              paused = true;
              character.onPause();
              document.getElementById('variable-content').style.visibility = 'visible';
              document.getElementById('variable-content').innerHTML =
                '<h2>PAUSED</h2><p>Nhấn phím bất kỳ để tiếp tục.</p>';
              document.getElementById('controls').style.display = 'block';

              // Pause music when game is paused
              AudioManager.pause();
            }
            if (key == KEYCODE.UP && !paused) {
              character.onUpKeyPressed();

              if (currentCameraIndex === 2) {
                // apply UP preset and set a short-lived override so per-frame logic respects it
                const live = CAMERA_SETTING_LIVE;
                // Dùng currentLane thay vì position.x để tránh timing issue
                const currentX = character.currentLane * 800;

                const target = {
                  x: currentX,
                  y: live.UP.y,
                  z: live.UP.z,
                  lookAt: { x: currentX, y: live.UP.lookAt.y, z: live.UP.lookAt.z }
                };
                setCameraPosition(target, 200);

                // cameraLiveOverride = 'UP';
                // if (cameraLiveOverrideTimer) clearTimeout(cameraLiveOverrideTimer);
                // cameraLiveOverrideTimer = setTimeout(() => {
                //   cameraLiveOverride = null;
                //   cameraLiveOverrideTimer = null;
                // }, CAMERA_LIVE_OVERRIDE_MS);
              }
            }
            if (key == KEYCODE.LEFT && !paused) {
              character.onLeftKeyPressed();

              // moving lanes should clear any UP/DOWN override so LIVE mode follows lane again
              if (cameraLiveOverrideTimer) {
                clearTimeout(cameraLiveOverrideTimer);
                cameraLiveOverrideTimer = null;
              }
              cameraLiveOverride = null;

              if (currentCameraIndex === 2) {
                const live = CAMERA_SETTING_LIVE;
                const targetLane = Math.max(character.currentLane - 1, -1);
                const targetX = targetLane * 800; // mỗi lane cách nhau 800 units

                const target = {
                  x: targetX,
                  y: live.CENTER.y,
                  z: live.CENTER.z,
                  lookAt: { x: targetX, y: live.CENTER.lookAt.y, z: live.CENTER.lookAt.z }
                };
                setCameraPosition(target, 200);
              }
            }
            if (key == KEYCODE.RIGHT && !paused) {
              character.onRightKeyPressed();

              if (cameraLiveOverrideTimer) {
                clearTimeout(cameraLiveOverrideTimer);
                cameraLiveOverrideTimer = null;
              }
              cameraLiveOverride = null;

              if (currentCameraIndex === 2) {
                const live = CAMERA_SETTING_LIVE;
                const targetLane = Math.min(character.currentLane + 1, 1);
                const targetX = targetLane * 800;

                const target = {
                  x: targetX,
                  y: live.CENTER.y,
                  z: live.CENTER.z,
                  lookAt: { x: targetX, y: live.CENTER.lookAt.y, z: live.CENTER.lookAt.z }
                };
                setCameraPosition(target, 200);
              }
            }
            if (key == KEYCODE.DOWN && !paused) {
              character.onDownKeyPressed();
              // AudioManager.playSoundEffect('sounds/siu.mp3');

              if (currentCameraIndex === 2) {
                const live = CAMERA_SETTING_LIVE;
                // Dùng currentLane thay vì position.x để tránh timing issue
                const currentX = character.currentLane * 800;

                const target = {
                  x: currentX,
                  y: live.DOWN.y,
                  z: live.DOWN.z,
                  lookAt: { x: currentX, y: live.DOWN.lookAt.y, z: live.DOWN.lookAt.z }
                };
                setCameraPosition(target, 200);
              }
            }
            if (key === KEYCODE.V && !paused) {
              currentCameraIndex = (currentCameraIndex + 1) % cameraModes.length;
              const mode = cameraModes[currentCameraIndex];
              setCameraPosition(CAMERA_SETTINGS[mode], 400); // faster switch
            }

            if (key === KEYCODE.P && !paused) {
              character.nextSkin();
            }
            if (key === KEYCODE.B && !paused) {
              DEBUG_HITBOX = !DEBUG_HITBOX;
              console.log('Object DEBUG_HITBOX toggled:', DEBUG_HITBOX ? 'ON' : 'OFF');
            }
          }
        }
      });
      document.addEventListener('keyup', function (e) {
        keysAllowed[e.keyCode] = true;
      });
      document.addEventListener('focus', function (e) {
        keysAllowed = {};
      });

      // Initialize the scores and difficulty.
      score = 0;
      difficulty = 0;
      document.getElementById('score').innerHTML = score;

      network.init();

      // Setup network callbacks nếu là multiplayer
      if (network.isMultiplayer) {
        setupMultiplayerCallbacks();
      }

      // Begin the rendering loop.
      loop();
    } catch (err) {
      console.error('World init failed', err);
      // fail-safe: show pause panel so user sees something instead of blank
      const panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'block';
      return;
    }
  }

  function setupMultiplayerCallbacks() {
    // Callbacks từ network strategy
    network.onPlayerJoined = function (data) {
      addOpponent(data);
    };

    network.onPlayerLeft = function (data) {
      removeOpponent(data.playerId);
    };

    network.onOpponentUpdate = function (playerId, data) {
      updateOpponent(playerId, data);
    };

    network.onRaceStart = function (data) {
      console.log('Race started!');
      paused = false;
      character.onUnpause();
      AudioManager.play();

      // Add all existing players
      data.players.forEach(function (player) {
        if (player.id !== network.networkManager.playerId) {
          addOpponent(player);
        }
      });
    };

    network.onRaceEnded = function (data) {
      AudioManager.stop();
      displayRaceResults(data.rankings);
    };

    network.onRaceCountdown = function (data) {
      displayCountdown(data.countdown);
    };
  }

  function addOpponent(playerData) {
    if (opponents.has(playerData.id)) return;

    var opponent = new Character(playerData.colors);
    opponent.playerName = playerData.name;
    scene.add(opponent.element);
    opponents.set(playerData.id, opponent);
  }

  function updateOpponent(playerId, data) {
    var opponent = opponents.get(playerId);
    if (!opponent) return;

    if (data.position) {
      opponent.element.position.set(data.position.x, data.position.y, data.position.z);
    }
    if (data.lane !== undefined) opponent.currentLane = data.lane;
    if (data.isJumping !== undefined) opponent.isJumping = data.isJumping;
  }

  function removeOpponent(playerId) {
    var opponent = opponents.get(playerId);
    if (opponent) {
      scene.remove(opponent.element);
      opponents.delete(playerId);
    }
  }

  function displayCountdown(count) {
    var countdownElement = document.getElementById('countdown');
    if (!countdownElement) {
      countdownElement = document.createElement('div');
      countdownElement.id = 'countdown';
      countdownElement.style.cssText =
        'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); ' +
        'font-size: 120px; font-weight: bold; color: white; ' +
        'text-shadow: 3px 3px 6px rgba(0,0,0,0.5); z-index: 1000;';
      document.body.appendChild(countdownElement);
    }
    countdownElement.innerHTML = count;
  }

  function displayRaceResults(rankings) {
    var resultsHtml = '<h2>Race Results</h2><table>';
    rankings.forEach(function (rank) {
      resultsHtml +=
        '<tr><td>' +
        rank.rank +
        '</td><td>' +
        rank.playerName +
        '</td><td>' +
        rank.score +
        '</td></tr>';
    });
    resultsHtml += '</table>';

    document.getElementById('variable-content').innerHTML = resultsHtml;
    document.getElementById('variable-content').style.visibility = 'visible';
  }

  /**
   * Update stat bars in UI
   */
  function updateStatsUI() {
    updateStatBar('trust', playerStats.trust);
    updateStatBar('justice', playerStats.justice);
    updateStatBar('unity', playerStats.unity);
  }

  function updateStatBar(statName, value) {
    // Use window function if available, otherwise do it directly
    if (typeof window.updateStatBar === 'function') {
      window.updateStatBar(statName, value);
      return;
    }

    // Fallback implementation
    var clampedValue = Math.max(0, Math.min(100, value));
    var valueElement = document.getElementById(statName + '-value');
    var barElement = document.getElementById(statName + '-bar');
    var containerElement = document.getElementById(statName + '-container');

    if (valueElement) {
      valueElement.textContent = Math.round(clampedValue) + '/100';
    }

    if (barElement) {
      barElement.style.width = clampedValue + '%';

      barElement.classList.remove('low', 'medium');

      if (clampedValue < 25) {
        barElement.classList.add('low');
        if (containerElement) containerElement.classList.add('critical');
      } else if (clampedValue < 50) {
        barElement.classList.add('medium');
        if (containerElement) containerElement.classList.remove('critical');
      } else {
        if (containerElement) containerElement.classList.remove('critical');
      }
    }
  }

  /**
   * Apply buffs from collected object
   */
  function applyBuffs(buffs) {
    if (!buffs) return;

    playerStats.trust += buffs.trust || 0;
    playerStats.justice += buffs.justice || 0;
    playerStats.unity += buffs.unity || 0;

    // Clamp values between 0 and 100
    playerStats.trust = Math.max(0, Math.min(100, playerStats.trust));
    playerStats.justice = Math.max(0, Math.min(100, playerStats.justice));
    playerStats.unity = Math.max(0, Math.min(100, playerStats.unity));

    updateStatsUI();

    // Show buff notification
    showBuffNotification(buffs);

    // Play coin/buff SFX (respect mute setting)
    AudioManager.playSoundEffect('sounds/subway-surfers-coin-collect.ogg');

    // Check for game over conditions
    checkGameOverConditions();
  }

  function showBuffNotification(buffs) {
    var notification = document.createElement('div');
    notification.style.cssText =
      'position: absolute; top: 25%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0); color: white; padding: 20px 40px; border-radius: 10px; font-size: 1.2rem; z-index: 1000; animation: fadeInOut 1s;';

    var messages = [];
    if (buffs.trust !== 0)
      messages.push('🤝 Niềm Tin ' + (buffs.trust > 0 ? '+' : '') + buffs.trust);
    if (buffs.justice !== 0)
      messages.push('⚖️ Công Bằng ' + (buffs.justice > 0 ? '+' : '') + buffs.justice);
    if (buffs.unity !== 0)
      messages.push('👨 Đoàn Kết ' + (buffs.unity > 0 ? '+' : '') + buffs.unity);

    if (messages.length === 0) return;

    notification.innerHTML = messages.join('<br>');
    document.body.appendChild(notification);

    setTimeout(function () {
      notification.remove();
    }, 1000);

    // Add CSS animation
    if (!document.getElementById('buff-animation-style')) {
      var style = document.createElement('style');
      style.id = 'buff-animation-style';
      style.innerHTML =
        '@keyframes fadeInOut { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } }';
      document.head.appendChild(style);
    }
  }

  function checkGameOverConditions() {
    if (playerStats.trust <= 0) {
      triggerGameOver('Dân nổi dậy → Chính quyền sụp đổ!', 'trust');
    } else if (playerStats.justice <= 0) {
      triggerGameOver('Tham nhũng tuyệt đối → Hệ thống vô pháp!', 'justice');
    } else if (playerStats.unity <= 0) {
      triggerGameOver('Xã hội chia rẽ → Khủng hoảng xã hội!', 'unity');
    }
  }

  function triggerGameOver(message, reason) {
    gameOver = true;
    paused = true;

    AudioManager.playGameOver(); // Thay đổi này

    // Notify network
    network.onGameOver(score);

    // Show game panel
    if (typeof window.showGamePanel === 'function') {
      window.showGamePanel();
    } else {
      var panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'block';
    }

    document.addEventListener('keydown', function (e) {
      if (e.keyCode == KEYCODE.R) {
        document.location.reload(true);
      }
    });

    var variableContent = document.getElementById('variable-content');
    variableContent.style.visibility = 'visible';
    variableContent.innerHTML =
      '<h2 style="color: #F44336;">GAME OVER</h2><p style="font-size: 20px;">' +
      message +
      '</p><p>Score: ' +
      score +
      '</p><p>Nhấn R để chơi lại.</p>';
  }

  /**
   * MAIN ANIMATION LOOP
   */
  function loop() {
    if (!paused) {
      // Tăng tốc theo mốc điểm
      if (score > GAME_CONSTANTS.MILE_STONES.EASY) {
        gameSpeed = 100;
        minRowsBetweenDeadly = 6;
        deadlySpawnChance = 0.5;
      }

      if (score > GAME_CONSTANTS.MILE_STONES.MEDIUM) {
        gameSpeed = 125;
        minRowsBetweenDeadly = 5;
        deadlySpawnChance = 0.6;

        if (groundStage < 2) switchGround(2);
      }

      if (score > GAME_CONSTANTS.MILE_STONES.HARD) {
        gameSpeed = 150;
        minRowsBetweenDeadly = 4;
        deadlySpawnChance = 0.7;

        if (groundStage < 3) switchGround(3);
      }

      // Spawn đường mới
      if (objects.length > 0 && objects[objects.length - 1].mesh.position.z > -80000) {
        difficulty += 1;
        createRowOfObjects(objects[objects.length - 1].mesh.position.z - 3000);
      }

      // Di chuyển object theo tốc độ gameSpeed
      var objectsToUpdate = objects.length;
      for (var i = 0; i < objectsToUpdate; i++) {
        var object = objects[i];
        if (object && object.mesh) {
          object.mesh.position.z += gameSpeed;
          if (typeof object.update === 'function') {
            object.update();
          }
        }
      }

      if (activeGround?.material?.map) {
        activeGround.material.map.offset.y += GAME_CONSTANTS.TOC_DO_LUOT_DAT;
      }
      // Animate sidewalk textures cùng tốc độ
      if (activeSidewalks.left?.material?.map) {
        activeSidewalks.left.material.map.offset.y += GAME_CONSTANTS.TOC_DO_LUOT_DAT;
      }
      if (activeSidewalks.right?.material?.map) {
        activeSidewalks.right.material.map.offset.y += GAME_CONSTANTS.TOC_DO_LUOT_DAT;
      }

      for (let obj of objects) {
        if (obj.updateHitbox) obj.updateHitbox();
      }

      // Smooth camera transition for LIVE mode với head bobbing
      if (currentCameraIndex === 2 && camera && character) {
        const live = CAMERA_SETTING_LIVE;
        const currentX = character.currentLane * 800;

        // Tính toán head bobbing dựa trên character.element.position.y
        // character.element.position.y dao động khi chạy (từ sinusoid)
        const bobAmount = character.element.position.y * 1.8; // Scale down để không rung quá mạnh

        // Base position từ preset CENTER
        let targetY = live.CENTER.y + bobAmount;
        let targetZ = live.CENTER.z;

        // Nếu có override (UP/DOWN khi nhảy/trượt), ưu tiên override
        if (cameraLiveOverride && live[cameraLiveOverride]) {
          const desired = live[cameraLiveOverride];
          targetY = desired.y + bobAmount;
          targetZ = desired.z;
        }

        // Smooth transition
        const targetVec = new THREE.Vector3(currentX, targetY, targetZ);
        camera.position.lerp(targetVec, 1); // Tăng lerp factor để mượt hơn

        // LookAt với bobbing nhẹ
        const lookY = live.CENTER.lookAt.y + bobAmount * 0.5;
        const look = new THREE.Vector3(currentX, lookY, live.CENTER.lookAt.z);
        camera.lookAt(look);
      }

      // Xóa object khi ra khỏi màn
      objects = objects.filter(function (object) {
        if (object.mesh.position.z >= 0) {
          disposeObject(object);
          return false;
        }
        return true;
      });

      // Update nhân vật
      character.update();

      // Smooth camera transition for LIVE mode
      if (currentCameraIndex === 2 && camera && character) {
        // choose desired target: override (UP/DOWN) wins, otherwise lane-based target
        const live = CAMERA_SETTING_LIVE;
        let desired = live.CENTER || { x: 0, y: 0, z: -4000 };

        if (cameraLiveOverride && live[cameraLiveOverride]) {
          desired = live[cameraLiveOverride];
        } else {
          // determine lane: character.currentLane expected to be -1/0/1 or similar
          const lane = character.currentLane || 0;
          if (lane < 0 && live.LEFT) desired = live.LEFT;
          else if (lane > 0 && live.RIGHT) desired = live.RIGHT;
          else if (live.CENTER) desired = live.CENTER;
        }

        // smooth the camera toward desired
        const targetVec = new THREE.Vector3(desired.x, desired.y, desired.z);
        camera.position.lerp(targetVec, 0.08);

        // smooth lookAt if provided
        if (desired.lookAt) {
          const look = new THREE.Vector3(desired.lookAt.x, desired.lookAt.y, desired.lookAt.z);
          camera.lookAt(look);
        }
      }

      // Send network updates via strategy
      network.onGameLoop({
        position: {
          x: character.element.position.x,
          y: character.element.position.y,
          z: character.element.position.z
        },
        lane: character.currentLane,
        isJumping: character.isJumping,
        score: score
      });

      // Check deadly collisions
      if (!gameOver && checkDeadlyCollisions()) {
        // Play coin/buff SFX (respect mute setting)
        AudioManager.playSoundEffect('sounds/error.mp3');

        triggerGameOver('Va chạm với chướng ngại vật!', 'collision');
      }

      // Check collectible collisions
      if (!gameOver) {
        var collidedObjects = checkCollisions();
        if (collidedObjects.length > 0) {
          collidedObjects.forEach(function (objectIndex) {
            var object = objects[objectIndex];
            if (object && object.buffs && !object.isCollected) {
              object.isCollected = true;
              applyBuffs(object.buffs);

              if (typeof object.collect === 'function') {
                object.collect();
              }

              score += object.buffValue || 0;
            }
          });
        }
      }

      score += 10;
      document.getElementById('score').innerHTML = score;
    }

    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }

  function switchGround(newStage) {
    if (groundStage === newStage) return;

    // Remove ground cũ
    if (activeGround && scene) {
      try {
        scene.remove(activeGround);
      } catch (e) {
        console.warn('Remove ground failed', e);
      }
    }

    // Remove sidewalks cũ
    if (activeSidewalks.left && scene) {
      try {
        scene.remove(activeSidewalks.left);
      } catch (e) {
        console.warn('Remove left sidewalk failed', e);
      }
    }
    if (activeSidewalks.right && scene) {
      try {
        scene.remove(activeSidewalks.right);
      } catch (e) {
        console.warn('Remove right sidewalk failed', e);
      }
    }

    // Set ground mới
    const groundSet = GROUNDS[newStage];
    if (groundSet) {
      // Main road
      activeGround = groundSet.main;
      if (activeGround) {
        if (activeGround.material?.map) {
          activeGround.material.map.wrapS = THREE.RepeatWrapping;
          activeGround.material.map.wrapT = THREE.RepeatWrapping;
          activeGround.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200);
        }
        scene.add(activeGround);
      }

      // Left sidewalk
      activeSidewalks.left = groundSet.leftSidewalk;
      if (activeSidewalks.left) {
        if (activeSidewalks.left.material?.map) {
          activeSidewalks.left.material.map.wrapS = THREE.RepeatWrapping;
          activeSidewalks.left.material.map.wrapT = THREE.RepeatWrapping;
          activeSidewalks.left.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200);
        }
        scene.add(activeSidewalks.left);
      }

      // Right sidewalk
      activeSidewalks.right = groundSet.rightSidewalk;
      if (activeSidewalks.right) {
        if (activeSidewalks.right.material?.map) {
          activeSidewalks.right.material.map.wrapS = THREE.RepeatWrapping;
          activeSidewalks.right.material.map.wrapT = THREE.RepeatWrapping;
          activeSidewalks.right.material.map.repeat.set(GAME_CONSTANTS.SO_LUONG_LANE, 200);
        }
        scene.add(activeSidewalks.right);
      }
    }
    groundStage = newStage;
  }

  /**
   * A method called when window is resized.
   */
  function handleWindowResize() {
    renderer.setSize(element.clientWidth, element.clientHeight);
    camera.aspect = element.clientWidth / element.clientHeight;
    camera.updateProjectionMatrix();
  }
  /**
   * CREATE ROW OF OBJECTS (Subway Surfer style)
   */
  function createRowOfObjects(position) {
    rowCounter++;

    var rowsSinceDeadly = rowCounter - lastDeadlySpawn;
    var rowsSinceBuff = rowCounter - lastBuffSpawn;
    var rowsSinceSideObject = rowCounter - lastSideObjectSpawn;

    // Determine current stage based on score
    var currentStage = 1;
    if (score > GAME_CONSTANTS.MILE_STONES.HARD) {
      currentStage = 3;
    } else if (score > GAME_CONSTANTS.MILE_STONES.MEDIUM) {
      currentStage = 2;
    }

    // ===== SIDE OBJECTS (LUÔN SPAWN, BẤT KỂ CÓ DEADLY HAY KHÔNG) =====
    var shouldSpawnSideObject = rowsSinceSideObject >= minRowsBetweenSideObject;

    if (shouldSpawnSideObject) {
      var largeObjects = [
        'OldApartmentBlock',
        'Skyscraper',
        'MetroStation',
        'OldFactory'
      ];

      var objectType = getRandomSideObject(currentStage);
      var isLargeObject = largeObjects.includes(objectType);

      var playerLane =
        character && typeof character.currentLane === 'number' ? character.currentLane : 0;

      if (isLargeObject) {
        var side = Math.random() < 0.5 ? 'left' : 'right'; // Chọn 1 bên
        var lane = side === 'left' ? -4 : 4;
        var scale = 3 + Math.random() * 2; // Object large dùng scale lớn hơn
        var sideObject = createSideObject(objectType, lane * 800, -300, position, scale);

        // Xoay object hướng về lane người chơi
        if (sideObject && sideObject.mesh) {
          var dx = playerLane * 800 - lane * 800;
          var dz = 0;
          var angle = Math.atan2(dx, dz);
          sideObject.mesh.rotation.y = angle;
        }

        objects.push(sideObject);
        scene.add(sideObject.mesh);
      } else {
        for (var lane = GAME_CONSTANTS.START_LANE; lane < GAME_CONSTANTS.END_LANE; lane++) {
          if (lane < -3 || lane > 3) {
            // Random spawn
            if (Math.random() < 0.5) {
              // Object medium/small dùng scale nhỏ hơn
              var scale = minScale + Math.random() * (maxScale - minScale);
              var sideObject = createSideObject(objectType, lane * 800, -200, position, scale);

              // Xoay object hướng về lane người chơi
              if (sideObject && sideObject.mesh) {
                var dx = playerLane * 800 - lane * 800;
                var dz = 0;
                var angle = Math.atan2(dx, dz);
                sideObject.mesh.rotation.y = angle;
              }

              objects.push(sideObject);
              scene.add(sideObject.mesh);
            }
          }
        }
      }
      lastSideObjectSpawn = rowCounter;
    }

    // ===== DEADLY PATTERN (CHỈ SPAWN Ở 3 LANE GIỮA) =====
    var shouldSpawnDeadly =
      rowsSinceDeadly >= minRowsBetweenDeadly && Math.random() < deadlySpawnChance;

    if (shouldSpawnDeadly) {
      var patternType = Math.random();

      if (score > 30000 && patternType < 0.15) {
        spawnCapitalistTrain(position);
      } else if (patternType < 0.3) {
        spawnSingleGate(position);
      } else if (patternType < 0.5) {
        spawnHighBarrierPattern(position);
      } else if (patternType < 0.7) {
        for (let i = 0; i < 2; i++) {
          spawnSingleGate(position - i * 1500);
        }
      } else if (patternType < 0.85) {
        spawnSingleGate(position);
        spawnHammerCoinPattern(position - 1000);
      } else if (patternType < 0.95) {
        spawnTwoLaneBlock(position);
      } else {
        spawnHighBarrierPattern(position);
        spawnSingleGate(position - 1500);
      }

      lastDeadlySpawn = rowCounter;
    }

    // ===== BUFF / COIN SPAWN =====
    var shouldSpawnBuff = rowsSinceBuff >= minRowsBetweenBuff && Math.random() < buffSpawnChance;

    if (shouldSpawnBuff) {
      var buffWeights = {
        hammerandsickle: 1.0,
        ruleOfLawState: 0.6,
        unityHands: 0.6,
        reformGears: 0.6,
        ballotBox: 0.6,
        bribeEnvelope: 0.8,
        corruptedThrone: 0.8,
        puppetManipulation: 0.8,
        misbalancedScale: 0.8
      };

      var objectType = weightedRandomObstacle(buffWeights);

      if (objectType === 'hammerandsickle') {
        spawnHammerCoinPattern(position);
        lastBuffSpawn = rowCounter;
        return; // Return sau khi spawn coin pattern
      }

      var lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
      var scale = 1.5 + Math.random() * 0.4;
      var buffObject;

      switch (objectType) {
        case 'ruleOfLawState':
          buffObject = new RuleOfLawState(lane * 800, 0, position, scale);
          break;
        case 'unityHands':
          buffObject = new UnityHands(lane * 800, 0, position, scale);
          break;
        case 'reformGears':
          buffObject = new ReformGears(lane * 800, 0, position, scale);
          break;
        case 'ballotBox':
          buffObject = new BallotBox(lane * 800, 0, position, scale);
          break;
        case 'bribeEnvelope':
          buffObject = new BribeEnvelope(lane * 800, 0, position, scale);
          break;
        case 'corruptedThrone':
          buffObject = new CorruptedThrone(lane * 800, 0, position, scale);
          break;
        case 'puppetManipulation':
          buffObject = new PuppetManipulation(lane * 800, 0, position, scale);
          break;
        case 'misbalancedScale':
          buffObject = new MisbalancedScale(lane * 800, 0, position, scale);
          break;
      }

      if (buffObject) {
        buffObject.mesh.userData = { buff: true };
        objects.push(buffObject);
        scene.add(buffObject.mesh);
        lastBuffSpawn = rowCounter;
      }
    }
  }

  function createSideObject(type, x, y, z, scale) {
    var adjustedX = x;
    var adjustedY = y;

    var largeObjects = [
      'OldApartmentBlock',
      'Company',
      'Skyscraper',
      'MetroStation',
      'OldFactory'
    ];

    if (largeObjects.includes(type)) {
      adjustedX = x < 0 ? x - 1000 : x + 1000;
    }

    var obj = null;
    switch (type) {
      case 'Tree':
        obj = new Tree(adjustedX, adjustedY, z, scale);
        break;
      case 'VillageHut':
        obj = new VillageHut(adjustedX, adjustedY, z, scale);
        break;
      case 'BambooTree':
        obj = new BambooTree(adjustedX, adjustedY, z, scale);
        break;
      case 'WaterBuffalo':
        obj = new WaterBuffalo(adjustedX, adjustedY, z, scale);
        break;
      case 'RiceStorage':
        obj = new RiceStorage(adjustedX, adjustedY, z, scale);
        break;
      case 'CropField':
        obj = new CropField(adjustedX, adjustedY, z, scale);
        break;
      case 'OldFactory':
        obj = new OldFactory(adjustedX, adjustedY, z, scale);
        break;
      case 'House':
        obj = new House(adjustedX, adjustedY, z, scale);
        break;
      case 'FiveGTower':
        obj = new FiveGTower(adjustedX, adjustedY, z, scale);
        break;
      case 'MetroStation':
        obj = new MetroStation(adjustedX, adjustedY, z, scale);
        break;
      case 'Skyscraper':
        obj = new Skyscraper(adjustedX, adjustedY, z, scale);
        break;
      case 'Company':
        obj = new Company(adjustedX, adjustedY, z, scale);
        break;
      default:
        obj = new Tree(adjustedX, adjustedY, z, scale);
    }

    return obj;
  }

  /**
   * Weighted random selection for side objects
   */
  function getRandomSideObject(stage) {
    var objectPool = SIDE_OBJECTS_BY_STAGE[stage] || SIDE_OBJECTS_BY_STAGE[1];

    var totalWeight = 0;
    for (var i = 0; i < objectPool.length; i++) {
      totalWeight += objectPool[i].weight;
    }

    var random = Math.random() * totalWeight;
    var weightSum = 0;

    for (var i = 0; i < objectPool.length; i++) {
      weightSum += objectPool[i].weight;
      if (random <= weightSum) {
        return objectPool[i].type;
      }
    }

    return 'Tree'; // Fallback
  }



  function spawnHammerCoinPattern(zPos) {
    var pattern = Math.random() < 0.5 ? 'line' : 'zigzag';
    var coinCount = 12 + Math.floor(Math.random() * 5); // 12-16 coins
    var lanes = [-1, 0, 1];
    var startLane = lanes[Math.floor(Math.random() * 3)];

    for (let i = 0; i < coinCount; i++) {
      var lane;

      if (pattern === 'line') {
        lane = startLane;
      } else {
        lane = lanes[i % 3];
      }

      var coin = new HammerAndSickle(lane * 800, 0, zPos - i * 750, 1);
      coin.mesh.userData = { buff: true };

      objects.push(coin);
      scene.add(coin.mesh);
    }
  }

  function spawnHighBarrierPattern(position) {
    var lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    var barrier = new HighBarrier(lane * 800, -300, position, 1.2, scene);
    barrier.mesh.userData = { deadly: true };

    if (DEBUG_HITBOX) barrier.showHitbox();

    objects.push(barrier);
    scene.add(barrier.mesh);
  }

  function spawnSingleGate(zPos) {
    var gateCount = Math.random() < 0.5 ? 1 : 2;
    var lanes = [-1, 0, 1];
    shuffleArray(lanes);

    for (var i = 0; i < gateCount; i++) {
      var gate = new LowBarrier(lanes[i] * 800, -300, zPos, 0.8, scene);
      gate.mesh.userData = { deadly: true };

      if (DEBUG_HITBOX) gate.showHitbox();

      objects.push(gate);
      scene.add(gate.mesh);
    }
  }

  function spawnTwoLaneBlock(zPos) {
    var lanes = [-1, 0, 1];
    shuffleArray(lanes);

    // lanes[0] là lane an toàn (không đặt vật cản)
    lastSafeLane = lanes[0];

    for (var i = 1; i < 3; i++) {
      var gate = new LowBarrier(lanes[i] * 800, -300, zPos, 0.8, scene);
      gate.mesh.userData = { deadly: true };

      if (DEBUG_HITBOX) gate.showHitbox();

      objects.push(gate);
      scene.add(gate.mesh);
    }
  }

  function spawnCapitalistTrain(zPos) {
    // Chọn lane gần player (ví dụ lane 0 hoặc random)
    var lane = [-1, 0, 1][Math.floor(Math.random() * 3)];

    // Z spawn xa phía trước (vì train lao ngược về player)
    var train = new CapitalistExpress(lane * 800, -300, zPos - 10000, 3, scene);
    train.mesh.userData = { deadly: true };

    if (DEBUG_HITBOX) train.showHitbox();

    objects.push(train);
    scene.add(train.mesh);
  }

  function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
  }

  function weightedRandomObstacle(weights) {
    var totalWeight = 0;
    for (var type in weights) {
      totalWeight += weights[type];
    }
    var random = Math.random() * totalWeight;
    var weightSum = 0;
    for (var type in weights) {
      weightSum += weights[type];
      if (random <= weightSum) {
        return type;
      }
    }
    return 'hammerandsickle';
  }

  /**
   * Returns true if and only if the character is currently colliding with
   * an object on the map.
   */
  function collisionsDetected() {
    return checkCollisions().length > 0 || checkDeadlyCollisions();
  }

  function checkCollisions() {
    if (!character || !character.element || objects.length === 0) return [];

    var hitbox = character.getHitbox();
    var collidedObjects = [];

    for (var i = 0; i < objects.length; i++) {
      if (objects[i] && typeof objects[i].collides === 'function') {
        if (objects[i].buffs && !objects[i].mesh.userData.deadly) {
          if (
            objects[i].collides(
              hitbox.minX,
              hitbox.maxX,
              hitbox.minY,
              hitbox.maxY,
              hitbox.minZ,
              hitbox.maxZ
            ) &&
            !objects[i].isCollected
          ) {
            collidedObjects.push(i);
          }
        }
      }
    }
    return collidedObjects;
  }

  function checkDeadlyCollisions() {
    if (!character || !character.element || objects.length === 0) return false;

    var hitbox = character.getHitbox();

    for (var i = 0; i < objects.length; i++) {
      if (objects[i] && typeof objects[i].collides === 'function') {
        if (objects[i].mesh.userData.deadly) {
          if (
            objects[i].collides(
              hitbox.minX,
              hitbox.maxX,
              hitbox.minY,
              hitbox.maxY,
              hitbox.minZ,
              hitbox.maxZ
            )
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  function setCameraPosition(target, duration = 1000) {
    const start = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z
    };

    const lookAtTarget = target.lookAt || { x: 0, y: 600, z: -5000 };
    const vector = new THREE.Vector3();
    camera.getWorldDirection(vector); // hướng nhìn hiện tại
    vector.add(camera.position); //
    const startLookAt = vector;

    const startTime = performance.now();

    function animateCamera(time) {
      const elapsed = time - startTime;
      const t = Math.min(elapsed / duration, 1);

      // Smoothstep easing (for smoother motion)
      const smoothT = t * t * (3 - 2 * t);

      // Interpolate position
      camera.position.x = THREE.MathUtils.lerp(start.x, target.x, smoothT);
      camera.position.y = THREE.MathUtils.lerp(start.y, target.y, smoothT);
      camera.position.z = THREE.MathUtils.lerp(start.z, target.z, smoothT);

      // Interpolate lookAt
      const lx = THREE.MathUtils.lerp(startLookAt.x, lookAtTarget.x, smoothT);
      const ly = THREE.MathUtils.lerp(startLookAt.y, lookAtTarget.y, smoothT);
      const lz = THREE.MathUtils.lerp(startLookAt.z, lookAtTarget.z, smoothT);
      camera.lookAt(new THREE.Vector3(lx, ly, lz));

      if (t < 1) requestAnimationFrame(animateCamera);
    }

    requestAnimationFrame(animateCamera);
  }

  /**
   * Properly dispose Three.js objects to prevent memory leaks
   */
  function disposeObject(object) {
    if (!object || !object.mesh) return;

    // Remove from scene
    scene.remove(object.mesh);

    // Dispose particles if they exist
    if (object.particles && object.particles.length > 0) {
      object.particles.forEach(function (particle) {
        if (particle.geometry) particle.geometry.dispose();
        if (particle.material) particle.material.dispose();
        object.mesh.remove(particle);
      });
      object.particles = [];
    }

    // Recursively dispose all children
    function disposeNode(node) {
      if (!node) return;

      // Dispose geometry
      if (node.geometry) {
        node.geometry.dispose();
      }

      // Dispose material(s)
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(function (mat) {
            disposeMaterial(mat);
          });
        } else {
          disposeMaterial(node.material);
        }
      }

      // Dispose children recursively
      if (node.children && node.children.length > 0) {
        for (var i = node.children.length - 1; i >= 0; i--) {
          disposeNode(node.children[i]);
          node.remove(node.children[i]);
        }
      }
    }

    function disposeMaterial(material) {
      if (!material) return;

      // Dispose textures
      if (material.map) material.map.dispose();
      if (material.lightMap) material.lightMap.dispose();
      if (material.bumpMap) material.bumpMap.dispose();
      if (material.normalMap) material.normalMap.dispose();
      if (material.specularMap) material.specularMap.dispose();
      if (material.envMap) material.envMap.dispose();
      if (material.alphaMap) material.alphaMap.dispose();
      if (material.aoMap) material.aoMap.dispose();
      if (material.displacementMap) material.displacementMap.dispose();
      if (material.emissiveMap) material.emissiveMap.dispose();
      if (material.gradientMap) material.gradientMap.dispose();
      if (material.metalnessMap) material.metalnessMap.dispose();
      if (material.roughnessMap) material.roughnessMap.dispose();

      material.dispose();
    }

    // Start disposal from the root mesh
    disposeNode(object.mesh);

    // Clear references
    object.mesh = null;
  }

  // ===== PUBLIC METHODS =====
  // Đặt tất cả public methods ở cuối, trước khi kết thúc WorldMap

  /**
   * Cleanup resources when leaving the game
   */
  self.cleanup = function () {
    // Cleanup network
    network.cleanup();

    // Cleanup opponents
    opponents.forEach(function (opponent, playerId) {
      if (opponent && opponent.element) {
        scene.remove(opponent.element);
      }
    });
    opponents.clear();

    // Cleanup all game objects
    objects.forEach(function (object) {
      disposeObject(object);
    });
    objects = [];

    if (activeSidewalks.left && scene) {
      scene.remove(activeSidewalks.left);
    }
    if (activeSidewalks.right && scene) {
      scene.remove(activeSidewalks.right);
    }

    activeSidewalks = { left: null, right: null };

    // Stop audio
    if (typeof AudioManager !== 'undefined') {
      AudioManager.stop();
    }

    // Remove event listeners
    window.removeEventListener('resize', handleWindowResize);

    // Dispose renderer
    if (renderer) {
      renderer.dispose();
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    }

    // Clear scene
    if (scene) {
      scene.clear();
    }

    console.log('WorldMap cleaned up');
  };

  /**
   * Pause the game
   */
  self.pause = function () {
    paused = true;
    if (character) character.onPause();
    AudioManager.pause();

    // Show game panel when paused
    if (typeof window.showGamePanel === 'function') {
      window.showGamePanel();
    } else {
      const panel = document.getElementById('gamePanel');
      if (panel) panel.style.display = 'block';
    }
  };

  /**
   * Resume the game
   */
  self.resume = function () {
    if (!gameOver) {
      paused = false;
      if (character) {
        character.onUnpause();
      }
      AudioManager.play();
    }
  };

  /**
   * Get current game state
   */
  self.getState = function () {
    return {
      score: score,
      paused: paused,
      gameOver: gameOver,
      playerStats: playerStats,
      isMultiplayer: network.isMultiplayer,
      opponentCount: opponents.size
    };
  };

  return self;
}
