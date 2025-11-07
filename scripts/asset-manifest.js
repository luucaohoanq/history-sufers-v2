export const ASSET_MANIFEST = [
  // GLB models
  { url: 'assets/objects/SimpleTree.glb', type: 'glb' },
  { url: 'assets/objects/VillageHut.glb', type: 'glb' },
  { url: 'assets/objects/CapitalistExpress.glb', type: 'glb' },
  { url: 'assets/objects/WaterBuffalo.glb', type: 'glb' },
  { url: 'assets/objects/SkyScraper.glb', type: 'glb' },
  { url: 'assets/objects/StorageHouse.glb', type: 'glb' },
  { url: 'assets/objects/House.glb', type: 'glb' },
  { url: 'assets/objects/Company.glb', type: 'glb' },
  { url: 'assets/objects/Bamboo.glb', type: 'glb' },
  { url: 'assets/objects/CropField.glb', type: 'glb' },
  { url: 'assets/objects/Factory.glb', type: 'glb' },
  { url: 'assets/objects/LargeBuilding_2.glb', type: 'glb' },
  { url: 'assets/objects/Train.glb', type: 'glb' },
  { url: 'assets/objects/Gear.glb', type: 'glb' },
  { url: 'assets/objects/BallotBox.glb', type: 'glb' },
  { url: 'assets/objects/RadioTower.glb', type: 'glb' },
  { url: 'assets/objects/TrafficBarrier.glb', type: 'glb' },
  { url: 'assets/models/business_man.glb', type: 'glb' },
  { url: 'assets/models/worker.glb', type: 'glb' },
  { url: 'assets/models/farmer.glb', type: 'glb' },

  // Textures / images
  { url: 'assets/xp.jpg', type: 'texture' },
  { url: 'assets/bamboo.jpg', type: 'texture' },
  { url: 'textures/road/Road007_1K-JPG_Color.jpg', type: 'texture' },
  { url: 'textures/ground/Ground067_1K-JPG_Color.jpg', type: 'texture' },
  { url: 'textures/brick/Bricks075A_1K-JPG_Color.jpg', type: 'texture' },
  { url: 'textures/ground/co.jpg', type: 'texture' },
  { url: 'textures/brick/leda.jpg', type: 'texture' },
  { url: 'textures/road/viahe.jpg', type: 'texture' },

  // Audio
  { url: 'sounds/intro.ogg', type: 'audio' },
  { url: 'sounds/loop.ogg', type: 'audio' },
  { url: 'sounds/gameover.ogg', type: 'audio' },
  { url: 'sounds/error.mp3', type: 'audio' },
  { url: 'sounds/siu.mp3', type: 'audio' },
  { url: 'sounds/subway-surfers-coin-collect.ogg', type: 'audio' }
];

export const PRECACHE_URLS = Array.from(new Set(ASSET_MANIFEST.map((entry) => entry.url)));
