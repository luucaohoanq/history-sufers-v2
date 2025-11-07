import * as THREE from 'three';
import { createTextLabel } from '../scripts/utils.js';
import { createGLBModel } from '../scripts/create-glb-model.js';

const SIMPLE_TREE_URL = new URL('../assets/objects/SimpleTree.glb', import.meta.url).href;
const VILLAGE_HUT_URL = new URL('../assets/objects/VillageHut.glb', import.meta.url).href;
const CAPITALIST_EXPRESS_URL = new URL('../assets/objects/CapitalistExpress.glb', import.meta.url)
  .href;
const WATER_BUFFALO_URL = new URL('../assets/objects/WaterBuffalo.glb', import.meta.url).href;
const SKYSCRAPER_URL = new URL('../assets/objects/SkyScraper.glb', import.meta.url).href;
const STORAGE_HOUSE_URL = new URL('../assets/objects/StorageHouse.glb', import.meta.url).href;
const HOUSE_URL = new URL('../assets/objects/House.glb', import.meta.url).href;
const BAMBOO_URL = new URL('../assets/objects/Bamboo.glb', import.meta.url).href;
const CROP_FIELD_URL = new URL('../assets/objects/CropField.glb', import.meta.url).href;
const FACTORY_URL = new URL('../assets/objects/Factory.glb', import.meta.url).href;
const COMPANY_URL = new URL('../assets/objects/LargeBuilding_2.glb', import.meta.url).href;
const TRAIN_URL = new URL('../assets/objects/Train.glb', import.meta.url).href;
const GEAR_URL = new URL('../assets/objects/Gear.glb', import.meta.url).href;
const BALLOT_BOX_URL = new URL('../assets/objects/BallotBox.glb', import.meta.url).href;
const FIVEG_TOWER_URL = new URL('../assets/objects/RadioTower.glb', import.meta.url).href;
const LOW_BARRIER_URL = new URL('../assets/objects/TrafficBarrier.glb', import.meta.url).href;

/**
 * A collidable tree in the game positioned at X, Y, Z in the scene and with
 * scale S.
 */

async function loadTreeInstance() {
  const tree = await createGLBModel({
    url: SIMPLE_TREE_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 450,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });

  return tree;
}

export function Tree(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  loadTreeInstance()
    .then((treeInstance) => {
      this.mesh.add(treeInstance);
      this.loadedMesh = treeInstance;
    })
    .catch((error) => {
      console.error('Failed to load tree model:', error);
      this.loadedMesh = null;
    });

  // Gốc đặt theo tham số
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

export function HammerAndSickle(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 0, // Không ảnh hưởng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 10; // Điểm số chung (nếu cần)

  // ===== GOLD MATERIAL (flat 2D color) =====
  const goldMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // ===== BÚA (phía TRƯỚC liềm) =====
  const handleGeom = new THREE.CylinderGeometry(3.5, 3.5, 130, 12);
  const handle = new THREE.Mesh(handleGeom, goldMaterial);
  handle.rotation.z = Math.PI * 0.3;
  handle.position.set(-8, -10, 5);

  const headGeom = new THREE.BoxGeometry(45, 18, 20);
  const head = new THREE.Mesh(headGeom, goldMaterial);
  head.rotation.z = Math.PI * 0.3;
  head.position.set(28, 22, 5);

  const neckGeom = new THREE.BoxGeometry(10, 20, 10);
  const neck = new THREE.Mesh(neckGeom, goldMaterial);
  neck.rotation.z = Math.PI * 0.3;
  neck.position.set(10, 5, 5);

  // ===== LIỀM (phía SAU búa) =====
  const sickleGeom = new THREE.TorusGeometry(90, 8, 24, 200, Math.PI * 1.55);
  const sickle = new THREE.Mesh(sickleGeom, goldMaterial);
  sickle.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  sickle.position.set(-10, 5, 0);

  const innerGeom = new THREE.TorusGeometry(75, 5, 16, 180, Math.PI * 1.5);
  const inner = new THREE.Mesh(innerGeom, goldMaterial);
  inner.rotation.set(Math.PI / 2, 0, -Math.PI * 0.25);
  inner.position.set(-10, 5, 0);

  const bladeGeom = new THREE.ConeGeometry(9, 30, 12);
  const blade = new THREE.Mesh(bladeGeom, goldMaterial);
  blade.position.set(-78, 38, 0);
  blade.rotation.set(0, 0, -Math.PI * 0.6);

  this.mesh.add(sickle, inner, blade, handle, neck, head);
  this.mesh.rotation.z = Math.PI * 0.5;
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'hammerandsickle';
  this.isCollected = false;
  this.particles = [];

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.visible = false;
    }
  };

  this.collect = function () {
    this.isCollected = true;
    this.spawnParticles();
  };

  this.spawnParticles = function () {
    for (let i = 0; i < 18; i++) {
      let geom = new THREE.SphereGeometry(4, 8, 8);
      let mat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 1
      });
      let spark = new THREE.Mesh(geom, mat);
      spark.position.set(
        (Math.random() - 0.5) * 60,
        Math.random() * 60,
        (Math.random() - 0.5) * 40
      );
      this.mesh.add(spark);
      this.particles.push(spark);
    }
  };
}

