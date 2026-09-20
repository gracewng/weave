'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, RoundedBox, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CanvasTexture, DoubleSide, Plane, PlaneGeometry, SRGBColorSpace, Vector3, type BufferAttribute, type Mesh } from 'three';
import { useReducedMotion } from 'motion/react';
import { drawReceipt, loadReceiptFonts, PAPER_PX, type Block } from './receiptTexture';

const PAPER_W = 2.75;
const PX_PER_UNIT = PAPER_PX / PAPER_W;
const PAPER_Z = -0.32;
const FADE_MS = 300;

type Tex = { map: CanvasTexture; len: number; overlayY: number };

function Paper({ sections, duration, onDone, onSettled, onMeasure }: { sections: Block[][]; duration: number; onDone: () => void; onSettled: () => void; onMeasure: (len: number, overlayY: number) => void }) {
  const reduce = useReducedMotion();
  const mesh = useRef<Mesh>(null);
  const [tex, setTex] = useState<Tex | null>(null);
  const clip = useMemo(() => [new Plane(new Vector3(0, -1, 0), 0)], []); // hide what is still inside the printer
  // Feed state: absolute printed length, and the segment currently feeding.
  const L = useRef(0);
  const seg = useRef<{ from: number; t0: number | null } | null>(null);
  const doneAt = useRef<number | null>(null);
  const settled = useRef(false);

  useEffect(() => {
    let live = true;
    loadReceiptFonts().then(() => {
      if (!live) return;
      const { canvas, height, overlayPx } = drawReceipt(sections, 3);
      const map = new CanvasTexture(canvas); map.colorSpace = SRGBColorSpace; map.anisotropy = 8;
      setTex((old) => { old?.map.dispose(); return { map, len: height / PX_PER_UNIT, overlayY: -overlayPx / PX_PER_UNIT }; });
      seg.current = { from: L.current, t0: null }; doneAt.current = null; settled.current = false;
      onMeasure(height / PX_PER_UNIT, -overlayPx / PX_PER_UNIT);
    });
    return () => { live = false; };
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps

  const geo = useMemo(() => {
    if (!tex) return null;
    const g = new PlaneGeometry(PAPER_W, tex.len, 1, Math.ceil(tex.len * 40)); g.translate(0, -tex.len / 2, 0); // top edge at the slit
    const pos = g.attributes.position as BufferAttribute;
    return { g, pos, base: Float32Array.from(pos.array) };
  }, [tex]);

  useFrame((s) => {
    if (!tex || !geo || !mesh.current) return;
    const t = s.clock.elapsedTime;
    if (seg.current) {
      if (seg.current.t0 === null) seg.current.t0 = t;
      const p = reduce ? 1 : Math.min(1, (t - seg.current.t0) / duration);
      const e = 1 - Math.pow(1 - p, 2.2);
      L.current = seg.current.from + (tex.len - seg.current.from) * Math.round(e * 64) / 64;
      if (p >= 1) { seg.current = null; doneAt.current = t; onDone(); }
    }
    const m = mesh.current;
    m.position.y = tex.len - L.current;
    // Pendulum swing toward/away from the camera; damps once the feed stops.
    const amp = reduce ? 0 : 0.252 * (doneAt.current === null ? 1 : Math.exp(-3.9 * (t - doneAt.current)));
    if (doneAt.current !== null && amp < 0.01 && !settled.current) { settled.current = true; onSettled(); }
    const theta = amp * Math.sin(2.1 * t);
    const sin = Math.sin(theta), cos = Math.cos(theta);
    const pos = geo.pos;
    for (let i = 0; i < pos.count; i++) {
      const ly = geo.base[i * 3 + 1] ?? 0;
      const h = Math.max(0, -(ly + m.position.y)); // depth below the slit
      pos.setY(i, ly + h * (1 - cos));
      pos.setZ(i, h * sin + 0.015 * h * h + 0.01 * Math.sin(h * 4 - t * 0.7) * Math.min(1, h));
    }
    pos.needsUpdate = true; geo.g.computeVertexNormals();
  });

  if (!tex || !geo) return null;
  return (
    <mesh ref={mesh} geometry={geo.g} position={[0, tex.len, PAPER_Z]}>
      <meshStandardMaterial map={tex.map} side={DoubleSide} clippingPlanes={clip} transparent alphaTest={0.5} roughness={0.95} />
    </mesh>
  );
}

const LOGO_W = 1.5;
const LOGO_ASPECT = 1511 / 489;

/* White wordmark (/public/logo-white.png) centred on the printer's front face. */
function PrinterLogo() {
  const map = useTexture('/logo-white.png');
  map.colorSpace = SRGBColorSpace;
  return (
    <mesh position={[0, 0.58, 0.96]}>
      <planeGeometry args={[LOGO_W, LOGO_W / LOGO_ASPECT]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} />
    </mesh>
  );
}

function PrinterModel({ printing }: { printing: boolean }) {
  const light = useRef<{ emissiveIntensity: number }>(null);
  useFrame((s) => { if (light.current) light.current.emissiveIntensity = printing ? 1.2 + Math.sin(s.clock.elapsedTime * 9) : 0.35; });
  return (
    <group>
      <RoundedBox args={[3.9, 1.15, 1.9]} radius={0.14} smoothness={6} position={[0, 0.58, 0]}>
        <meshStandardMaterial color="#3a5a40" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[3.3, 0.12, 1.15]} radius={0.05} smoothness={4} position={[0, -0.02, 0.3]}>
        <meshStandardMaterial color="#4f7054" roughness={0.55} />
      </RoundedBox>
      <Suspense fallback={null}><PrinterLogo /></Suspense>
      <mesh position={[0, -0.02, PAPER_Z]}><boxGeometry args={[3.1, 0.06, 0.16]} /><meshStandardMaterial color="#121b16" /></mesh>
      <mesh position={[1.55, 0.4, 0.96]}><sphereGeometry args={[0.055, 24, 24]} /><meshStandardMaterial ref={light} color="#cfe3c0" emissive="#cfe3c0" emissiveIntensity={0.4} /></mesh>
      <mesh position={[1.25, 0.4, 0.96]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.085, 0.085, 0.05, 32]} /><meshStandardMaterial color="#a3b18a" roughness={0.5} /></mesh>
    </group>
  );
}

