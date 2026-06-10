import {
  circleIntersectsBoxXZ,
  clamp,
  forwardFromYaw,
  nearestPointOnBoxXZ,
  rightFromYaw
} from "../engine/math.js";
import { Sfx } from "../engine/audio.js";

const tempForward = { x: 0, y: 0, z: 0 };
const tempRight = { x: 0, y: 0, z: 0 };

export class Player {
  constructor(THREE, start) {
    this.THREE = THREE;
    this.position = start.clone();
    this.position.y = Math.max(this.position.y, 1.8);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.height = 1.72;
    this.radius = 0.62;
    this.walkSpeed = 8.8;
    this.sprintSpeed = 13.6;
    this.airControl = 0.32;
    this.jumpSpeed = 9.2;
    this.gravity = 24;
    this.onGround = false;
    this.wallRun = null;
    this.wallRunCooldown = 0;
    this.health = 100;
    this.shield = 100;
    this.maxHealth = 100;
    this.maxShield = 100;
    this.lastDamageAt = 0;
    this.dead = false;
    this.activeVehicle = null;
    this.damageFlash = 0;
  }

  updateLook(input) {
    const sensitivity = input.mouseDown(2) ? 0.00125 : 0.0021;
    this.yaw -= input.mouseDelta.x * sensitivity;
    this.pitch -= input.mouseDelta.y * sensitivity;
    this.pitch = clamp(this.pitch, -1.35, 1.35);
  }

  applyCamera(camera) {
    camera.position.copy(this.position);
    camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  update(dt, input, camera, colliders, wallRunColliders, time) {
    if (this.activeVehicle) return;
    this.updateLook(input);
    this.wallRunCooldown = Math.max(0, this.wallRunCooldown - dt);
    this.regenerateShield(dt, time);

    const THREE = this.THREE;
    const forward = forwardFromYaw(this.yaw, new THREE.Vector3());
    const right = rightFromYaw(this.yaw, new THREE.Vector3());
    const wish = new THREE.Vector3();
    if (input.isDown("KeyW")) wish.add(forward);
    if (input.isDown("KeyS")) wish.sub(forward);
    if (input.isDown("KeyD")) wish.add(right);
    if (input.isDown("KeyA")) wish.sub(right);
    if (wish.lengthSq() > 0.001) wish.normalize();

    const sprinting = input.isDown("ShiftLeft") || input.isDown("ShiftRight");
    const speed = sprinting ? this.sprintSpeed : this.walkSpeed;

    if (this.onGround) {
      this.velocity.x = wish.x * speed;
      this.velocity.z = wish.z * speed;
      if (input.consumePressed("Space")) {
        this.velocity.y = this.jumpSpeed;
        this.onGround = false;
      }
    } else if (this.wallRun) {
      this.updateWallRun(dt, input, wish);
    } else {
      this.velocity.x += wish.x * speed * this.airControl * dt * 5;
      this.velocity.z += wish.z * speed * this.airControl * dt * 5;
      const lateral = Math.hypot(this.velocity.x, this.velocity.z);
      const maxAir = speed * 1.18;
      if (lateral > maxAir) {
        this.velocity.x = (this.velocity.x / lateral) * maxAir;
        this.velocity.z = (this.velocity.z / lateral) * maxAir;
      }
      this.velocity.y -= this.gravity * dt;
      this.tryStartWallRun(input, wallRunColliders, forward, right);
    }

    this.integrate(dt, colliders);
    this.applyCamera(camera);
  }

  updateWallRun(dt, input, wish) {
    const THREE = this.THREE;
    this.wallRun.timer -= dt;
    const normal = this.wallRun.normal;
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
    if (tangent.dot(wish) < 0) tangent.multiplyScalar(-1);
    this.velocity.x = tangent.x * 13.8;
    this.velocity.z = tangent.z * 13.8;
    this.velocity.y = Math.max(this.velocity.y, 1.4) - 3.0 * dt;

    if (!input.isDown("KeyW") || this.wallRun.timer <= 0) {
      this.wallRun = null;
      this.wallRunCooldown = 0.22;
      return;
    }

    if (input.consumePressed("Space")) {
      this.velocity.x = normal.x * 8.2 + tangent.x * 8;
      this.velocity.z = normal.z * 8.2 + tangent.z * 8;
      this.velocity.y = this.jumpSpeed * 0.96;
      this.wallRun = null;
      this.wallRunCooldown = 0.38;
    }
  }

  tryStartWallRun(input, wallRunColliders, forward, right) {
    if (this.wallRunCooldown > 0 || !input.isDown("KeyW") || this.velocity.y < -13) return;
    const wall = this.findWall(wallRunColliders);
    if (!wall) return;
    const sideDot = wall.normal.dot(right);
    if (Math.abs(sideDot) < 0.34) return;
    const alongWall = Math.abs(wall.normal.dot(forward));
    if (alongWall > 0.82) return;
    this.wallRun = {
      normal: wall.normal,
      timer: 1.45,
      side: sideDot > 0 ? "right" : "left"
    };
    this.velocity.y = Math.max(this.velocity.y, 2.2);
  }

  findWall(colliders) {
    const THREE = this.THREE;
    const nearest = new THREE.Vector3();
    let best = null;
    let bestDist = Infinity;
    for (const collider of colliders) {
      const box = collider.box;
      if (this.position.y < box.min.y + 1 || this.position.y > box.max.y + 4) continue;
      nearestPointOnBoxXZ(this.position, box, nearest);
      const dx = this.position.x - nearest.x;
      const dz = this.position.z - nearest.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 1.05 || dist >= bestDist) continue;

      const normal = new THREE.Vector3(dx, 0, dz);
      if (normal.lengthSq() < 0.0001) {
        const left = Math.abs(this.position.x - box.min.x);
        const right = Math.abs(this.position.x - box.max.x);
        const front = Math.abs(this.position.z - box.min.z);
        const back = Math.abs(this.position.z - box.max.z);
        const min = Math.min(left, right, front, back);
        if (min === left) normal.set(-1, 0, 0);
        else if (min === right) normal.set(1, 0, 0);
        else if (min === front) normal.set(0, 0, -1);
        else normal.set(0, 0, 1);
      } else {
        normal.normalize();
      }
      best = { collider, normal };
      bestDist = dist;
    }
    return best;
  }

