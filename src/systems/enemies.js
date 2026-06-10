import { Action, Condition, Selector, Sequence, Status } from "../engine/behaviorTree.js";
import { clamp, distanceXZ, rand, wrapAngle } from "../engine/math.js";

const TYPE_DATA = {
  sentinel: {
    health: 85,
    speed: 4.6,
    range: 34,
    detection: 82,
    damage: 10,
    fireInterval: 0.72,
    hitRadius: 1.25,
    color: "#35ffc6"
  },
  drone: {
    health: 62,
    speed: 7.8,
    range: 42,
    detection: 110,
    damage: 8,
    fireInterval: 0.46,
    hitRadius: 1.05,
    color: "#49a6ff",
    flying: true
  },
  brute: {
    health: 210,
    speed: 5.4,
    range: 5.4,
    detection: 78,
    damage: 24,
    fireInterval: 1.05,
    hitRadius: 1.65,
    color: "#f9ff66"
  },
  sniper: {
    health: 74,
    speed: 3.8,
    range: 94,
    detection: 124,
    damage: 19,
    fireInterval: 1.35,
    hitRadius: 1.05,
    color: "#ff57d8"
  },
  turret: {
    health: 130,
    speed: 0,
    range: 118,
    detection: 140,
    damage: 13,
    fireInterval: 0.54,
    hitRadius: 1.45,
    color: "#ff365e",
    stationary: true
  }
};

export class EnemySystem {
  constructor(THREE, scene, city) {
    this.THREE = THREE;
    this.scene = scene;
    this.city = city;
    this.enemies = [];
    this.turretsSpawned = false;
    this.reinforcementsSpawned = false;
    this.spawnInitialPatrols();
  }

  get alive() {
    return this.enemies.filter((enemy) => enemy.alive);
  }

  spawn(type, position, options = {}) {
    const enemy = new Enemy(this.THREE, this.scene, type, position, options);
    this.enemies.push(enemy);
    return enemy;
  }

  spawnInitialPatrols() {
    const positions = [
      [-40, 0, -38, "sentinel"],
      [42, 0, -48, "sentinel"],
      [78, 10, -112, "drone"],
      [-92, 0, 68, "brute"],
      [-132, 0, -126, "sniper"],
      [112, 0, 44, "sentinel"],
      [-40, 16, 126, "drone"]
    ];
    for (const [x, y, z, type] of positions) {
      this.spawn(type, new this.THREE.Vector3(x, y || 0, z));
    }
  }

  ensureTurrets() {
    if (this.turretsSpawned) return;
    this.turretsSpawned = true;
    for (const loc of [this.city.locations.aaOne, this.city.locations.aaTwo, this.city.locations.aaThree]) {
      this.spawn("turret", loc.clone().add(new this.THREE.Vector3(0, 4.1, 0)), { tag: "aa-turret" });
      this.spawn("sentinel", loc.clone().add(new this.THREE.Vector3(rand(-10, 10), 0, rand(-10, 10))));
    }
  }

  spawnExtractionReinforcements() {
    if (this.reinforcementsSpawned) return;
    this.reinforcementsSpawned = true;
    const loc = this.city.locations.extraction;
    this.spawn("drone", loc.clone().add(new this.THREE.Vector3(18, 7, 12)));
    this.spawn("drone", loc.clone().add(new this.THREE.Vector3(-18, 10, -16)));
    this.spawn("sniper", new this.THREE.Vector3(-140, 0, -132));
  }

  update(dt, player, effects, time) {
    for (const enemy of this.enemies) enemy.update(dt, player, effects, time, this.city);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (enemy.removeMe) {
        this.scene.remove(enemy.group);
        enemy.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }

  aliveByTag(tag) {
    return this.alive.filter((enemy) => enemy.tag === tag);
  }
}

class Enemy {
  constructor(THREE, scene, type, position, options = {}) {
    this.THREE = THREE;
    this.scene = scene;
    this.type = type;
    this.data = TYPE_DATA[type];
    this.tag = options.tag || type;
    this.position = position.clone();
    this.position.y = this.data.flying ? Math.max(10, this.position.y || 18) : Math.max(1.2, this.position.y + 1.2);
    this.velocity = new THREE.Vector3();
    this.impulse = new THREE.Vector3();
    this.yaw = 0;
    this.health = this.data.health;
    this.maxHealth = this.data.health;
    this.hitRadius = this.data.hitRadius;
    this.alive = true;
    this.deadTimer = 0;
    this.removeMe = false;
    this.fireCooldown = rand(0.1, 0.8);
    this.patrolIndex = 0;
    this.orbit = rand(0, Math.PI * 2);
    this.group = this.createMesh();
    this.group.position.copy(this.position);
    scene.add(this.group);
    this.patrol = options.patrol || this.defaultPatrol();
    this.tree = this.createTree();
  }

  defaultPatrol() {
    const THREE = this.THREE;
    const points = [];
    for (let i = 0; i < 4; i++) {
      points.push(
        this.position
          .clone()
          .add(new THREE.Vector3(Math.cos(i * Math.PI * 0.5) * 18, 0, Math.sin(i * Math.PI * 0.5) * 18))
      );
    }
    return points;
  }