export function BribeEnvelope(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -15, // Giảm niềm tin
    justice: -20, // Giảm công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = -2000; // Tổng điểm âm

  var paperMat = new THREE.MeshBasicMaterial({ color: 0xe5d3b3 });

  var moneyMat = new THREE.MeshBasicMaterial({ color: 0x2e8b57 });

  var envelope = new THREE.Mesh(new THREE.BoxGeometry(120, 80, 6, 1, 1, 1), paperMat);
  envelope.position.set(0, 0, 0);

  var flapShape = new THREE.Shape();
  flapShape.moveTo(-60, 0);
  flapShape.lineTo(60, 0);
  flapShape.lineTo(0, 50);
  flapShape.lineTo(-60, 0);

  var flapGeom = new THREE.ShapeGeometry(flapShape);
  var flap = new THREE.Mesh(flapGeom, paperMat);
  flap.position.set(0, 20, 3.5);
  flap.rotation.x = -Math.PI * 0.5;

  var money = new THREE.Mesh(new THREE.BoxGeometry(100, 65, 3), moneyMat);
  money.position.set(0, 5, -3.2);
  money.rotation.z = Math.PI * 0.02;

  var creaseGeom = new THREE.PlaneGeometry(120, 0.8);
  var crease = new THREE.Mesh(creaseGeom, new THREE.MeshBasicMaterial({ color: 0xd0c1a2 }));
  crease.position.set(0, 0, 3.2);

  // removed point light - flat colors

  this.mesh.add(envelope, money, flap, crease);
  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'bribeEnvelope';
  this.scale = s;
  this.isCollected = false;

  this.update = function () {
    this.mesh.rotation.y += 0.008;
    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

function loadBallotBoxInstance() {
  return createGLBModel({
    url: BALLOT_BOX_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 250,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function BallotBox(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 25, // Tăng niềm tin
    justice: 0, // Không ảnh hưởng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 500; // Điểm dương
  this.type = 'ballotbox';
  this.isCollected = false;

  // Load GLB model thay vì tạo manual
  loadBallotBoxInstance()
    .then((ballotBox) => {
      this.mesh.add(ballotBox);
      this.loadedMesh = ballotBox;
    })
    .catch((error) => {
      console.error('Failed to load ballot box model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'ballotbox';

  this.update = function () {
    // Xoay tổng thể ballot box
    this.mesh.rotation.y += 0.008;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

export function RuleOfLawState(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 30, // Tăng niềm tin mạnh
    justice: 35, // Tăng công bằng mạnh
    unity: 20 // Tăng đoàn kết
  };
  this.buffValue = 750; // Điểm dương cao nhất

  var metalMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  var goldMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
  var woodMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
  var bookMat = new THREE.MeshBasicMaterial({ color: 0xf3e5ab });

  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), woodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  var plinth = new THREE.Mesh(new THREE.BoxGeometry(120, 16, 60), metalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  var post = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 180, 20), metalMat);
  post.position.set(0, 128, 0);
  this.mesh.add(post);

  var arm = new THREE.Mesh(new THREE.BoxGeometry(160, 8, 8), metalMat);
  arm.position.set(0, 200, 0);
  this.mesh.add(arm);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 12), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  function makePan() {
    var group = new THREE.Object3D();
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 4, 32), metalMat);
    var hanger = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 40, 8), metalMat);
    plate.rotation.x = Math.PI;
    hanger.position.set(0, 20, 0);
    group.add(plate, hanger);
    return group;
  }

  var leftGroup = makePan();
  var rightGroup = makePan();
  leftGroup.position.set(-70, 160, 0);
  rightGroup.position.set(70, 160, 0);
  this.mesh.add(leftGroup, rightGroup);

  function chainBetween(x1, y1, z1, x2, y2, z2) {
    var len = Math.hypot(x2 - x1, y2 - y1, z2 - z1);
    var cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, len, 8), metalMat);
    cyl.position.set((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    cyl.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(x2 - x1, y2 - y1, z2 - z1).normalize()
    );
    return cyl;
  }
  this.mesh.add(chainBetween(-70, 200, 0, -70, 180, 0));
  this.mesh.add(chainBetween(70, 200, 0, 70, 180, 0));

  function createThinStar(points, outer, inner, material, depth) {
    var shape = new THREE.Shape();
    for (var i = 0; i < 2 * points; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (i * Math.PI) / points - Math.PI / 2;
      var x = Math.cos(a) * r;
      var y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    var geom = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false });
    return new THREE.Mesh(geom, material);
  }

  var star = createThinStar(5, 40, 16, goldMat, 2);
  star.position.set(0, 260, -45);
  star.rotation.x = -Math.PI / 10;
  this.mesh.add(star);

  var bookGroup = new THREE.Object3D();
  var book = new THREE.Mesh(new THREE.BoxGeometry(60, 6, 40), bookMat);
  var stripe = new THREE.Mesh(
    new THREE.BoxGeometry(56, 2, 6),
    new THREE.MeshStandardMaterial({ color: 0x8b0000 })
  );
  book.position.set(0, 0, 0);
  stripe.position.set(0, 2, 12);
  bookGroup.position.set(0, 34, 0);
  bookGroup.add(book, stripe);
  this.mesh.add(bookGroup);

  var cap = new THREE.Mesh(new THREE.TorusGeometry(14, 2, 8, 24), goldMat);
  cap.position.set(0, 290, 0);
  cap.rotation.x = Math.PI / 2;
  this.mesh.add(cap);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'ruleOfLawState';

  this._rotateEnabled = true;
  this._rotationSpeed = 0.005;
  this._tilt = 0;
  this._tiltDir = 1;

  this.update = function () {
    if (this._rotateEnabled) this.mesh.rotation.y += this._rotationSpeed;
    this._tilt += 0.0008 * this._tiltDir;
    if (Math.abs(this._tilt) > 0.02) this._tiltDir *= -1;
    arm.rotation.z = this._tilt;
    pivot.rotation.z = this._tilt * 0.5;
    leftGroup.rotation.z = -this._tilt * 1.2;
    rightGroup.rotation.z = this._tilt * 1.2;
    star.rotation.z += 0.002;
    star.position.y = 260 + Math.sin(Date.now() * 0.001) * 1.0;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  // removed point light - using flat MeshBasicMaterial

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 1.2;
    var obstMinX = self.mesh.position.x - scaleFactor * 110;
    var obstMaxX = self.mesh.position.x + scaleFactor * 110;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 300;
    var obstMinZ = self.mesh.position.z - scaleFactor * 60;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 60;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

function loadGearInstance() {
  return createGLBModel({
    url: GEAR_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 200,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function ReformGears(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 30, // Tăng công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = 50; // Điểm dương

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'reformgears';
  this.isCollected = false;

  // Load GLB model thay vì tạo manual
  loadGearInstance().then((gear) => {
    this.mesh.add(gear);
  });

  this.update = function () {
    this.mesh.rotation.y += 0.004;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var obstMinX = self.mesh.position.x - s * 200;
    var obstMaxX = self.mesh.position.x + s * 200;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + s * 260;
    var obstMinZ = self.mesh.position.z - s * 150;
    var obstMaxZ = self.mesh.position.z + s * 150;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

export function UnityHands(x, y, z, s) {
  var self = this;
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 20, // Tăng niềm tin
    justice: 0, // Không ảnh hưởng
    unity: 35 // Tăng đoàn kết mạnh
  };
  this.buffValue = 100; // Điểm dương

  var skinMat = new THREE.MeshBasicMaterial({ color: 0xf2d2b6 });
  var bookMat = new THREE.MeshBasicMaterial({ color: 0x3e2723 });
  var gearMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  var hoeMat = new THREE.MeshBasicMaterial({ color: 0x665544 });

  function createHand() {
    var hand = new THREE.Object3D();
    var palm = new THREE.Mesh(new THREE.BoxGeometry(40, 15, 50), skinMat);
    palm.position.set(0, 0, 0);
    hand.add(palm);

    for (let i = -1.5; i <= 1.5; i++) {
      var finger = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 30), skinMat);
      finger.position.set(i * 12, 0, 35);
      hand.add(finger);
    }
    return hand;
  }

  function createBook() {
    return new THREE.Mesh(new THREE.BoxGeometry(30, 10, 40), bookMat);
  }

  function createGear() {
    return new THREE.Mesh(new THREE.CylinderGeometry(20, 20, 8, 16), gearMat);
  }

  function createHoe() {
    var hoe = new THREE.Object3D();
    var handle = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 80, 8), hoeMat);
    var head = new THREE.Mesh(new THREE.BoxGeometry(30, 4, 10), hoeMat);
    head.position.set(0, 40, 10);
    hoe.add(handle, head);
    return hoe;
  }

  var handWorker = createHand();
  var handFarmer = createHand();
  var handScholar = createHand();

  handWorker.position.set(-50, 0, 0);
  handWorker.rotation.set(0, Math.PI * 0.2, 0);

  handFarmer.position.set(50, 0, 0);
  handFarmer.rotation.set(0, -Math.PI * 0.2, 0);

  handScholar.position.set(0, 0, -50);
  handScholar.rotation.set(-Math.PI * 0.2, 0, 0);

  var gear = createGear();
  gear.position.set(0, 5, 20);
  handWorker.add(gear);

  var hoe = createHoe();
  hoe.position.set(0, 5, 25);
  hoe.rotation.set(0, Math.PI * 0.2, 0);
  handFarmer.add(hoe);

  var book = createBook();
  book.position.set(0, 5, 25);
  handScholar.add(book);

  this.mesh.add(handWorker, handFarmer, handScholar);

  this.mesh.position.set(x, y + 100, z);
  this.mesh.scale.set(s * 1.5, s * 1.5, s * 1.5);
  this.type = 'unityhands';

  this.mesh.rotation.x = Math.PI / 4;
  this.mesh.rotation.y = Math.PI;

  this.scale = s; // Thêm dòng này để scale hoạt động đúng
  this.mesh.position.set(x, y, z); // Bỏ cộng +100 nếu muốn player chạm được
  this.isCollected = false; // Giống BribeEnvelope

  this.update = function () {
    this.mesh.rotation.y += 0.004;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  // removed point light

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    var scaleFactor = Math.sqrt(this.scale) * 2.5;
    var obstMinX = self.mesh.position.x - scaleFactor * 100;
    var obstMaxX = self.mesh.position.x + scaleFactor * 100;
    var obstMinY = self.mesh.position.y;
    var obstMaxY = self.mesh.position.y + scaleFactor * 200;
    var obstMinZ = self.mesh.position.z - scaleFactor * 100;
    var obstMaxZ = self.mesh.position.z + scaleFactor * 100;
    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
}

export function CorruptedThrone(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -30, // Giảm niềm tin mạnh
    justice: -25, // Giảm công bằng
    unity: 0 // Không ảnh hưởng
  };
  this.buffValue = -5000; // Điểm âm cao
  this.isCollected = false;

  const woodMat = new THREE.MeshBasicMaterial({ color: 0x4b3621 });
  const webMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 });
  const vineMat = new THREE.MeshBasicMaterial({ color: 0x556b2f });

  const SCALE = 1.5;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(80 * SCALE, 20 * SCALE, 80 * SCALE), woodMat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(80 * SCALE, 120 * SCALE, 15 * SCALE), woodMat);

  const armL = new THREE.Mesh(new THREE.BoxGeometry(15 * SCALE, 40 * SCALE, 60 * SCALE), woodMat);
  const armR = armL.clone();
  armL.position.set(-50 * SCALE, 40 * SCALE, 0);
  armR.position.set(50 * SCALE, 40 * SCALE, 0);

  const leg1 = new THREE.Mesh(new THREE.BoxGeometry(15 * SCALE, 50 * SCALE, 15 * SCALE), woodMat);
  const leg2 = leg1.clone(),
    leg3 = leg1.clone(),
    leg4 = leg1.clone();
  leg1.position.set(-30 * SCALE, 10 * SCALE, 30 * SCALE);
  leg2.position.set(30 * SCALE, 10 * SCALE, 30 * SCALE);
  leg3.position.set(-30 * SCALE, 10 * SCALE, -30 * SCALE);
  leg4.position.set(30 * SCALE, 10 * SCALE, -30 * SCALE);

  back.position.set(0, 70 * SCALE, -35 * SCALE);
  seat.position.set(0, 25 * SCALE, 0);

  this.mesh.add(seat, back, armL, armR, leg1, leg2, leg3, leg4);

  // removed point light

  function createWeb(size, pos, rot) {
    let web = new THREE.Mesh(new THREE.PlaneGeometry(size * SCALE, size * SCALE), webMat);
    web.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
    web.rotation.set(rot.x, rot.y, rot.z);
    return web;
  }
  this.mesh.add(
    createWeb(70, { x: -40, y: 60, z: 0 }, { x: 0, y: Math.PI / 2, z: 0 }),
    createWeb(60, { x: 0, y: 40, z: 45 }, { x: Math.PI / 2, y: 0, z: 0 })
  );

  function createVine(pos, rot) {
    const vine = new THREE.Mesh(
      new THREE.CylinderGeometry(2 * SCALE, 2 * SCALE, 100 * SCALE, 8),
      vineMat
    );
    vine.position.set(pos.x * SCALE, pos.y * SCALE, pos.z * SCALE);
    vine.rotation.set(rot.x, rot.y, rot.z);
    return vine;
  }
  this.mesh.add(
    createVine({ x: 20, y: 60, z: -20 }, { x: Math.PI * 0.4, y: 0, z: 0 }),
    createVine({ x: -25, y: 50, z: 10 }, { x: -Math.PI * 0.3, y: 0, z: Math.PI * 0.2 })
  );

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'corruptedThrone';
  this.scale = s;

  this.update = function () {
    this.mesh.rotation.y += 0.003;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const scaleFactor = Math.sqrt(s) * 1.2;
    const size = 80 * SCALE * scaleFactor;
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    return (
      px - size <= maxX &&
      px + size >= minX &&
      py <= maxY &&
      py + size * 2 >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

export function PuppetManipulation(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: -25, // Giảm niềm tin
    justice: 0, // Không ảnh hưởng
    unity: -20 // Giảm đoàn kết
  };
  this.buffValue = -4500; // Điểm âm
  this.isCollected = false;

  const woodMat = new THREE.MeshBasicMaterial({ color: 0x8b5a2b });
  const stringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, 80, 16), woodMat);
  body.position.set(0, 80, 0);

  const head = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 24), woodMat);
  head.position.set(0, 120, 0);

  const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 60, 12), woodMat);
  leftArm.position.set(-20, 100, 0);
  leftArm.rotation.z = Math.PI / 4;

  const rightArm = leftArm.clone();
  rightArm.position.set(20, 100, 0);
  rightArm.rotation.z = -Math.PI / 4;

  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 70, 12), woodMat);
  leftLeg.position.set(-10, 35, 0);

  const rightLeg = leftLeg.clone();
  rightLeg.position.set(10, 35, 0);

  this.mesh.add(body, head, leftArm, rightArm, leftLeg, rightLeg);

  function createString(from, to) {
    const len = from.distanceTo(to);
    const geo = new THREE.CylinderGeometry(0.5, 0.5, len, 8);
    const mesh = new THREE.Mesh(geo, stringMat);
    mesh.position.copy(from).lerp(to, 0.5);

    const dir = new THREE.Vector3().subVectors(to, from).normalize();
    const axis = new THREE.Vector3(0, 1, 0).cross(dir);
    const angle = Math.acos(dir.y);
    if (axis.length() > 0) axis.normalize();
    mesh.quaternion.setFromAxisAngle(axis, angle);
    return mesh;
  }

  const topPoint = new THREE.Vector3(0, 200, 0);
  this.mesh.add(
    createString(head.position.clone(), topPoint),
    createString(leftArm.position.clone(), topPoint.clone().add(new THREE.Vector3(-20, 0, 0))),
    createString(rightArm.position.clone(), topPoint.clone().add(new THREE.Vector3(20, 0, 0)))
  );

  const handBar = new THREE.Mesh(new THREE.BoxGeometry(80, 15, 30), woodMat);
  handBar.position.set(0, 215, 0);
  handBar.rotation.x = -Math.PI * 0.1;
  this.mesh.add(handBar);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'puppetManipulation';

  this._rotationSpeed = 0.004;
  this.update = function () {
    this.mesh.rotation.y += this._rotationSpeed;
    head.rotation.y = Math.sin(Date.now() * 0.002) * 0.2;
    leftArm.rotation.z = Math.sin(Date.now() * 0.0015) * 0.3 + Math.PI / 4;
    rightArm.rotation.z = -Math.sin(Date.now() * 0.0015) * 0.3 - Math.PI / 4;

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    let scaleFactor = Math.sqrt(s) * 1.2;
    let size = 150 * scaleFactor;
    let px = this.mesh.position.x;
    let py = this.mesh.position.y;
    let pz = this.mesh.position.z;
    return (
      px - size <= maxX &&
      px + size >= minX &&
      py <= maxY &&
      py + size >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

export function MisbalancedScale(x, y, z, s) {
  this.mesh = new THREE.Object3D();

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0, // Không ảnh hưởng
    justice: 0, // Không ảnh hưởng
    unity: -30 // Giảm đoàn kết mạnh (bất công xã hội)
  };
  this.buffValue = -3000; // Điểm âm
  this.isCollected = false;

  var metalMat = new THREE.MeshBasicMaterial({ color: 0x555555 });
  var darkMetalMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
  var goldMat = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
  var dullWoodMat = new THREE.MeshBasicMaterial({ color: 0x4b3a2a });

  var base = new THREE.Mesh(new THREE.BoxGeometry(220, 20, 120), dullWoodMat);
  base.position.set(0, 10, 0);
  this.mesh.add(base);

  var plinth = new THREE.Mesh(new THREE.BoxGeometry(140, 18, 70), darkMetalMat);
  plinth.position.set(0, 38, 0);
  this.mesh.add(plinth);

  var pillar = new THREE.Mesh(new THREE.CylinderGeometry(7, 9, 180, 20), metalMat);
  pillar.position.set(0, 128, 0);
  this.mesh.add(pillar);

  var beam = new THREE.Mesh(new THREE.BoxGeometry(220, 10, 10), metalMat);
  beam.position.set(0, 200, 0);
  this.mesh.add(beam);

  var pivot = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 16), goldMat);
  pivot.position.set(0, 200, 0);
  this.mesh.add(pivot);

  function makePan() {
    var grp = new THREE.Object3D();
    var plate = new THREE.Mesh(new THREE.CylinderGeometry(32, 32, 4, 32), metalMat);
    plate.rotation.x = Math.PI;
    grp.add(plate);

    var hanger = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 45, 12), metalMat);
    hanger.position.set(0, 25, 0);
    grp.add(hanger);
    return grp;
  }

  var leftPan = makePan();
  var rightPan = makePan();
  leftPan.position.set(-80, 160, 0);
  rightPan.position.set(80, 160, 0);
  this.mesh.add(leftPan, rightPan);

  var person = new THREE.Mesh(
    new THREE.CylinderGeometry(5, 5, 40, 12),
    new THREE.MeshBasicMaterial({ color: 0xdddddd })
  );
  person.position.set(0, 22, 0);
  leftPan.add(person);

  for (let i = 0; i < 3; i++) {
    let gold = new THREE.Mesh(new THREE.BoxGeometry(30, 15, 20), goldMat);
    gold.position.set(i * 25 - 25, 10, 0);
    rightPan.add(gold);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.type = 'misbalancedScale';

  this.collider = new THREE.Box3().setFromObject(this.mesh);

  this._tilt = -0.12;
  this._rotateEnabled = true;
  this._rotationSpeed = 0.004;

  // no point light - flat materials

  this.update = function () {
    if (this._rotateEnabled) this.mesh.rotation.y += this._rotationSpeed;

    beam.rotation.z = this._tilt;
    pivot.rotation.z = this._tilt * 0.5;
    leftPan.rotation.z = -this._tilt * 1.2;
    rightPan.rotation.z = this._tilt * 1.2;

    this.collider.setFromObject(this.mesh);

    if (this.isCollected) {
      this.mesh.visible = false;
      return;
    }
  };

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const px = this.mesh.position.x;
    const py = this.mesh.position.y;
    const pz = this.mesh.position.z;
    const scaleFactor = Math.sqrt(s) * 1.2;
    const size = 200 * scaleFactor;

    return (
      px - size <= maxX &&
      px + size >= minX &&
      py - size <= maxY &&
      py + size >= minY &&
      pz - size <= maxZ &&
      pz + size >= minZ
    );
  };
}

