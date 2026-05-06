const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const skillPointsEl = document.getElementById("skillPoints");
const xpTextEl = document.getElementById("xpText");
const xpFillEl = document.getElementById("xpFill");
const upgradeBar = document.getElementById("upgradeBar");

const buildHint = document.createElement("div");
buildHint.className = "buildHint";
document.body.appendChild(buildHint);

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
let wireStart = null;

const buildCosts = {
  wall: 200,
  wire: 180,
  mine: 160,
  turret: 350,
  drone: 500
};

let mouse = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  down: false
};

const moveJoy = { dx: 0, dy: 0, active: false };
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

for (let i = 0; i < 95; i++) {
  spawnObject();
}

function updateHUD() {
  scoreEl.textContent = Math.floor(player.score);
  levelEl.textContent = player.level;
  skillPointsEl.textContent = player.skillPoints;

  xpTextEl.textContent = `LVL ${player.level}`;
  xpFillEl.style.width = `${(player.xp / player.xpNeed) * 100}%`;

  const hasPoints = player.skillPoints > 0;

  upgradeBar.classList.toggle("hidden", !hasPoints);

  document.querySelectorAll(".upgrade").forEach(u => {
    u.classList.toggle("locked", !hasPoints);
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

    if (up === "speed") {
      player.speed += 0.35;
    }

    if (up === "reload") {
      player.reload = Math.max(75, player.reload - 28);
    }

    if (up === "damage") {
      player.damage += 5;
    }

    if (up === "penetration") {
      player.penetration += 1;
    }

    if (up === "bulletSpeed") {
      player.bulletSpeed += 1.2;
    }

    if (up === "bodyDamage") {
      player.bodyDamage += 4;
    }

    if (up === "maxHealth") {
      player.maxHealth += 25;
      player.health = player.maxHealth;
    }

    if (up === "regen") {
      player.regen += 0.025;
    }

    player.skillPoints--;
    updateHUD();
  });
});

document.querySelectorAll(".buildSlot").forEach(slot => {
  slot.addEventListener("click", () => {
    document.querySelectorAll(".buildSlot").forEach(s => s.classList.remove("selected"));

    const type = slot.dataset.build;

    if (selectedBuild === type) {
      selectedBuild = null;
      wireStart = null;
      buildHint.style.display = "none";
      return;
    }

    selectedBuild = type;
    wireStart = null;
    slot.classList.add("selected");

    if (type === "wall") {
      buildHint.textContent = "Tocca la mappa per piazzare un muro";
    }

    if (type === "mine") {
      buildHint.textContent = "Tocca la mappa per piazzare una mina";
    }

    if (type === "drone") {
      buildHint.textContent = "Tocca la mappa per comprare un drone orbitante";
    }

    if (type === "wire") {
      buildHint.textContent = "Tocca il primo punto del filo spinato";
    }

    if (type === "turret") {
      buildHint.textContent = "Torretta non ancora attiva";
    }

    buildHint.style.display = "block";
  });
});

function spend(cost) {
  if (player.score < cost) {
    buildHint.textContent = `Punti insufficienti: servono ${cost}`;
    buildHint.style.display = "block";
    return false;
  }

  player.score -= cost;
  updateHUD();
  return true;
}

