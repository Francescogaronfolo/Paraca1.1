const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const xpEl = document.getElementById("xp");
const xpNeedEl = document.getElementById("xpNeed");
const xpFillEl = document.getElementById("xpFill");
const pointsEl = document.getElementById("points");
const upgrades = document.querySelectorAll(".upgrade");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const world = {
  width: 4000,
  height: 4000
};

const camera = {
  x: 0,
  y: 0
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  r: 24,
  angle: 0,
  speed: 4,
  hp: 100,
  maxHp: 100,
  damage: 18,
  reload: 260,
  bulletSpeed: 11,
  lastShot: 0,
  level: 1,
  xp: 0,
  xpNeed: 100,
  score: 0,
  upgradePoints: 0
};

const keys = {};
const bullets = [];
const shapes = [];

let mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  down: false
};

let joystick = {
  active: false,
  dx: 0,
  dy: 0
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function dist(a, b, c, d) {
  return Math.hypot(a - c, b - d);
}

function spawnShape() {
  const typeRoll = Math.random();

  let type = "square";
  let hp = 35;
  let value = 25;
  let size = 26;

  if (typeRoll > 0.72) {
    type = "triangle";
    hp = 55;
    value = 45;
    size = 30;
  }

  if (typeRoll > 0.92) {
    type = "pentagon";
    hp = 120;
    value = 110;
    size = 42;
  }

  shapes.push({
    x: rand(120, world.width - 120),
    y: rand(120, world.height - 120),
    size,
    hp,
    maxHp: hp,
    value,
    type,
    rot: rand(0, Math.PI * 2)
  });
}

for (let i = 0; i < 90; i++) spawnShape();

function addXP(amount) {
  player.xp += amount;
  player.score += amount;

  while (player.xp >= player.xpNeed) {
    player.xp -= player.xpNeed;
    player.level++;
    player.upgradePoints++;
    player.xpNeed = Math.floor(player.xpNeed * 1.22);
  }

  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = player.score;
  levelEl.textContent = player.level;
  xpEl.textContent = player.xp;
  xpNeedEl.textContent = player.xpNeed;
  pointsEl.textContent = player.upgradePoints;
  xpFillEl.style.width = `${(player.xp / player.xpNeed) * 100}%`;

  upgrades.forEach(btn => {
    if (player.upgradePoints > 0) btn.classList.add("available");
    else btn.classList.remove("available");
  });
}

upgrades.forEach(btn => {
  btn.addEventListener("click", () => {
    if (player.upgradePoints <= 0) return;

    const type = btn.dataset.upgrade;

    if (type === "damage") player.damage += 5;
    if (type === "reload") player.reload = Math.max(80, player.reload - 28);
    if (type === "speed") player.speed += 0.35;
    if (type === "hp") {
      player.maxHp += 20;
      player.hp = player.maxHp;
    }

    player.upgradePoints--;
    updateHUD();
  });
});

function shoot() {
  const now = performance.now();
  if (now - player.lastShot < player.reload) return;

  player.lastShot = now;

  bullets.push({
    x: player.x + Math.cos(player.angle) * 30,
    y: player.y + Math.sin(player.angle) * 30,
    vx: Math.cos(player.angle) * player.bulletSpeed,
    vy: Math.sin(player.angle) * player.bulletSpeed,
    r: 7,
    damage: player.damage,
    life: 80
  });
}

function updatePlayer() {
  let mx = 0;
  let my = 0;

  if (keys["w"] || keys["ArrowUp"]) my -= 1;
  if (keys["s"] || keys["ArrowDown"]) my += 1;
  if (keys["a"] || keys["ArrowLeft"]) mx -= 1;
  if (keys["d"] || keys["ArrowRight"]) mx += 1;

  mx += joystick.dx;
  my += joystick.dy;

  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    player.x += mx * player.speed;
    player.y += my * player.speed;
  }

  player.x = Math.max(player.r, Math.min(world.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(world.height - player.r, player.y));

  const worldMouseX = mouse.x + camera.x;
  const worldMouseY = mouse.y + camera.y;
  player.angle = Math.atan2(worldMouseY - player.y, worldMouseX - player.x);

  if (mouse.down) shoot();
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (
      b.life <= 0 ||
      b.x < 0 ||
      b.y < 0 ||
      b.x > world.width ||
      b.y > world.height
    ) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = shapes.length - 1; j >= 0; j--) {
      const s = shapes[j];

      if (dist(b.x, b.y, s.x, s.y) < b.r + s.size) {
        s.hp -= b.damage;
        bullets.splice(i, 1);

        if (s.hp <= 0) {
          addXP(s.value);
          shapes.splice(j, 1);
          spawnShape();
        }

        break;
      }
    }
  }
}

