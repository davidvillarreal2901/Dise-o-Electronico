import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  Activity, AlertCircle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BatteryFull,
  Box, Camera, Check, ChevronRight, CircleHelp, Compass, Crosshair,
  Eye, Gamepad2, Glasses, Info, Keyboard, MapPin, Pause, Play, Radio,
  RotateCcw, ScanLine, ShieldAlert, ShieldCheck, Target, TriangleAlert, X,
} from 'lucide-react';
import {
  initialState, Simulation, type FlightControl, type InspectionResult, type SimulationState,
} from './simulator/Simulation';
import { SITES } from './simulator/world';

const phaseLabels: Record<SimulationState['phase'], string> = {
  ready: 'En espera',
  active: 'En curso',
  paused: 'En pausa',
  complete: 'Completada',
  battery: 'Batería agotada',
};

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

function MissionLogo() {
  return (
    <div className="brand-lockup" aria-label="Misión Post-Sismo">
      <div className="brand-mark"><ScanLine size={21} strokeWidth={2.1} /></div>
      <div className="brand-copy">
        <strong>MISIÓN <span>POST-SISMO</span></strong>
        <small>INSPECCIÓN ESTRUCTURAL</small>
      </div>
    </div>
  );
}

function FlightButton({
  control, label, children, simulation, disabled,
}: {
  control: FlightControl;
  label: string;
  children: ReactNode;
  simulation: RefObject<Simulation | null>;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className="flight-button"
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        simulation.current?.setControl(control, true);
      }}
      onPointerUp={() => simulation.current?.setControl(control, false)}
      onPointerCancel={() => simulation.current?.setControl(control, false)}
      onLostPointerCapture={() => simulation.current?.setControl(control, false)}
    >
      {children}
    </button>
  );
}

function InspectionDialog({ result, close }: { result: InspectionResult; close: () => void }) {
  const site = SITES[result.siteIndex];
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [close]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="modal-heading">
          <div>
            <div className="eyebrow orange-text"><span className="eyebrow-line" /> REGISTRO DE INSPECCIÓN / {site.id}</div>
            <h2 id="result-title">Análisis preliminar</h2>
            <p>{site.name} <span>·</span> {site.location}</p>
          </div>
          <button ref={closeButtonRef} className="icon-button close-modal" onClick={close} aria-label="Cerrar análisis"><X size={19} /></button>
        </div>
        <div className="inspection-photo">
          <img src="./images/inspeccion-grietas.jpg" alt="Imagen ilustrativa de una fachada de concreto con una grieta" />
          <svg className="crack-overlay" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
            {/* Trazado calibrado sobre public/images/inspeccion-grietas.jpg (1280 x 720) */}
            <path className="crack-glow" d="M370 1 L386 7 L403 31 L434 52 L447 73 L486 97 L484 106 L499 133 L493 145 L496 151 L532 163 L537 181 L549 184 L566 205 L568 229 L592 238 L602 274 L633 292 L649 325 L680 346 L683 358 L698 373 L702 397 L717 430 L714 433 L739 439 L744 448 L736 457 L760 472 L773 511 L790 523 L805 556 L820 565 L820 577 L844 610 L840 616 L843 625 L868 649 L871 661 L886 676 L899 718" />
            <path className="crack-line" d="M370 1 L386 7 L403 31 L434 52 L447 73 L486 97 L484 106 L499 133 L493 145 L496 151 L532 163 L537 181 L549 184 L566 205 L568 229 L592 238 L602 274 L633 292 L649 325 L680 346 L683 358 L698 373 L702 397 L717 430 L714 433 L739 439 L744 448 L736 457 L760 472 L773 511 L790 523 L805 556 L820 565 L820 577 L844 610 L840 616 L843 625 L868 649 L871 661 L886 676 L899 718" />
            <path className="crack-branch" d="M480 120 L463 133 L451 139 L418 135 L403 128 M566 205 L583 216 L602 219 L611 226 M717 430 L750 477 L769 487 L786 506 M847 452 L905 462 L926 479" />
            <path className="crack-branch faint" d="M592 238 L571 250 L556 268 M749 512 L699 524 L687 540 M700 350 L622 377" />
          </svg>
          <div className="photo-top"><span><span className="tiny-dot" /> CAPTURA ILUSTRATIVA</span><span>GC4653 / SIMULADA</span></div>
          <div className="photo-bottom"><ScanLine size={14} /> RESALTADO DE FISURA SIMULADO</div>
          <div className="photo-corners" />
        </div>
        <div className="result-summary">
          <div className="result-item">
            <span>DISTANCIA ESTIMADA</span>
            <strong>{result.distance.toFixed(1)} <small>m</small></strong>
          </div>
          <div className="result-item result-finding">
            <span>HALLAZGO SIMULADO</span>
            <strong>{result.finding}</strong>
          </div>
          <div className="result-item severity-item">
            <span>ALERTA PRELIMINAR</span>
            <strong className={result.severity === 'Alta' ? 'severity high' : 'severity'}><TriangleAlert size={15} /> {result.severity}</strong>
          </div>
        </div>
        <div className="result-disclaimer"><Info size={16} /><p>Imagen ilustrativa, distancia y clasificación simuladas. Este resultado no constituye una medición ni un diagnóstico estructural.</p></div>
        <div className="modal-actions">
          <span>REGISTRO {site.id} / 03</span>
          <button className="button primary" onClick={close}>Continuar misión <ChevronRight size={16} /></button>
        </div>
      </section>
    </div>
  );
}

