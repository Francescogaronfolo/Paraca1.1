const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lanes = [
  { y: canvas.height * 0.36 },
  { y: canvas.height * 0.50 },
  { y: canvas.height * 0.64 }
];

let units = [];
let bullets = [];
let assaultMode = false;

const baseLeft = 70;
const baseRight = canvas.width - 70;

/* Trincee più lontane */
const trenchPlayer = canvas.width * 0.32;
const trenchEnemy = canvas.width * 0.68;

const deck = [
  { name: "RIFLE", type: "rifle", cooldown: 2500, lastUsed: -99999 },
  { name: "MG", type: "mg", cooldown: 5500, lastUsed: -99999 },
  { name: "TANK", type: "tank", cooldown: 9500, lastUsed: -99999 }
];

function createUnit(type, side, laneIndex) {
  const config = {
    rifle: { hp: 100, speed: 0.75, range: 135, dmg: 10, rate: 58 },
    mg: { hp: 85, speed: 0.55, range: 175, dmg: 5, rate: 18 },
    tank: { hp: 320, speed: 0.35, range: 215, dmg: 24, rate: 80 }
  };

  const c = config[type];

  return {
    x: side === "player" ? baseLeft : baseRight,
    y: lanes[laneIndex].y,
    hp: c.hp,
    maxHp: c.hp,
    speed: side === "player" ? c.speed : -c.speed,
    range: c.range,
    dmg: c.dmg,
    rate: c.rate,
    cooldown: 0,
    side,
    type,
    state: "walk",
    lane: laneIndex,
    inTrench: false
  };
}

function spawnPlayer(type) {
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "player", lane));
}

function spawnEnemy() {
  const types = ["rifle", "rifle", "mg"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

setInterval(spawnEnemy, 2200);

function toggleAssault() {
  assaultMode = !assaultMode;

  const btn = document.getElementById("assaultBtn");

  if (assaultMode) {
    btn.textContent = "DIFESA";
    btn.classList.add("defense");

    units.forEach(u => {
      if (u.side === "player") {
        u.inTrench = false;
      }
    });
  } else {
    btn.textContent = "ASSALTO";
    btn.classList.remove("defense");
  }
}

function findTarget(unit) {
  return units.find(u =>
    u.side !== unit.side &&
    u.lane === unit.lane &&
    Math.abs(u.x - unit.x) < unit.range
  );
}

function updateUnits() {
  units.forEach(unit => {
    const target = findTarget(unit);

    if (target) {
      unit.state = "shoot";

      if (unit.cooldown <= 0) {
        shoot(unit, target);
        unit.cooldown = unit.rate;
      }
    } else {
      unit.state = "walk";

      if (unit.side === "player") {
        if (!unit.inTrench || assaultMode) {
          unit.x += unit.speed;
        }

        if (!assaultMode && unit.x >= trenchPlayer) {
          unit.x = trenchPlayer;
          unit.inTrench = true;
          unit.state = "shoot";
        }
      }

      if (unit.side === "enemy") {
        if (!unit.inTrench) {
          unit.x += unit.speed;
        }

        if (unit.x <= trenchEnemy) {
          unit.x = trenchEnemy;
          unit.inTrench = true;
          unit.state = "shoot";
        }
      }
    }

    if (unit.cooldown > 0) unit.cooldown--;
  });

  units = units.filter(u => u.hp > 0);
}

function shoot(unit, target) {
  bullets.push({
    x: unit.x,
    y: unit.y - 6,
    target,
    dmg: unit.dmg,
    fx: false,
    side: unit.side
  });
}

function updateBullets() {
  bullets.forEach(b => {
    if (b.fx) {
      b.life--;
      return;
    }

    if (!b.target || b.target.hp <= 0) {
      b.hit = true;
      return;
    }

    const dx = b.target.x - b.x;
    const dy = b.target.y - 6 - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      let damage = b.dmg;

      if (b.target.inTrench) {
        damage *= 0.5;
      }

      b.target.hp -= damage;
      b.hit = true;

      bullets.push({
        x: b.target.x,
        y: b.target.y - 8,
        fx: true,
        life: 9
      });
    } else {
      b.x += dx / dist * 6;
      b.y += dy / dist * 6;
    }
  });

  bullets = bullets.filter(b => {
    if (b.fx) return b.life > 0;
    return !b.hit;
  });
}

function draw() {
  drawBackground();
  drawLanes();
  drawTrenches();

  units.forEach(u => drawSoldier(u));

  drawBullets();
  drawHudText();
}

function drawBackground() {
  ctx.fillStyle = "#3a5f3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.035)";
  for (let i = 0; i < 80; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 53) % canvas.height;
    ctx.fillRect(x, y, 2, 2);
  }
}

function drawLanes() {
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = 2;

  lanes.forEach(lane => {
    ctx.beginPath();
    ctx.moveTo(baseLeft, lane.y);
    ctx.lineTo(baseRight, lane.y);
    ctx.stroke();
  });
}

/* Trincee piccole: solo sulle corsie, non più dall’alto al basso */
function drawTrenches() {
  lanes.forEach(lane => {
    drawSmallTrench(trenchPlayer, lane.y, "#3b2f2f", "#8b5a2b");
    drawSmallTrench(trenchEnemy, lane.y, "#2b1f1f", "#7a2b2b");
  });
}

