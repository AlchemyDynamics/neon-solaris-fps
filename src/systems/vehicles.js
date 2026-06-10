import { clamp, distanceXZ, forwardFromYaw, rightFromYaw, wrapAngle } from "../engine/math.js";
import { createVehicleMesh } from "./traffic.js";
import { Sfx } from "../engine/audio.js";

export class VehicleSystem {
  constructor(THREE, scene, city) {
    this.THREE = THREE;
    this.scene = scene;
    this.city = city;
    this.vehicles = [];
    this.active = null;
    this.createVehicles();
  }

  createVehicles() {
    this.addVehicle("Solar Coupe", "ground", new this.THREE.Vector3(18, 0, 35), "#35ffc6");
    this.addVehicle("Metro Runner", "ground", new this.THREE.Vector3(-62, 0, 52), "#f9ff66");
    this.addVehicle("Sky Courier", "skimmer", this.city.locations.skyCourier.clone().add(new this.THREE.Vector3(0, 3.5, 0)), "#ff57d8", {
      role: "courier"
    });
  }

  addVehicle(name, type, position, color, options = {}) {
    const mesh = createVehicleMesh(this.THREE, color, type === "skimmer");
    mesh.position.copy(position);
    mesh.rotation.y = options.yaw || 0;
    this.scene.add(mesh);
    const vehicle = {
      name,
      type,
      role: options.role || type,
      mesh,
      position,
      yaw: options.yaw || 0,
      speed: 0,
      color,
      occupied: false
    };
    this.vehicles.push(vehicle);
    return vehicle;
  }

  update(dt, input, player, camera, time) {
    if (input.consumePressed("KeyF")) {
      if (this.active) this.exit(player);
      else {
        const nearest = this.findNearest(player.position);
        if (nearest && nearest.distance < 7) this.enter(nearest.vehicle, player);
      }
    }

    if (!this.active) {
      for (const vehicle of this.vehicles) {
        vehicle.mesh.position.copy(vehicle.position);
        vehicle.mesh.rotation.y = vehicle.yaw;
      }
      Sfx.engineStop();
      return;
    }

    Sfx.engine(Math.abs(this.active.speed) / 48, this.active.type === "skimmer");
    player.updateLook(input);
    if (this.active.type === "skimmer") this.updateSkimmer(dt, input);
    else this.updateGround(dt, input);

    this.active.mesh.position.copy(this.active.position);
    this.active.mesh.rotation.y = this.active.yaw;
    if (this.active.type === "skimmer") {
      this.active.mesh.rotation.z = Math.sin(time * 2.1) * 0.03;
      this.active.mesh.position.y += Math.sin(time * 2.4) * 0.12;
    }

    const cockpitHeight = this.active.type === "skimmer" ? 1.35 : 1.25;
    player.position.copy(this.active.position);
    player.position.y += cockpitHeight;
    player.velocity.set(0, 0, 0);
    player.applyCamera(camera);
  }

  updateGround(dt, input) {
    const vehicle = this.active;
    const throttle = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 0.78 : 0);
    const steer = (input.isDown("KeyA") ? 1 : 0) - (input.isDown("KeyD") ? 1 : 0);
    vehicle.speed += throttle * 25 * dt;
    vehicle.speed *= 1 - Math.min(0.94, dt * 1.35);
    vehicle.speed = clamp(vehicle.speed, -13, 31);
    vehicle.yaw += steer * dt * clamp(Math.abs(vehicle.speed) * 0.08, 0.4, 2.2) * Math.sign(vehicle.speed || 1);
    const forward = forwardFromYaw(vehicle.yaw, new this.THREE.Vector3());
    vehicle.position.addScaledVector(forward, vehicle.speed * dt);
    vehicle.position.y = 0;
    vehicle.position.x = clamp(vehicle.position.x, -332, 332);
    vehicle.position.z = clamp(vehicle.position.z, -332, 332);
  }

  updateSkimmer(dt, input) {
    const vehicle = this.active;
    const throttle = (input.isDown("KeyW") ? 1 : 0) - (input.isDown("KeyS") ? 0.7 : 0);
    const steer = (input.isDown("KeyA") ? 1 : 0) - (input.isDown("KeyD") ? 1 : 0);
    const boost = input.isDown("ShiftLeft") || input.isDown("ShiftRight") ? 1.45 : 1;
    vehicle.speed += throttle * 31 * boost * dt;
    vehicle.speed *= 1 - Math.min(0.94, dt * 0.92);
    vehicle.speed = clamp(vehicle.speed, -16, 48 * boost);
    vehicle.yaw += steer * dt * 1.35;
    const lift = (input.isDown("Space") ? 1 : 0) - (input.isDown("KeyC") ? 1 : 0);
    const forward = forwardFromYaw(vehicle.yaw, new this.THREE.Vector3());
    vehicle.position.addScaledVector(forward, vehicle.speed * dt);
    vehicle.position.y = clamp(vehicle.position.y + lift * 18 * dt, 5, 76);
    vehicle.position.x = clamp(vehicle.position.x, -345, 345);
    vehicle.position.z = clamp(vehicle.position.z, -345, 345);
  }

  enter(vehicle, player) {
    this.active = vehicle;
    vehicle.occupied = true;
    player.activeVehicle = vehicle;
    player.yaw = vehicle.yaw;
    player.pitch = clamp(player.pitch, -0.55, 0.55);
  }

  exit(player) {
    if (!this.active) return;
    const vehicle = this.active;
    const right = rightFromYaw(vehicle.yaw, new this.THREE.Vector3());
    player.position.copy(vehicle.position).addScaledVector(right, 3.2);
    player.position.y = Math.max(1.72, vehicle.type === "skimmer" ? vehicle.position.y + 0.4 : 1.72);
    player.velocity.set(0, 0, 0);
    player.activeVehicle = null;
    vehicle.occupied = false;
    this.active = null;
  }

  findNearest(point) {
    let best = null;
    let bestDistance = Infinity;
    for (const vehicle of this.vehicles) {
      const distance = vehicle.type === "skimmer" ? point.distanceTo(vehicle.position) : distanceXZ(point, vehicle.position);
      if (distance < bestDistance) {
        best = vehicle;
        bestDistance = distance;
      }
    }
    return best ? { vehicle: best, distance: bestDistance } : null;
  }

  getPrompt(player) {
    if (this.active) return `[F] Exit ${this.active.name}`;
    const nearest = this.findNearest(player.position);
    if (nearest && nearest.distance < 7) return `[F] Enter ${nearest.vehicle.name}`;
    return "";
  }

  isCourierActive() {
    return this.active?.role === "courier";
  }
}