function updateCamera() {
  camera.x = player.x - canvas.width / 2;
  camera.y = player.y - canvas.height / 2;

  camera.x = Math.max(0, Math.min(world.width - canvas.width, camera.x));
  camera.y = Math.max(0, Math.min(world.height - canvas.height, camera.y));
}

function drawGrid() {
  const grid = 60;

  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 1;

  const startX = Math.floor(camera.x / grid) * grid;
  const startY = Math.floor(camera.y / grid) * grid;

  for (let x = startX; x < camera.x + canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, 0);
    ctx.lineTo(x - camera.x, canvas.height);
    ctx.stroke();
  }

  for (let y = startY; y < camera.y + canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y - camera.y);
    ctx.lineTo(canvas.width, y - camera.y);
    ctx.stroke();
  }
}

function drawShape(s) {
  const x = s.x - camera.x;
  const y = s.y - camera.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(s.rot);

  if (s.type === "square") {
    ctx.fillStyle = "#f4d03f";
    ctx.strokeStyle = "#b7950b";
    ctx.lineWidth = 4;
    ctx.fillRect(-s.size, -s.size, s.size * 2, s.size * 2);
    ctx.strokeRect(-s.size, -s.size, s.size * 2, s.size * 2);
  }

  if (s.type === "triangle") {
    ctx.fillStyle = "#e74c3c";
    ctx.strokeStyle = "#922b21";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -s.size);
    ctx.lineTo(s.size, s.size);
    ctx.lineTo(-s.size, s.size);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  if (s.type === "pentagon") {
    ctx.fillStyle = "#8e44ad";
    ctx.strokeStyle = "#512e5f";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 5;
      const px = Math.cos(a) * s.size;
      const py = Math.sin(a) * s.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  const barW = s.size * 2;
  const hpPerc = s.hp / s.maxHp;

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x - s.size, y + s.size + 8, barW, 6);

  ctx.fillStyle = "#43d17a";
  ctx.fillRect(x - s.size, y + s.size + 8, barW * hpPerc, 6);
}

function drawPlayer() {
  const x = player.x - camera.x;
  const y = player.y - camera.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);

  ctx.fillStyle = "#4aa3ff";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#222";
  ctx.fillRect(10, -6, 34, 12);

  ctx.restore();

  ctx.fillStyle = "#111";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.fillText("PARACA", x, y - 34);
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(b.x - camera.x, b.y - camera.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWorldBorder() {
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(-camera.x, -camera.y, world.width, world.height);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawWorldBorder();

  shapes.forEach(drawShape);
  drawBullets();
  drawPlayer();
}

function loop() {
  updatePlayer();
  updateBullets();
  updateCamera();
  draw();

  requestAnimationFrame(loop);
}

document.addEventListener("keydown", e => {
  keys[e.key] = true;
});

document.addEventListener("keyup", e => {
  keys[e.key] = false;
});

canvas.addEventListener("mousemove", e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => {
  mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
  mouse.down = false;
});

canvas.addEventListener("touchmove", e => {
  const t = e.touches[0];
  mouse.x = t.clientX;
  mouse.y = t.clientY;
}, { passive: true });

const shootBtn = document.getElementById("shootBtn");

shootBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  mouse.down = true;
});

shootBtn.addEventListener("touchend", e => {
  e.preventDefault();
  mouse.down = false;
});

shootBtn.addEventListener("mousedown", () => {
  mouse.down = true;
});

shootBtn.addEventListener("mouseup", () => {
  mouse.down = false;
});

const joyBase = document.getElementById("joyBase");
const joyStick = document.getElementById("joyStick");

joyBase.addEventListener("touchstart", e => {
  e.preventDefault();
  joystick.active = true;
});

joyBase.addEventListener("touchmove", e => {
  e.preventDefault();

  const rect = joyBase.getBoundingClientRect();
  const t = e.touches[0];

  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  let dx = t.clientX - cx;
  let dy = t.clientY - cy;

  const max = 42;
  const len = Math.hypot(dx, dy);

  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }

  joystick.dx = dx / max;
  joystick.dy = dy / max;

  joyStick.style.left = `${42 + dx}px`;
  joyStick.style.top = `${42 + dy}px`;
}, { passive: false });

joyBase.addEventListener("touchend", e => {
  e.preventDefault();

  joystick.active = false;
  joystick.dx = 0;
  joystick.dy = 0;

  joyStick.style.left = "42px";
  joyStick.style.top = "42px";
});

updateHUD();
loop();