function drawSmallTrench(x, y, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(x - 28, y - 18, 56, 36);

  ctx.strokeStyle = light;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x - 22, y - 10);
  ctx.lineTo(x + 22, y - 10);
  ctx.moveTo(x - 22, y);
  ctx.lineTo(x + 22, y);
  ctx.moveTo(x - 22, y + 10);
  ctx.lineTo(x + 22, y + 10);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 28, y - 18, 56, 36);
}

function drawBullets() {
  bullets.forEach(b => {
    if (b.fx) {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = b.side === "player" ? "#facc15" : "#ff4d4d";
      ctx.fillRect(b.x, b.y, 5, 3);
    }
  });
}

function drawSoldier(u) {
  const isPlayer = u.side === "player";
  const dir = isPlayer ? 1 : -1;

  ctx.save();
  ctx.translate(u.x, u.y);

  if (u.type === "tank") {
    ctx.fillStyle = isPlayer ? "#1f2937" : "#7f1d1d";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;

    ctx.fillRect(-24, -12, 48, 24);
    ctx.strokeRect(-24, -12, 48, 24);

    ctx.fillRect(-9, -21, 18, 15);
    ctx.strokeRect(-9, -21, 18, 15);

    ctx.beginPath();
    ctx.moveTo(8 * dir, -15);
    ctx.lineTo(38 * dir, -15);
    ctx.stroke();
  } else {
    ctx.fillStyle = isPlayer ? "#1d4ed8" : "#b91c1c";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;

    const offset = u.state === "walk" ? Math.sin(Date.now() * 0.012) * 2 : 0;

    ctx.beginPath();
    ctx.ellipse(0, offset, 8, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#d6b48c";
    ctx.beginPath();
    ctx.arc(0, -17, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.beginPath();
    ctx.arc(0, -20, 7, Math.PI, 0);
    ctx.fill();

    ctx.strokeStyle = "#111";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-4, 12);
    ctx.lineTo(-8, 22);
    ctx.moveTo(4, 12);
    ctx.lineTo(8, 22);
    ctx.stroke();

    ctx.strokeStyle = "#222";
    ctx.lineWidth = u.type === "mg" ? 4 : 3;

    ctx.beginPath();
    ctx.moveTo(5 * dir, -4);
    ctx.lineTo(28 * dir, -8);
    ctx.stroke();

    if (u.type === "mg") {
      ctx.beginPath();
      ctx.moveTo(28 * dir, -8);
      ctx.lineTo(40 * dir, -8);
      ctx.stroke();
    }

    if (u.state === "shoot") {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(31 * dir, -8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (u.inTrench) {
    ctx.strokeStyle = "rgba(34,197,94,0.8)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  drawHpBar(u);
}

function drawHpBar(u) {
  const bw = u.type === "tank" ? 42 : 32;
  const bh = 4;
  const bx = u.x - bw / 2;
  const by = u.y - 36;

  const hpPercent = Math.max(0, u.hp / u.maxHp);

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(bx, by, bw, bh);

  ctx.fillStyle =
    hpPercent > 0.5 ? "#22c55e" :
    hpPercent > 0.25 ? "#facc15" :
    "#ef4444";

  ctx.fillRect(bx, by, bw * hpPercent, bh);
}

function drawHudText() {
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("PLAYER", 20, 24);
  ctx.fillText("ENEMY", canvas.width - 88, 24);

  ctx.font = "13px Arial";
  ctx.fillStyle = assaultMode ? "#ff7676" : "#86efac";

  ctx.fillText(
    assaultMode ? "MODALITÀ: ASSALTO" : "MODALITÀ: DIFESA",
    canvas.width / 2 - 70,
    24
  );
}

function checkWin() {
  units.forEach(u => {
    if (u.side === "player" && u.x > baseRight) {
      alert("VITTORIA");
      location.reload();
    }

    if (u.side === "enemy" && u.x < baseLeft) {
      alert("SCONFITTA");
      location.reload();
    }
  });
}

function renderCardBar() {
  const bar = document.getElementById("cardBar");
  const now = Date.now();

  bar.innerHTML = "";

  deck.forEach((card, index) => {
    const elapsed = now - card.lastUsed;
    const ready = elapsed >= card.cooldown;
    const remaining = Math.max(0, card.cooldown - elapsed);
    const percent = remaining / card.cooldown;

    const div = document.createElement("div");
    div.className = "card" + (ready ? " ready" : "");

    div.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-type">${card.type.toUpperCase()}</div>
      <div class="card-cost">${Math.ceil(remaining / 1000)}s</div>
      <div class="card-cooldown" style="transform: scaleY(${percent});"></div>
    `;

    div.addEventListener("click", function () {
      playCard(index);
    });

    bar.appendChild(div);
  });
}

function playCard(index) {
  const card = deck[index];
  const now = Date.now();

  if (now - card.lastUsed < card.cooldown) return;

  spawnPlayer(card.type);
  card.lastUsed = now;
  renderCardBar();
}

function gameLoop() {
  updateUnits();
  updateBullets();
  draw();
  checkWin();
  renderCardBar();
  requestAnimationFrame(gameLoop);
}

document.getElementById("assaultBtn").addEventListener("click", toggleAssault);

renderCardBar();
gameLoop();
