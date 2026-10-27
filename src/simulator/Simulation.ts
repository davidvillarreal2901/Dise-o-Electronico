/// <reference types="webxr" />
/// <reference types="vite/client" />
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BASE, BUILDINGS, createDrone, createWorld, SITES, type Drone, type World } from './world';

export type MissionPhase = 'ready' | 'active' | 'paused' | 'complete' | 'battery';
export type CameraMode = 'external' | 'inspection';
export type FlightControl = 'forward' | 'backward' | 'left' | 'right' | 'up' | 'down';
export type ModuleStatus = 'loading' | 'loaded' | 'missing';
export type XRStatus = 'checking' | 'available' | 'unavailable' | 'active';

export interface InspectionResult {
  siteIndex: number;
  distance: number;
  severity: 'Moderada' | 'Alta';
  finding: string;
}

export interface SimulationState {
  phase: MissionPhase;
  camera: CameraMode;
  battery: number;
  altitude: number;
  speed: number;
  elapsed: number;
  position: { x: number; z: number };
  completed: boolean[];
  distances: number[];
  nearSite: number | null;
  scanningSite: number | null;
  scanProgress: number;
  proximity: 'safe' | 'near' | 'collision';
  baseDistance: number;
  moduleStatus: ModuleStatus;
  xrStatus: XRStatus;
  notice: string | null;
}

type StateCallback = (state: SimulationState) => void;
type InspectionCallback = (result: InspectionResult, inVR: boolean) => void;

const modelFiles = import.meta.glob('../../assets/modelos-3d/modulo-inspeccion.glb', {
  eager: true,
  query: '?url',
  import: 'default',
});
const modelUrl = Object.values(modelFiles)[0] as string | undefined;
const SCAN_RADIUS = 4.2;
const SCAN_DURATION = 2.8;
const START_POSITION = new THREE.Vector3(BASE.x, 4.8, BASE.z);

export const initialState: SimulationState = {
  phase: 'ready',
  camera: 'external',
  battery: 100,
  altitude: START_POSITION.y,
  speed: 0,
  elapsed: 0,
  position: { x: START_POSITION.x, z: START_POSITION.z },
  completed: [false, false, false],
  distances: SITES.map((site) => site.position.distanceTo(START_POSITION)),
  nearSite: null,
  scanningSite: null,
  scanProgress: 0,
  proximity: 'safe',
  baseDistance: 0,
  moduleStatus: modelUrl ? 'loading' : 'missing',
  xrStatus: 'checking',
  notice: null,
};

const keyControls: Record<string, FlightControl> = {
  w: 'forward', arrowup: 'forward',
  s: 'backward', arrowdown: 'backward',
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  r: 'up', f: 'down',
};

function relativeAssetUrl(url: string) {
  // Vite can emit root-relative asset URLs; make them work under a Pages repository path too.
  return url.startsWith('/') && !url.startsWith('//')
    ? new URL(url.slice(1), document.baseURI).href
    : url;
}

export class Simulation {
  private readonly host: HTMLElement;
  private readonly onState: StateCallback;
  private readonly onInspection: InspectionCallback;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly cameraRig = new THREE.Group();
  private readonly world: World;
  private readonly drone: Drone;
  private readonly controls = new Set<FlightControl>();
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly desiredCamera = new THREE.Vector3();
  private readonly xrLookMatrix = new THREE.Matrix4();
  private readonly xrHudCanvas = document.createElement('canvas');
  private readonly xrHudTexture: THREE.CanvasTexture;
  private readonly xrHud: THREE.Mesh;
  private readonly inspectionImage = new Image();
  private phase: MissionPhase = 'ready';
  private cameraMode: CameraMode = 'external';
  private battery = 100;
  private elapsed = 0;
  private speed = 0;
  private completed = [false, false, false];
  private scanningSite: number | null = null;
  private scanProgress = 0;
  private proximity: SimulationState['proximity'] = 'safe';
  private collisionTimer = 0;
  private moduleStatus: ModuleStatus = modelUrl ? 'loading' : 'missing';
  private xrStatus: XRStatus = 'checking';
  private notice: string | null = null;
  private noticeTimer = 0;
  private blocked = false;
  private disposed = false;
  private stateTimer = 0;
  private xrTriggerWasPressed = false;
  private xrResult: InspectionResult | null = null;
  private xrResultTimer = 0;