function placeBuild(worldX, worldY) {
  if (!selectedBuild) return false;

  const cost = buildCosts[selectedBuild] || 200;

  if (selectedBuild === "drone") {
    if (!spend(cost)) return true;

    drones.push({
      angle: Math.random() * Math.PI * 2,
      dist: 76,
      r: 10,
      damage: 16,
      cooldown: 0,
      x: player.x,
      y: player.y
    });

    buildHint.textContent = "Drone acquistato";
    return true;
  }

  if (selectedBuild === "mine") {
    if (!spend(cost)) return true;

    buildings.push({
      type: "mine",
      x: worldX,
      y: worldY,
      r: 18,
      armed: true,
      timer: 0,
      exploded: false
    });

    buildHint.textContent = "Mina piazzata";
    return true;
  }

  if (selectedBuild === "wall") {
    if (!spend(cost)) return true;

    buildings.push({
      type: "wall",
      x: worldX,
      y: worldY,
      hp: 250,
      maxHp: 250,
      w: 64,
      h: 26
    });

    buildHint.textContent = "Muro piazzato";
    return true;
  }

  if (selectedBuild === "wire") {
    if (!wireStart) {
      wireStart = {
        x: worldX,
        y: worldY
      };

      buildHint.textContent = "Tocca il secondo punto del filo spinato";
      return true;
    }

    const maxLen = 210;

    let dx = worldX - wireStart.x;
    let dy = worldY - wireStart.y;

    const len = Math.hypot(dx, dy);

    if (len > maxLen) {
      dx = dx / len * maxLen;
      dy = dy / len * maxLen;
    }

    if (!spend(cost)) return true;

    buildings.push({
      type: "wire",
      x1: wireStart.x,
      y1: wireStart.y,
      x2: wireStart.x + dx,
      y2: wireStart.y + dy,
      slow: 0.45
    });

    wireStart = null;
    buildHint.textContent = "Filo spinato piazzato";
    return true;
  }

  if (selectedBuild === "turret") {
    if (!spend(cost)) return true;

    buildings.push({
      type: "turret",
      x: worldX,
      y: worldY,
      r: 24,
      cooldown: 0,
      damage: 14
    });

    buildHint.textContent = "Torretta piazzata";
    return true;
  }

  return false;
}

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

  for (const b of buildings) {
    if (b.type === "wire") {
      const d = pointToSegmentDistance(player.x, player.y, b.x1, b.y1, b.x2, b.y2);

      if (d < 36) {
        mx *= b.slow;
        my *= b.slow;
      }
    }
  }

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

    if (mouse.down) {
      shoot();
    }
  }

  player.health = Math.min(player.maxHealth, player.health + player.regen);
}

function pointToSegmentDistance(px, py, x1, y1, x2, y2) {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return distance(px, py, xx, yy);
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

function updateMines() {
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];

    if (b.type !== "mine") continue;

    if (b.exploded) {
      b.timer++;

      if (b.timer > 22) {
        buildings.splice(i, 1);
      }

      continue;
    }

    for (let j = objects.length - 1; j >= 0; j--) {
      const o = objects[j];

      if (distance(b.x, b.y, o.x, o.y) < 95) {
        b.exploded = true;

        for (let k = objects.length - 1; k >= 0; k--) {
          const target = objects[k];

          if (distance(b.x, b.y, target.x, target.y) < 115) {
            target.hp -= 120;

            if (target.hp <= 0) {
              addXP(target.value);
              objects.splice(k, 1);
              spawnObject();
            }
          }
        }

        break;
      }
    }
  }
}

function updateDrones() {
  drones.forEach((d, index) => {
    d.angle += 0.035;

    const offset = index * ((Math.PI * 2) / Math.max(1, drones.length));

    d.x = player.x + Math.cos(d.angle + offset) * d.dist;
    d.y = player.y + Math.sin(d.angle + offset) * d.dist;

    d.cooldown--;

    if (d.cooldown <= 0 && objects.length > 0) {
      let nearest = null;
      let best = Infinity;

      objects.forEach(o => {
        const dis = distance(d.x, d.y, o.x, o.y);

        if (dis < best) {
          best = dis;
          nearest = o;
        }
      });

      if (nearest && best < 420) {
        const ang = Math.atan2(nearest.y - d.y, nearest.x - d.x);

        bullets.push({
          x: d.x,
          y: d.y,
          vx: Math.cos(ang) * 9,
          vy: Math.sin(ang) * 9,
          r: 5,
          damage: d.damage,
          pierce: 1,
          life: 70
        });

        d.cooldown = 50;
      }
    }
  });
}

