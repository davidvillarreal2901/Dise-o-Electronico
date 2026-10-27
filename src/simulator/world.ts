import * as THREE from 'three';

export interface InspectionSite {
  id: string;
  name: string;
  location: string;
  position: THREE.Vector3;
  facadeZ: number;
  severity: 'Moderada' | 'Alta';
  finding: string;
}

export interface BuildingBounds {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

export const BUILDINGS: BuildingBounds[] = [
  { x: -14, z: -7, width: 10, depth: 9, height: 13 },
  { x: 0, z: -13, width: 11, depth: 10, height: 17 },
  { x: 14, z: -7, width: 10, depth: 9, height: 12 },
];

export const SITES: InspectionSite[] = [
  {
    id: '01',
    name: 'Edificio A',
    location: 'Fachada principal',
    position: new THREE.Vector3(-14, 6, 1),
    facadeZ: -2.5,
    severity: 'Moderada',
    finding: 'Fisuras diagonales en la fachada',
  },
  {
    id: '02',
    name: 'Edificio B',
    location: 'Estructura central',
    position: new THREE.Vector3(0, 8, -4),
    facadeZ: -8,
    severity: 'Alta',
    finding: 'Grietas en zona estructural',
  },
  {
    id: '03',
    name: 'Edificio C',
    location: 'Fachada lateral',
    position: new THREE.Vector3(14, 5.5, 1),
    facadeZ: -2.5,
    severity: 'Moderada',
    finding: 'Fisuras y desprendimiento superficial',
  },
];

export const BASE = new THREE.Vector3(0, 0, 23);

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x7a8580, roughness: 1 }),
  asphalt: new THREE.MeshStandardMaterial({ color: 0x626d69, roughness: 1 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0xabb0a7, roughness: 0.96 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x858e87, roughness: 1 }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0xc1c3b7, roughness: 1 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x40535a, roughness: 0.45, metalness: 0.15 }),
  glassLight: new THREE.MeshStandardMaterial({ color: 0x71827f, roughness: 0.55, metalness: 0.1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x252f30, roughness: 0.8 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x515c59, metalness: 0.45, roughness: 0.7 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xe99b43, roughness: 0.8 }),
  roadMark: new THREE.MeshStandardMaterial({ color: 0xc3c1ab, roughness: 1 }),
};

function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function box(
  parent: THREE.Object3D,
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  x: number,
  y: number,
  z: number,
  shadow = true,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = shadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createGroundTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const random = seeded(893);
  context.fillStyle = '#87918b';
  context.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const shade = Math.floor(105 + random() * 65);
    context.fillStyle = `rgba(${shade},${shade + 3},${shade},${0.04 + random() * 0.16})`;
    const size = 0.5 + random() * 3;
    context.fillRect(random() * 512, random() * 512, size, size);
  }
  for (let i = 0; i < 100; i++) {
    context.strokeStyle = `rgba(45,55,50,${random() * 0.16})`;
    context.lineWidth = random() * 1.2;
    context.beginPath();
    const x = random() * 512;
    const y = random() * 512;
    context.moveTo(x, y);
    context.lineTo(x + random() * 24, y + random() * 9);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addCrack(parent: THREE.Object3D, x: number, y: number, z: number, scale: number, flip = false) {
  const direction = flip ? -1 : 1;
  const points = [
    [0, 0], [0.16, -0.35], [-0.03, -0.72], [0.25, -1.05],
    [0.15, -1.4], [0.48, -1.8], [0.35, -2.16], [0.65, -2.55],
  ].map(([px, py]) => new THREE.Vector3(x + px * scale * direction, y + py * scale, z));
  const crack = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 22, 0.035 * scale, 4, false),
    materials.black,
  );
  parent.add(crack);
  const branch = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        points[3],
        new THREE.Vector3(x - 0.35 * scale * direction, y - 1.35 * scale, z),
        new THREE.Vector3(x - 0.55 * scale * direction, y - 1.78 * scale, z),
      ]), 8, 0.018 * scale, 4, false,
    ),
    materials.black,
  );
  parent.add(branch);
}

