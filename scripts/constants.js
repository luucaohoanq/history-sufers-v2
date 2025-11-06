import { Colors } from './colors.js';
import { createBoxTexture } from './utils.js';

export const GAME_CONSTANTS = {
  START_LANE: -4,
  END_LANE: 5,
  TOC_DO_LUOT_DAT: 0.025,
  SO_LUONG_LANE: 3,
  MILE_STONES: {
    EASY: 15000,
    MEDIUM: 30000,
    HARD: 50000
  }
};

export const GROUND_KIT = {
  DUONG_NHUA: 'textures/road/Road007_1K-JPG_Color.jpg',
  DUONG_DAT: 'textures/ground/Ground067_1K-JPG_Color.jpg',
  DUONG_GACH: 'textures/brick/Bricks075A_1K-JPG_Color.jpg'
};

export const SIDEWALK_KIT = {
  DUONG_DAT: 'textures/ground/co.jpg',
  DUONG_GACH: 'textures/brick/leda.jpg',
  DUONG_NHUA: 'textures/road/viahe.jpg'
};


export const CAMERA_SETTINGS = {
  NORMAL: { x: 0, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  NGANG: { x: 2000, y: 700, z: -2000, lookAt: { x: 0, y: 600, z: -5000 } },
  LIVE: { x: 0, y: 0, z: -5000, lookAt: { x: 0, y: 0, z: -60000 } },
  HARD_CORE: { x: 0, y: 200, z: -7000, lookAt: { x: 0, y: 0, z: -5000 } }
};

export const CAMERA_SETTING_LIVE = {
  LEFT: { x: -800, y: 250, z: -4300, lookAt: { x: -800, y: 200, z: -60000 } },
  CENTER: { x: 0, y: 250, z: -4300, lookAt: { x: 0, y: 200, z: -60000 } },
  RIGHT: { x: 800, y: 250, z: -4300, lookAt: { x: 800, y: 200, z: -60000 } },
  UP: { x: 0, y: 450, z: -4200, lookAt: { x: 100, y: 400, z: -60000 } },
  DOWN: { x: 0, y: 150, z: -4200, lookAt: { x: 100, y: 100, z: -60000 } }
};

// ===== MAIN ROAD (3 LANES GIỮA) =====
export let DUONG_CHAY = createBoxTexture(
  3000, // width cho 3 lanes (800 * 3)
  20,
  120000,
  Colors.sand,
  0, // center position
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_NHUA
);

export let DUONG_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  0,
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_DAT
);

export let DUONG_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  0,
  -400,
  -60000,
  true,
  GROUND_KIT.DUONG_GACH
);

// ===== SIDEWALK LEFT (-4, -3, -2) =====
export let SIDEWALK_LEFT_CHAY = createBoxTexture(
  3000, // width cho 3 lanes vỉa hè trái
  20,
  120000,
  Colors.sand,
  -3000, // offset sang trái (center road là 0, mỗi lane = 800)
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_NHUA
);

export let SIDEWALK_LEFT_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  -3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_DAT
);

export let SIDEWALK_LEFT_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  -3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_GACH
);

// ===== SIDEWALK RIGHT (2, 3, 4) =====
export let SIDEWALK_RIGHT_CHAY = createBoxTexture(
  3000, // width cho 3 lanes vỉa hè phải
  20,
  120000,
  Colors.sand,
  3000, // offset sang phải
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_NHUA
);

export let SIDEWALK_RIGHT_DAT = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_DAT
);

export let SIDEWALK_RIGHT_GACH = createBoxTexture(
  3000,
  20,
  120000,
  Colors.sand,
  3000,
  -380,
  -60000,
  true,
  SIDEWALK_KIT.DUONG_GACH
);

export const SIDE_OBJECTS_BY_STAGE = {
  1: [
    { type: 'Tree', weight: 2 },
    { type: 'VillageHut', weight: 1.5 },
    { type: 'BambooTree', weight: 1.5 },
    { type: 'WaterBuffalo', weight: 0.5 },
    { type: 'RiceStorage', weight: 0.8 },
    { type: 'CropField', weight: 0.7 }
  ],
  2: [
    { type: 'Tree', weight: 1 },
    { type: 'OldFactory', weight: 2 },
    { type: 'House', weight: 2 },
    { type: 'CropField', weight: 0.2 },
    { type: 'VillageHut', weight: 0.2 }
  ],
  3: [
    { type: 'Tree', weight: 0.5 },
    { type: 'FiveGTower', weight: 2 },
    { type: 'MetroStation', weight: 1.5 },
    { type: 'Skyscraper', weight: 1 },
    { type: 'Company', weight: 1.5 }
  ]
};

export const POINT_OBJECT_GUIDE = [
  {
    type: 'hammerandsickle',
    name: 'Biểu tượng Búa Liềm',
    description: 'Thu thập để nhận thêm điểm và buff lòng tin cơ bản.',
    preview: { y: 120, scale: 1.2, lookAtY: 60 }
  },
  {
    type: 'ballotbox',
    name: 'Thùng Phiếu Cải Cách',
    description: 'Đại diện cho tiến bộ dân chủ, mang lại lượng điểm lớn.',
    preview: { y: 0, scale: 1.2, lookAtY: 100 }
  },
  {
    type: 'ruleoflawstate',
    name: 'Cột Mốc Nhà Nước Pháp Quyền',
    description: 'Tượng trưng cho pháp quyền vững mạnh, thưởng nhiều điểm.',
    preview: { y: 0, scale: 1.2, cameraY: 220, lookAtY: 180 }
  },
  {
    type: 'reformgears',
    name: 'Bánh Răng Cải Cách',
    description: 'Biểu tượng vận hành cải cách, cho thêm điểm thưởng.',
    preview: { y: 0, scale: 1.5, lookAtY: 150 }
  },
  {
    type: 'unityhands',
    name: 'Bàn Tay Đoàn Kết',
    description: 'Tinh thần đoàn kết giữa các tầng lớp, tặng thêm điểm.',
    preview: { y: 40, scale: 2.1, cameraY: 260, lookAtY: 50 }
  }
];

export const PENALTY_OBJECT_GUIDE = [
  {
    type: 'bribeEnvelope',
    name: 'Phong bì hối lộ',
    description: 'Thu nhặt sẽ làm giảm điểm và uy tín – hãy tránh xa.',
    preview: { y: 0, scale: 2.2, lookAtY: 40, cameraZ: 600 }
  },
  {
    type: 'corruptedThrone',
    name: 'Ngai vàng mục nát',
    description: 'Biểu tượng của quyền lực tha hóa, khiến bạn mất rất nhiều điểm.',
    preview: { y: 0, scale: 1.5, cameraY: 220, lookAtY: 120, cameraZ: 720 }
  },
  {
    type: 'puppetManipulation',
    name: 'Rối thao túng',
    description: 'Thao túng dư luận làm tụt đoàn kết và trừ điểm nặng.',
    preview: { y: 0, scale: 2.0, cameraY: 260, lookAtY: 160, cameraZ: 780 }
  },
  {
    type: 'misbalancedScale',
    name: 'Cân công lý lệch',
    description: 'Cán cân bất công làm giảm chỉ số và trừ điểm đáng kể.',
    preview: { y: 0, scale: 1.5, cameraY: 200, lookAtY: 120, cameraZ: 700 }
  }
];