/* Fixed camera; scales about the slit on narrow screens. */
function Rig({ children }: { children: ReactNode }) {
  const { camera, viewport } = useThree();
  useEffect(() => { camera.lookAt(0, -1.15, 0); }, [camera]); // keeps the printer's top edge in frame
  return <group scale={Math.min(1, viewport.width / 4.4)}>{children}</group>;
}

export interface ReceiptPrinter3DProps { sections: Block[][]; duration?: number; overlay?: ReactNode }

/* A 3D thermal printer at the top of the frame. Each new section feeds out under the slit and pushes earlier ones down. */
export function ReceiptPrinter3D({ sections, duration = 1.6, overlay }: ReceiptPrinter3DProps) {
  const [done, setDone] = useState(false);
  const [settled, setSettled] = useState(false);
  const [overlayY, setOverlayY] = useState(-1);
  // New sections are held back until the current overlay has faded out (FADE_MS).
  const [active, setActive] = useState({ sections, overlay });
  const [fading, setFading] = useState(false);
  const latestOverlay = useRef(overlay); latestOverlay.current = overlay;
  useEffect(() => {
    if (active.sections === sections) return;
    setFading(true); setSettled(false);
    const t = setTimeout(() => { setActive({ sections, overlay: latestOverlay.current }); setFading(false); setDone(false); }, FADE_MS);
    return () => clearTimeout(t);
  }, [sections]); // eslint-disable-line react-hooks/exhaustive-deps
  const shown = fading ? active.overlay : overlay;
  return (
    <div className="relative h-full w-full">
      <Canvas dpr={[1, 1.75]} camera={{ position: [0, -1.0, 8], fov: 34 }} gl={{ localClippingEnabled: true, antialias: true }}>
        <ambientLight intensity={0.75} />
        <directionalLight position={[3, 6, 5]} intensity={1.7} />
        <directionalLight position={[-4, -2, 4]} intensity={0.45} />
        <Rig>
          <PrinterModel printing={!done} />
          <Paper sections={active.sections} duration={duration} onDone={() => setDone(true)} onSettled={() => setSettled(true)} onMeasure={(_, y) => setOverlayY(y)} />
          {shown && (
            <Html position={[0, overlayY, PAPER_Z + 0.08]} center zIndexRange={[20, 0]} style={{ width: 375, pointerEvents: settled ? 'auto' : 'none', opacity: settled ? 1 : 0, transition: `opacity ${FADE_MS}ms ease` }}>
              <div className="printed">{shown}</div>
            </Html>
          )}
        </Rig>
      </Canvas>
      {/* Grainy displacement + soft blur so HTML on the paper reads as thermal ink. */}
      <svg width="0" height="0" aria-hidden="true">
        <filter id="thermal-ink" x="-5%" y="-10%" width="110%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </svg>
    </div>
  );
}
