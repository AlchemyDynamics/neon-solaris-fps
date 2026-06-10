import { rand } from "../engine/math.js";

export function createVehicleMesh(THREE, color = "#35ffc6", flying = false) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: flying ? "#111920" : "#151b20",
    roughness: 0.28,
    metalness: 0.62
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 2.4,
    toneMapped: false
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: "#9df7d3",
    emissive: "#0d4840",
    emissiveIntensity: 0.8,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.74
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(flying ? 3.9 : 3.7, flying ? 0.8 : 0.75, flying ? 6.2 : 5.2), bodyMat);
  body.position.y = flying ? 0.16 : 0.52;
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 1.8), glassMat);
  cockpit.position.set(0, flying ? 0.72 : 1.1, flying ? -0.55 : -0.45);
  const leftLight = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.16), glowMat);
  leftLight.position.set(-1.2, 0.62, -2.75);
  const rightLight = leftLight.clone();
  rightLight.position.x = 1.2;
  group.add(body, cockpit, leftLight, rightLight);

  if (flying) {
    const wingA = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.12, 1.1), glowMat);
    wingA.position.set(0, 0.18, 0.8);
    const wingB = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.1, 0.6), glowMat);
    wingB.position.set(0, -0.2, 2.2);
    group.add(wingA, wingB);
  } else {
    const wheelMat = new THREE.MeshStandardMaterial({ color: "#05080b", roughness: 0.7, metalness: 0.2 });
    for (const x of [-1.45, 1.45]) {
      for (const z of [-1.8, 1.8]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.3, 16), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.22, z);
        group.add(wheel);
      }
    }
  }
  return group;
}

export class TrafficSystem {
  constructor(THREE, scene, city) {
    this.THREE = THREE;
    this.scene = scene;
    this.city = city;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.groundCars = [];
    this.flyingCars = [];
    this.createGroundTraffic();
    this.createFlyingTraffic();
  }

  createGroundTraffic() {
    const colors = ["#35ffc6", "#ff57d8", "#f9ff66", "#49a6ff"];
    const roadLines = [-168, -112, -56, 0, 56, 112, 168];
    for (let i = 0; i < 32; i++) {
      const axis = Math.random() > 0.5 ? "x" : "z";
      const road = roadLines[Math.floor(Math.random() * roadLines.length)];
      const direction = Math.random() > 0.5 ? 1 : -1;
      const laneOffset = direction > 0 ? -3.3 : 3.3;
      const mesh = createVehicleMesh(this.THREE, colors[i % colors.length], false);
      mesh.scale.setScalar(rand(0.78, 1.06));
      this.group.add(mesh);
      this.groundCars.push({
        mesh,
        axis,
        road,
        direction,
        laneOffset,
        progress: rand(-330, 330),
        speed: rand(8, 18)
      });
    }
  }

  createFlyingTraffic() {
    const colors = ["#9df7d3", "#ff57d8", "#f9ff66", "#49a6ff"];
    for (let i = 0; i < 26; i++) {
      const mesh = createVehicleMesh(this.THREE, colors[i % colors.length], true);
      mesh.scale.setScalar(rand(0.58, 0.95));
      this.group.add(mesh);
      this.flyingCars.push({
        mesh,
        phase: rand(0, Math.PI * 2),
        radiusX: rand(100, 250),
        radiusZ: rand(80, 210),
        altitude: rand(24, 70),
        speed: rand(0.12, 0.32),
        wobble: rand(0.4, 1.8)
      });
    }
  }

  update(dt, time) {
    for (const car of this.groundCars) {
      car.progress += car.direction * car.speed * dt;
      if (car.progress > 340) car.progress = -340;
      if (car.progress < -340) car.progress = 340;
      if (car.axis === "x") {
        car.mesh.position.set(car.progress, 0, car.road + car.laneOffset);
        car.mesh.rotation.y = car.direction > 0 ? -Math.PI / 2 : Math.PI / 2;
      } else {
        car.mesh.position.set(car.road + car.laneOffset, 0, car.progress);
        car.mesh.rotation.y = car.direction > 0 ? Math.PI : 0;
      }
    }

    for (const car of this.flyingCars) {
      car.phase += car.speed * dt;
      const x = Math.cos(car.phase) * car.radiusX;
      const z = Math.sin(car.phase) * car.radiusZ;
      const nextX = Math.cos(car.phase + 0.02) * car.radiusX;
      const nextZ = Math.sin(car.phase + 0.02) * car.radiusZ;
      car.mesh.position.set(x, car.altitude + Math.sin(time * car.wobble + car.phase) * 2, z);
      car.mesh.rotation.y = Math.atan2(x - nextX, z - nextZ);
      car.mesh.rotation.z = Math.sin(car.phase * 2) * 0.12;
    }
  }
}
