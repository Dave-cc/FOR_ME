import * as THREE from 'three';

export function createStars({ count = 2000, radius = 200, color = 0xbcd3ff } = {}) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  const colorObj = new THREE.Color(color);

  for (let i = 0; i < count; i++) {
    const r = radius * (0.1 + Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    colors[i * 3] = colorObj.r * (0.7 + 0.6 * Math.random());
    colors[i * 3 + 1] = colorObj.g * (0.7 + 0.6 * Math.random());
    colors[i * 3 + 2] = colorObj.b * (0.7 + 0.6 * Math.random());
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.9,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'Stars';
  return points;
}