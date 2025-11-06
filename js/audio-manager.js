/**
 * AudioManager (Web Audio API, IIFE)
 * - Perfect looping using AudioBufferSourceNode.loop = true
 * - 1s crossfade between intro -> loop -> gameover
 * - 1s fade-out on stop
 * - stores mute & volume to localStorage
 * - PREVENTS DOUBLE LOOP CREATION
 *
 * Usage:
 *  AudioManager.init();
 *  AudioManager.loadAll().then(() => { AudioManager.playIntro(); });
 *  AudioManager.play(); // start game (intro -> loop crossfade)
 *  AudioManager.playGameOver(); // loop -> gameover crossfade
 */

var AudioManager = (function () {
  'use strict';

  // configuration
  var CROSSFADE_SEC = 1.0;
  var DEFAULT_VOLUME = 0.5;

  // WebAudio context + nodes
  var audioCtx = null;
  var masterGain = null;

  // decoded buffers
  var buffers = {
    intro: null,
    loop: null,
    gameover: null
  };

  // active sources and their gain nodes
  // { source: AudioBufferSourceNode, gain: GainNode, startTime: number }
  var active = {
    intro: null,
    loop: null,
    gameover: null
  };

  // state
  var isMuted = false;
  var masterVolume = DEFAULT_VOLUME;
  var isInitialized = false;
  var gameState = 'menu'; // 'menu' | 'playing' | 'gameover'

  // persist keys
  var KEY_MUTE = 'gameAudioMuted';
  var KEY_VOL = 'gameAudioVolume';

  // helper: create or resume AudioContext (user gesture may be needed)
  function ensureAudioContext() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = isMuted ? 0 : masterVolume;
      masterGain.connect(audioCtx.destination);
    } else if (audioCtx.state === 'suspended') {
      // try resume; some browsers require user gesture to resume
      audioCtx.resume().catch(function (e) {
        console.warn('AudioContext resume failed:', e);
      });
    }
  }

  // helper: fetch + decode a file
  function fetchAndDecode(url) {
    ensureAudioContext();
    return fetch(url)
      .then(function (r) {
        return r.arrayBuffer();
      })
      .then(function (ab) {
        return new Promise(function (resolve, reject) {
          audioCtx.decodeAudioData(
            ab,
            function (decoded) {
              resolve(decoded);
            },
            function (err) {
              reject(err);
            }
          );
        });
      });
  }

  // create a playing buffer source + gain, returns object
  function createPlayingSource(buffer, loop) {
    ensureAudioContext();
    var src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.loop = !!loop;
    var g = audioCtx.createGain();
    // start with zero volume by default (caller sets)
    g.gain.setValueAtTime(0, audioCtx.currentTime);
    src.connect(g);
    g.connect(masterGain);
    return { source: src, gain: g, startTime: null };
  }

  // schedule crossfade from 'fromObj' to 'toObj' over sec seconds
  // fromObj/toObj are {source, gain, startTime} or null
  function scheduleCrossfade(fromObj, toObj, sec) {
    sec = typeof sec === 'number' ? sec : CROSSFADE_SEC;
    ensureAudioContext();
    var now = audioCtx.currentTime;

    var volumeTarget = isMuted ? 0 : masterVolume;

    // if toObj provided, start it immediately at gain 0
    if (toObj) {
      try {
        toObj.gain.gain.cancelScheduledValues(now);
        toObj.gain.gain.setValueAtTime(0, now);
        toObj.startTime = now; // Track start time
        toObj.source.start(now);
      } catch (e) {
        console.warn('start toObj failed', e);
      }
      // ramp up to master volume
      toObj.gain.gain.linearRampToValueAtTime(volumeTarget, now + sec);
    }

    // fade out fromObj
    if (fromObj) {
      try {
        fromObj.gain.gain.cancelScheduledValues(now);
        // ensure current value is set
        var currentVal = fromObj.gain.gain.value;
        fromObj.gain.gain.setValueAtTime(currentVal, now);
        fromObj.gain.gain.linearRampToValueAtTime(0, now + sec);
        // schedule stop a little after fade completes
        (function (f, stopAt) {
          setTimeout(
            function () {
              try {
                f.source.stop();
                console.log('🛑 Stopped audio source');
              } catch (e) { }
              try {
                f.source.disconnect();
              } catch (e) { }
              try {
                f.gain.disconnect();
              } catch (e) { }
            },
            Math.max(0, (stopAt - audioCtx.currentTime) * 1000 + 50)
          );
        })(fromObj, now + sec);
      } catch (e) {
        console.warn('fade out fromObj failed', e);
      }
    }
  }

  // stops and clears an active slot object
  function stopAndClearSlot(slotName) {
    var obj = active[slotName];
    if (!obj) return;
    try {
      obj.source.stop();
    } catch (e) { }
    try {
      obj.source.disconnect();
    } catch (e) { }
    try {
      obj.gain.disconnect();
    } catch (e) { }
    active[slotName] = null;
  }

  // PUBLIC: init only prepares audio context and loads saved settings
  function init() {
    if (isInitialized) return;
    // load persisted settings
    var savedMute = localStorage.getItem(KEY_MUTE);
    if (savedMute === 'true') isMuted = true;
    var savedVol = parseFloat(localStorage.getItem(KEY_VOL));
    if (!isNaN(savedVol)) masterVolume = Math.max(0, Math.min(1, savedVol));
    // create context lazily when loading/playing
    ensureAudioContext();
    // apply master gain
    if (masterGain) masterGain.gain.value = isMuted ? 0 : masterVolume;
    isInitialized = true;

    // add resume on user gesture (helpful if audio context suspended)
    ['pointerdown', 'keydown', 'click', 'touchstart'].forEach(function (ev) {
      window.addEventListener(
        ev,
        function resumeOnce() {
          if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(function (e) { });
          }
          window.removeEventListener(ev, resumeOnce);
        },
        { once: true }
      );
    });
  }

  // PUBLIC: preload all three tracks (returns Promise)
  function loadAll(paths) {
    // paths optional override: {intro, loop, gameover}
    init();
    paths = paths || {};
    var introPath = paths.intro || 'sounds/intro.ogg';
    var loopPath = paths.loop || 'sounds/loop.ogg';
    var gameoverPath = paths.gameover || 'sounds/gameover.ogg';

    return Promise.all([
      fetchAndDecode(introPath).then(function (b) {
        buffers.intro = b;
      }),
      fetchAndDecode(loopPath).then(function (b) {
        buffers.loop = b;
      }),
      fetchAndDecode(gameoverPath).then(function (b) {
        buffers.gameover = b;
      })
    ]);
  }

  // PUBLIC: playIntro (menu) — intro should loop perfectly
  function playIntro() {
    init();
    gameState = 'menu';

    // Đã chạy intro → không tạo thêm
    if (active.intro) {
      console.log('🎵 Intro already playing');
      return;
    }

    // Tạo intro và cho chạy, KHÔNG crossfade từ đầu
    var toObj = createPlayingSource(buffers.intro || null, true);
    if (!toObj.source.buffer) {
      console.warn('intro buffer not loaded');
      return;
    }

    active.intro = toObj;

    // Mở intro với full volume (không fade-in từ 0)
    var now = audioCtx.currentTime;
    var volumeTarget = isMuted ? 0 : masterVolume;
    toObj.gain.gain.setValueAtTime(volumeTarget, now);
    toObj.startTime = now; // Track start time
    toObj.source.start(now);

    console.log('🎵 Intro started at:', toObj.startTime);
  }

  // PUBLIC: start game — transition intro -> loop
  function play() {
    init();
    gameState = 'playing';

    // 🔥 CRITICAL: Check if loop is already playing
    if (active.loop) {
      console.log('🎵 Loop already playing, skipping play() call');
      return;
    }

    // ensure loop buffer present
    if (!buffers.loop) {
      console.warn('loop buffer not loaded — attempting to play anyway (no buffer).');
    }

    // create loop source
    var toObj = createPlayingSource(buffers.loop || null, true);
    if (!toObj.source.buffer) {
      console.warn('loop buffer not loaded');
      // fallback: if no buffer, we cannot play via WebAudio; exit
      return;
    }

    console.log('🎵 Creating new loop audio source');
    active.loop = toObj;

    // find currently playing object to fade from: prefer intro then gameover
    var fromObj = active.intro || active.gameover || null;

    // If we are currently playing intro and it's active, crossfade intro -> loop
    if (active.intro) {
      console.log('🎵 Crossfading intro -> loop');
      scheduleCrossfade(active.intro, toObj, CROSSFADE_SEC);
      // clear intro after scheduled fade will stop it
      active.intro = null;
    } else if (fromObj) {
      // crossfade from whatever currently playing to loop
      console.log('🎵 Crossfading from current audio -> loop');
      scheduleCrossfade(fromObj, toObj, CROSSFADE_SEC);
      // clear previous slot appropriately
      if (fromObj === active.gameover) active.gameover = null;
    } else {
      // nothing playing — fade in loop from 0
      console.log('🎵 Fading in loop from silence');
      scheduleCrossfade(null, toObj, CROSSFADE_SEC);
    }
  }

  // PUBLIC: game over — crossfade to gameover (one-shot)
  function playGameOver() {
    init();
    gameState = 'gameover';

    if (!buffers.gameover) {
      console.warn('gameover buffer not loaded');
      return;
    }

    var toObj = createPlayingSource(buffers.gameover || null, false);
    if (!toObj.source.buffer) return;
    active.gameover = toObj;

    var fromObj = active.loop || active.intro || null;
    scheduleCrossfade(fromObj, toObj, CROSSFADE_SEC);

    // Clear loop/intro slots
    if (fromObj === active.loop) active.loop = null;
    if (fromObj === active.intro) active.intro = null;

    // for one-shot, ensure we clear the gameover after it ends
    // schedule clearing after duration of buffer + small margin
    try {
      var dur = toObj.source.buffer ? toObj.source.buffer.duration * 1000 : 0;
      setTimeout(
        function () {
          // stop and cleanup after finished playing
          stopAndClearSlot('gameover');
          // go back to menu if desired (not automatic); caller can call playIntro()
        },
        dur + CROSSFADE_SEC * 1000 + 100
      );
    } catch (e) { }
  }

  // PUBLIC: pause immediately (no fade)
  function pause() {
    if (!audioCtx) return;
    // stopping individual source nodes is the way to pause; but we may want to preserve their positions.
    // WebAudio BufferSourceNodes cannot be paused/resumed — they'd need re-creation with offset.
    // So here we will stop all and set flags so caller can decide to restart from beginning.
    // For simple pause behavior we do immediate fade-out then stop.
    stop(); // use stop which fades out and resets
  }

  // PUBLIC: stop with fade-out then reset
  function stop() {
    if (!audioCtx) return;
    // crossfade current to null -> fade down
    var currentObj = active.loop || active.intro || active.gameover || null;
    if (!currentObj) return;

    scheduleCrossfade(currentObj, null, CROSSFADE_SEC);

    // clear active slots after fade
    setTimeout(
      function () {
        try {
          ['intro', 'loop', 'gameover'].forEach(function (k) {
            if (active[k]) {
              try {
                active[k].source.stop();
              } catch (e) { }
              try {
                active[k].source.disconnect();
              } catch (e) { }
              try {
                active[k].gain.disconnect();
              } catch (e) { }
              active[k] = null;
            }
          });
        } catch (e) { }
      },
      (CROSSFADE_SEC + 0.05) * 1000
    );
  }

  // PUBLIC: toggle mute (immediate)
  function toggleMute() {
    isMuted = !isMuted;
    if (masterGain) {
      masterGain.gain.setValueAtTime(
        isMuted ? 0 : masterVolume,
        audioCtx ? audioCtx.currentTime : 0
      );
    }
    localStorage.setItem(KEY_MUTE, isMuted ? 'true' : 'false');
    return isMuted;
  }

  function setVolume(v) {
    masterVolume = Math.max(0, Math.min(1, v));
    if (!isMuted && masterGain) {
      masterGain.gain.setValueAtTime(masterVolume, audioCtx ? audioCtx.currentTime : 0);
    }
    localStorage.setItem(KEY_VOL, masterVolume.toString());
  }

  function getVolume() {
    return masterVolume;
  }
  function getMuteState() {
    return isMuted;
  }

  // PUBLIC: play short sound effect (uses a small buffer decode each time or <audio> fallback)
  function playSoundEffect(url, volume) {
    volume = typeof volume === 'number' ? Math.max(0, Math.min(1, volume)) : 1.0;
    ensureAudioContext();
    if (isMuted) return;
    // simple approach: decode once then play — for simplicity we'll fetch+decode each time here
    fetch(url)
      .then(function (r) {
        return r.arrayBuffer();
      })
      .then(function (ab) {
        return audioCtx.decodeAudioData(ab);
      })
      .then(function (buf) {
        var s = audioCtx.createBufferSource();
        var g = audioCtx.createGain();
        s.buffer = buf;
        g.gain.value = volume;
        s.connect(g);
        g.connect(masterGain);
        s.start();
        // cleanup
        setTimeout(
          function () {
            try {
              s.stop();
            } catch (e) { }
            try {
              s.disconnect();
            } catch (e) { }
            try {
              g.disconnect();
            } catch (e) { }
          },
          (buf.duration + 0.1) * 1000
        );
      })
      .catch(function (e) {
        // fallback to <audio> element if decode fails
        try {
          var a = new Audio(url);
          a.volume = volume;
          a.play().catch(function () { });
        } catch (er) { }
      });
  }

  // Expose public API
  return {
    init: init,
    loadAll: loadAll,
    playIntro: playIntro,
    play: play,
    playGameOver: playGameOver,
    stop: stop,
    pause: pause,
    toggleMute: toggleMute,
    setVolume: setVolume,
    getVolume: getVolume,
    getMuteState: getMuteState,
    playSoundEffect: playSoundEffect,

    // internals exposed for debugging (optional)
    _audioCtx: function () {
      return audioCtx;
    },
    _buffers: function () {
      return buffers;
    },
    _active: function () {
      return active;
    }
  };
})();
