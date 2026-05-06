const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const skillPointsEl = document.getElementById("skillPoints");
const xpTextEl = document.getElementById("xpText");
const xpFillEl = document.getElementById("xpFill");

canvas.width = innerWidth;
canvas.height = innerHeight;

addEventListener("resize", () => {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
});

const world = {
  width: 4200,
  height: 4200
};

const camera = {
  x: 0,
  y: 0
};

const player = {
  x: world.width / 2,
  y: world.height / 2,
  r: 25,
  angle: 0,

  speed: 3.8,
  damage: 18,
  reload: 280,
  penetration: 1,
  bulletSpeed: 10,
  bodyDamage: 5,
  maxHealth: 100,
  health: 100,
  regen: 0.015,

  level: 1,
  xp: 0,
  xpNeed: 100,
  score: 0,
  skillPoints: 0,
  lastShot: 0
};

const keys = {};
const bullets = [];
const objects = [];
const buildings = [];
const drones = [];

let selectedBuild = null;

let mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  down: false
};

const moveJoy = { dx: 0, dy: 0 };
const aimJoy = { dx: 0, dy: 0, active: false };

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function spawnObject() {
  const roll = Math.random();

  let type = "crate";
  let hp = 35;
  let value = 25;
  let size = 25;

  if (roll > 0.68) {
    type = "barrel";
    hp = 60;
    value = 45;
    size = 28;
  }

  if (roll > 0.9) {
    type = "bunker";
    hp = 130;
    value = 110;
    size = 42;
  }

  objects.push({
    type,
    x: rand(120, world.width - 120),
    y: rand(120, world.height - 120),
    size,
    hp,
    maxHp: hp,
    value,
    rot: rand(0, Math.PI * 2)
  });
}

for (let i = 0; i < 95; i++) spawnObject();

function updateHUD() {
  scoreEl.textContent = Math.floor(player.score);
  levelEl.textContent = player.level;
  skillPointsEl.textContent = player.skillPoints;
  xpTextEl.textContent = `LVL ${player.level}`;
  xpFillEl.style.width = `${(player.xp / player.xpNeed) * 100}%`;

  document.querySelectorAll(".upgrade").forEach(u => {
    u.classList.toggle("locked", player.skillPoints <= 0);
  });
}

function addXP(amount) {
  player.xp += amount;
  player.score += amount;

  while (player.xp >= player.xpNeed) {
    player.xp -= player.xpNeed;
    player.level++;
    player.skillPoints++;
    player.xpNeed = Math.floor(player.xpNeed * 1.23);
  }

  updateHUD();
}

document.querySelectorAll(".upgrade").forEach(btn => {
  btn.addEventListener("click", () => {
    if (player.skillPoints <= 0) return;

    const up = btn.dataset.upgrade;

    if (up === "speed") player.speed += 0.35;
    if (up === "reload") player.reload = Math.max(75, player.reload - 28);
    if (up === "damage") player.damage += 5;
    if (up === "penetration") player.penetration += 1;
    if (up === "bulletSpeed") player.bulletSpeed += 1.2;
    if (up === "bodyDamage") player.bodyDamage += 4;
    if (up === "maxHealth") {
      player.maxHealth += 25;
      player.health = player.maxHealth;
    }
    if (up === "regen") player.regen += 0.025;

    player.skillPoints--;
    updateHUD();
  });
});

document.querySelectorAll(".buildSlot").forEach(slot => {
  slot.addEventListener("click", () => {
    document.querySelectorAll(".buildSlot").forEach(s => s.classList.remove("selected"));
    slot.classList.add("selected");
    selectedBuild = slot.dataset.build;
  });
});

function shoot() {
  const now = performance.now();
  if (now - player.lastShot < player.reload) return;

  player.lastShot = now;

  bullets.push({
    x: player.x + Math.cos(player.angle) * 38,
    y: player.y + Math.sin(player.angle) * 38,
    vx: Math.cos(player.angle) * player.bulletSpeed,
    vy: Math.sin(player.angle) * player.bulletSpeed,
    r: 7,
    damage: player.damage,
    pierce: player.penetration,
    life: 90
  });
}

function updatePlayer() {
  let mx = 0;
  let my = 0;

  if (keys.w || keys.ArrowUp) my -= 1;
  if (keys.s || keys.ArrowDown) my += 1;
  if (keys.a || keys.ArrowLeft) mx -= 1;
  if (keys.d || keys.ArrowRight) mx += 1;

  mx += moveJoy.dx;
  my += moveJoy.dy;

  const len = Math.hypot(mx, my);

  if (len > 0) {
    mx /= len;
    my /= len;
    player.x += mx * player.speed;
    player.y += my * player.speed;
  }

  player.x = Math.max(player.r, Math.min(world.width - player.r, player.x));
  player.y = Math.max(player.r, Math.min(world.height - player.r, player.y));

  if (aimJoy.active) {
    player.angle = Math.atan2(aimJoy.dy, aimJoy.dx);
    shoot();
  } else {
    const wx = mouse.x + camera.x;
    const wy = mouse.y + camera.y;
    player.angle = Math.atan2(wy - player.y, wx - player.x);
    if (mouse.down) shoot();
  }

  player.health = Math.min(player.maxHealth, player.health + player.regen);
}

