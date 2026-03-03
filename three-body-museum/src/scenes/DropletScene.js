import * as THREE from 'three';
import { createStars } from '../utils/createStars.js';

export function createDropletScene({ THREE: T, renderer }) {
  const group = new T.Group();

  const stars = createStars({ count: 1600, radius: 220, color: 0xcfe1ff });
  group.add(stars);

  const baseLight = new T.HemisphereLight(0x99c6ff, 0x0b1020, 0.55);
  group.add(baseLight);

  const dir1 = new T.DirectionalLight(0xffffff, 1.0);
  dir1.position.set(6, 4, 3);
  group.add(dir1);

  const dir2 = new T.DirectionalLight(0x99bbff, 0.6);
  dir2.position.set(-4, 3, -5);
  group.add(dir2);

  const cubeRenderTarget = new T.WebGLCubeRenderTarget(256, { type: T.HalfFloatType, generateMipmaps: true });
  const cubeCamera = new T.CubeCamera(0.1, 1000, cubeRenderTarget);
  group.add(cubeCamera);

  const droplet = new T.Mesh(
    new T.SphereGeometry(1.1, 64, 64),
    new T.MeshPhysicalMaterial({
      color: 0xdddddd,
      metalness: 1.0,
      roughness: 0.02,
      transmission: 0.0,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      envMap: cubeRenderTarget.texture,
    })
  );
  droplet.position.set(0, 0, 0);
  droplet.castShadow = true;
  group.add(droplet);

  const ring = new T.Mesh(
    new T.TorusKnotGeometry(2.8, 0.05, 120, 16),
    new T.MeshBasicMaterial({ color: 0x7fb0ff, transparent: true, opacity: 0.25 })
  );
  group.add(ring);

  let frame = 0;
  return {
    group,
    update(delta, elapsed) {
      stars.rotation.y += delta * 0.06;
      ring.rotation.x += delta * 0.2;
      ring.rotation.y += delta * 0.1;

      // Update env map occasionally for performance
      if ((frame++ % 2) === 0) {
        droplet.visible = false;
        cubeCamera.update(renderer, group);
        droplet.visible = true;
      }
    },
  };
}