function addBuilding(scene: THREE.Scene, building: BuildingBounds, index: number) {
  const { x, z, width, depth, height } = building;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const wall = index === 1 ? materials.concreteDark : materials.concrete;
  box(group, width, height - 1, depth, wall, 0, (height - 1) / 2, 0);
  box(group, width + 0.3, 0.25, depth + 0.3, materials.concreteDark, 0, 0.16, 0);

  const floors = Math.floor((height - 1) / 3);
  for (let floor = 0; floor < floors; floor++) {
    const y = 1.65 + floor * 3;
    box(group, width + 0.12, 0.13, 0.13, materials.concreteLight, 0, y - 1.25, depth / 2 + 0.04, false);
    for (let col = 0; col < 4; col++) {
      const windowX = -width / 2 + 1.35 + col * ((width - 2.7) / 3);
      const isBroken = (floor * 3 + col + index) % 6 === 0;
      box(group, 1.3, 1.65, 0.08, isBroken ? materials.black : (col % 3 === 0 ? materials.glassLight : materials.glass), windowX, y, depth / 2 + 0.06, false);
      box(group, 1.42, 0.12, 0.22, materials.concreteLight, windowX, y - 0.9, depth / 2 + 0.11, false);
      box(group, 0.06, 1.65, 0.1, materials.metal, windowX, y, depth / 2 + 0.12, false);
      if (isBroken) {
        const shard = box(group, 0.06, 1.8, 0.1, materials.concreteLight, windowX, y, depth / 2 + 0.14, false);
        shard.rotation.z = 0.5;
      }
    }
    for (let col = 0; col < 3; col++) {
      const windowZ = -depth / 2 + 1.6 + col * ((depth - 3.2) / 2);
      box(group, 0.08, 1.65, 1.25, col === 1 ? materials.glassLight : materials.glass, width / 2 + 0.06, y, windowZ, false);
      box(group, 0.2, 0.12, 1.37, materials.concreteLight, width / 2 + 0.1, y - 0.9, windowZ, false);
    }
  }

  // Broken parapets and exposed rebar make the top silhouette visibly irregular.
  const random = seeded(index * 200 + 11);
  for (let i = 0; i < 8; i++) {
    const pieceWidth = 0.6 + random() * 1.5;
    const pieceHeight = 0.3 + random() * 1.1;
    const chunk = box(group, pieceWidth, pieceHeight, 0.55 + random() * 1.1, i % 3 ? wall : materials.concreteLight,
      -width / 2 + 0.6 + i * (width - 1.2) / 7, height - 1 + pieceHeight / 2, depth / 2 - random() * 1.2);
    chunk.rotation.z = (random() - 0.5) * 0.24;
  }
  box(group, width * 0.6, 0.28, depth * 0.65, materials.concreteLight, -0.8, height - 0.85, -1.1);
  for (let i = 0; i < 5; i++) {
    const rod = box(group, 0.055, 1.5 + random(), 0.055, materials.metal,
      -width / 2 + 1 + random() * width, height - 0.1, depth / 2 - random() * 1.5, false);
    rod.rotation.z = (random() - 0.5) * 0.65;
  }
  addCrack(group, -width * 0.26, height - 2, depth / 2 + 0.18, 1.55, index === 2);
  addCrack(group, width * 0.28, height * 0.62, depth / 2 + 0.18, 1.05, index !== 0);
  return group;
}

function addDebris(scene: THREE.Scene) {
  const random = seeded(61027);
  BUILDINGS.forEach((building, buildingIndex) => {
    for (let i = 0; i < 38; i++) {
      const angle = random() * Math.PI * 2;
      const radius = 5 + random() * 5.8;
      const x = building.x + Math.cos(angle) * radius;
      const z = building.z + Math.sin(angle) * radius;
      if (Math.abs(x - building.x) < building.width / 2 + 0.4 && Math.abs(z - building.z) < building.depth / 2 + 0.4) continue;
      if (Math.abs(x) < 5 && z > 17) continue;
      const size = 0.25 + random() * 1.1;
      const piece = box(scene, size * (0.7 + random()), size * (0.25 + random() * 0.45), size * (0.7 + random()),
        [materials.concrete, materials.concreteDark, materials.concreteLight][(i + buildingIndex) % 3], x, size * 0.2, z);
      piece.rotation.set(random() * 0.25, random() * Math.PI, random() * 0.25);
    }
  });
  for (let i = 0; i < 8; i++) {
    const x = -21 + random() * 42;
    const z = -19 + random() * 25;
    const rod = box(scene, 2 + random() * 2, 0.09, 0.1, materials.metal, x, 0.16, z);
    rod.rotation.y = random() * Math.PI;
  }
}

