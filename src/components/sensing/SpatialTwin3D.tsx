import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Text, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { NodeSensing } from "@/hooks/useRuViewSensing";
import { useIsMobile } from "@/hooks/use-mobile";
import { DEFAULT_FLOORPLAN, type RoomGeometry } from "./SpatialTwin";


/**
 * Multi-dimensional spatial twin.
 *
 * Dimensions actually encoded (each from a real signal, none decorative):
 *   X / Z  — floor position: which room, and where inside it (motion-driven drift)
 *   Y      — posture: the figure lies down when the sleep primitive is active,
 *            stands otherwise. This is the dimension a 2D plan cannot show.
 *   scale  — the torso expands and contracts at the *measured* breathing rate,
 *            so respiration is visible rather than merely printed as a number
 *   colour — alert state (distress / high fall-risk / fall detected)
 *   ring   — estimate confidence: a wider, fainter ring means a looser fix
 *
 * Units: the 0..100 floor-plan grid is mapped to metres/10 so the scene sits in
 * a sensible camera range.
 */

const S = 0.1; // plan units → scene units

function roomCentre(r: RoomGeometry) {
  return { x: (r.x + r.w / 2) * S, z: (r.y + r.h / 2) * S, w: r.w * S, d: r.h * S };
}

function Room({ r, occupied }: { r: RoomGeometry; occupied: boolean }) {
  const c = roomCentre(r);
  const colour = occupied ? "#22d3ee" : "#475569";
  return (
    <group position={[c.x, 0, c.z]}>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
        <planeGeometry args={[c.w, c.d]} />
        <meshStandardMaterial color={occupied ? "#0e7490" : "#1e293b"} transparent opacity={occupied ? 0.35 : 0.18} />
      </mesh>
      {/* wall outline */}
      <lineSegments position={[0, 0.575, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(c.w, 1.15, c.d)]} />
        <lineBasicMaterial color={colour} transparent opacity={occupied ? 0.75 : 0.3} />
      </lineSegments>
      <Text position={[0, 0.02, -c.d / 2 + 0.12]} rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.11} color={occupied ? "#67e8f9" : "#64748b"} anchorY="middle">
        {r.label}
      </Text>
    </group>
  );
}

interface OccProps {
  x: number; z: number;
  lying: boolean;
  breathBpm: number | null;
  alert: boolean;
  confidence: number;
  motion: number;
}

