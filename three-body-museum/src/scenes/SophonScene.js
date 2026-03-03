import * as THREE from 'three';
import { createStars } from '../utils/createStars.js';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform float u_time;
  uniform vec2 u_res;

  float ring(vec2 p, float r, float w) {
    float d = abs(length(p) - r);
    return smoothstep(w, 0.0, d);
  }

  void main() {
    vec2 uv = (vUv - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 2.0;
    float t = u_time * 0.6;

    float r1 = ring(uv + vec2(sin(t*1.1)*0.3, cos(t*1.3)*0.2), 0.3 + sin(t*0.8)*0.15, 0.02);
    float r2 = ring(uv + vec2(cos(t*0.7)*0.2, sin(t*1.7)*0.25), 0.55 + cos(t*0.6)*0.2, 0.02);
    float r3 = ring(uv + vec2(sin(t*1.3)*0.25, cos(t*0.9)*0.25), 0.85 + sin(t*1.2)*0.2, 0.02);

    float interference = r1 + r2 + r3;

    vec3 colA = vec3(0.25, 0.62, 1.0);
    vec3 colB = vec3(0.95, 0.74, 0.35);
    vec3 col = mix(colA, colB, 0.5 + 0.5 * sin(t + interference * 3.14));

    float glow = smoothstep(0.0, 1.0, interference);
    col += vec3(0.2, 0.35, 0.6) * glow * 0.45;

    float vignette = smoothstep(1.2, 0.3, length(uv));
    col *= vignette;

    gl_FragColor = vec4(col, 0.88);
  }
`;

export function createSophonScene({ THREE: T, renderer }) {
  const group = new T.Group();

  const stars = createStars({ count: 1300, radius: 200, color: 0xd8e5ff });
  stars.material.opacity = 0.75;
  group.add(stars);

  const planeGeom = new T.PlaneGeometry(6, 6, 1, 1);
  const uniforms = {
    u_time: { value: 0 },
    u_res: { value: new T.Vector2(renderer.domElement.width, renderer.domElement.height) },
  };
  const material = new T.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
  });

  const plane = new T.Mesh(planeGeom, material);
  plane.position.set(0, 0, 0);
  group.add(plane);

  const particles = new T.Group();
  for (let i = 0; i < 240; i++) {
    const s = new T.Mesh(
      new T.SphereGeometry(0.04, 12, 12),
      new T.MeshBasicMaterial({ color: 0x9cc7ff, transparent: true, opacity: 0.7 })
    );
    const r = 2.0 + Math.random() * 2.0;
    const a = Math.random() * Math.PI * 2;
    const h = (Math.random() - 0.5) * 1.2;
    s.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    particles.add(s);
  }
  group.add(particles);

  return {
    group,
    update(delta, elapsed) {
      uniforms.u_time.value = elapsed;
      stars.rotation.y += delta * 0.02;
      particles.rotation.y += delta * 0.2;
      plane.rotation.y = Math.sin(elapsed * 0.3) * 0.2;
      plane.rotation.x = Math.cos(elapsed * 0.2) * 0.15;
    },
  };
}