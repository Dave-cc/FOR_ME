import * as THREE from 'three';
import { createStars } from '../utils/createStars.js';

export function createTrisolarisScene({ THREE: T }) {
  const group = new T.Group();

  const stars = createStars({ count: 1800, radius: 220, color: 0xd1e2ff });
  group.add(stars);

  const planet = new T.Mesh(
    new T.SphereGeometry(1.2, 48, 48),
    new T.MeshStandardMaterial({ color: 0x2b6b7f, roughness: 0.9, metalness: 0.05, emissive: 0x0a2030, emissiveIntensity: 0.2 })
  );
  planet.position.set(0, 0, 0);
  group.add(planet);

  const atmosphere = new T.Mesh(
    new T.SphereGeometry(1.23, 48, 48),
    new T.MeshPhongMaterial({ color: 0x7be3ff, transparent: true, opacity: 0.08, shininess: 80 })
  );
  group.add(atmosphere);

  const suns = [];
  const sunColors = [0xffe9a3, 0xffc46e, 0xff9b4a];
  for (let i = 0; i < 3; i++) {
    const mesh = new T.Mesh(
      new T.SphereGeometry(0.45, 32, 32),
      new T.MeshBasicMaterial({ color: sunColors[i] })
    );
    const light = new T.PointLight(sunColors[i], 1.7, 60, 2);
    const halo = new T.Mesh(
      new T.SphereGeometry(0.65, 32, 32),
      new T.MeshBasicMaterial({ color: sunColors[i], transparent: true, opacity: 0.25 })
    );
    const sun = new T.Group();
    sun.add(mesh);
    sun.add(halo);
    sun.add(light);
    suns.push({ sun, light, base: Math.random() * Math.PI * 2, speed: 0.25 + Math.random() * 0.35 });
    group.add(sun);
  }

  const heatLight = new T.DirectionalLight(0xffcfa1, 0.35);
  heatLight.position.set(2, 3, 1);
  group.add(heatLight);

  const debris = new T.Group();
  for (let i = 0; i < 200; i++) {
    const d = new T.Mesh(
      new T.IcosahedronGeometry(0.04 + Math.random() * 0.06, 0),
      new T.MeshStandardMaterial({ color: 0x98b7d9, roughness: 0.8, metalness: 0.2 })
    );
    const r = 3.2 + Math.random() * 3.6;
    const a = Math.random() * Math.PI * 2;
    const h = (Math.random() - 0.5) * 0.1;
    d.position.set(Math.cos(a) * r, h, Math.sin(a) * r);
    debris.add(d);
  }
  group.add(debris);

  return {
    group,
    update(delta, elapsed) {
      stars.rotation.y += delta * 0.03;
      debris.rotation.y += delta * 0.05;

      const chaos = 0.8 + Math.sin(elapsed * 0.37) * 0.6;
      for (let i = 0; i < suns.length; i++) {
        const s = suns[i];
        const t = elapsed * s.speed + s.base;
        const r = 2.4 + Math.sin(t * 1.7 + i) * 1.8;
        const y = Math.sin(t * 0.9 + i * 1.3) * 0.35;
        s.sun.position.set(Math.cos(t * 1.2) * r, y, Math.sin(t * 0.8 + i) * r);
        s.light.intensity = 1.2 + Math.abs(Math.sin(t * 1.6)) * chaos;
      }

      const combinedHeat = suns.reduce((acc, s) => acc + s.light.intensity, 0) / suns.length;
      heatLight.intensity = 0.25 + (combinedHeat - 1.2) * 0.2;
      atmosphere.material.opacity = 0.06 + (combinedHeat - 1.2) * 0.05;
    },
  };
}