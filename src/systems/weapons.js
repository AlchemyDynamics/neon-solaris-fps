import { clamp, raySphere } from "../engine/math.js";

const WEAPON_DATA = [
  {
    name: "Ion Pistol",
    shortName: "Pistol",
    damage: 34,
    fireRate: 4.5,
    range: 95,
    spread: 0.006,
    magSize: 12,
    reserve: 96,
    reloadTime: 1.05,
    automatic: false,
    pellets: 1,
    color: "#35ffc6"
  },
  {
    name: "Helix SMG",
    shortName: "SMG",
    damage: 13,
    fireRate: 13,
    range: 82,
    spread: 0.018,
    magSize: 42,
    reserve: 252,
    reloadTime: 1.65,
    automatic: true,
    pellets: 1,
    color: "#49a6ff"
  },
  {
    name: "Arc Shotgun",
    shortName: "Shotgun",
    damage: 15,
    fireRate: 1.15,
    range: 48,
    spread: 0.072,
    magSize: 7,
    reserve: 49,
    reloadTime: 1.95,
    automatic: false,
    pellets: 9,
    color: "#f9ff66"
  },
  {
    name: "Grenade Launcher",
    shortName: "Grenade",
    damage: 115,
    fireRate: 0.72,
    range: 120,
    spread: 0.01,
    magSize: 4,
    reserve: 20,
    reloadTime: 2.35,
    automatic: false,
    projectile: true,
    color: "#ff57d8"
  }
];

