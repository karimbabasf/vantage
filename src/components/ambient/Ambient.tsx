import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Subtle enamel sheen: a slow domain-warped gradient in the board's warm tones.
// Low contrast, opaque, cheap. Reads as depth behind the panels, not decoration.
const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime * 0.018;
    vec2 p = uv * 2.4;
    float n = noise(p + vec2(t, t * 0.6));
    n += 0.5 * noise(p * 2.1 - vec2(t * 0.7, t));
    n /= 1.5;

    vec3 base = vec3(0.083, 0.076, 0.064);
    vec3 warm = vec3(0.150, 0.132, 0.100);
    vec3 col = mix(base, warm, smoothstep(0.35, 0.95, n) * 0.55);

    float vig = smoothstep(1.25, 0.15, length(uv - 0.5));
    col *= mix(0.72, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Sheen() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    if (mat.current) mat.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={{ uTime: { value: 0 } }} />
    </mesh>
  );
}

export function Ambient() {
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        dpr={[1, 1.5]}
        frameloop={reduce ? "demand" : "always"}
        gl={{ antialias: false, powerPreference: "low-power" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Sheen />
      </Canvas>
    </div>
  );
}
