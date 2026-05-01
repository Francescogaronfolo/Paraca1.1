const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.imageSmoothingEnabled = false;

/* =====================================================
   USA SOLO I 5 SPRITE NUOVI
   Se un nome file è diverso su GitHub, correggilo qui.
===================================================== */

const assets = {
  malloreddu: loadImage("004D20A3-9323-486B-BF28-F5B4160871D1.png"),
  bau: loadImage("0C023008-BF16-420A-B5FD-BDE54F51AC1C.png"),
  gaar: loadImage("20A19C74-2669-4EC3-9156-24C050D0ECD9.png"),
  mendel: loadImage("7D9C4DE6-410E-4723-B238-F73F04D13A29.png"),
  lacan: loadImage("C76310A9-7FC2-4B3F-8444-A32C14BB6762.png")
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/* =====================================================
   MAPPA
===================================================== */

const lanes = [
  { y: canvas.height * 0.32 },
  { y: canvas.height * 0.48 },
  { y: canvas.height * 0.64 }
];

let units = [];
let bullets = [];
let assaultMode = false;
let enemyAssaultMode = false;

const baseLeft = 70;
const baseRight = canvas.width - 70;

const trenchPlayer = canvas.width * 0.30;
const trenchEnemy = canvas.width * 0.70;

/* =====================================================
   5 CARTE
===================================================== */

const deck = [
  { name: "LACAN", type: "lacan", cooldown: 2500, lastUsed: -99999 },
  { name: "MENDEL", type: "mendel", cooldown: 5500, lastUsed: -99999 },
  { name: "GAAR", type: "gaar", cooldown: 7500, lastUsed: -99999 },
  { name: "MALLO", type: "malloreddu", cooldown: 5200, lastUsed: -99999 },
  { name: "BAU BAU", type: "bau", cooldown: 8500, lastUsed: -99999 }
];

function createUnit(type, side, laneIndex) {
  const config = {
    lacan: { hp: 100, speed: 0.75, range: 150, dmg: 10, rate: 58 },
    mendel: { hp: 160, speed: 0.45, range: 180, dmg: 7, rate: 16 },
    gaar: { hp: 75, speed: 0.42, range: 300, dmg: 45, rate: 120 },
    malloreddu: { hp: 130, speed: 0.85, range: 155, dmg: 14, rate: 52 },
    bau: { hp: 140, speed: 0.95, range: 135, dmg: 13, rate: 45 }
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
    inTrench: false,
    born: Date.now()
  };
}

function spawnPlayer(type) {
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "player", lane));
}

function spawnEnemy() {
  const types = ["lacan", "mendel", "gaar", "malloreddu", "bau"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

setInterval(spawnEnemy, 2600);

function toggleEnemyAssault() {
  enemyAssaultMode = !enemyAssaultMode;

  units.forEach(u => {
    if (u.side === "enemy") u.inTrench = false;
  });
}

setInterval(toggleEnemyAssault, 7000);

function toggleAssault() {
  assaultMode = !assaultMode;

  const btn = document.getElementById("assaultBtn");

  if (assaultMode) {
    btn.textContent = "DIFESA";
    btn.classList.add("defense");

    units.forEach(u => {
      if (u.side === "player") u.inTrench = false;
    });
  } else {
    btn.textContent = "ASSALTO";
    btn.classList.remove("defense");
  }
}

/* =====================================================
   COMBATTIMENTO
===================================================== */

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
        if (!unit.inTrench || assaultMode) unit.x += unit.speed;

        if (!assaultMode && unit.x >= trenchPlayer && unit.x < trenchEnemy - 20) {
          unit.x = trenchPlayer;
          unit.inTrench = true;
          unit.state = "shoot";
        }

        if (!assaultMode && unit.x >= trenchEnemy) {
          unit.x = trenchEnemy;
          unit.inTrench = true;
          unit.state = "shoot";
        }
      }

      if (unit.side === "enemy") {
        if (!unit.inTrench || enemyAssaultMode) unit.x += unit.speed;

        if (!enemyAssaultMode && unit.x <= trenchEnemy && unit.x > trenchPlayer + 20) {
          unit.x = trenchEnemy;
          unit.inTrench = true;
          unit.state = "shoot";
        }

        if (!enemyAssaultMode && unit.x <= trenchPlayer) {
          unit.x = trenchPlayer;
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
    y: unit.y - 46,
    target,
    dmg: unit.dmg,
    side: unit.side,
    fx: false
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
    const dy = b.target.y - 46 - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 8) {
      let damage = b.dmg;
      if (b.target.inTrench) damage *= 0.5;

      b.target.hp -= damage;
      b.hit = true;

      bullets.push({
        x: b.target.x,
        y: b.target.y - 46,
        fx: true,
        life: 8
      });
    } else {
      b.x += (dx / dist) * 8;
      b.y += (dy / dist) * 8;
    }
  });

  bullets = bullets.filter(b => {
    if (b.fx) return b.life > 0;
    return !b.hit;
  });
}

/* =====================================================
   DISEGNO
===================================================== */

function draw() {
  drawBackground();
  drawLanes();
  drawTrenches();

  units.forEach(drawUnit);

  drawBullets();
  drawHudText();
}