function loadBarrierModel() {
  return createGLBModel({
    url: LOW_BARRIER_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 450,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function LowBarrier(x, y, z, s, scene) {
  var self = this;
  this.mesh = new THREE.Object3D();
  this.scene = scene;

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0,
    justice: 0,
    unity: 0
  };
  this.buffValue = 0;
  this.type = 'lowBarrier';
  this.scale = s;
  this.mesh.userData = { deadly: true };

  // Load GLB model thay cho tạo thủ công
  loadBarrierModel()
    .then((barrier) => {
      this.mesh.add(barrier);
      this.loadedMesh = barrier;
    })
    .catch((error) => {
      console.error('Failed to load barrier model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const width = 600 * this.scale; // ±300
    const height = 800 * this.scale; // 0 -> 800
    const depth = 100 * this.scale; // ±50

    const obstMinX = self.mesh.position.x - width / 2;
    const obstMaxX = self.mesh.position.x + width / 2;
    const obstMinY = self.mesh.position.y;
    const obstMaxY = self.mesh.position.y + height;
    const obstMinZ = self.mesh.position.z - depth / 2;
    const obstMaxZ = self.mesh.position.z + depth / 2;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };
  this.enableHitbox = false; // tắt mặc định

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      let expandSize = 0.2;
      bbox.expandByScalar(expandSize);
      let box = new THREE.Box3Helper(bbox, 0xff0000);
      box.material.depthTest = false;
      box.material.depthWrite = false;
      box.renderOrder = 9999;
      scene.add(box);
      this.hitboxHelper = box;
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      bbox.expandByScalar(0.2);
      this.hitboxHelper.box.copy(bbox);
    }
  };
}

export function HighBarrier(x, y, z, s, scene) {
  var self = this;
  this.mesh = new THREE.Group();
  this.scene = scene;

  // ===== BUFF SYSTEM =====
  this.buffs = {
    trust: 0,
    justice: 0,
    unity: 0
  };
  this.buffValue = 0;

  // Trụ bên trái
  const leftPole = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1000, 16), // Scale up đáng kể
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  leftPole.position.set(-250, 0, 0);
  this.mesh.add(leftPole);

  // Trụ bên phải
  const rightPole = new THREE.Mesh(
    new THREE.CylinderGeometry(30, 30, 1000, 16),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  rightPole.position.set(250, 0, 0);
  this.mesh.add(rightPole);

  // Thanh ngang trên cao (phần deadly) - cao hơn để nhảy qua được, thấp hơn để slide qua được
  const BAR_Y = 700; // tăng thêm 100 đơn vị so với trước (600 -> 700)
  const topBar = new THREE.Mesh(
    new THREE.BoxGeometry(550, 550, 80), // Rộng gần bằng tree
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  topBar.position.set(0, BAR_Y, 0); // Cao hơn để character nhảy không chạm
  this.mesh.add(topBar);

  // Dải cảnh báo đỏ trắng
  const stripeWidth = 140;
  for (let i = 0; i < 4; i++) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(stripeWidth, 50, 85),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xff0000,
        emissiveIntensity: 0.3
      })
    );
    stripe.position.set(-210 + i * stripeWidth, BAR_Y, 0);
    this.mesh.add(stripe);
  }

  // Warning sign
  const warningSign = new THREE.Mesh(
    new THREE.CircleGeometry(50, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5
    })
  );
  warningSign.position.set(0, BAR_Y, 50);
  this.mesh.add(warningSign);

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.scale = s;
  this.type = 'highBarrier';
  this.mesh.userData = { deadly: true };

  // ===== COLLISION DETECTION =====
  this.collides = function (minX, maxX, minY, maxY, minZ, maxZ) {
    const barWidth = 550 * this.scale; // ±275
    const barHeight = 500 * this.scale;
    const barDepth = 80 * this.scale; // ±40
    const barY = self.mesh.position.y + BAR_Y * this.scale; // Vị trí Y tuyệt đối

    const obstMinX = self.mesh.position.x - barWidth / 2;
    const obstMaxX = self.mesh.position.x + barWidth / 2;
    const obstMinY = barY - barHeight / 2;
    const obstMaxY = barY + barHeight / 2;
    const obstMinZ = self.mesh.position.z - barDepth / 2;
    const obstMaxZ = self.mesh.position.z + barDepth / 2;

    return (
      obstMinX <= maxX &&
      obstMaxX >= minX &&
      obstMinY <= maxY &&
      obstMaxY >= minY &&
      obstMinZ <= maxZ &&
      obstMaxZ >= minZ
    );
  };

  this.enableHitbox = false; // tắt mặc định

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      // Tính bounding box gốc
      let bbox = new THREE.Box3().setFromObject(this.mesh);

      let expandSize = 0.2;
      bbox.expandByScalar(expandSize);

      // Tạo BoxHelper từ box đã mở rộng
      let box = new THREE.Box3Helper(bbox, 0xff0000);
      box.material.depthTest = false;
      box.material.depthWrite = false;
      box.renderOrder = 9999;
      scene.add(box);

      this.hitboxHelper = box;
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      // Cập nhật vị trí theo mesh nhưng **giữ kích thước mở rộng**
      let bbox = new THREE.Box3().setFromObject(this.mesh);
      bbox.expandByScalar(0.2);
      this.hitboxHelper.box.copy(bbox);
    }
  };
}