/** A person: posture on Y, respiration as a live scale oscillation. */
function Occupant({ x, z, lying, breathBpm, alert, confidence, motion }: OccProps) {
  const torso = useRef<THREE.Mesh>(null);
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);

  const colour = alert ? "#f43f5e" : lying ? "#818cf8" : "#34d399";
  const standH = 0.62, lieH = 0.18;
  const FIG = 1.7; // figure scale — small rooms need a readable person

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Respiration: expand/contract the torso at the measured rate.
    if (torso.current) {
      const hz = breathBpm != null ? breathBpm / 60 : 0;
      const amp = breathBpm != null ? 0.10 : 0;
      const s = 1 + Math.sin(t * Math.PI * 2 * hz) * amp;
      torso.current.scale.set(s, lying ? 1 : 1 / (1 + amp * 0.4), s);
    }
    // Gentle sway proportional to measured motion (stillness reads as stillness).
    if (group.current) {
      group.current.position.x = x + Math.sin(t * 0.7) * motion * 0.25;
      group.current.position.z = z + Math.cos(t * 0.5) * motion * 0.2;
      const targetY = lying ? lieH : standH;
      group.current.position.y += (targetY - group.current.position.y) * 0.05;
    }
    // Confidence ring breathes slowly; alert makes it pulse hard.
    if (ring.current) {
      const base = 0.22 + (1 - confidence) * 0.5;
      const p = alert ? 1 + Math.sin(t * 4) * 0.25 : 1 + Math.sin(t * 1.2) * 0.06;
      ring.current.scale.setScalar(base * p);
    }
  });

  return (
    <group ref={group} position={[x, standH, z]}>
      {/* head */}
      <mesh position={[0, lying ? 0.0 : 0.30 * FIG, lying ? -0.22 * FIG : 0]} castShadow>
        <sphereGeometry args={[0.075 * FIG, 20, 20]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={alert ? 0.8 : 0.35} />
      </mesh>
      {/* torso — this is what visibly breathes */}
      <mesh ref={torso} rotation={lying ? [Math.PI / 2, 0, 0] : [0, 0, 0]} castShadow>
        <capsuleGeometry args={[0.085 * FIG, 0.26 * FIG, 6, 14]} />
        <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={alert ? 0.55 : 0.2}
                              transparent opacity={0.92} />
      </mesh>
      {/* confidence / alert ring on the floor */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -standH + 0.01, 0]}>
        <ringGeometry args={[0.86, 1.0, 48]} />
        <meshBasicMaterial color={colour} transparent opacity={alert ? 0.7 : 0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function Scene({ nodes, plan, fix }: {
  nodes: NodeSensing[]; plan: RoomGeometry[];
  fix?: { x: number; y: number; confidence: number; method: string; usedNodes: string[] };
}) {
  const occupants = useMemo(
    () =>
      nodes.flatMap((n) => {
        const v = n.latest;
        if (!v?.presence) return [];
        const r = plan.find((p) => p.node_id === n.node.node_id);
        if (!r) return [];
        const c = roomCentre(r);
        // Prefer the mesh-wide multilateration fix when it is better than a
        // room-level guess and this node contributed to it.
        const useFix =
          fix && fix.method === "multilateration" && fix.usedNodes.includes(n.node.node_id);
        return [{
          id: n.node.node_id,
          x: useFix ? fix!.x * S : c.x,
          z: useFix ? fix!.y * S : c.z,
          lying: n.posture === "lying",
          breathBpm: n.breathing.value,
          confidence: Math.max(n.breathing.confidence, n.heart.confidence),
          motion: v.motion,
          alert:
            v.fall_detected || n.fallRisk >= 70 ||
            n.semantics.some((s) => s.active && s.primitive === "possible_distress"),
        }];
      }),
    [nodes, plan],
  );
  const occupied = new Set(occupants.map((o) => o.id));

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 6, 3]} intensity={1.1} castShadow />
      <pointLight position={[-3, 3, -2]} intensity={0.4} color="#38bdf8" />

      <Grid args={[14, 14]} cellSize={0.5} cellThickness={0.5} cellColor="#1e293b"
            sectionSize={2} sectionThickness={1} sectionColor="#334155"
            fadeDistance={16} infiniteGrid position={[0, -0.002, 0]} />

      {plan.map((r) => <Room key={r.node_id} r={r} occupied={occupied.has(r.node_id)} />)}
      {occupants.map((o) => <Occupant key={o.id} {...o} />)}
    </>
  );
}

export function SpatialTwin3D({
  nodes, plan = DEFAULT_FLOORPLAN, className, fix,
}: {
  nodes: NodeSensing[]; plan?: RoomGeometry[]; className?: string;
  fix?: { x: number; y: number; confidence: number; method: string; usedNodes: string[] };
}) {
  const isMobile = useIsMobile();

  // Frame the whole plan: centre on its bounds and pull the camera back far
  // enough that every room is in shot regardless of layout. Phones get a
  // slightly wider pull-back because the viewport is squarer and narrower.
  const { target, camPos } = useMemo(() => {
    const minX = Math.min(...plan.map((r) => r.x)) * S;
    const maxX = Math.max(...plan.map((r) => r.x + r.w)) * S;
    const minZ = Math.min(...plan.map((r) => r.y)) * S;
    const maxZ = Math.max(...plan.map((r) => r.y + r.h)) * S;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
    const span = Math.max(maxX - minX, maxZ - minZ);
    const d = span * (isMobile ? 1.05 : 0.85) + 1.1;
    return {
      target: new THREE.Vector3(cx, 0.3, cz),
      camPos: [cx + d * 0.45, d * 0.62, cz + d * 0.80] as [number, number, number],
    };
  }, [plan, isMobile]);

  return (
    <div className={`rounded-xl overflow-hidden bg-slate-950 touch-none ${className ?? ""}`}>
      <Canvas shadows={!isMobile} camera={{ position: camPos, fov: isMobile ? 54 : 46 }}
              dpr={isMobile ? [1, 1.5] : [1, 1.8]} gl={{ antialias: !isMobile }}>
        <color attach="background" args={["#020617"]} />
        <fog attach="fog" args={["#020617", 12, 26]} />
        <Suspense fallback={null}>
          <Scene nodes={nodes} plan={plan} fix={fix} />
        </Suspense>
        <OrbitControls target={target} enablePan={false}
                       minPolarAngle={0.2} maxPolarAngle={Math.PI / 2.15}
                       minDistance={isMobile ? 2.4 : 3} maxDistance={18}
                       rotateSpeed={isMobile ? 0.6 : 1}
                       enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}


export default SpatialTwin3D;
