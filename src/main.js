import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Input } from "./engine/input.js";
import { clamp } from "./engine/math.js";
import { Sfx } from "./engine/audio.js";
import { createTextures } from "./world/textures.js";
import { City } from "./world/city.js";
import { Player } from "./systems/player.js";
import { WeaponSystem } from "./systems/weapons.js";
import { Effects } from "./systems/effects.js";
import { EnemySystem } from "./systems/enemies.js";
import { TrafficSystem } from "./systems/traffic.js";
import { VehicleSystem } from "./systems/vehicles.js";
import { MissionSystem } from "./systems/missions.js";

const canvas = document.querySelector("#gameCanvas");
const boot = document.querySelector("#boot");
const startButton = document.querySelector("#startButton");
const healthFill = document.querySelector("#healthFill");
const shieldFill = document.querySelector("#shieldFill");
const weaponName = document.querySelector("#weaponName");
const ammoReadout = document.querySelector("#ammoReadout");
const weaponBar = document.querySelector("#weaponBar");
const missionTitle = document.querySelector("#missionTitle");
const objectiveText = document.querySelector("#objectiveText");
const missionProgress = document.querySelector("#missionProgress");
const messageLog = document.querySelector("#messageLog");
const promptEl = document.querySelector("#prompt");
const damageVignette = document.querySelector("#damageVignette");
const miniMap = document.querySelector("#miniMap");
const miniCtx = miniMap.getContext("2d");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance"
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.08, 900);
scene.add(camera);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.78,
  0.46,
  0.6
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

const textures = createTextures(THREE);
const city = new City(THREE, scene, textures);
const player = new Player(THREE, city.locations.spawn);
const input = new Input(canvas);
const effects = new Effects(THREE, scene);
const traffic = new TrafficSystem(THREE, scene, city);
const vehicles = new VehicleSystem(THREE, scene, city);
const enemies = new EnemySystem(THREE, scene, city);
const weapons = new WeaponSystem(THREE, scene, camera);

const story = await loadStory();
const mission = new MissionSystem(THREE, scene, city, story);

let started = false;
let last = performance.now();
let deathTimer = 0;

player.applyCamera(camera);
buildMissionProgress();
buildWeaponBar();
renderHUD(0);

const bootLog = document.querySelector("#bootLog");
const bootLines = [
  "> sunwell uplink ........ OK",
  "> district 7 mesh ....... OK",
  "> weapon sync ........... OK",
  "> dawnline handshake .... READY"
];
startButton.disabled = true;
let bootIndex = 0;
const bootTimer = setInterval(() => {
  if (bootLog) bootLog.textContent += (bootIndex ? "\n" : "") + bootLines[bootIndex];
  bootIndex += 1;
  if (bootIndex >= bootLines.length) {
    clearInterval(bootTimer);
    startButton.disabled = false;
  }
}, 1080);

startButton.addEventListener("click", () => {
  if (startButton.disabled) return;
  started = true;
  Sfx.init();
  Sfx.confirm();
  boot.classList.add("is-hidden");
  input.lock();
});

