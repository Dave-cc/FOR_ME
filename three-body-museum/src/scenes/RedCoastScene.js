import * as THREE from 'three';
import { createStars } from '../utils/createStars.js';

export function createRedCoastScene({ THREE: T }) {
  const group = new T.Group();

  const stars = createStars({ count: 1400, radius: 200, color: 0xcad9ff });
  group.add(stars);

  const ground = new T.Mesh(
    new T.CircleGeometry(18, 64),
    new T.MeshStandardMaterial({ color: 0x0f1524, roughness: 1.0, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  group.add(ground);

  const base = new T.Group();
  const tower = new T.Mesh(
    new T.CylinderGeometry(0.7, 0.9, 6, 24),
    new T.MeshStandardMaterial({ color: 0x2a3f5f, roughness: 0.85, metalness: 0.15, emissive: 0x0e1a2d, emissiveIntensity: 0.2 })
  );
  tower.position.set(0, 3, 0);
  tower.castShadow = true;
  base.add(tower);

  const dish = new T.Mesh(
    new T.ConeGeometry(1.8, 0.9, 40, 1, true),
    new T.MeshStandardMaterial({ color: 0x354e78, roughness: 0.7, metalness: 0.3, side: T.DoubleSide })
  );
  dish.position.set(0, 6, 0);
  dish.rotation.x = Math.PI / 2.2;
  base.add(dish);

  const cabin = new T.Mesh(
    new T.BoxGeometry(2.6, 1.2, 1.6),
    new T.MeshStandardMaterial({ color: 0x1f2f4b, roughness: 0.8, metalness: 0.2 })
  );
  cabin.position.set(-3.2, 0.6, -1.2);
  base.add(cabin);

  const beacon = new T.PointLight(0xff3344, 1.4, 60, 2);
  beacon.position.set(0, 6.2, 0.6);
  base.add(beacon);

  const beam = new T.SpotLight(0xff2233, 2.2, 80, Math.PI / 12, 0.35, 1.6);
  beam.position.set(0, 6.2, 0.6);
  beam.target.position.set(0, 6.0, -10);
  base.add(beam);
  base.add(beam.target);

  group.add(base);

  const hemi = new T.HemisphereLight(0x9dbfff, 0x0b1020, 0.35);
  group.add(hemi);

  return {
    group,
    update(delta, elapsed) {
      base.rotation.y += delta * 0.08;
      beam.angle = (Math.PI / 18) + Math.sin(elapsed * 0.7) * (Math.PI / 36);
      stars.rotation.y += delta * 0.03;
    },
  };
}