  constructor(host: HTMLElement, onState: StateCallback, onInspection: InspectionCallback) {
    this.host = host;
    this.onState = onState;
    this.onInspection = onInspection;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local');
    this.renderer.domElement.setAttribute('aria-label', 'Vista 3D de la zona urbana y el dron');
    this.renderer.domElement.setAttribute('role', 'img');
    host.appendChild(this.renderer.domElement);

    this.world = createWorld();
    this.drone = createDrone();
    this.drone.group.position.copy(START_POSITION);
    this.world.scene.add(this.drone.group);
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
    this.world.scene.add(this.cameraRig);
    this.cameraRig.add(this.camera);
    this.camera.position.copy(START_POSITION).add(new THREE.Vector3(22, 18, 27));
    this.camera.lookAt(START_POSITION.x, START_POSITION.y - 1, START_POSITION.z - 12);

    this.xrHudCanvas.width = 1024;
    this.xrHudCanvas.height = 256;
    this.xrHudTexture = new THREE.CanvasTexture(this.xrHudCanvas);
    this.xrHudTexture.colorSpace = THREE.SRGBColorSpace;
    this.xrHud = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.36),
      new THREE.MeshBasicMaterial({ map: this.xrHudTexture, transparent: true, depthTest: false }));
    this.xrHud.position.set(0, -0.38, -1.4);
    this.xrHud.renderOrder = 100;
    this.xrHud.visible = false;
    this.camera.add(this.xrHud);
    this.inspectionImage.src = new URL('images/inspeccion-grietas.jpg', document.baseURI).href;

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(host);
    this.resize();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.clearControls);
    this.renderer.setAnimationLoop(this.animate);
    this.loadModule();
    void this.checkVR();
    this.emitState();
  }

  private resize = () => {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  private onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const key = event.key.toLowerCase();
    const control = keyControls[key];
    if (control) {
      event.preventDefault();
      if (!this.blocked) this.controls.add(control);
    } else if (key === 'e' && !event.repeat && !this.blocked) {
      event.preventDefault();
      this.tryScan();
    } else if (key === 'c' && !event.repeat && !this.blocked) {
      this.toggleCamera();
    }
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const control = keyControls[event.key.toLowerCase()];
    if (control) this.controls.delete(control);
  };

  private clearControls = () => {
    this.controls.clear();
    this.speed = 0;
  };

  private loadModule() {
    if (!modelUrl) return;
    new GLTFLoader().load(relativeAssetUrl(modelUrl), (gltf) => {
      if (this.disposed) return;
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const maxSide = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(maxSide) || maxSide <= 0) {
        this.moduleStatus = 'missing';
        this.emitState();
        return;
      }
      // Escala, centrado y orientación: el modelo se ajusta bajo el dron con la
      // ventana óptica mirando hacia el frente (-Z) y la carcasa entre los patines.
      const scale = 1.25 / maxSide;
      const holder = new THREE.Group();
      holder.rotation.y = Math.PI;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
      holder.add(model);
      let textured = false;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          if (materials.some((entry) => entry instanceof THREE.MeshStandardMaterial && entry.map)) textured = true;
        }
      });
      if (!textured) {
        // El GLB conceptual no incluye texturas: se le da el acabado oscuro del render.
        const finish = new THREE.MeshStandardMaterial({ color: 0x303c40, metalness: 0.55, roughness: 0.4 });
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((entry) => entry.dispose());
          object.material = finish;
        });
      }
      this.drone.fallback.visible = false;
      this.drone.moduleMount.add(holder);
      this.moduleStatus = 'loaded';
      this.emitState();
    }, undefined, () => {
      if (this.disposed) return;
      this.moduleStatus = 'missing';
      this.emitState();
    });
  }

  private async checkVR() {
    if (!navigator.xr || !window.isSecureContext) {
      this.xrStatus = 'unavailable';
    } else {
      try {
        this.xrStatus = await navigator.xr.isSessionSupported('immersive-vr') ? 'available' : 'unavailable';
      } catch {
        this.xrStatus = 'unavailable';
      }
    }
    if (!this.disposed) this.emitState();
  }

  async toggleVR() {
    const existing = this.renderer.xr.getSession();
    if (existing) {
      await existing.end();
      return;
    }
    if (!navigator.xr || this.xrStatus !== 'available') return;
    try {
      const session = await navigator.xr.requestSession('immersive-vr', {
        optionalFeatures: ['local-floor', 'bounded-floor'],
      });
      session.addEventListener('end', () => {
        this.xrStatus = 'available';
        this.xrHud.visible = false;
        this.xrTriggerWasPressed = false;
        this.cameraRig.position.set(0, 0, 0);
        this.cameraRig.quaternion.identity();
        this.camera.position.copy(this.desiredCamera);
        this.clearControls();
        if (!this.disposed) this.emitState();
      });
      await this.renderer.xr.setSession(session);
      this.xrStatus = 'active';
      this.xrHud.visible = true;
      this.emitState();
    } catch {
      this.showNotice('No se pudo iniciar VR. Continúa en modo escritorio.');
    }
  }

  setControl(control: FlightControl, pressed: boolean) {
    if (pressed && !this.blocked) this.controls.add(control);
    else this.controls.delete(control);
  }

  setBlocked(blocked: boolean) {
    this.blocked = blocked;
    if (blocked) this.clearControls();
  }

  start() {
    if (this.phase === 'ready' || this.phase === 'paused') {
      this.phase = 'active';
      this.showNotice(this.completed.every(Boolean) ? 'Regresa a la base de despegue.' : 'Localiza los tres puntos de inspección.');
      this.emitState();
    }
  }

  pause() {
    if (this.phase !== 'active') return;
    this.phase = 'paused';
    this.clearControls();
    this.emitState();
  }

  reset() {
    this.phase = 'ready';
    this.cameraMode = 'external';
    this.battery = 100;
    this.elapsed = 0;
    this.completed = [false, false, false];
    this.scanningSite = null;
    this.scanProgress = 0;
    this.proximity = 'safe';
    this.collisionTimer = 0;
    this.notice = null;
    this.blocked = false;
    this.xrResult = null;
    this.drone.group.position.copy(START_POSITION);
    this.drone.group.rotation.set(0, 0, 0);
    this.drone.group.visible = true;
    this.camera.position.copy(START_POSITION).add(new THREE.Vector3(22, 18, 27));
    this.clearControls();
    this.refreshMarkers();
    this.emitState();
  }

  toggleCamera() {
    this.cameraMode = this.cameraMode === 'external' ? 'inspection' : 'external';
    this.drone.group.visible = this.cameraMode === 'external';
    this.emitState();
  }

  tryScan() {
    if (this.phase !== 'active' || this.blocked || this.scanningSite !== null) return;
    const near = this.getNearSite();
    if (near === null) {
      this.showNotice('Acércate a un punto pendiente para iniciar el escaneo.');
      return;
    }
    this.scanningSite = near;
    this.scanProgress = 0;
    this.clearControls();
    this.showNotice(`Escaneando ${SITES[near].name}. Mantén la posición.`);
    this.emitState();
  }

  private showNotice(message: string) {
    this.notice = message;
    this.noticeTimer = 4;
    this.emitState();
  }

  private getNearSite() {
    let nearest: number | null = null;
    let shortest = SCAN_RADIUS;
    SITES.forEach((site, index) => {
      const distance = site.position.distanceTo(this.drone.group.position);
      if (!this.completed[index] && distance <= shortest) {
        nearest = index;
        shortest = distance;
      }
    });
    return nearest;
  }

  private collides(position: THREE.Vector3) {
    const margin = 1.0;
    return BUILDINGS.some((building) => position.y < building.height + 0.8 &&
      Math.abs(position.x - building.x) < building.width / 2 + margin &&
      Math.abs(position.z - building.z) < building.depth / 2 + margin);
  }

  private updateProximity() {
    if (this.collisionTimer > 0) {
      this.proximity = 'collision';
      return;
    }
    const position = this.drone.group.position;
    let distance = Infinity;
    BUILDINGS.forEach((building) => {
      const dx = Math.max(Math.abs(position.x - building.x) - building.width / 2, 0);
      const dz = Math.max(Math.abs(position.z - building.z) - building.depth / 2, 0);
      const dy = Math.max(position.y - building.height, 0);
      distance = Math.min(distance, Math.hypot(dx, dy, dz));
    });
    this.proximity = distance < 3.4 || position.y < 2.6 ? 'near' : 'safe';
  }

  private readXRControls() {
    const session = this.renderer.xr.getSession();
    let x = 0;
    let z = 0;
    let vertical = 0;
    let trigger = false;
    if (session) {
      for (const source of session.inputSources) {
        const gamepad = source.gamepad;
        if (!gamepad) continue;
        const axisOffset = gamepad.axes.length >= 4 ? 2 : 0;
        const axisX = gamepad.axes[axisOffset] || 0;
        const axisZ = gamepad.axes[axisOffset + 1] || 0;
        if (Math.abs(axisX) > 0.2) x += axisX;
        if (Math.abs(axisZ) > 0.2) z += axisZ;
        if (gamepad.buttons[4]?.pressed) vertical += 1;
        if (gamepad.buttons[5]?.pressed) vertical -= 1;
        trigger ||= Boolean(gamepad.buttons[0]?.pressed);
      }
    }
    if (trigger && !this.xrTriggerWasPressed && !this.blocked) {
      if (this.phase === 'ready' || this.phase === 'paused') this.start();
      else this.tryScan();
    }
    this.xrTriggerWasPressed = trigger;
    return { x: THREE.MathUtils.clamp(x, -1, 1), z: THREE.MathUtils.clamp(z, -1, 1), vertical };
  }

  private moveDrone(delta: number, xr: { x: number; z: number; vertical: number }) {
    const x = Number(this.controls.has('right')) - Number(this.controls.has('left')) + xr.x;
    const z = Number(this.controls.has('backward')) - Number(this.controls.has('forward')) + xr.z;
    const vertical = Number(this.controls.has('up')) - Number(this.controls.has('down')) + xr.vertical;
    const direction = new THREE.Vector3(x, 0, z);
    if (direction.lengthSq() > 1) direction.normalize();
    direction.multiplyScalar(6.1 * delta);
    const before = this.drone.group.position.clone();
    const position = this.drone.group.position;
    const nextX = position.clone();
    nextX.x = THREE.MathUtils.clamp(nextX.x + direction.x, -34, 34);
    if (!this.collides(nextX)) position.x = nextX.x;
    else if (Math.abs(direction.x) > 0.001) this.collisionTimer = 1.2;
    const nextZ = position.clone();
    nextZ.z = THREE.MathUtils.clamp(nextZ.z + direction.z, -32, 32);
    if (!this.collides(nextZ)) position.z = nextZ.z;
    else if (Math.abs(direction.z) > 0.001) this.collisionTimer = 1.2;
    const nextY = position.clone();
    nextY.y = THREE.MathUtils.clamp(nextY.y + THREE.MathUtils.clamp(vertical, -1, 1) * 3.6 * delta, 1.8, 22);
    if (!this.collides(nextY)) position.y = nextY.y;
    else if (Math.abs(vertical) > 0.01) this.collisionTimer = 1.2;
    this.speed = position.distanceTo(before) / Math.max(delta, 0.001);
    this.drone.group.rotation.z = THREE.MathUtils.lerp(this.drone.group.rotation.z, -x * 0.055, 0.1);
    this.drone.group.rotation.x = THREE.MathUtils.lerp(this.drone.group.rotation.x, z * 0.045, 0.1);
  }

  private finishScan(index: number) {
    const site = SITES[index];
    const result: InspectionResult = {
      siteIndex: index,
      distance: Math.max(1, Math.abs(this.drone.group.position.z - site.facadeZ)),
      severity: site.severity,
      finding: site.finding,
    };
    this.completed[index] = true;
    this.scanningSite = null;
    this.scanProgress = 0;
    this.refreshMarkers();
    this.clearControls();
    const inVR = this.renderer.xr.isPresenting;
    if (inVR) {
      this.xrResult = result;
      this.xrResultTimer = 10;
    } else {
      this.blocked = true;
    }
    this.onInspection(result, inVR);
    this.showNotice(this.completed.every(Boolean) ? 'Inspecciones completas. Regresa a la base.' : 'Inspección completada. Continúa con los puntos pendientes.');
    this.emitState();
  }

  private refreshMarkers() {
    this.world.markers.forEach((marker, index) => {
      const color = this.completed[index] ? 0x9acdad : 0xf5a03d;
      (marker.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
      (marker.innerRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      (marker.beam.material as THREE.MeshBasicMaterial).color.setHex(color);
      marker.label.material.color.setHex(this.completed[index] ? 0x9acdad : 0xffffff);
      marker.beam.visible = !this.completed[index];
    });
  }

  private updateHud() {
    if (!this.renderer.xr.isPresenting) return;
    const context = this.xrHudCanvas.getContext('2d')!;
    context.clearRect(0, 0, 1024, 256);
    context.fillStyle = 'rgba(15, 24, 25, .92)';
    context.fillRect(0, 0, 1024, 256);
    context.fillStyle = '#e6a34e';
    context.fillRect(0, 0, 8, 256);
    context.font = 'bold 24px Arial';
    context.fillStyle = '#efaa53';
    context.fillText('MISIÓN POST-SISMO  /  SIMULACIÓN', 34, 46);
    context.font = 'bold 31px Arial';
    context.fillStyle = '#f5f5ed';
    if (this.xrResult && this.xrResultTimer > 0) {
      context.fillText(`${SITES[this.xrResult.siteIndex].name}: daño ${this.xrResult.severity.toLowerCase()}`, 34, 99);
      context.font = '23px Arial';
      context.fillStyle = '#c7d0ca';
      context.fillText(`Distancia simulada: ${this.xrResult.distance.toFixed(1)} m`, 34, 139);
      context.fillText('Resultado ilustrativo, no es un diagnóstico.', 34, 176);
      if (this.inspectionImage.complete && this.inspectionImage.naturalWidth) {
        context.drawImage(this.inspectionImage, 730, 56, 260, 150);
        context.strokeStyle = '#ff9849';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(824, 65); context.lineTo(845, 100); context.lineTo(832, 120);
        context.lineTo(867, 150); context.lineTo(858, 178); context.lineTo(880, 202);
        context.stroke();
      }
    } else {
      const near = this.getNearSite();
      const message = this.phase === 'ready' ? 'Pulsa el gatillo para iniciar la misión' :
        this.phase === 'paused' ? 'Pulsa el gatillo para reanudar la misión' :
          this.phase === 'complete' ? 'Misión completada' :
            this.phase === 'battery' ? 'Batería agotada. Reinicia la misión' :
              this.scanningSite !== null ? `Escaneando ${SITES[this.scanningSite].name}: ${Math.round(this.scanProgress * 100)}%` :
                this.completed.every(Boolean) ? 'Regresa a la base' :
                  near !== null ? 'Pulsa el gatillo para escanear' : 'Acércate a un punto de inspección';
      context.fillText(message, 34, 102);
      context.font = '23px Arial';
      context.fillStyle = '#c7d0ca';
      context.fillText(`Batería ${Math.ceil(this.battery)}%     Inspecciones ${this.completed.filter(Boolean).length}/3`, 34, 151);
      context.fillText('Joystick: mover  ·  Botones A/B: altura  ·  Gatillo: escanear', 34, 198);
    }
    this.xrHudTexture.needsUpdate = true;
  }

  private animate = (_time: number) => {
    if (this.disposed) return;
    const delta = Math.min(this.clock.getDelta(), 0.2);
    const xrControls = this.readXRControls();
    const active = this.phase === 'active' && !this.blocked;
    if (active) {
      this.elapsed += delta;
      this.moveDrone(delta, xrControls);
      this.battery = Math.max(0, this.battery - delta * (0.045 + (this.speed > 0.1 ? 0.055 : 0)));
      if (this.scanningSite !== null) {
        if (SITES[this.scanningSite].position.distanceTo(this.drone.group.position) > SCAN_RADIUS + 0.8) {
          this.scanningSite = null;
          this.scanProgress = 0;
          this.showNotice('Escaneo interrumpido. Vuelve a acercarte al punto.');
        } else {
          this.scanProgress += delta / SCAN_DURATION;
          if (this.scanProgress >= 1) this.finishScan(this.scanningSite);
        }
      }
      if (this.completed.every(Boolean) && this.scanningSite === null && !this.blocked &&
        Math.hypot(this.drone.group.position.x - BASE.x, this.drone.group.position.z - BASE.z) < 4.3 && this.drone.group.position.y <= 5.8) {
        this.phase = 'complete';
        this.clearControls();
        this.showNotice('Misión completada. El módulo regresó a la base.');
      }
      if (this.battery <= 0) {
        this.phase = 'battery';
        this.clearControls();
        this.showNotice('Batería agotada. Reinicia la misión para volver a intentarlo.');
      }
    } else {
      this.speed = 0;
    }
    this.collisionTimer = Math.max(0, this.collisionTimer - delta);
    this.updateProximity();
    if (this.noticeTimer > 0) {
      this.noticeTimer -= delta;
      if (this.noticeTimer <= 0) this.notice = null;
    }
    if (this.xrResultTimer > 0) this.xrResultTimer -= delta;
    const t = this.clock.elapsedTime;
    this.drone.rotors.forEach((rotor, index) => {
      rotor.rotation.y += delta * (active ? 24 : 3) * (index % 2 ? 1 : -1);
    });
    this.world.markers.forEach((marker, index) => {
      const pulse = 1 + Math.sin(t * 2 + index) * 0.055;
      marker.innerRing.scale.set(pulse, pulse, 1);
      marker.label.position.y = SITES[index].position.y + 2.3 + Math.sin(t * 1.4 + index) * 0.14;
    });
    if (this.cameraMode === 'external') {
      this.desiredCamera.copy(this.drone.group.position).add(new THREE.Vector3(22, 18, 27));
      this.cameraTarget.copy(this.drone.group.position).add(new THREE.Vector3(0, -1, -12));
    } else {
      this.desiredCamera.copy(this.drone.group.position).add(new THREE.Vector3(0, -0.5, -0.9));
      this.cameraTarget.copy(this.desiredCamera).add(new THREE.Vector3(0, -0.5, -20));
    }
    if (this.renderer.xr.isPresenting) {
      // The headset pose is relative to its parent, so move the rig rather than the XR camera.
      this.cameraRig.position.copy(this.desiredCamera);
      this.cameraRig.quaternion.setFromRotationMatrix(this.xrLookMatrix.lookAt(this.desiredCamera, this.cameraTarget, this.camera.up));
    } else {
      if (this.cameraMode === 'external') this.camera.position.lerp(this.desiredCamera, 1 - Math.exp(-delta * 3.5));
      else this.camera.position.copy(this.desiredCamera);
      this.camera.lookAt(this.cameraTarget);
    }
    this.stateTimer += delta;
    if (this.stateTimer > 0.14) {
      this.stateTimer = 0;
      this.emitState();
      this.updateHud();
    }
    this.renderer.render(this.world.scene, this.camera);
  };

  private emitState() {
    if (this.disposed) return;
    const position = this.drone.group.position;
    this.onState({
      phase: this.phase,
      camera: this.cameraMode,
      battery: this.battery,
      altitude: position.y,
      speed: this.speed,
      elapsed: this.elapsed,
      position: { x: position.x, z: position.z },
      completed: [...this.completed],
      distances: SITES.map((site) => site.position.distanceTo(position)),
      nearSite: this.getNearSite(),
      scanningSite: this.scanningSite,
      scanProgress: Math.min(this.scanProgress, 1),
      proximity: this.proximity,
      baseDistance: Math.hypot(position.x - BASE.x, position.z - BASE.z),
      moduleStatus: this.moduleStatus,
      xrStatus: this.xrStatus,
      notice: this.notice,
    });
  }

  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    const session = this.renderer.xr.getSession();
    if (session) void session.end();
    this.resizeObserver.disconnect();
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.clearControls);
    const geometries = new Set<THREE.BufferGeometry>();
    const sceneMaterials = new Set<THREE.Material>();
    this.world.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        geometries.add(object.geometry);
        const entries = Array.isArray(object.material) ? object.material : [object.material];
        entries.forEach((material) => sceneMaterials.add(material));
      } else if (object instanceof THREE.Sprite) {
        sceneMaterials.add(object.material);
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    sceneMaterials.forEach((material) => {
      if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose();
      material.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}