function updateBullets() {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    b.x += b.vx;
    b.y += b.vy;
    b.life--;

    if (b.life <= 0) {
      bullets.splice(i, 1);
      continue;
    }

    for (let j = objects.length - 1; j >= 0; j--) {
      const o = objects[j];

      if (distance(b.x, b.y, o.x, o.y) < b.r + o.size) {
        o.hp -= b.damage;
        b.pierce--;

        if (o.hp <= 0) {
          addXP(o.value);
          objects.splice(j, 1);
          spawnObject();
        }

        if (b.pierce <= 0) {
          bullets.splice(i, 1);
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
  ctx.fillStyle = "#78945d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const grid = 70;
  ctx.strokeStyle = "rgba(40,70,35,0.25)";
  ctx.lineWidth = 3;

  const sx = Math.floor(camera.x / grid) * grid;
  const sy = Math.floor(camera.y / grid) * grid;

  for (let x = sx; x < camera.x + canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x - camera.x, 0);
    ctx.lineTo(x - camera.x, canvas.height);
    ctx.stroke();
  }

  for (let y = sy; y < camera.y + canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y - camera.y);
    ctx.lineTo(canvas.width, y - camera.y);
    ctx.stroke();
  }
}

function drawObject(o) {
  const x = o.x - camera.x;
  const y = o.y - camera.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(o.rot);

  if (o.type === "crate") {
    ctx.fillStyle = "#b8893d";
    ctx.strokeStyle = "#6b4e1f";
    ctx.lineWidth = 5;
    ctx.fillRect(-o.size, -o.size, o.size * 2, o.size * 2);
    ctx.strokeRect(-o.size, -o.size, o.size * 2, o.size * 2);

    ctx.strokeStyle = "rgba(80,50,20,0.6)";
    ctx.beginPath();
    ctx.moveTo(-o.size, -o.size);
    ctx.lineTo(o.size, o.size);
    ctx.moveTo(o.size, -o.size);
    ctx.lineTo(-o.size, o.size);
    ctx.stroke();
  }

  if (o.type === "barrel") {
    ctx.fillStyle = "#7d7f37";
    ctx.strokeStyle = "#4b4d20";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, o.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (o.type === "bunker") {
    ctx.fillStyle = "#6d6d6d";
    ctx.strokeStyle = "#3d3d3d";
    ctx.lineWidth = 6;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 6;
      const px = Math.cos(a) * o.size;
      const py = Math.sin(a) * o.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - o.size, y + o.size + 8, o.size * 2, 7);

  ctx.fillStyle = "#7dff80";
  ctx.fillRect(x - o.size, y + o.size + 8, o.size * 2 * (o.hp / o.maxHp), 7);
}

function drawPlayer() {
  const x = player.x - camera.x;
  const y = player.y - camera.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.angle);

  ctx.fillStyle = "#33aee2";
  ctx.strokeStyle = "#174f63";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#454545";
  ctx.strokeStyle = "#222";
  ctx.lineWidth = 3;
  ctx.fillRect(14, -7, 38, 14);
  ctx.strokeRect(14, -7, 38, 14);

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - 32, y + 35, 64, 8);

  ctx.fillStyle = "#7dff80";
  ctx.fillRect(x - 32, y + 35, 64 * (player.health / player.maxHealth), 8);
}

function drawBullets() {
  ctx.fillStyle = "#202020";

  bullets.forEach(b => {
    ctx.beginPath();
    ctx.arc(b.x - camera.x, b.y - camera.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBuildings() {
  buildings.forEach(b => {
    const x = b.x - camera.x;
    const y = b.y - camera.y;

    ctx.fillStyle = "#4b3927";
    ctx.strokeStyle = "#22170e";
    ctx.lineWidth = 4;

    ctx.fillRect(x - 22, y - 22, 44, 44);
    ctx.strokeRect(x - 22, y - 22, 44, 44);
  });
}

function drawBorder() {
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 8;
  ctx.strokeRect(-camera.x, -camera.y, world.width, world.height);
}

function draw() {
  drawGrid();
  drawBorder();
  objects.forEach(drawObject);
  drawBuildings();
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

canvas.addEventListener("mousedown", e => {
  mouse.down = true;

  if (selectedBuild && player.score >= 200) {
    buildings.push({
      type: selectedBuild,
      x: mouse.x + camera.x,
      y: mouse.y + camera.y,
      hp: 200
    });
    player.score -= 200;
    updateHUD();
  }
});

canvas.addEventListener("mouseup", () => {
  mouse.down = false;
});

function setupJoystick(baseId, stickId, target, isAim = false) {
  const base = document.getElementById(baseId);
  const stick = document.getElementById(stickId);

  function reset() {
    target.dx = 0;
    target.dy = 0;
    target.active = false;
    stick.style.left = "";
    stick.style.top = "";
  }

  base.addEventListener("touchstart", e => {
    e.preventDefault();
    target.active = true;
  }, { passive: false });

  base.addEventListener("touchmove", e => {
    e.preventDefault();

    const rect = base.getBoundingClientRect();
    const t = e.touches[0];

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    let dx = t.clientX - cx;
    let dy = t.clientY - cy;

    const max = rect.width * 0.31;
    const len = Math.hypot(dx, dy);

    if (len > max) {
      dx = dx / len * max;
      dy = dy / len * max;
    }

    target.dx = dx / max;
    target.dy = dy / max;
    target.active = true;

    stick.style.left = `${rect.width / 2 - stick.offsetWidth / 2 + dx}px`;
    stick.style.top = `${rect.height / 2 - stick.offsetHeight / 2 + dy}px`;
  }, { passive: false });

  base.addEventListener("touchend", e => {
    e.preventDefault();
    reset();
  }, { passive: false });
}

setupJoystick("moveJoystick", "moveStick", moveJoy, false);
setupJoystick("aimJoystick", "aimStick", aimJoy, true);

updateHUD();
loop();
