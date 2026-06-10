import { rand, seededRandom } from "../engine/math.js";

export class City {
  constructor(THREE, scene, textures) {
    this.THREE = THREE;
    this.scene = scene;
    this.textures = textures;
    this.group = new THREE.Group();
    this.colliders = [];
    this.wallRunColliders = [];
    this.roads = [];
    this.lights = [];
    this.locations = {
      spawn: new THREE.Vector3(0, 2, 52),
      relay: new THREE.Vector3(92, 0, -78),
      aaOne: new THREE.Vector3(-122, 0, -90),
      aaTwo: new THREE.Vector3(132, 0, -4),
      aaThree: new THREE.Vector3(-66, 0, 118),
      skyCourier: new THREE.Vector3(154, 3, 102),
      extraction: new THREE.Vector3(-168, 42, -156)
    };

    this.scene.add(this.group);
    this.createMaterials();
    this.createLighting();
    this.createGround();
    this.createRoads();
    this.createBuildings();
    this.createMissionStructures();
    this.createSkyLanes();
  }

  createMaterials() {
    const THREE = this.THREE;
    this.materials = {
      road: new THREE.MeshStandardMaterial({
        map: this.textures.road,
        roughness: 0.64,
        metalness: 0.08
      }),
      ground: new THREE.MeshStandardMaterial({
        map: this.textures.concrete,
        roughness: 0.9,
        metalness: 0.02
      }),
      glass: new THREE.MeshStandardMaterial({
        map: this.textures.glass,
        color: "#9df7d3",
        emissive: "#0b302e",
        emissiveIntensity: 0.7,
        roughness: 0.32,
        metalness: 0.36
      }),
      darkGlass: new THREE.MeshStandardMaterial({
        color: "#071017",
        map: this.textures.glass,
        emissive: "#130927",
        emissiveIntensity: 0.45,
        roughness: 0.26,
        metalness: 0.5
      }),
      solar: new THREE.MeshStandardMaterial({
        map: this.textures.solar,
        color: "#c6eaff",
        roughness: 0.22,
        metalness: 0.65
      }),
      foliage: new THREE.MeshStandardMaterial({
        map: this.textures.foliage,
        color: "#7fffbf",
        roughness: 0.82
      }),
      neonCyan: new THREE.MeshStandardMaterial({
        color: "#35ffc6",
        emissive: "#35ffc6",
        emissiveIntensity: 2.5,
        toneMapped: false
      }),
      neonPink: new THREE.MeshStandardMaterial({
        color: "#ff57d8",
        emissive: "#ff57d8",
        emissiveIntensity: 2.3,
        toneMapped: false
      }),
      neonGold: new THREE.MeshStandardMaterial({
        color: "#f9ff66",
        emissive: "#f9ff66",
        emissiveIntensity: 2.0,
        toneMapped: false
      }),
      trunk: new THREE.MeshStandardMaterial({
        color: "#2a2519",
        roughness: 0.85
      })
    };
  }

  createLighting() {
    const THREE = this.THREE;
    this.scene.background = new THREE.Color("#071017");
    this.scene.fog = new THREE.FogExp2("#071017", 0.0046);

    const hemi = new THREE.HemisphereLight("#c4fff0", "#142314", 1.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight("#f9ffcc", 2.3);
    sun.position.set(-75, 150, 44);
    sun.castShadow = true;
    this.scene.add(sun);

    const skyGlow = new THREE.PointLight("#ff57d8", 150, 260, 2);
    skyGlow.position.set(60, 80, -80);
    this.scene.add(skyGlow);

    const cyanGlow = new THREE.PointLight("#35ffc6", 110, 220, 2);
    cyanGlow.position.set(-90, 42, 96);
    this.scene.add(cyanGlow);
  }

  createGround() {
    const THREE = this.THREE;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(720, 720), this.materials.ground);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.group.add(ground);

    const canalMaterial = new THREE.MeshStandardMaterial({
      color: "#123a42",
      emissive: "#0c4039",
      emissiveIntensity: 0.55,
      roughness: 0.16,
      metalness: 0.02,
      transparent: true,
      opacity: 0.86
    });

    for (const z of [-184, 184]) {
      const canal = new THREE.Mesh(new THREE.PlaneGeometry(720, 18), canalMaterial);
      canal.rotation.x = -Math.PI / 2;
      canal.position.set(0, 0.06, z);
      this.group.add(canal);
    }
  }