function addRoadDetails(scene: THREE.Scene) {
  box(scene, 82, 0.04, 14, materials.asphalt, 0, 0.025, 13, false);
  box(scene, 13, 0.05, 80, materials.asphalt, 0, 0.03, -2, false);
  for (let z = -30; z < 33; z += 5) {
    box(scene, 0.16, 0.025, 2.2, materials.roadMark, 0, 0.07, z, false);
  }
  for (let x = -38; x < 40; x += 5) {
    if (Math.abs(x) < 7) continue;
    box(scene, 2.2, 0.025, 0.16, materials.roadMark, x, 0.08, 13, false);
  }
  // Pavement edges and striped pedestrian crossings give the terrain a street scale.
  box(scene, 82, 0.2, 0.28, materials.concreteLight, 0, 0.1, 5.9);
  box(scene, 82, 0.2, 0.28, materials.concreteLight, 0, 0.1, 20.1);
  for (let i = 0; i < 6; i++) {
    box(scene, 0.7, 0.025, 3, materials.roadMark, -4.4 + i * 1.7, 0.075, 9, false);
  }
}

function makeLabel(text: string, subtext: string, color = '#f3a64b') {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.fillStyle = 'rgba(24, 32, 31, .9)';
  context.beginPath();
  context.roundRect(5, 7, 310, 105, 12);
  context.fill();
  context.strokeStyle = color;
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = color;
  context.font = 'bold 48px Arial';
  context.fillText(text, 25, 69);
  context.fillStyle = '#e6e9df';
  context.font = 'bold 18px Arial';
  context.letterSpacing = '2px';
  context.fillText(subtext, 104, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(4.3, 1.72, 1);
  sprite.renderOrder = 20;
  return sprite;
}

export interface SiteMarker {
  group: THREE.Group;
  ring: THREE.Mesh;
  innerRing: THREE.Mesh;
  beam: THREE.Mesh;
  label: THREE.Sprite;
}

function addMarker(scene: THREE.Scene, site: InspectionSite): SiteMarker {
  const group = new THREE.Group();
  group.position.set(site.position.x, 0, site.position.z);
  scene.add(group);
  const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xf5a03d, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.0, 2.12, 64), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.17;
  group.add(ring);
  const innerRing = new THREE.Mesh(new THREE.RingGeometry(1.35, 1.4, 64), ringMaterial.clone());
  innerRing.rotation.x = -Math.PI / 2;
  innerRing.position.y = 0.18;
  group.add(innerRing);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.8, site.position.y, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf7a347, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }),
  );
  beam.position.y = site.position.y / 2;
  group.add(beam);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, site.position.y + 1.1, 8),
    new THREE.MeshBasicMaterial({ color: 0xffbb63, transparent: true, opacity: 0.7 }));
  stem.position.y = (site.position.y + 1.1) / 2;
  group.add(stem);
  const label = makeLabel(site.id, 'INSPECCIÓN');
  label.position.y = site.position.y + 2.3;
  group.add(label);
  return { group, ring, innerRing, beam, label };
}

function addBase(scene: THREE.Scene) {
  const group = new THREE.Group();
  group.position.copy(BASE);
  scene.add(group);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.11, 48),
    new THREE.MeshStandardMaterial({ color: 0x374842, roughness: 0.85 }));
  pad.position.y = 0.12;
  pad.receiveShadow = true;
  group.add(pad);
  const rim = new THREE.Mesh(new THREE.RingGeometry(4.05, 4.18, 64),
    new THREE.MeshBasicMaterial({ color: 0xe7aa5c, side: THREE.DoubleSide }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.19;
  group.add(rim);
  box(group, 0.45, 0.025, 3.2, materials.roadMark, -1.1, 0.2, 0, false);
  box(group, 0.45, 0.025, 3.2, materials.roadMark, 1.1, 0.2, 0, false);
  box(group, 2.6, 0.025, 0.45, materials.roadMark, 0, 0.2, 0, false);
  const label = makeLabel('H', 'BASE', '#cfdfb9');
  label.position.set(0, 1.1, 5.4);
  label.scale.set(3, 1.2, 1);
  group.add(label);
  return group;
}

function addStreetFurniture(scene: THREE.Scene) {
  for (const x of [-25, 25]) {
    const pole = box(scene, 0.16, 6.2, 0.16, materials.metal, x, 3.1, 5.3);
    pole.rotation.z = x < 0 ? -0.06 : 0.08;
    box(scene, 1.5, 0.15, 0.15, materials.metal, x + (x < 0 ? 0.65 : -0.65), 6.2, 5.3);
    box(scene, 0.55, 0.18, 0.35, materials.concreteLight, x + (x < 0 ? 1.25 : -1.25), 6.1, 5.3);
  }
  for (let i = 0; i < 4; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 10), materials.orange);
    cone.position.set(-8.5 + i * 1.3, 0.35, 18.2);
    cone.castShadow = true;
    scene.add(cone);
  }
  for (const x of [-31, -25, 25, 31]) {
    const backdrop = box(scene, 7, 4 + Math.abs(x % 5), 7, materials.concreteDark, x, 3, -32);
    backdrop.material = new THREE.MeshStandardMaterial({ color: 0x9ba8a1, roughness: 1 });
  }
}

