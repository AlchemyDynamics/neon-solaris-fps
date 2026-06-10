import { seededRandom } from "../engine/math.js";

function makeCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function textureFromCanvas(THREE, canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function noise(ctx, size, alpha = 0.08, seed = 1) {
  const rnd = seededRandom(seed);
  const image = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = Math.floor((rnd() - 0.5) * 255 * alpha);
    image.data[i] = Math.max(0, Math.min(255, image.data[i] + v));
    image.data[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + v));
    image.data[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + v));
  }
  ctx.putImageData(image, 0, 0);
}

function drawPanelLines(ctx, size, color, step, width = 2) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (let x = 0; x <= size; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = 0; y <= size; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

function roadTexture(THREE) {
  const size = 1024;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111920";
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 0.18, 42);

  ctx.fillStyle = "rgba(12, 255, 196, 0.14)";
  for (let i = 0; i < 36; i++) {
    const y = (i * 127) % size;
    ctx.fillRect(0, y, size, 2);
  }

  ctx.strokeStyle = "rgba(246, 255, 118, 0.78)";
  ctx.lineWidth = 8;
  ctx.setLineDash([46, 42]);
  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.lineTo(size / 2, size);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(255, 87, 216, 0.5)";
  ctx.lineWidth = 5;
  ctx.strokeRect(24, 24, size - 48, size - 48);

  return textureFromCanvas(THREE, canvas, 5, 5);
}

function glassTexture(THREE) {
  const size = 1024;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#09242a");
  gradient.addColorStop(0.45, "#103a42");
  gradient.addColorStop(1, "#05080b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 0.1, 75);
  drawPanelLines(ctx, size, "rgba(157,247,211,0.14)", 128, 3);

  const rnd = seededRandom(88);
  for (let y = 26; y < size; y += 64) {
    for (let x = 22; x < size; x += 78) {
      if (rnd() > 0.42) {
        const hue = rnd() > 0.72 ? "#ff57d8" : rnd() > 0.5 ? "#f9ff66" : "#35ffc6";
        ctx.fillStyle = hue;
        ctx.globalAlpha = 0.22 + rnd() * 0.42;
        ctx.fillRect(x, y, 36 + rnd() * 22, 18 + rnd() * 18);
      }
    }
  }
  ctx.globalAlpha = 1;

  return textureFromCanvas(THREE, canvas, 2, 6);
}

function concreteTexture(THREE) {
  const size = 1024;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#202a27";
  ctx.fillRect(0, 0, size, size);
  noise(ctx, size, 0.22, 101);
  drawPanelLines(ctx, size, "rgba(236,255,249,0.1)", 128, 2);

  ctx.fillStyle = "rgba(53,255,198,0.13)";
  for (let i = 0; i < 90; i++) {
    const x = (i * 97) % size;
    const y = (i * 211) % size;
    ctx.beginPath();
    ctx.ellipse(x, y, 8 + (i % 6) * 6, 3 + (i % 5) * 4, i, 0, Math.PI * 2);
    ctx.fill();
  }

  return textureFromCanvas(THREE, canvas, 8, 8);
}

function solarTexture(THREE) {
  const size = 1024;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#07182a");
  gradient.addColorStop(0.55, "#123a58");
  gradient.addColorStop(1, "#06101c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  drawPanelLines(ctx, size, "rgba(73,166,255,0.35)", 128, 4);

  ctx.strokeStyle = "rgba(249,255,102,0.4)";
  ctx.lineWidth = 8;
  for (let i = -size; i < size * 2; i += 130) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  return textureFromCanvas(THREE, canvas, 3, 2);
}

function foliageTexture(THREE) {
  const size = 1024;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0c2a20";
  ctx.fillRect(0, 0, size, size);
  const rnd = seededRandom(202);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 4 + rnd() * 16;
    ctx.fillStyle = rnd() > 0.28 ? "rgba(53,255,198,0.28)" : "rgba(249,255,102,0.18)";
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.35 + rnd() * 0.55), rnd() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  noise(ctx, size, 0.08, 203);
  return textureFromCanvas(THREE, canvas, 4, 4);
}

function signTexture(THREE, label, color = "#35ffc6") {
  const canvas = makeCanvas(512);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(5,8,11,0.88)";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = color;
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, 476, 476);
  ctx.fillStyle = color;
  ctx.font = "900 58px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const words = label.split(" ");
  words.forEach((word, index) => {
    ctx.fillText(word, 256, 220 + index * 70 - (words.length - 1) * 34);
  });
  return textureFromCanvas(THREE, canvas, 1, 1);
}

export function createTextures(THREE) {
  return {
    road: roadTexture(THREE),
    glass: glassTexture(THREE),
    concrete: concreteTexture(THREE),
    solar: solarTexture(THREE),
    foliage: foliageTexture(THREE),
    signs: {
      dawnline: signTexture(THREE, "DAWN LINE", "#f9ff66"),
      oasis: signTexture(THREE, "OASIS GRID", "#35ffc6"),
      transit: signTexture(THREE, "SKY TRANSIT", "#ff57d8")
    }
  };
}