function drawBackground() {
  ctx.fillStyle = "#315c34";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < 90; i++) {
    const x = (i * 83) % canvas.width;
    const y = (i * 47) % canvas.height;
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawLanes() {
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;

  lanes.forEach(lane => {
    ctx.beginPath();
    ctx.moveTo(baseLeft, lane.y);
    ctx.lineTo(baseRight, lane.y);
    ctx.stroke();
  });
}

function drawTrenches() {
  lanes.forEach(lane => {
    drawSmallTrench(trenchPlayer, lane.y, "#3b2f2f", "#8b5a2b");
    drawSmallTrench(trenchEnemy, lane.y, "#2b1f1f", "#7a2b2b");
  });
}

function drawSmallTrench(x, y, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(x - 34, y - 18, 68, 36);

  ctx.strokeStyle = light;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x - 26, y - 9);
  ctx.lineTo(x + 26, y - 9);
  ctx.moveTo(x - 26, y + 9);
  ctx.lineTo(x + 26, y + 9);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 34, y - 18, 68, 36);
}

function drawUnit(u) {
  drawSpriteUnit(u);
  drawHpBar(u);
}

function drawSpriteUnit(u) {
  const img = assets[u.type];

  if (!img || !img.complete || img.naturalWidth === 0) {
    drawFallback(u);
    return;
  }

  const frame = getFrameForUnit(u, img);
  const crop = getCrop(img, u.type, frame);

  ctx.save();
  ctx.translate(u.x, u.y);

  if (u.side === "enemy") ctx.scale(-1, 1);

  const scale = u.type === "bau" ? 0.33 : 0.38;
  const dw = crop.sw * scale;
  const dh = crop.sh * scale;

  ctx.drawImage(
    img,
    crop.sx,
    crop.sy,
    crop.sw,
    crop.sh,
    -dw / 2,
    -dh + 10,
    dw,
    dh
  );

  ctx.restore();

  if (u.inTrench) drawDefenseRing(u);
}

function getFrameForUnit(u, img) {
  if (u.state === "walk" && !u.inTrench) {
    if (u.type === "bau") {
      return Math.floor((Date.now() - u.born) / 140) % 2 === 0 ? 1 : 2;
    }
    return 1;
  }

  if (u.state === "shoot" || u.inTrench) {
    return Math.floor(Date.now() / 160) % 2 === 0 ? 2 : 3;
  }

  return 0;
}

/*
  Ritaglio percentuale:
  ignora la parte sinistra con titolo/testo e prende solo i personaggi.
*/
function getCrop(img, type, frame) {
  const w = img.width;
  const h = img.height;

  let frames = 4;
  let startX = w * 0.28;
  let endX = w * 0.96;
  let sy = h * 0.30;
  let sh = h * 0.56;

  if (type === "bau") {
    frames = 5;
    startX = w * 0.25;
    endX = w * 0.98;
    sy = h * 0.31;
    sh = h * 0.55;
  }

  frame = Math.min(frame, frames - 1);

  const areaW = endX - startX;
  const sw = areaW / frames;
  const sx = startX + sw * frame;

  return {
    sx,
    sy,
    sw,
    sh
  };
}

function drawDefenseRing(u) {
  ctx.strokeStyle = "rgba(34,197,94,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(u.x, u.y - 45, 25, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFallback(u) {
  ctx.fillStyle = u.side === "player" ? "#1d4ed8" : "#b91c1c";
  ctx.beginPath();
  ctx.arc(u.x, u.y - 40, 16, 0, Math.PI * 2);
  ctx.fill();
}

function drawHpBar(u) {
  const bw = 48;
  const bh = 5;
  const bx = u.x - bw / 2;
  const by = u.y - 92;

  const hpPercent = Math.max(0, u.hp / u.maxHp);

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(bx, by, bw, bh);

  if (hpPercent > 0.5) ctx.fillStyle = "#22c55e";
  else if (hpPercent > 0.25) ctx.fillStyle = "#facc15";
  else ctx.fillStyle = "#ef4444";

  ctx.fillRect(bx, by, bw * hpPercent, bh);
}

function drawBullets() {
  bullets.forEach(b => {
    if (b.fx) {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = b.side === "player" ? "#facc15" : "#ff4d4d";
      ctx.fillRect(b.x, b.y, 8, 3);
    }
  });
}

function drawHudText() {
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("PLAYER", 20, 24);
  ctx.fillText("ENEMY", canvas.width - 88, 24);

  ctx.font = "13px Arial";

  ctx.fillStyle = assaultMode ? "#ff7676" : "#86efac";
  ctx.fillText(
    assaultMode ? "TU: ASSALTO" : "TU: DIFESA",
    canvas.width / 2 - 105,
    24
  );

  ctx.fillStyle = enemyAssaultMode ? "#ff7676" : "#86efac";
  ctx.fillText(
    enemyAssaultMode ? "NEMICO: ASSALTO" : "NEMICO: DIFESA",
    canvas.width / 2 - 105,
    42
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

/* =====================================================
   CARTE
===================================================== */

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

    div.innerHTML =
      '<div class="card-name">' + card.name + '</div>' +
      '<div class="card-type">' + card.type.toUpperCase() + '</div>' +
      '<div class="card-cost">' + Math.ceil(remaining / 1000) + 's</div>' +
      '<div class="card-cooldown" style="transform: scaleY(' + percent + ');"></div>';

    div.addEventListener("click", () => playCard(index));
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

/* =====================================================
   LOOP
===================================================== */

function gameLoop() {
  updateUnits();
  updateBullets();
  draw();
  checkWin();

  requestAnimationFrame(gameLoop);
}

document.getElementById("assaultBtn").addEventListener("click", toggleAssault);

renderCardBar();
setInterval(renderCardBar, 200);
gameLoop();