export interface World {
  scene: THREE.Scene;
  markers: SiteMarker[];
  base: THREE.Group;
}

export function createWorld(): World {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xc2ceca);
  scene.fog = new THREE.Fog(0xc2ceca, 62, 125);
  const groundMaterial = materials.ground.clone();
  groundMaterial.map = createGroundTexture();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const hemisphere = new THREE.HemisphereLight(0xe9f2ed, 0x69726a, 2.15);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffefd5, 2.35);
  sun.position.set(-24, 42, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -45;
  sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45;
  sun.shadow.camera.bottom = -45;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun);
  addRoadDetails(scene);
  BUILDINGS.forEach((building, index) => addBuilding(scene, building, index));
  addDebris(scene);
  addStreetFurniture(scene);
  const base = addBase(scene);
  const markers = SITES.map((site) => addMarker(scene, site));
  return { scene, markers, base };
}

export interface Drone {
  group: THREE.Group;
  rotors: THREE.Group[];
  moduleMount: THREE.Group;
  fallback: THREE.Group;
}

export function createDrone(): Drone {
  const group = new THREE.Group();
  group.scale.setScalar(1.18);
  const shell = new THREE.MeshStandardMaterial({ color: 0x202b2e, metalness: 0.45, roughness: 0.5 });
  const shellLight = new THREE.MeshStandardMaterial({ color: 0x455250, metalness: 0.45, roughness: 0.6 });
  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2223, roughness: 0.5, metalness: 0.2 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xe6a34e, metalness: 0.2, roughness: 0.65 });
  box(group, 1.8, 0.48, 1.35, shell, 0, 0, 0);
  box(group, 1.2, 0.19, 1.05, shellLight, 0, 0.31, 0);
  box(group, 0.55, 0.025, 0.5, accent, 0, 0.42, -0.1, false);
  for (const angle of [Math.PI / 4, -Math.PI / 4]) {
    const arm = box(group, 4.6, 0.18, 0.22, shell, 0, -0.04, 0);
    arm.rotation.y = angle;
  }
  const rotors: THREE.Group[] = [];
  for (const x of [-1.65, 1.65]) {
    for (const z of [-1.65, 1.65]) {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.27, 0.28, 16), shellLight);
      motor.position.set(x, 0.12, z);
      motor.castShadow = true;
      group.add(motor);
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.3, z);
      box(rotor, 2.25, 0.035, 0.18, bladeMaterial, 0, 0, 0, false);
      box(rotor, 0.26, 0.1, 0.26, shell, 0, 0.05, 0, false);
      group.add(rotor);
      rotors.push(rotor);
      const leg = box(group, 0.13, 0.75, 0.13, shell, x * 0.58, -0.52, z * 0.58);
      leg.rotation.z = x < 0 ? -0.25 : 0.25;
    }
  }
  for (const x of [-1.05, 1.05]) box(group, 0.1, 0.1, 2.4, shell, x, -0.89, 0);
  const moduleMount = new THREE.Group();
  // Altura del módulo acoplado: debajo del fuselaje y entre los patines.
  moduleMount.position.y = -0.58;
  group.add(moduleMount);
  const fallback = new THREE.Group();
  const board = new THREE.MeshStandardMaterial({ color: 0x4f6651, roughness: 0.7 });
  box(fallback, 1.15, 0.18, 0.86, board, 0, 0, 0);
  box(fallback, 0.5, 0.12, 0.42, shell, 0.05, -0.14, 0.04);
  box(fallback, 0.22, 0.07, 0.2, accent, -0.35, -0.13, 0.12);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.35, 20), shell);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.06, -0.5);
  fallback.add(lens);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 20),
    new THREE.MeshStandardMaterial({ color: 0x6ba1a0, metalness: 0.55, roughness: 0.15, emissive: 0x1c4545 }));
  glass.rotation.x = Math.PI / 2;
  glass.position.set(0, -0.06, -0.685);
  fallback.add(glass);
  moduleMount.add(fallback);
  return { group, rotors, moduleMount, fallback };
}