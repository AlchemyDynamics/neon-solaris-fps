import { formatDistance } from "../engine/math.js";

export class MissionSystem {
  constructor(THREE, scene, city, story) {
    this.THREE = THREE;
    this.scene = scene;
    this.city = city;
    this.story = story;
    this.index = 0;
    this.startedObjectives = new Set();
    this.messages = [];
    this.prompt = "";
    this.objectives = [
      {
        title: "Reach the Dawnline relay.",
        target: city.locations.relay,
        radius: 20,
        type: "reach",
        message: story.briefings?.[0] || "Reach the relay."
      },
      {
        title: "Breach the biodome seed vault.",
        target: city.locations.terminal,
        radius: 7,
        type: "interact",
        prompt: "Breach seed vault",
        message: "The seed vault is ready. Start the handshake at the relay core."
      },
      {
        title: "Destroy the three anti-air emplacements.",
        target: city.locations.aaOne,
        radius: 1,
        type: "destroyTurrets",
        message: story.briefings?.[1] || "Clear the anti-air sites."
      },
      {
        title: "Board the Sky Courier.",
        target: city.locations.skyCourier,
        radius: 9,
        type: "enterCourier",
        message: story.briefings?.[2] || "Take the courier."
      },
      {
        title: "Fly through the greenhouse extraction gate.",
        target: city.locations.extraction,
        radius: 17,
        type: "extract",
        message: story.briefings?.[3] || "Reach extraction."
      },
      {
        title: "Dawnline seed recovered.",
        target: null,
        radius: 0,
        type: "complete",
        message: "District 7 is waking up. Water gardens and solar roofs are back on the grid."
      }
    ];
    this.marker = this.createMarker();
    this.log(story.story || "Operation Dawnline is live.");
    this.log(this.objectives[0].message);
  }

  createMarker() {
    const THREE = this.THREE;
    const group = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: "#f9ff66",
      transparent: true,
      opacity: 0.86,
      depthWrite: false
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.09, 8, 48), material);
    ring.rotation.x = Math.PI / 2;
    const ringB = ring.clone();
    ringB.scale.setScalar(1.6);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 34, 8), material.clone());
    pillar.position.y = 17;
    group.add(ring, ringB, pillar);
    this.scene.add(group);
    return group;
  }

  update(dt, time, player, input, enemies, vehicles) {
    this.prompt = "";
    const objective = this.objectives[this.index];
    this.handleStart(objective, enemies);
    this.updateMarker(objective, time, enemies);

    if (objective.type === "reach") {
      if (player.position.distanceTo(objective.target) < objective.radius) this.advance(enemies);
    } else if (objective.type === "interact") {
      const distance = player.position.distanceTo(objective.target);
      if (distance < objective.radius) {
        this.prompt = objective.prompt;
        if (input.consumePressed("KeyE")) this.advance(enemies);
      } else {
        this.prompt = `${formatDistance(distance)} to seed vault`;
      }
    } else if (objective.type === "destroyTurrets") {
      const turrets = enemies.aliveByTag("aa-turret");
      if (turrets.length === 0) {
        this.advance(enemies);
      } else {
        const nearest = turrets
          .map((enemy) => ({ enemy, distance: enemy.position.distanceTo(player.position) }))
          .sort((a, b) => a.distance - b.distance)[0];
        objective.target = nearest.enemy.position;
        this.prompt = `${turrets.length} AA sites online`;
      }
    } else if (objective.type === "enterCourier") {
      if (vehicles.isCourierActive()) this.advance(enemies);
      else this.prompt = `${formatDistance(player.position.distanceTo(objective.target))} to courier`;
    } else if (objective.type === "extract") {
      const distance = player.position.distanceTo(objective.target);
      if (vehicles.isCourierActive() && distance < objective.radius) this.advance(enemies);
      else this.prompt = `${formatDistance(distance)} to extraction`;
    }
  }

  handleStart(objective, enemies) {
    if (this.startedObjectives.has(this.index)) return;
    this.startedObjectives.add(this.index);
    if (objective.type === "destroyTurrets") enemies.ensureTurrets();
    if (objective.type === "extract") enemies.spawnExtractionReinforcements();
  }

  updateMarker(objective, time) {
    if (!objective?.target) {
      this.marker.visible = false;
      return;
    }
    this.marker.visible = true;
    this.marker.position.copy(objective.target);
    this.marker.position.y = Math.max(0.2, objective.target.y || 0.2);
    this.marker.rotation.y = time * 1.2;
    const scale = 1 + Math.sin(time * 4) * 0.08;
    this.marker.scale.setScalar(scale);
  }

  advance(enemies) {
    this.index = Math.min(this.objectives.length - 1, this.index + 1);
    const objective = this.objectives[this.index];
    this.log(objective.message);
    this.handleStart(objective, enemies);
  }

  log(message) {
    this.messages.unshift({ message, time: performance.now() });
    this.messages = this.messages.slice(0, 4);
  }

  get state() {
    return {
      title: this.story.title || "Operation Dawnline",
      objective: this.objectives[this.index].title,
      index: this.index,
      total: this.objectives.length,
      messages: this.messages,
      prompt: this.prompt,
      complete: this.objectives[this.index].type === "complete"
    };
  }
}