  createRoads() {
    const THREE = this.THREE;
    const roadGeomX = new THREE.PlaneGeometry(720, 15);
    const roadGeomZ = new THREE.PlaneGeometry(15, 720);
    const roads = [-168, -112, -56, 0, 56, 112, 168];

    for (const z of roads) {
      const road = new THREE.Mesh(roadGeomX, this.materials.road);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0.09, z);
      this.group.add(road);
      this.roads.push({ axis: "x", z, min: -340, max: 340 });
    }

    for (const x of roads) {
      const road = new THREE.Mesh(roadGeomZ, this.materials.road);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.1, 0);
      this.group.add(road);
      this.roads.push({ axis: "z", x, min: -340, max: 340 });
    }
  }

  createBuildings() {
    const THREE = this.THREE;
    const rnd = seededRandom(777);
    const centers = [-140, -84, -28, 28, 84, 140];

    for (const x of centers) {
      for (const z of centers) {
        const nearMission =
          Math.hypot(x - this.locations.relay.x, z - this.locations.relay.z) < 46 ||
          Math.hypot(x - this.locations.skyCourier.x, z - this.locations.skyCourier.z) < 48 ||
          Math.hypot(x, z - 52) < 42;
        if (nearMission) continue;

        const width = 24 + rnd() * 17;
        const depth = 24 + rnd() * 17;
        const height = 26 + rnd() * 112;
        const geom = new THREE.BoxGeometry(width, height, depth, 1, 5, 1);
        const mat = rnd() > 0.42 ? this.materials.glass : this.materials.darkGlass;
        const building = new THREE.Mesh(geom, mat);
        building.position.set(x + (rnd() - 0.5) * 8, height / 2, z + (rnd() - 0.5) * 8);
        building.castShadow = true;
        building.receiveShadow = true;
        this.group.add(building);
        this.addCollider(building, true);

        this.addRooftopGarden(building, width, depth, height, rnd);
        this.addNeonBands(building, width, depth, height, rnd);
        if (rnd() > 0.58) this.addSign(building, width, depth, height, rnd);
      }
    }

    for (let i = 0; i < 42; i++) {
      this.addStreetTree(rand(-310, 310), rand(-310, 310));
    }
  }

  addCollider(mesh, wallRunnable = false) {
    const THREE = this.THREE;
    mesh.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(mesh);
    const collider = { box, mesh, wallRunnable };
    this.colliders.push(collider);
    if (wallRunnable) this.wallRunColliders.push(collider);
    return collider;
  }

  addRooftopGarden(building, width, depth, height, rnd) {
    const THREE = this.THREE;
    const garden = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.82, 0.72, depth * 0.82),
      this.materials.foliage
    );
    garden.position.set(building.position.x, height + 0.45, building.position.z);
    garden.castShadow = true;
    this.group.add(garden);

    if (rnd() > 0.36) {
      const solar = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.45, 0.35, depth * 0.34),
        this.materials.solar
      );
      solar.position.set(building.position.x + width * 0.12, height + 1.1, building.position.z);
      solar.rotation.y = rnd() * Math.PI;
      solar.rotation.z = -0.12;
      this.group.add(solar);
    }
  }

  addNeonBands(building, width, depth, height, rnd) {
    const THREE = this.THREE;
    const material = rnd() > 0.5 ? this.materials.neonCyan : this.materials.neonPink;
    const levels = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < levels; i++) {
      const y = height * (0.2 + rnd() * 0.68);
      const band = new THREE.Mesh(new THREE.BoxGeometry(width + 0.35, 0.55, 0.35), material);
      band.position.set(building.position.x, y, building.position.z - depth / 2 - 0.24);
      this.group.add(band);
      const band2 = band.clone();
      band2.position.z = building.position.z + depth / 2 + 0.24;
      this.group.add(band2);
    }
  }

  addSign(building, width, depth, height, rnd) {
    const THREE = this.THREE;
    const keys = Object.keys(this.textures.signs);
    const texture = this.textures.signs[keys[Math.floor(rnd() * keys.length)]];
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.82, width * 0.42), material);
    sign.position.set(building.position.x, height * 0.62, building.position.z - depth / 2 - 0.4);
    this.group.add(sign);
  }

  addStreetTree(x, z) {
    const THREE = this.THREE;
    const nearRoad = this.roads.some((road) =>
      road.axis === "x" ? Math.abs(z - road.z) < 13 : Math.abs(x - road.x) < 13
    );
    if (!nearRoad) return;
    if (this.colliders.some(({ box }) => x > box.min.x && x < box.max.x && z > box.min.z && z < box.max.z)) return;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 4.4, 8), this.materials.trunk);
    trunk.position.y = 2.2;
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.4, 2), this.materials.foliage);
    crown.position.y = 5.2;
    tree.add(trunk, crown);
    tree.position.set(x, 0, z);
    tree.castShadow = true;
    this.group.add(tree);
  }

  createMissionStructures() {
    this.createBiodome();
    this.createAASites();
    this.createSkyDeck();
    this.createExtractionGate();
  }

  createBiodome() {
    const THREE = this.THREE;
    const loc = this.locations.relay;
    const domeMat = new THREE.MeshStandardMaterial({
      color: "#8ffff0",
      emissive: "#19655d",
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.38,
      roughness: 0.05,
      metalness: 0.08
    });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(23, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.copy(loc);
    dome.position.y = 0.4;
    this.group.add(dome);

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(24, 27, 2.2, 48), this.materials.foliage);
    platform.position.set(loc.x, 1.1, loc.z);
    this.group.add(platform);
    this.addCollider(platform, false);

    const core = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 15, 16), this.materials.neonGold);
    core.position.set(loc.x, 8.8, loc.z);
    this.group.add(core);
    this.locations.terminal = new THREE.Vector3(loc.x, 2.2, loc.z + 7);
  }

  createAASites() {
    const THREE = this.THREE;
    for (const loc of [this.locations.aaOne, this.locations.aaTwo, this.locations.aaThree]) {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.4, 3, 8), this.materials.darkGlass);
      base.position.set(loc.x, 1.5, loc.z);
      base.rotation.y = Math.PI / 8;
      this.group.add(base);
      this.addCollider(base, false);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.25, 10, 36), this.materials.neonPink);
      ring.position.set(loc.x, 3.4, loc.z);
      ring.rotation.x = Math.PI / 2;
      this.group.add(ring);
    }
  }

  createSkyDeck() {
    const THREE = this.THREE;
    const loc = this.locations.skyCourier;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(42, 3, 30), this.materials.solar);
    deck.position.set(loc.x, 1.5, loc.z);
    this.group.add(deck);
    this.addCollider(deck, false);

    const railMat = this.materials.neonCyan;
    for (const offset of [-16, 16]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 0.5), railMat);
      rail.position.set(loc.x, 4, loc.z + offset);
      this.group.add(rail);
    }
  }

  createExtractionGate() {
    const THREE = this.THREE;
    const loc = this.locations.extraction;
    const material = this.materials.neonGold;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(13, 0.7, 16, 64), material);
    ring.position.copy(loc);
    ring.rotation.y = Math.PI / 2;
    this.group.add(ring);

    const spine = new THREE.Mesh(new THREE.BoxGeometry(8, 34, 8), this.materials.foliage);
    spine.position.set(loc.x, 17, loc.z);
    this.group.add(spine);
  }

  createSkyLanes() {
    const THREE = this.THREE;
    const material = new THREE.LineBasicMaterial({
      color: "#35ffc6",
      transparent: true,
      opacity: 0.34
    });
    for (let i = 0; i < 5; i++) {
      const points = [];
      const y = 32 + i * 12;
      for (let t = 0; t <= 1; t += 0.025) {
        const angle = t * Math.PI * 2;
        points.push(new THREE.Vector3(Math.cos(angle) * (120 + i * 28), y, Math.sin(angle) * (90 + i * 22)));
      }
      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.LineLoop(geom, material);
      this.group.add(line);
    }
  }
}