  integrate(dt, colliders) {
    this.position.x += this.velocity.x * dt;
    this.resolveHorizontal(colliders, "x");
    this.position.z += this.velocity.z * dt;
    this.resolveHorizontal(colliders, "z");
    this.position.y += this.velocity.y * dt;

    if (this.position.y <= this.height) {
      this.position.y = this.height;
      this.velocity.y = 0;
      this.onGround = true;
      this.wallRun = null;
    } else {
      this.onGround = false;
    }
  }

  resolveHorizontal(colliders) {
    const THREE = this.THREE;
    const center = new THREE.Vector3(this.position.x, this.position.y, this.position.z);
    for (const collider of colliders) {
      const box = collider.box;
      if (this.position.y < box.min.y - 0.2 || this.position.y - this.height > box.max.y) continue;
      if (!circleIntersectsBoxXZ(center, this.radius, box)) continue;
      const nearest = new THREE.Vector3();
      nearestPointOnBoxXZ(center, box, nearest);
      let dx = center.x - nearest.x;
      let dz = center.z - nearest.z;
      let dist = Math.hypot(dx, dz);

      if (dist < 0.0001) {
        const pxMin = Math.abs(center.x - box.min.x);
        const pxMax = Math.abs(center.x - box.max.x);
        const pzMin = Math.abs(center.z - box.min.z);
        const pzMax = Math.abs(center.z - box.max.z);
        const min = Math.min(pxMin, pxMax, pzMin, pzMax);
        if (min === pxMin) {
          dx = -1;
          dz = 0;
          dist = pxMin;
        } else if (min === pxMax) {
          dx = 1;
          dz = 0;
          dist = pxMax;
        } else if (min === pzMin) {
          dx = 0;
          dz = -1;
          dist = pzMin;
        } else {
          dx = 0;
          dz = 1;
          dist = pzMax;
        }
      }

      const penetration = this.radius - dist;
      if (penetration > 0) {
        const nx = dx / Math.max(0.0001, dist);
        const nz = dz / Math.max(0.0001, dist);
        this.position.x += nx * penetration;
        this.position.z += nz * penetration;
        const inward = this.velocity.x * nx + this.velocity.z * nz;
        if (inward < 0) {
          this.velocity.x -= inward * nx;
          this.velocity.z -= inward * nz;
        }
      }
    }
  }

  regenerateShield(dt, time) {
    if (time - this.lastDamageAt > 4.2) {
      this.shield = Math.min(this.maxShield, this.shield + dt * 13);
    }
    this.damageFlash = Math.max(0, this.damageFlash - dt * 2.4);
  }

  takeDamage(amount, time) {
    if (this.dead) return;
    this.lastDamageAt = time;
    this.damageFlash = 1;
    Sfx.hit();
    const shieldHit = Math.min(this.shield, amount);
    this.shield -= shieldHit;
    this.health -= amount - shieldHit;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  respawn(start) {
    this.position.copy(start);
    this.position.y = Math.max(this.height, start.y);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.shield = this.maxShield;
    this.dead = false;
    this.wallRun = null;
    this.activeVehicle = null;
  }

  getForwardVector(out) {
    return forwardFromYaw(this.yaw, out);
  }

  getRightVector(out) {
    return rightFromYaw(this.yaw, out);
  }
}
