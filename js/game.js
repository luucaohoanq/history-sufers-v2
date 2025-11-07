/**
 * game single player mode entry point
 */

import { WorldMap } from '../scripts/maps.js';
import { SinglePlayerStrategy } from '../scripts/network-strategy.js';
import { updateSoundButtonUI } from '../scripts/utils.js';

/**
 * Con đường đổi mới - SINGLE PLAYER MODE
 */

window.addEventListener('load', async function () {
  let waitForAssets = async () => {};

  try {
    const { initAssetPreloader, waitForAssetPreloadCompletion } = await import(
      '../scripts/preload-banner.js'
    );
    initAssetPreloader();
    waitForAssets = async () => {
      try {
        await waitForAssetPreloadCompletion();
      } catch (error) {
        console.warn('Asset preloading completed with warnings', error);
      }
    };
  } catch (error) {
    console.error('Failed to initialize asset preloader:', error);
  }

  // Initialize audio manager
  AudioManager.init();

  AudioManager.loadAll()
    .then(function () {
      // nếu người chơi đã tương tác ở lobby, gọi:
      AudioManager.playIntro(); // intro sẽ loop perfectly

      // setup UI toggle
      var soundToggleBtn = document.getElementById('sound-toggle');
      if (soundToggleBtn) {
        updateSoundButtonUI(); // your function
        soundToggleBtn.addEventListener('click', function () {
          AudioManager.toggleMute();
          updateSoundButtonUI();
        });
      }
    })
    .catch(function (e) {
      console.error('Audio preload failed', e);
      // fallback: you may call AudioManager.playIntro() later after user gesture
    });

  try {
    await waitForAssets();
  } catch (error) {
    console.warn('Proceeding despite asset preload failure', error);
  }

  // Create single player strategy
  const networkStrategy = new SinglePlayerStrategy();

  // Create world with single player strategy
  const world = new WorldMap(networkStrategy);

  // Store reference globally for cleanup
  window.currentWorld = world;

  // Cleanup on page unload
  window.addEventListener('beforeunload', function () {
    if (window.currentWorld && typeof window.currentWorld.cleanup === 'function') {
      window.currentWorld.cleanup();
    }

    // Stop all audio when leaving
    AudioManager.stop();
  });
});
