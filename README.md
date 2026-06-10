# Neon Solaris: Dawnline

Neon Solaris: Dawnline is a playable browser FPS vertical slice set in a neon solarpunk megacity. It includes switchable weapons, a grenade launcher, wall running, ground and flying traffic, drivable vehicles, flying cars, enemy archetypes with behavior trees, procedural high-resolution city textures, and a complete mission loop.

## Run

This project intentionally has no npm dependency install step. It uses the local `node` executable and imports Three.js from a CDN.

```powershell
cd C:\Users\Marco\develop\alchemy\neon-solaris-fps
.\scripts\start.ps1
```

Then open:

```text
http://localhost:4173
```

If you have npm available, `npm start` also runs the same server.

## Controls

- Mouse: look
- Left mouse: fire
- Right mouse: aim focus
- 1-4 or mouse wheel: switch weapons
- R: reload
- W/A/S/D: move
- Space: jump; while beside a wall in the air, starts or exits wall run
- Shift: sprint
- E: interact with mission objects
- F: enter or exit nearby vehicles
- C / Space while flying vehicle: descend / ascend

## Included Systems

- First-person movement with sprinting, jumping, collision, and wall running.
- Weapon system with Ion Pistol, Helix SMG, Arc Shotgun, and Grenade Launcher.
- Grenade physics with timed explosions, splash damage, and neon particle bursts.
- Procedural HD texture generation for roads, towers, solar panels, foliage, and glass.
- Megacity generation with streets, rooftop gardens, solar arrays, city lights, biodomes, and sky lanes.
- Ground traffic and flying car lanes.
- Drivable ground cars and a mission skimmer.
- Multiple enemy classes:
  - Sentinel: patrols, chases, and fires bursts.
  - Drone: flies, orbits, and strafes.
  - Brute: closes distance and uses impact attacks.
  - Sniper: keeps range and fires rail shots.
  - Turret: defends anti-air sites.
- Behavior-tree AI implementation in `src/engine/behaviorTree.js`.
- Mission storyline: Operation Dawnline.

## Repository Status

The local git repository is initialized and committed as part of project setup. GitHub remote creation requires either the GitHub CLI (`gh`) or a token-backed API flow; neither is bundled in the project.
