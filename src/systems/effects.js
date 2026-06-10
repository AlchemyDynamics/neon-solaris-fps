import { rand } from "../engine/math.js";

export class Effects {
  constructor(THREE, scene) {
    this.THREE = THREE;
    this.scene = scene;
    this.items = [];
    this.materials = {
      cyan: new THREE.MeshBasicMaterial({ color: "#35ffc6", transparent: true }),
      pink: new THREE.MeshBasicMaterial({ color: "#ff57d8", transparent: true }),
      gold: new THREE.MeshBasicMaterial({ color: "#f9ff66", transparent: true }),
      red: new THREE.MeshBasicMaterial({ color: "#ff365e", transparent: true }),
      white: new THREE.MeshBasicMaterial({ color: "#ecfff9", transparent: true })
    };
  }

  spawnTracer(start, end, color = "#35ffc6", life = 0.08) {
    const THREE = this.THREE;
    const geometry = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 1,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.items.push({ object: line, material, life, maxLife: life, type: "fade" });
  }

  spawnBurst(position, color = "#35ffc6", count = 14, power = 7) {
    const THREE = this.THREE;
    const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
    const geometry = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    for (let i = 0; i < count; i++) {
      const shard = new THREE.Mesh(geometry, material.clone());
      shard.position.copy(position);
      const velocity = new THREE.Vector3(rand(-1, 1), rand(0.1, 1.2), rand(-1, 1))
        .normalize()
        .multiplyScalar(rand(power * 0.4, power));
      this.scene.add(shard);
      this.items.push({
        object: shard,
        material: shard.material,
        velocity,
        life: rand(0.35, 0.82),
        maxLife: 0.82,
        type: "particle"
      });
    }
  }

  spawnExplosion(position, radius = 6, color = "#ff57d8") {
    const THREE = this.THREE;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.48,
        wireframe: true
      })
    );
    sphere.position.copy(position);
    this.scene.add(sphere);
    this.items.push({
      object: sphere,
      material: sphere.material,
      life: 0.42,
      maxLife: 0.42,
      radius,
      type: "shockwave"
    });
    this.spawnBurst(position, color, 42, radius * 1.8);
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.life -= dt;
      const t = Math.max(0, item.life / item.maxLife);
      if (item.type === "particle") {
        item.velocity.y -= 10 * dt;
        item.object.position.addScaledVector(item.velocity, dt);
        item.object.rotation.x += dt * 8;
        item.object.rotation.y += dt * 5;
        item.material.opacity = t;
      } else if (item.type === "shockwave") {
        const scale = 1 + (1 - t) * item.radius;
        item.object.scale.setScalar(scale);
        item.material.opacity = t * 0.48;
      } else if (item.type === "fade") {
        item.material.opacity = t;
      }

      if (item.life <= 0) {
        this.scene.remove(item.object);
        item.object.geometry?.dispose?.();
        item.material?.dispose?.();
        this.items.splice(i, 1);
      }
    }
  }
}