async function loadCapitalistExpressInstance() {
  return createGLBModel({
    url: CAPITALIST_EXPRESS_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 630,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function CapitalistExpress(x, y, z, s, scene) {
  this.mesh = new THREE.Object3D();
  this.type = 'capitalistExpress';
  this.speed = 200;
  this.scene = scene;
  this.scale = s;
  this.mesh.userData = { deadly: true };

  loadCapitalistExpressInstance()
    .then((train) => {
      this.mesh.add(train);
      this.loadedMesh = train;

      this.updateHitbox();
    })
    .catch((error) => {
      console.error('Failed to load Capitalist Express model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  this.update = function () {
    this.mesh.position.z += this.speed;
    if (this.mesh.position.z > 2000) {
      scene.remove(this.mesh);
    }
    this.updateHitbox();
  };

  this.collides = function (
    playerMinX,
    playerMaxX,
    playerMinY,
    playerMaxY,
    playerMinZ,
    playerMaxZ
  ) {
    const customWidth = 300 * this.scale;
    const customHeight = 400 * this.scale;
    const customDepth = 200 * this.scale;

    const minX = this.mesh.position.x - customWidth / 2;
    const maxX = this.mesh.position.x + customWidth / 2;
    const minY = this.mesh.position.y;
    const maxY = this.mesh.position.y + customHeight;
    const minZ = this.mesh.position.z - customDepth / 2;
    const maxZ = this.mesh.position.z + customDepth / 2;

    return (
      minX <= playerMaxX &&
      maxX >= playerMinX &&
      minY <= playerMaxY &&
      maxY >= playerMinY &&
      minZ <= playerMaxZ &&
      maxZ >= playerMinZ
    );
  };
  this.enableHitbox = true;

  this.showHitbox = function () {
    if (!this.hitboxHelper) {
      // Tạo hitbox visualization dựa trên kích thước tự định nghĩa
      const customWidth = 300 * this.scale;
      const customHeight = 400 * this.scale;
      const customDepth = 200 * this.scale;

      const geometry = new THREE.BoxGeometry(customWidth, customHeight, customDepth);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        transparent: true,
        opacity: 0.6
      });

      this.hitboxHelper = new THREE.Mesh(geometry, material);
      this.hitboxHelper.position.set(
        this.mesh.position.x,
        this.mesh.position.y + customHeight / 2,
        this.mesh.position.z
      );
      scene.add(this.hitboxHelper);
    }
    this.hitboxHelper.visible = true;
  };

  this.updateHitbox = function () {
    if (this.hitboxHelper) {
      const customHeight = 400 * this.scale;
      this.hitboxHelper.position.set(
        this.mesh.position.x,
        this.mesh.position.y + customHeight / 2,
        this.mesh.position.z
      );
    }
  };
}

async function loadVillageHutInstance() {
  return createGLBModel({
    url: VILLAGE_HUT_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 480,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function VillageHut(x, y, z, s) {
  this.mesh = new THREE.Object3D();
  this.type = 'villageHut';
  this.mesh.userData = { sideElement: true };

  loadVillageHutInstance()
    .then((hut) => {
      this.mesh.add(hut);
      this.loadedMesh = hut;
    })
    .catch((error) => {
      console.error('Failed to load village hut model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  const baseScale = 1 * s;
  this.mesh.scale.set(baseScale, baseScale, baseScale);
  this.mesh.rotation.y = Math.PI / 2;
}

async function loadBambooInstance() {
  return createGLBModel({
    url: BAMBOO_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 750,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function BambooTree(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'bambooTree';
  this.mesh.userData = { sideElement: true };

  loadBambooInstance()
    .then((bamboo) => {
      this.mesh.add(bamboo);
      this.loadedMesh = bamboo;
    })
    .catch((error) => {
      console.error('Failed to load bamboo model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

async function loadWaterBuffaloInstance() {
  return createGLBModel({
    url: WATER_BUFFALO_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 250,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function WaterBuffalo(x, y, z, s) {
  this.mesh = new THREE.Object3D();
  this.type = 'waterBuffalo';
  this.mesh.userData = { deadly: false };

  loadWaterBuffaloInstance()
    .then((buffalo) => {
      this.mesh.add(buffalo);
      this.loadedMesh = buffalo;
    })
    .catch((error) => {
      console.error('Failed to load water buffalo model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

async function loadRiceStorage() {
  return createGLBModel({
    url: STORAGE_HOUSE_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 450,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function RiceStorage(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'riceStorage';

  loadRiceStorage()
    .then((storage) => {
      this.mesh.add(storage);
      this.loadedMesh = storage;
    })
    .catch((error) => {
      console.error('Failed to load rice storage model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.mesh.rotation.y = Math.PI;
}

function loadCropFieldModel() {
  return createGLBModel({
    url: CROP_FIELD_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 150,
    snapToGround: false,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function CropField(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'cropField';

  loadCropFieldModel()
    .then((field) => {
      this.mesh.add(field);
      this.loadedMesh = field;
    })
    .catch((error) => {
      console.error('Failed to load crop field model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

function loadOldFactoryModel() {
  return createGLBModel({
    url: FACTORY_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 800,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function OldFactory(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'oldFactory';

  loadOldFactoryModel()
    .then((factory) => {
      this.mesh.add(factory);
    })
    .catch((error) => {
      console.error('Failed to load old factory model:', error);
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);

  // Quay ngang sang phải (trục Y, 90 độ)
  this.mesh.rotation.y = -Math.PI / 2;
}

function createHouseInstance() {
  return createGLBModel({
    url: HOUSE_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 700,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function House(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'house';

  createHouseInstance()
    .then((house) => {
      this.mesh.add(house);
    })
    .catch((error) => {
      console.error('Failed to load house model:', error);
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.mesh.rotation.y = -Math.PI / 2;
}

function loadFiveGTowerModel() {
  return createGLBModel({
    url: FIVEG_TOWER_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 1200,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function FiveGTower(x, y, z, s) {
  this.mesh = new THREE.Object3D(); // Initialize mesh first!
  this.type = 'fiveGTower';
  this.mesh.userData = { sideElement: true };

  loadFiveGTowerModel()
    .then((tower) => {
      this.mesh.add(tower);
      this.loadedMesh = tower;
    })
    .catch((error) => {
      console.error('Failed to load 5G tower model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

function loadTrainModel() {
  return createGLBModel({
    url: TRAIN_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 200,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function MetroStation(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'metroStation';

  // Platform base - kích thước lớn và cố định
  const platformWidth = 800;
  const platformHeight = 50;
  const platformDepth = 300;

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth),
    new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
  );
  platform.position.y = platformHeight / 2;
  this.mesh.add(platform);

  // Station roof - mái nhà lớn
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(platformWidth / 2, platformWidth / 2, 80, 32, 1, true, 0, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0xeeeeee, side: THREE.DoubleSide })
  );
  roof.position.y = 200;
  roof.rotation.z = Math.PI / 2;
  this.mesh.add(roof);

  // Glass walls
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0.4
  });
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(platformWidth, 150, 10), glassMat);
  frontWall.position.set(0, 100, platformDepth / 2);
  this.mesh.add(frontWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(platformWidth, 150, 10), glassMat);
  backWall.position.set(0, 100, -platformDepth / 2);
  this.mesh.add(backWall);

  // Support pillars
  const pillarGeom = new THREE.CylinderGeometry(15, 15, 200, 12);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  for (let i = -3; i <= 3; i++) {
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.set(i * 120, 100, -platformDepth / 3);
    this.mesh.add(pillar);
  }

  // Load and add train model in the center
  loadTrainModel()
    .then((train) => {
      // Đặt train ở giữa platform
      train.position.set(0, platformHeight + 10, 0); // Hơi cao hơn platform
      train.rotation.y = Math.PI / 2; // Xoay train song song với platform
      this.mesh.add(train);
      this.trainModel = train;
    })
    .catch((error) => {
      console.error('Failed to load train model for metro station:', error);
    });

  // Station sign
  if (typeof createTextLabel === 'function') {
    const signGroup = new THREE.Group();
    const label = createTextLabel('METRO', 200, 60, {
      color: '#FFFFFFFF',
      bg: 'rgba(255,68,68,0.5)',
      font: 'Arial',
      fontSize: 40,
      pxPerUnit: 0.5
    });

    // Đặt label ở mặt trước của ga tàu (về phía người chơi - trục Z dương)
    label.position.set(0, 120, platformDepth / 2 + 15); // Hơi ra ngoài tường kính
    signGroup.add(label);

    // Sign group không bị rotation của mesh chính
    this.mesh.add(signGroup);
  }

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s); // Chỉ scale theo parameter s
  // Quay ngang sang phải (trục Y, 90 độ)
  this.mesh.rotation.y = -Math.PI / 2;
}

function loadSkyscraperModel() {
  return createGLBModel({
    url: SKYSCRAPER_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 3000,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function Skyscraper(x, y, z, s) {
  this.mesh = new THREE.Object3D(); // Initialize mesh first!
  this.type = 'skyscraper';
  this.mesh.userData = { sideElement: true };

  loadSkyscraperModel()
    .then((skyscraper) => {
      this.mesh.add(skyscraper);
      this.loadedMesh = skyscraper;
    })
    .catch((error) => {
      console.error('Failed to load skyscraper model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
}

function loadCompanyModel() {
  return createGLBModel({
    url: COMPANY_URL,
    castShadow: true,
    receiveShadow: true,
    desiredHeight: 1000,
    desiredWidth: 300,
    snapToGround: true,
    onClone: (root) => {
      root.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
    }
  });
}

export function Company(x, y, z, s) {
  this.mesh = new THREE.Group();
  this.type = 'company';

  loadCompanyModel()
    .then((company) => {
      this.mesh.add(company);
      this.loadedMesh = company;
    })
    .catch((error) => {
      console.error('Failed to load company model:', error);
      this.loadedMesh = null;
    });

  this.mesh.position.set(x, y, z);
  this.mesh.scale.set(s, s, s);
  this.mesh.rotation.y = -Math.PI / 2;
}