function objectiveFor(state: SimulationState) {
  if (state.phase === 'ready') return { title: 'Prepara tu misión', detail: 'Inicia el vuelo para explorar la zona afectada.' };
  if (state.phase === 'paused') return { title: 'Misión en pausa', detail: 'Reanuda el vuelo cuando estés listo.' };
  if (state.phase === 'complete') return { title: 'Misión completada', detail: 'Las tres zonas fueron inspeccionadas y el módulo regresó a la base.' };
  if (state.phase === 'battery') return { title: 'Batería agotada', detail: 'Reinicia la misión para volver a intentarlo.' };
  if (state.scanningSite !== null) return { title: 'Escaneo en progreso', detail: `Mantén la posición frente al ${SITES[state.scanningSite].name}.` };
  if (state.completed.every(Boolean)) return { title: 'Regresa a la base', detail: 'Vuela hasta la plataforma H y desciende para completar la misión.' };
  if (state.nearSite !== null) return { title: 'Punto de inspección cercano', detail: `Pulsa E para escanear el ${SITES[state.nearSite].name}.` };
  return { title: 'Localiza los puntos', detail: 'Acércate a los tres marcadores para inspeccionar las estructuras.' };
}

function App() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<Simulation | null>(null);
  const [state, setState] = useState<SimulationState>(initialState);
  const [results, setResults] = useState<(InspectionResult | null)[]>([null, null, null]);
  const [selectedResult, setSelectedResult] = useState<InspectionResult | null>(null);
  const [renderError, setRenderError] = useState(false);
  const [touchOpen, setTouchOpen] = useState(() => window.matchMedia('(max-width: 700px)').matches);

  useEffect(() => {
    if (!viewportRef.current) return;
    let simulation: Simulation | null = null;
    try {
      simulation = new Simulation(viewportRef.current, setState, (result, inVR) => {
        setResults((previous) => {
          const next = [...previous];
          next[result.siteIndex] = result;
          return next;
        });
        if (!inVR) setSelectedResult(result);
      });
      simulationRef.current = simulation;
    } catch (error) {
      console.error('No se pudo iniciar el entorno 3D:', error);
      setRenderError(true);
    }
    return () => {
      simulation?.dispose();
      if (simulationRef.current === simulation) simulationRef.current = null;
    };
  }, []);

  const closeResult = () => {
    setSelectedResult(null);
    simulationRef.current?.setBlocked(false);
  };
  const resetMission = () => {
    setSelectedResult(null);
    setResults([null, null, null]);
    simulationRef.current?.reset();
  };
  const openResult = (result: InspectionResult | null) => {
    if (!result) return;
    simulationRef.current?.setBlocked(true);
    setSelectedResult(result);
  };
  const objective = objectiveFor(state);
  const completedCount = state.completed.filter(Boolean).length;
  const isActive = state.phase === 'active';
  const inRange = state.nearSite !== null && state.scanningSite === null && isActive;
  const progress = completedCount / SITES.length * 100;
  const xrAvailable = state.xrStatus === 'available' || state.xrStatus === 'active';

  return (
    <div className="app-shell">
      <header className="topbar">
        <MissionLogo />
        <div className="topbar-center"><span className="nav-active">SIMULADOR</span><span className="topbar-divider" /><span>ENTORNO DE ENTRENAMIENTO</span></div>
        <div className="topbar-right">
          <div className="simulated-indicator"><span className="live-dot" /> SISTEMA SIMULADO</div>
          <button
            className={`vr-button ${xrAvailable ? 'available' : ''}`}
            onClick={() => void simulationRef.current?.toggleVR()}
            disabled={!xrAvailable}
            title={xrAvailable ? 'Usar un dispositivo de realidad virtual compatible' : 'VR requiere un dispositivo compatible y una conexión segura'}
          ><Glasses size={17} /> <span>{state.xrStatus === 'active' ? 'Salir de VR' : state.xrStatus === 'available' ? 'Entrar en VR' : 'VR no disponible'}</span></button>
        </div>
      </header>

      <main className="workspace">
        <div className="page-heading">
          <div className="page-heading-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> CENTRO DE OPERACIONES <span className="slash">/</span> ESCENARIO 01</div>
            <h1>Misión Post-Sismo<span className="heading-period">.</span></h1>
            <p>Inspección estructural remota en una zona urbana afectada.</p>
          </div>
          <div className="mission-actions">
            <button className="button secondary" onClick={resetMission} disabled={renderError}><RotateCcw size={16} /> Reiniciar</button>
            {state.phase === 'active' ? (
              <button className="button primary" onClick={() => simulationRef.current?.pause()} disabled={renderError}><Pause size={16} fill="currentColor" /> Pausar misión</button>
            ) : state.phase === 'complete' || state.phase === 'battery' ? (
              <button className="button primary" onClick={() => { resetMission(); simulationRef.current?.start(); }} disabled={renderError}><Play size={16} fill="currentColor" /> Nueva misión</button>
            ) : (
              <button className="button primary" onClick={() => simulationRef.current?.start()} disabled={renderError}><Play size={16} fill="currentColor" /> {state.phase === 'paused' ? 'Reanudar misión' : 'Iniciar misión'}</button>
            )}
          </div>
        </div>

        <div className="workspace-grid">
          <section className="flight-column" aria-label="Simulador de vuelo">
            <div className="viewer-shell">
              <div className="viewer-toolbar">
                <div className="viewer-title"><span className="viewer-title-icon"><Crosshair size={16} /></span><div><strong>VISTA DE MISIÓN</strong><span>ZONA URBANA / 01</span></div></div>
                <div className="camera-tabs" role="group" aria-label="Seleccionar cámara">
                  <button className={state.camera === 'external' ? 'active' : ''} onClick={() => state.camera !== 'external' && simulationRef.current?.toggleCamera()}><Eye size={15} /> <span>Vista exterior</span></button>
                  <button className={state.camera === 'inspection' ? 'active' : ''} onClick={() => state.camera !== 'inspection' && simulationRef.current?.toggleCamera()}><Camera size={15} /> <span>Cámara de inspección</span></button>
                </div>
              </div>
              <div className="scene-viewport" data-position-x={state.position.x.toFixed(2)} data-position-y={state.altitude.toFixed(2)} data-position-z={state.position.z.toFixed(2)} data-phase={state.phase} data-module-status={state.moduleStatus}>
                <div className="canvas-host" ref={viewportRef} />
                {renderError ? (
                  <div className="render-error"><AlertCircle size={28} /><strong>No se pudo iniciar el entorno 3D</strong><span>Comprueba que tu navegador permita WebGL y vuelve a cargar la página.</span></div>
                ) : (
                  <>
                    <div className="scene-top-left"><span className="scene-status"><span className={isActive ? 'live-dot' : 'idle-dot'} /> {isActive ? 'MISIÓN EN CURSO' : phaseLabels[state.phase].toUpperCase()}</span><span className="scene-area">ÁREA DE INSPECCIÓN <b>01</b></span></div>
                    <div className="scene-top-right"><span>● GRABACIÓN SIMULADA</span><strong>{state.camera === 'external' ? 'CAM 01 / EXTERIOR' : 'CAM 02 / INSPECCIÓN'}</strong></div>
                    <div className="scene-reticle" aria-hidden="true"><span /><i /><span /></div>
                    <div className="telemetry">
                      <div><span>ALTURA</span><strong>{state.altitude.toFixed(1)} <small>m</small></strong></div>
                      <div><span>VELOCIDAD</span><strong>{state.speed.toFixed(1)} <small>m/s</small></strong></div>
                      <div><span>TIEMPO</span><strong>{formatTime(state.elapsed)}</strong></div>
                    </div>
                    <div className="scene-compass" aria-label="Norte"><span>N</span><Compass size={30} strokeWidth={1} /><small>RUMBO</small></div>
                    {state.phase === 'ready' && <div className="scene-prompt"><span className="prompt-icon"><Play size={14} fill="currentColor" /></span><span><strong>Todo listo para despegar</strong><small>Inicia la misión para comenzar el vuelo</small></span></div>}
                    {state.phase === 'paused' && <div className="scene-prompt"><span className="prompt-icon"><Pause size={15} /></span><span><strong>Misión en pausa</strong><small>Reanuda el vuelo para continuar</small></span></div>}
                    {state.phase === 'complete' && <div className="scene-prompt success-prompt"><span className="prompt-icon"><Check size={16} /></span><span><strong>¡Misión completada!</strong><small>Has regresado a la base de forma segura</small></span></div>}
                    {state.scanningSite !== null && isActive && <div className="scene-prompt scanning-prompt"><span className="prompt-icon"><ScanLine size={17} /></span><span><strong>Escaneando {SITES[state.scanningSite].name}</strong><small>Mantén la posición · {Math.round(state.scanProgress * 100)}%</small><i className="scan-track"><i style={{ width: `${state.scanProgress * 100}%` }} /></i></span></div>}
                    {inRange && <button className="scene-prompt scan-prompt" onClick={() => simulationRef.current?.tryScan()}><span className="keycap orange-key">E</span><span><strong>Iniciar escaneo</strong><small>{SITES[state.nearSite!].name} al alcance</small></span><ChevronRight size={16} /></button>}
                    {isActive && state.completed.every(Boolean) && state.scanningSite === null && <div className="scene-prompt return-prompt"><span className="prompt-icon"><MapPin size={16} /></span><span><strong>Regresa a la base</strong><small>Plataforma H · {state.baseDistance.toFixed(0)} m</small></span></div>}
                  </>
                )}
              </div>
              <div className="control-strip">
                <div className="control-intro"><Keyboard size={17} /><span><strong>CONTROLES DE VUELO</strong><small>Teclado</small></span></div>
                <div className="control-legend"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><small>Mover / flechas</small></span><span><kbd>R</kbd><kbd>F</kbd><small>Subir / bajar</small></span><span><kbd>E</kbd><small>Escanear</small></span><span className="camera-key"><kbd>C</kbd><small>Cambiar cámara</small></span></div>
                <button className={`touch-toggle ${touchOpen ? 'selected' : ''}`} onClick={() => setTouchOpen(!touchOpen)} aria-expanded={touchOpen} title="Mostrar controles en pantalla"><Gamepad2 size={18} /><span>Controles</span></button>
              </div>
              <div className={`touch-controls ${touchOpen ? 'open' : ''}`}>
                <div className="touch-copy"><strong>CONTROLES EN PANTALLA</strong><span>Mantén pulsado para mover el dron.</span></div>
                <div className="direction-pad">
                  <span /> <FlightButton control="forward" label="Avanzar" simulation={simulationRef} disabled={!isActive}><ArrowUp size={17} /></FlightButton> <span />
                  <FlightButton control="left" label="Mover a la izquierda" simulation={simulationRef} disabled={!isActive}><ArrowLeft size={17} /></FlightButton>
                  <FlightButton control="backward" label="Retroceder" simulation={simulationRef} disabled={!isActive}><ArrowDown size={17} /></FlightButton>
                  <FlightButton control="right" label="Mover a la derecha" simulation={simulationRef} disabled={!isActive}><ArrowRight size={17} /></FlightButton>
                </div>
                <div className="height-pad"><FlightButton control="up" label="Ascender" simulation={simulationRef} disabled={!isActive}><ArrowUp size={16} /> <small>Subir</small></FlightButton><FlightButton control="down" label="Descender" simulation={simulationRef} disabled={!isActive}><ArrowDown size={16} /> <small>Bajar</small></FlightButton></div>
                <button className="touch-scan" disabled={!inRange} onClick={() => simulationRef.current?.tryScan()}><ScanLine size={16} /> Escanear</button>
              </div>
            </div>
            {state.moduleStatus === 'missing' && <div className="module-warning" role="status"><TriangleAlert size={16} /><span><strong>Modelo del módulo no disponible.</strong> Se muestra una geometría temporal; la misión sigue funcionando.</span><span className="warning-tag">MÓDULO 3D</span></div>}
            {state.moduleStatus === 'loading' && <div className="module-warning loading-warning" role="status"><Activity size={16} /><span>Cargando el modelo 3D del módulo de inspección...</span></div>}
          </section>

          <aside className="mission-panel" aria-label="Estado de la misión">
            <div className="panel-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> PANEL DE CONTROL</div><h2>Estado de misión</h2></div><span className={`mission-status ${isActive ? 'status-active' : ''} ${state.phase === 'complete' ? 'status-complete' : ''}`}><span />{phaseLabels[state.phase]}</span></div>

            <div className="panel-section battery-section">
              <div className="section-heading"><span><BatteryFull size={17} /> Batería del dron</span><strong className={state.battery < 25 ? 'low-battery' : ''}>{Math.ceil(state.battery)}<small>%</small></strong></div>
              <div className="battery-track"><span className={state.battery < 25 ? 'low' : ''} style={{ width: `${state.battery}%` }} /></div>
              <div className="micro-row"><span>ENERGÍA SIMULADA</span><span>{state.battery < 25 ? 'BATERÍA BAJA' : 'NIVEL ÓPTIMO'}</span></div>
            </div>

            <div className="panel-section inspections-section">
              <div className="section-heading"><span><Target size={17} /> Puntos de inspección</span><strong className="count">{completedCount}<small> / 3</small></strong></div>
              <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
              <div className="site-list">
                {SITES.map((site, index) => {
                  const done = state.completed[index];
                  const nearby = state.nearSite === index && isActive;
                  return <button key={site.id} className={`site-row ${done ? 'site-done' : ''} ${nearby ? 'site-near' : ''}`} onClick={() => openResult(results[index])} disabled={!results[index]} title={done ? 'Ver análisis de inspección' : 'Punto pendiente de inspección'}>
                    <span className="site-number">{done ? <Check size={15} /> : site.id}</span>
                    <span className="site-info"><strong>{site.name}</strong><small>{site.location}</small></span>
                    <span className="site-state"><strong>{done ? 'Completado' : nearby ? 'En alcance' : 'Pendiente'}</strong><small>{done ? 'Ver análisis  ›' : `${state.distances[index].toFixed(0)} m`}</small></span>
                  </button>;
                })}
              </div>
            </div>

            <div className="panel-section objective-section">
              <div className="section-label"><Crosshair size={14} /> OBJETIVO ACTUAL</div>
              <div className="objective-copy"><span className="objective-accent" /><div><strong>{objective.title}</strong><p>{objective.detail}</p></div></div>
            </div>

            <div className="panel-section proximity-section">
              <div className="section-label">SEGURIDAD DE VUELO</div>
              <div className={`proximity-line ${state.proximity !== 'safe' ? 'warning' : ''}`}>
                {state.proximity === 'safe' ? <ShieldCheck size={19} /> : <ShieldAlert size={19} />}
                <span><strong>{state.proximity === 'collision' ? 'Colisión evitada' : state.proximity === 'near' ? 'Obstáculo cercano' : 'Sin obstáculos cercanos'}</strong><small>{state.proximity === 'safe' ? 'Proximidad dentro del rango seguro' : 'Mantén una distancia prudente'}</small></span>
                <span className="safety-dot" />
              </div>
            </div>
            <div className="module-details"><div className="module-icon"><Box size={17} /></div><div><span>MÓDULO ACOPLABLE PROPUESTO</span><strong>Sipeed LicheeRV Nano W</strong><small>Cámara GC4653 · Plataforma comercial</small></div><Info size={14} className="module-info-icon" /></div>
          </aside>
        </div>

        <footer className="workspace-footer"><div><CircleHelp size={16} /><span><strong>ENTORNO DE ENTRENAMIENTO</strong> <i /> Imágenes, distancias, sensores y clasificación de daños son simulados. No sustituye una evaluación profesional.</span></div><span className="footer-id">MISIÓN POST-SISMO <b> / </b> V1.0</span></footer>
      </main>
      {state.notice && isActive && !selectedResult && <div className="toast" role="status"><Radio size={15} /> {state.notice}</div>}
      {selectedResult && <InspectionDialog result={selectedResult} close={closeResult} />}
      <div className="sr-only" aria-live="polite">{phaseLabels[state.phase]}. {completedCount} de 3 inspecciones completadas.</div>
    </div>
  );
}

export default App;