function updateTurrets() {
  buildings.forEach(t => {
    if (t.type !== "turret") return;

    t.cooldown--;

    if (t.cooldown > 0) return;

    let nearest = null;
    let best = Infinity;

    objects.forEach(o => {
      const dis = distance(t.x, t.y, o.x, o.y);

      if (dis < best) {
        best = dis;
        nearest = o;
      }
    });

    if (nearest && best < 480) {
      const ang = Math.atan2(nearest.y - t.y, nearest.x - t.x);

      bullets.push({
        x: t.x,
        y: t.y,
        vx: Math.cos(ang) * 8,
        vy: Math.sin(ang) * 8,
        r: 5,
        damage: t.damage,
        pierce: 1,
        life: 70
      });

      t.cooldown = 65;
    }
  });
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

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
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

function drawBuildings() {
  buildings.forEach(b => {
    if (b.type === "wall") {
      const x = b.x - camera.x;
      const y = b.y - camera.y;

      ctx.fillStyle = "#5b4027";
      ctx.strokeStyle = "#26170b";
      ctx.lineWidth = 4;

      ctx.fillRect(x - b.w / 2, y - b.h / 2, b.w, b.h);
      ctx.strokeRect(x - b.w / 2, y - b.h / 2, b.w, b.h);

      ctx.strokeStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(x - b.w / 2 + 8, y);
      ctx.lineTo(x + b.w / 2 - 8, y);
      ctx.stroke();
    }

    if (b.type === "mine") {
      const x = b.x - camera.x;
      const y = b.y - camera.y;

      ctx.fillStyle = b.exploded ? "rgba(255,120,0,0.45)" : "#222";
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 3;

      ctx.beginPath();
      ctx.arc(x, y, b.exploded ? 70 : b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (!b.exploded) {
        ctx.fillStyle = "#ffcc00";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (b.type === "wire") {
      ctx.strokeStyle = "#2a2a2a";
      ctx.lineWidth = 5;

      ctx.beginPath();
      ctx.moveTo(b.x1 - camera.x, b.y1 - camera.y);

      const segments = 8;

      for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        const x = b.x1 + (b.x2 - b.x1) * t;
        const y = b.y1 + (b.y2 - b.y1) * t;
        const wave = Math.sin(t * Math.PI * 8) * 10;

        ctx.lineTo(x - camera.x, y - camera.y + wave);
      }

      ctx.stroke();

      ctx.strokeStyle = "#b8b8b8";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (b.type === "turret") {
      const x = b.x - camera.x;
      const y = b.y - camera.y;

      ctx.fillStyle = "#3d3d3d";
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#222";
      ctx.fillRect(x + 5, y - 5, 34, 10);
    }
  });

  if (wireStart) {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(wireStart.x - camera.x, wireStart.y - camera.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawDrones() {
  drones.forEach(d => {
    ctx.fillStyle = "#7c4dff";
    ctx.strokeStyle = "#2b175f";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(d.x - camera.x + 13, d.y - camera.y);
    ctx.lineTo(d.x - camera.x - 10, d.y - camera.y - 9);
    ctx.lineTo(d.x - camera.x - 10, d.y - camera.y + 9);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();
  });
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
  drawDrones();
  drawPlayer();
}

function loop() {
  updatePlayer();
  updateBullets();
  updateMines();
  updateDrones();
  updateTurrets();
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
  const worldX = e.clientX + camera.x;
  const worldY = e.clientY + camera.y;

  if (selectedBuild) {
    placeBuild(worldX, worldY);
    return;
  }

  mouse.down = true;
});

canvas.addEventListener("mouseup", () => {
  mouse.down = false;
});

canvas.addEventListener("touchstart", e => {
  const t = e.touches[0];
  const worldX = t.clientX + camera.x;
  const worldY = t.clientY + camera.y;

  if (selectedBuild) {
    e.preventDefault();
    placeBuild(worldX, worldY);
  }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  const t = e.touches[0];

  if (!t) return;

  mouse.x = t.clientX;
  mouse.y = t.clientY;
}, { passive: true });

function setupJoystick(baseId, stickId, target) {
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

  base.addEventListener("touchcancel", e => {
    e.preventDefault();
    reset();
  }, { passive: false });
}

setupJoystick("moveJoystick", "moveStick", moveJoy);
setupJoystick("aimJoystick", "aimStick", aimJoy);

updateHUD();
loop();