  createMesh() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const glow = new THREE.MeshStandardMaterial({
      color: this.data.color,
      emissive: this.data.color,
      emissiveIntensity: 1.8,
      toneMapped: false
    });
    const armor = new THREE.MeshStandardMaterial({
      color: this.type === "brute" ? "#25281e" : "#111920",
      roughness: 0.36,
      metalness: 0.62
    });

    if (this.type === "drone") {
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), armor);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), glow);
      eye.position.set(0, 0.16, -0.95);
      const rotorA = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 0.16), glow);
      const rotorB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 3.2), glow);
      group.add(body, eye, rotorA, rotorB);
    } else if (this.type === "turret") {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.7, 1.1, 12), armor);
      const head = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 1.4), armor);
      head.position.y = 0.95;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.3, 12), glow);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.95, -1.65);
      group.add(base, head, barrel);
    } else {
      const scale = this.type === "brute" ? 1.35 : 1;
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 2.1 * scale, 0.86 * scale), armor);
      body.position.y = 0.9 * scale;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.82 * scale, 0.55 * scale, 0.72 * scale), armor);
      head.position.y = 2.2 * scale;
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.68 * scale, 0.12 * scale, 0.08), glow);
      visor.position.set(0, 2.25 * scale, -0.41 * scale);
      const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 1.35), glow);
      weapon.position.set(0.62 * scale, 1.36 * scale, -0.58 * scale);
      group.add(body, head, visor, weapon);
    }

    return group;
  }

  createTree() {
    const canSee = new Condition((ctx) => ctx.distance < ctx.self.data.detection);
    const inRange = new Condition((ctx) => ctx.distance < ctx.self.data.range);
    const tooClose = new Condition((ctx) => ctx.distance < 18);
    const nearMelee = new Condition((ctx) => ctx.distance < ctx.self.data.range + 0.8);

    if (this.type === "drone") {
      return new Selector([
        new Sequence([canSee, inRange, new Action((ctx) => ctx.self.orbitAndFire(ctx))]),
        new Sequence([canSee, new Action((ctx) => ctx.self.flyToward(ctx))]),
        new Action((ctx) => ctx.self.patrolMove(ctx))
      ]);
    }

    if (this.type === "brute") {
      return new Selector([
        new Sequence([canSee, nearMelee, new Action((ctx) => ctx.self.smash(ctx))]),
        new Sequence([canSee, new Action((ctx) => ctx.self.charge(ctx))]),
        new Action((ctx) => ctx.self.patrolMove(ctx))
      ]);
    }

    if (this.type === "sniper") {
      return new Selector([
        new Sequence([canSee, tooClose, new Action((ctx) => ctx.self.reposition(ctx))]),
        new Sequence([canSee, inRange, new Action((ctx) => ctx.self.fireAtPlayer(ctx, 1.3))]),
        new Sequence([canSee, new Action((ctx) => ctx.self.seekLine(ctx))]),
        new Action((ctx) => ctx.self.patrolMove(ctx))
      ]);
    }

    if (this.type === "turret") {
      return new Selector([
        new Sequence([canSee, inRange, new Action((ctx) => ctx.self.fireAtPlayer(ctx, 1))]),
        new Action((ctx) => ctx.self.scan(ctx))
      ]);
    }

    return new Selector([
      new Sequence([canSee, inRange, new Action((ctx) => ctx.self.fireAtPlayer(ctx, 1))]),
      new Sequence([canSee, new Action((ctx) => ctx.self.chase(ctx))]),
      new Action((ctx) => ctx.self.patrolMove(ctx))
    ]);
  }

  update(dt, player, effects, time, city) {
    if (!this.alive) {
      this.deadTimer += dt;
      this.group.rotation.z += dt * 1.2;
      this.group.scale.multiplyScalar(1 - dt * 0.65);
      if (this.deadTimer > 2.4) this.removeMe = true;
      return;
    }

    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    const distance = this.position.distanceTo(player.position);
    this.tree.tick({ self: this, player, effects, dt, time, distance, city });

    this.velocity.addScaledVector(this.impulse, dt);
    this.impulse.multiplyScalar(0.86);
    this.position.addScaledVector(this.velocity, dt);
    if (!this.data.flying && !this.data.stationary) {
      this.position.y = 1.2;
      this.velocity.y = 0;
    }
    if (this.data.flying) {
      this.position.y = clamp(this.position.y, 10, 46);
    }

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;

    if (this.health <= 0) this.die(effects);
  }

  moveToward(target, speed, dt, stopDistance = 0) {
    if (this.data.stationary) return Status.FAILURE;
    const desired = target.clone().sub(this.position);
    if (!this.data.flying) desired.y = 0;
    const dist = desired.length();
    if (dist <= stopDistance) {
      this.velocity.multiplyScalar(0.75);
      return Status.SUCCESS;
    }
    desired.normalize();
    this.velocity.lerp(desired.multiplyScalar(speed), clamp(dt * 5, 0, 1));
    this.face(target, dt);
    return Status.RUNNING;
  }

  face(target, dt) {
    const dx = target.x - this.position.x;
    const dz = target.z - this.position.z;
    if (Math.hypot(dx, dz) < 0.001) return;
    const desired = Math.atan2(-dx, -dz);
    this.yaw += wrapAngle(desired - this.yaw) * clamp(dt * 8, 0, 1);
  }

  chase(ctx) {
    this.moveToward(ctx.player.position, this.data.speed, ctx.dt, this.data.range * 0.72);
    return Status.RUNNING;
  }

  charge(ctx) {
    this.moveToward(ctx.player.position, this.data.speed * 1.55, ctx.dt, 2.5);
    return Status.RUNNING;
  }

  smash(ctx) {
    this.velocity.multiplyScalar(0.5);
    this.face(ctx.player.position, ctx.dt);
    if (this.fireCooldown <= 0) {
      ctx.player.takeDamage(this.data.damage, ctx.time);
      const direction = ctx.player.position.clone().sub(this.position).normalize();
      ctx.player.velocity.addScaledVector(direction, 8);
      ctx.player.velocity.y = Math.max(ctx.player.velocity.y, 5);
      ctx.effects.spawnExplosion(this.position.clone().add(new this.THREE.Vector3(0, 0.7, 0)), 4.2, this.data.color);
      this.fireCooldown = this.data.fireInterval;
    }
    return Status.SUCCESS;
  }

  fireAtPlayer(ctx, accuracy = 1) {
    this.velocity.multiplyScalar(0.88);
    this.face(ctx.player.position, ctx.dt);
    if (this.fireCooldown > 0) return Status.RUNNING;

    const THREE = this.THREE;
    const start = this.getAimPoint();
    const end = ctx.player.position.clone();
    end.y -= 0.12;
    const miss = (1 / accuracy - 1) * 2.4;
    end.x += rand(-miss, miss);
    end.y += rand(-miss, miss);
    end.z += rand(-miss, miss);
    ctx.effects.spawnTracer(start, end, this.data.color, 0.12);
    const distance = start.distanceTo(ctx.player.position);
    const hitChance = clamp(1 - distance / (this.data.range * 1.45), 0.24, 0.92) * accuracy;
    if (Math.random() < hitChance) ctx.player.takeDamage(this.data.damage, ctx.time);
    this.fireCooldown = this.data.fireInterval;
    return Status.SUCCESS;
  }

  orbitAndFire(ctx) {
    this.orbit += ctx.dt * 1.8;
    const radius = 18;
    const desired = ctx.player.position
      .clone()
      .add(new this.THREE.Vector3(Math.cos(this.orbit) * radius, 13 + Math.sin(this.orbit * 2) * 4, Math.sin(this.orbit) * radius));
    this.moveToward(desired, this.data.speed, ctx.dt, 2);
    this.fireAtPlayer(ctx, 0.74);
    return Status.RUNNING;
  }

  flyToward(ctx) {
    const target = ctx.player.position.clone().add(new this.THREE.Vector3(0, 15, 0));
    this.moveToward(target, this.data.speed, ctx.dt, 12);
    return Status.RUNNING;
  }

  seekLine(ctx) {
    const offset = this.position.clone().sub(ctx.player.position).normalize().multiplyScalar(36);
    const target = ctx.player.position.clone().add(offset);
    target.y = 1.2;
    this.moveToward(target, this.data.speed, ctx.dt, 4);
    return Status.RUNNING;
  }

  reposition(ctx) {
    const away = this.position.clone().sub(ctx.player.position);
    away.y = 0;
    if (away.lengthSq() < 0.001) away.set(1, 0, 0);
    away.normalize();
    const target = this.position.clone().add(away.multiplyScalar(20));
    this.moveToward(target, this.data.speed * 1.25, ctx.dt, 3);
    return Status.RUNNING;
  }

  scan(ctx) {
    this.yaw += ctx.dt * 0.65;
    this.velocity.set(0, 0, 0);
    return Status.RUNNING;
  }

  patrolMove(ctx) {
    if (!this.patrol.length || this.data.stationary) return this.scan(ctx);
    const target = this.patrol[this.patrolIndex];
    if (distanceXZ(this.position, target) < 2.4) {
      this.patrolIndex = (this.patrolIndex + 1) % this.patrol.length;
    }
    this.moveToward(this.patrol[this.patrolIndex], this.data.speed * 0.58, ctx.dt, 1.5);
    return Status.RUNNING;
  }

  takeDamage(amount, impulse) {
    if (!this.alive) return;
    this.health -= amount;
    if (impulse) this.impulse.add(impulse);
  }

  die(effects) {
    if (!this.alive) return;
    this.alive = false;
    this.velocity.set(0, 0, 0);
    effects.spawnBurst(this.getAimPoint(), this.data.color, this.type === "brute" ? 34 : 18, 8);
  }

  getAimPoint() {
    const point = this.position.clone();
    point.y += this.type === "drone" ? 0.1 : this.type === "turret" ? 0.4 : 1.2;
    return point;
  }

  dispose() {
    this.group.traverse((child) => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose?.());
      else child.material?.dispose?.();
    });
  }
}