canvas.addEventListener("click", () => {
  if (started) input.lock();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

requestAnimationFrame(loop);

async function loadStory() {
  try {
    const response = await fetch("./assets/mission.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Mission fetch failed: ${response.status}`);
    return await response.json();
  } catch {
    return {
      title: "Operation Dawnline",
      story: "Recover the Dawnline seed from District 7.",
      briefings: []
    };
  }
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000));
  const time = now / 1000;
  last = now;

  update(dt, time);
  composer.render();
  input.endFrame();
}

function update(dt, time) {
  traffic.update(dt, time);
  effects.update(dt);

  if (started) {
    vehicles.update(dt, input, player, camera, time);
    if (!vehicles.active) {
      player.update(dt, input, camera, city.colliders, city.wallRunColliders, time);
    } else {
      player.regenerateShield(dt, time);
    }

    if (!player.dead) {
      weapons.update(dt, input, enemies, effects, player, city, time);
      enemies.update(dt, player, effects, time);
      mission.update(dt, time, player, input, enemies, vehicles);
    } else {
      deathTimer += dt;
      if (deathTimer > 1.7) {
        deathTimer = 0;
        if (vehicles.active) vehicles.exit(player);
        player.respawn(city.locations.spawn);
        mission.log("Biomonitor reboot complete. Dawnline remains active.");
      }
    }
  } else {
    camera.position.lerp(new THREE.Vector3(16, 18, 64), 0.04);
    camera.lookAt(24, 8, 12);
  }

  renderHUD(time);
  renderMiniMap(time);
}

function buildMissionProgress() {
  missionProgress.innerHTML = "";
  for (let i = 0; i < mission.objectives.length; i++) {
    const item = document.createElement("i");
    missionProgress.appendChild(item);
  }
}

function buildWeaponBar() {
  weaponBar.innerHTML = "";
  for (const weapon of weapons.weapons) {
    const card = document.createElement("div");
    card.className = "weapon-card";
    card.innerHTML = `<b>${weapon.shortName}</b><span>${weapon.ammo}/${weapon.reserve}</span>`;
    weaponBar.appendChild(card);
  }
}

function renderHUD(time) {
  healthFill.style.transform = `scaleX(${clamp(player.health / player.maxHealth, 0, 1)})`;
  shieldFill.style.transform = `scaleX(${clamp(player.shield / player.maxShield, 0, 1)})`;
  damageVignette.classList.toggle("is-hit", player.damageFlash > 0.08);

  const weaponState = weapons.hudState();
  weaponName.textContent = weaponState.name;
  ammoReadout.textContent = weaponState.reloading
    ? `Reload ${Math.round(weaponState.reloadFraction * 100)}%`
    : `${weaponState.ammo} / ${weaponState.reserve}`;

  for (let i = 0; i < weaponBar.children.length; i++) {
    const card = weaponBar.children[i];
    const weapon = weaponState.weapons[i];
    card.classList.toggle("is-active", i === weaponState.activeIndex);
    card.querySelector("span").textContent =
      weapon.reloadRemaining > 0 ? `${Math.round((1 - weapon.reloadRemaining / weapon.reloadTime) * 100)}%` : `${weapon.ammo}/${weapon.reserve}`;
  }

  const missionState = mission.state;
  missionTitle.textContent = missionState.title;
  objectiveText.textContent = missionState.objective;
  for (let i = 0; i < missionProgress.children.length; i++) {
    missionProgress.children[i].classList.toggle("is-complete", i < missionState.index);
    missionProgress.children[i].classList.toggle("is-active", i === missionState.index);
  }

  messageLog.innerHTML = "";
  for (const item of missionState.messages) {
    const age = Math.max(0, performance.now() - item.time);
    if (age > 15000 && missionState.messages.indexOf(item) > 0) continue;
    const line = document.createElement("p");
    line.textContent = item.message;
    messageLog.appendChild(line);
  }

  const prompt = missionState.prompt || vehicles.getPrompt(player);
  promptEl.textContent = prompt;
  promptEl.classList.toggle("is-visible", Boolean(prompt) && started && !player.dead);

  if (player.wallRun && Math.floor(time * 7) % 2 === 0) {
    promptEl.textContent = "Wall run";
    promptEl.classList.add("is-visible");
  }
}

function renderMiniMap() {
  const size = miniMap.width;
  const center = size / 2;
  const scale = 0.24;
  miniCtx.clearRect(0, 0, size, size);
  miniCtx.fillStyle = "rgba(5, 8, 11, 0.82)";
  miniCtx.fillRect(0, 0, size, size);

  miniCtx.strokeStyle = "rgba(157,247,211,0.18)";
  miniCtx.lineWidth = 1;
  for (let v = -168; v <= 168; v += 56) {
    miniCtx.beginPath();
    miniCtx.moveTo(0, center + v * scale);
    miniCtx.lineTo(size, center + v * scale);
    miniCtx.stroke();
    miniCtx.beginPath();
    miniCtx.moveTo(center + v * scale, 0);
    miniCtx.lineTo(center + v * scale, size);
    miniCtx.stroke();
  }

  const objective = mission.objectives[mission.index];
  if (objective?.target) {
    drawDot(objective.target.x, objective.target.z, "#f9ff66", 5);
  }

  for (const enemy of enemies.alive) {
    drawDot(enemy.position.x, enemy.position.z, enemy.type === "turret" ? "#ff365e" : "#ff57d8", 3);
  }

  for (const vehicle of vehicles.vehicles) {
    drawDot(vehicle.position.x, vehicle.position.z, vehicle.role === "courier" ? "#f9ff66" : "#35ffc6", 2.6);
  }

  drawDot(player.position.x, player.position.z, "#ecfff9", 4.5);
  miniCtx.strokeStyle = "#ecfff9";
  miniCtx.beginPath();
  miniCtx.moveTo(center + player.position.x * scale, center + player.position.z * scale);
  miniCtx.lineTo(
    center + (player.position.x - Math.sin(player.yaw) * 12) * scale,
    center + (player.position.z - Math.cos(player.yaw) * 12) * scale
  );
  miniCtx.stroke();
}

function drawDot(x, z, color, radius) {
  const size = miniMap.width;
  const center = size / 2;
  const scale = 0.24;
  const px = center + x * scale;
  const py = center + z * scale;
  if (px < -8 || px > size + 8 || py < -8 || py > size + 8) return;
  miniCtx.fillStyle = color;
  miniCtx.shadowColor = color;
  miniCtx.shadowBlur = 8;
  miniCtx.beginPath();
  miniCtx.arc(px, py, radius, 0, Math.PI * 2);
  miniCtx.fill();
  miniCtx.shadowBlur = 0;
}
