const CACHE_NAME = 'history-surfers-preload-v1';
const STORAGE_KEY = 'hs-preload-status';
const STORAGE_READY_VALUE = `${CACHE_NAME}::ready`;

const GLB_ASSETS = [
  new URL('../assets/objects/SimpleTree.glb', import.meta.url).href,
  new URL('../assets/objects/VillageHut.glb', import.meta.url).href,
  new URL('../assets/objects/CapitalistExpress.glb', import.meta.url).href,
  new URL('../assets/objects/WaterBuffalo.glb', import.meta.url).href,
  new URL('../assets/objects/SkyScraper.glb', import.meta.url).href,
  new URL('../assets/objects/StorageHouse.glb', import.meta.url).href,
  new URL('../assets/objects/House.glb', import.meta.url).href,
  new URL('../assets/objects/Bamboo.glb', import.meta.url).href,
  new URL('../assets/objects/CropField.glb', import.meta.url).href,
  new URL('../assets/objects/Factory.glb', import.meta.url).href,
  new URL('../assets/objects/LargeBuilding_2.glb', import.meta.url).href,
  new URL('../assets/objects/Train.glb', import.meta.url).href,
  new URL('../assets/objects/Gear.glb', import.meta.url).href,
  new URL('../assets/objects/BallotBox.glb', import.meta.url).href,
  new URL('../assets/objects/RadioTower.glb', import.meta.url).href,
  new URL('../assets/objects/TrafficBarrier.glb', import.meta.url).href,
  new URL('../assets/models/business_man.glb', import.meta.url).href,
  new URL('../assets/models/worker.glb', import.meta.url).href,
  new URL('../assets/models/farmer.glb', import.meta.url).href
];

const TEXTURE_ASSETS = [
  new URL('../assets/xp.jpg', import.meta.url).href,
  new URL('../assets/bamboo.jpg', import.meta.url).href,
  new URL('../textures/road/Road007_1K-JPG_Color.jpg', import.meta.url).href,
  new URL('../textures/ground/Ground067_1K-JPG_Color.jpg', import.meta.url).href,
  new URL('../textures/brick/Bricks075A_1K-JPG_Color.jpg', import.meta.url).href,
  new URL('../textures/ground/co.jpg', import.meta.url).href,
  new URL('../textures/brick/leda.jpg', import.meta.url).href,
  new URL('../textures/road/viahe.jpg', import.meta.url).href
];

const AUDIO_ASSETS = [
  new URL('../sounds/intro.ogg', import.meta.url).href,
  new URL('../sounds/loop.ogg', import.meta.url).href,
  new URL('../sounds/gameover.ogg', import.meta.url).href,
  new URL('../sounds/error.mp3', import.meta.url).href,
  new URL('../sounds/siu.mp3', import.meta.url).href,
  new URL('../sounds/subway-surfers-coin-collect.ogg', import.meta.url).href
];

const manifest = buildManifest();

const state = {
  started: false,
  done: false,
  total: manifest.length,
  completed: 0,
  failures: []
};

let preloadPromise = null;
const subscribers = new Set();
let gltfModulePromise = null;
let warmedFromStorage = false;

function buildManifest() {
  const items = [];
  const appended = new Set();
  function push(url, type) {
    if (!url || appended.has(url)) {
      return;
    }
    appended.add(url);
    items.push({ url, type });
  }

  GLB_ASSETS.forEach((url) => push(url, 'glb'));
  TEXTURE_ASSETS.forEach((url) => push(url, 'texture'));
  AUDIO_ASSETS.forEach((url) => push(url, 'audio'));
  return items;
}

function snapshotState(extra = {}) {
  return { ...state, ...extra, total: state.total, completed: state.completed };
}

function notify(extra) {
  const current = snapshotState(extra);
  subscribers.forEach((listener) => {
    try {
      listener(current);
    } catch (error) {
      console.error('Asset preload listener failed', error);
    }
  });
  return current;
}

async function getGLTFModule() {
  if (!gltfModulePromise) {
    gltfModulePromise = import('./glb-model-cache.js');
  }
  return gltfModulePromise;
}

async function warmGLB(url) {
  const { getGLTFClone } = await getGLTFModule();
  await getGLTFClone(url);
}

async function warmViaFetch(url) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) {
    throw new Error(`Request for ${url} failed with status ${response.status}`);
  }
  const cacheableResponse = response.clone();
  // Consume the body to ensure the asset is fully cached.
  await response.arrayBuffer();
  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(url, cacheableResponse);
    } catch (error) {
      // Ignore cache storage errors (e.g., cross-origin or quota issues)
    }
  }
}

async function processAsset(item) {
  if (item.type === 'glb') {
    await warmGLB(item.url);
  } else {
    await warmViaFetch(item.url);
  }
}

async function runWithConcurrency(items, concurrency, onItem) {
  let index = 0;
  const workerCount = Math.min(concurrency, items.length || 1);

  async function work() {
    while (true) {
      const current = index++;
      if (current >= items.length) {
        break;
      }
      await onItem(items[current], current);
    }
  }

  const workers = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(work());
  }
  await Promise.all(workers);
}

function readStoredReady() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === STORAGE_READY_VALUE) {
      return true;
    }
    if (stored && stored !== STORAGE_READY_VALUE) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    return false;
  } catch (error) {
    return false;
  }
}

function persistStoredReady() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, STORAGE_READY_VALUE);
  } catch (error) { }
}

function clearStoredReady() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) { }
}

function initializeFromStorage() {
  warmedFromStorage = readStoredReady();
  if (warmedFromStorage) {
    state.started = true;
    state.done = true;
    state.completed = state.total;
    state.failures = [];
    preloadPromise = Promise.resolve(snapshotState({ done: true }));
  }
}

initializeFromStorage();

export function getAssetPreloadState() {
  return snapshotState();
}

export function subscribeToAssetPreload(listener) {
  if (typeof listener !== 'function') {
    return () => { };
  }
  subscribers.add(listener);
  listener(snapshotState());
  return () => subscribers.delete(listener);
}

export function isAssetPreloadPrimed() {
  return state.done === true && state.failures.length === 0 && state.completed >= state.total && state.total > 0;
}

export function startAssetPreload(options = {}) {
  const { concurrency = 4, onProgress } = options;
  if (typeof onProgress === 'function') {
    subscribeToAssetPreload(onProgress);
  }

  if (state.done && state.failures.length === 0) {
    if (!preloadPromise) {
      preloadPromise = Promise.resolve(snapshotState({ done: true }));
    }
    return preloadPromise;
  }

  if (state.started) {
    return preloadPromise ?? Promise.resolve(snapshotState());
  }

  state.started = true;
  state.done = false;
  state.total = manifest.length;
  state.completed = 0;
  state.failures = [];
  clearStoredReady();
  notify();

  preloadPromise = (async () => {
    await runWithConcurrency(manifest, Math.max(1, concurrency), async (item) => {
      try {
        await processAsset(item);
      } catch (error) {
        state.failures.push({ url: item.url, type: item.type, error });
      } finally {
        state.completed += 1;
        notify({ lastUrl: item.url });
      }
    });
    state.done = true;
    const finalState = notify({ done: true });
    if (state.failures.length === 0) {
      persistStoredReady();
    } else {
      clearStoredReady();
    }
    return finalState;
  })();

  return preloadPromise;
}

export function waitForAssetPreload() {
  return preloadPromise ?? Promise.resolve(snapshotState());
}
