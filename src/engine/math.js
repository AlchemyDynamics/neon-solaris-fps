export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, value) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

export function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

export function choose(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function distanceXZ(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function forwardFromYaw(yaw, target) {
  target.set(-Math.sin(yaw), 0, -Math.cos(yaw));
  return target;
}

export function rightFromYaw(yaw, target) {
  target.set(Math.cos(yaw), 0, -Math.sin(yaw));
  return target;
}

export function wrapAngle(angle) {
  while (angle > Math.PI) angle -= TAU;
  while (angle < -Math.PI) angle += TAU;
  return angle;
}

export function circleIntersectsBoxXZ(center, radius, box) {
  const nearestX = clamp(center.x, box.min.x, box.max.x);
  const nearestZ = clamp(center.z, box.min.z, box.max.z);
  const dx = center.x - nearestX;
  const dz = center.z - nearestZ;
  return dx * dx + dz * dz < radius * radius;
}

export function nearestPointOnBoxXZ(point, box, out) {
  out.x = clamp(point.x, box.min.x, box.max.x);
  out.y = point.y;
  out.z = clamp(point.z, box.min.z, box.max.z);
  return out;
}

export function raySphere(origin, direction, center, radius) {
  const ox = origin.x - center.x;
  const oy = origin.y - center.y;
  const oz = origin.z - center.z;
  const b = ox * direction.x + oy * direction.y + oz * direction.z;
  const c = ox * ox + oy * oy + oz * oz - radius * radius;
  const h = b * b - c;
  if (h < 0) return null;
  const t = -b - Math.sqrt(h);
  return t > 0 ? t : null;
}

export function formatDistance(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(0, Math.round(meters))}m`;
}

export function setObjectLayerRecursive(object, layer) {
  object.layers.set(layer);
  for (const child of object.children) setObjectLayerRecursive(child, layer);
}