export class WeaponSystem {
  constructor(THREE, scene, camera) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.weapons = WEAPON_DATA.map((weapon) => ({
      ...weapon,
      ammo: weapon.magSize,
      cooldown: 0,
      reloadRemaining: 0
    }));
    this.activeIndex = 0;
    this.projectiles = [];
    this.kick = 0;
    this.viewModel = this.createViewModel();
    this.camera.add(this.viewModel);
    this.updateViewModel();
  }

  get active() {
    return this.weapons[this.activeIndex];
  }

  switchTo(index) {
    if (index < 0 || index >= this.weapons.length || index === this.activeIndex) return;
    this.activeIndex = index;
    this.kick = 0.05;
    this.updateViewModel();
  }

  update(dt, input, enemies, effects, player, city, time) {
    for (const weapon of this.weapons) {
      weapon.cooldown = Math.max(0, weapon.cooldown - dt);
      if (weapon.reloadRemaining > 0) {
        weapon.reloadRemaining = Math.max(0, weapon.reloadRemaining - dt);
        if (weapon.reloadRemaining === 0) this.finishReload(weapon);
      }
    }

    for (let i = 0; i < this.weapons.length; i++) {
      if (input.wasPressed(`Digit${i + 1}`)) this.switchTo(i);
    }

    const wheel = input.consumeWheel();
    if (wheel !== 0) {
      const direction = Math.sign(wheel);
      this.switchTo((this.activeIndex + direction + this.weapons.length) % this.weapons.length);
    }

    if (input.consumePressed("KeyR")) this.reload(this.active);

    const weapon = this.active;
    const wantsFire = weapon.automatic ? input.mouseDown(0) : input.mouseWasPressed(0);
    if (wantsFire) this.fire(weapon, enemies, effects, player, time);

    this.updateProjectiles(dt, enemies, effects, player, city, time);
    this.kick = Math.max(0, this.kick - dt * 7);
    this.viewModel.position.y = -0.36 - this.kick * 0.12;
    this.viewModel.position.z = -0.62 + this.kick * 0.34;
  }

  fire(weapon, enemies, effects, player, time) {
    if (weapon.reloadRemaining > 0 || weapon.cooldown > 0) return;
    if (weapon.ammo <= 0) {
      this.reload(weapon);
      return;
    }

    weapon.ammo -= 1;
    weapon.cooldown = 1 / weapon.fireRate;
    this.kick = weapon.projectile ? 0.65 : 0.32;

    if (weapon.projectile) {
      this.launchGrenade(weapon, effects);
    } else {
      for (let i = 0; i < weapon.pellets; i++) this.fireRay(weapon, enemies, effects);
    }

    if (weapon.ammo <= 0) this.reload(weapon);
  }

  fireRay(weapon, enemies, effects) {
    const THREE = this.THREE;
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(direction);

    const spread = weapon.spread;
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    let bestEnemy = null;
    let bestT = weapon.range;
    for (const enemy of enemies.alive) {
      const t = raySphere(origin, direction, enemy.getAimPoint(), enemy.hitRadius);
      if (t !== null && t < bestT) {
        bestEnemy = enemy;
        bestT = t;
      }
    }

    const hit = origin.clone().addScaledVector(direction, bestT);
    effects.spawnTracer(origin, hit, weapon.color, 0.075);
    if (bestEnemy) {
      bestEnemy.takeDamage(weapon.damage, direction.clone().multiplyScalar(weapon.damage * 0.08));
      effects.spawnBurst(hit, weapon.color, weapon.pellets > 1 ? 6 : 3, 4);
    }
  }

  launchGrenade(weapon, effects) {
    const THREE = this.THREE;
    const origin = new THREE.Vector3();
    const direction = new THREE.Vector3();
    this.camera.getWorldPosition(origin);
    this.camera.getWorldDirection(direction);
    origin.addScaledVector(direction, 1.2);
    direction.x += (Math.random() - 0.5) * weapon.spread;
    direction.y += (Math.random() - 0.5) * weapon.spread + 0.08;
    direction.z += (Math.random() - 0.5) * weapon.spread;
    direction.normalize();

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 16, 10),
      new THREE.MeshStandardMaterial({
        color: "#1d0f24",
        emissive: weapon.color,
        emissiveIntensity: 1.8,
        roughness: 0.25,
        metalness: 0.45
      })
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh,
      position: origin,
      velocity: direction.multiplyScalar(38),
      life: 2.2,
      damage: weapon.damage,
      radius: 11,
      color: weapon.color
    });
    effects.spawnBurst(origin, weapon.color, 8, 4);
  }

  updateProjectiles(dt, enemies, effects, player, city, time) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.life -= dt;
      projectile.velocity.y -= 17 * dt;
      projectile.position.addScaledVector(projectile.velocity, dt);
      projectile.mesh.position.copy(projectile.position);
      projectile.mesh.rotation.x += dt * 8;
      projectile.mesh.rotation.y += dt * 5;

      if (projectile.position.y < 0.42) {
        projectile.position.y = 0.42;
        projectile.velocity.y = Math.abs(projectile.velocity.y) * 0.42;
        projectile.velocity.x *= 0.72;
        projectile.velocity.z *= 0.72;
      }

      for (const collider of city.colliders) {
        const box = collider.box;
        if (
          projectile.position.x > box.min.x &&
          projectile.position.x < box.max.x &&
          projectile.position.y > box.min.y &&
          projectile.position.y < box.max.y &&
          projectile.position.z > box.min.z &&
          projectile.position.z < box.max.z
        ) {
          projectile.life = 0;
          break;
        }
      }

      const hitEnemy = enemies.alive.find(
        (enemy) => enemy.getAimPoint().distanceTo(projectile.position) < enemy.hitRadius + 0.5
      );
      if (hitEnemy) projectile.life = 0;

      if (projectile.life <= 0) {
        this.explode(projectile, enemies, effects, player, time);
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        projectile.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  explode(projectile, enemies, effects, player, time) {
    effects.spawnExplosion(projectile.position, projectile.radius, projectile.color);
    for (const enemy of enemies.alive) {
      const distance = enemy.getAimPoint().distanceTo(projectile.position);
      if (distance > projectile.radius) continue;
      const falloff = 1 - clamp(distance / projectile.radius, 0, 1);
      const direction = enemy.getAimPoint().clone().sub(projectile.position).normalize();
      enemy.takeDamage(projectile.damage * (0.24 + falloff * 0.9), direction.multiplyScalar(18 * falloff));
    }

    const playerDistance = player.position.distanceTo(projectile.position);
    if (playerDistance < projectile.radius) {
      player.takeDamage(projectile.damage * 0.22 * (1 - playerDistance / projectile.radius), time);
    }
  }

  reload(weapon) {
    if (weapon.reloadRemaining > 0 || weapon.reserve <= 0 || weapon.ammo >= weapon.magSize) return;
    weapon.reloadRemaining = weapon.reloadTime;
  }

  finishReload(weapon) {
    const needed = weapon.magSize - weapon.ammo;
    const moved = Math.min(needed, weapon.reserve);
    weapon.ammo += moved;
    weapon.reserve -= moved;
  }

  createViewModel() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    group.position.set(0.42, -0.36, -0.62);
    group.rotation.set(-0.04, -0.16, 0.04);
    return group;
  }

  updateViewModel() {
    const THREE = this.THREE;
    this.viewModel.clear();
    const weapon = this.active;
    const baseMat = new THREE.MeshStandardMaterial({
      color: "#111920",
      roughness: 0.32,
      metalness: 0.72
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: weapon.color,
      emissive: weapon.color,
      emissiveIntensity: 2.4,
      toneMapped: false
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, weapon.projectile ? 0.78 : 0.56), baseMat);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(weapon.projectile ? 0.085 : 0.045, weapon.projectile ? 0.085 : 0.045, 0.58, 16),
      glowMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.42);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.16), baseMat);
    grip.position.set(0, -0.24, 0.1);
    grip.rotation.x = -0.42;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.44), glowMat);
    rail.position.set(0, 0.15, -0.02);
    this.viewModel.add(body, barrel, grip, rail);
  }

  hudState() {
    const weapon = this.active;
    return {
      activeIndex: this.activeIndex,
      weapons: this.weapons,
      name: weapon.name,
      ammo: weapon.ammo,
      reserve: weapon.reserve,
      reloading: weapon.reloadRemaining > 0,
      reloadFraction:
        weapon.reloadRemaining > 0 ? 1 - weapon.reloadRemaining / Math.max(0.001, weapon.reloadTime) : 1
    };
  }
}
