const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.imageSmoothingEnabled = false;

/* =========================
   ASSET
========================= */

const imgRifle = loadImage("3536007bf41649b984f91dfbe3ea46e6-d9hrf29-sheet.png");
const imgMG = loadImage("Soldier Pack.jpeg");
const imgSniperStand = loadImage("PMC_Stand.jpeg");
const imgSniperCrouch = loadImage("PMC_Crouch.jpeg");
const imgSniperRun = loadImage("Kahkis_Run.gif");
const imgTank = loadImage("tank_right_strip3.png");

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/* =========================
   MAPPA / LOGICA
========================= */

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

const deck = [
  { name: "LACAN", type: "rifle", cooldown: 2500, lastUsed: -99999 },
  { name: "MENDEL", type: "mg", cooldown: 5500, lastUsed: -99999 },
  { name: "GAAR", type: "sniper", cooldown: 7500, lastUsed: -99999 },
  { name: "CAVADDU", type: "tank", cooldown: 9500, lastUsed: -99999 }
];

function createUnit(type, side, laneIndex) {
  const config = {
    rifle:  { hp: 100, speed: 0.75, range: 145, dmg: 10, rate: 58 },
    mg:     { hp: 110, speed: 0.50, range: 180, dmg: 6,  rate: 18 },
    sniper: { hp: 75,  speed: 0.45, range: 280, dmg: 42, rate: 120 },
    tank:   { hp: 340, speed: 0.32, range: 220, dmg: 28, rate: 85 }
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
  const types = ["rifle", "rifle", "mg", "sniper", "tank"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

setInterval(spawnEnemy, 2400);

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
        if (!unit.inTrench || enemyAssaultMode) {
          unit.x += unit.speed;
        }

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
    y: unit.y - 30,
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
    const dy = b.target.y - 30 - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 7) {
      let damage = b.dmg;

      if (b.target.inTrench) damage *= 0.5;

      b.target.hp -= damage;
      b.hit = true;

      bullets.push({
        x: b.target.x,
        y: b.target.y - 30,
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

/* =========================
   DRAW
========================= */

function draw() {
  drawBackground();
  drawLanes();
  drawTrenches();

  units.forEach(u => drawUnit(u));

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
  if (u.type === "rifle") drawRifle(u);
  if (u.type === "mg") drawMG(u);
  if (u.type === "sniper") drawSniper(u);
  if (u.type === "tank") drawTank(u);

  drawHpBar(u);
}

function getFrame(unit, count, speed) {
  return Math.floor((Date.now() - unit.born) / speed) % count;
}

/* LACAN - rifle piccolo pixel */
function drawRifle(u) {
  if (!imgRifle.complete) return drawFallback(u);

  const frame = getFrame(u, 10, u.state === "walk" ? 95 : 140);
  const row = u.state === "walk" && !u.inTrench ? 1 : 0;

  drawSpriteFrame(u, imgRifle, frame * 32, row * 32, 32, 32, 3.1, 0, -4);
}

/* MENDEL - mitragliere da Soldier Pack */
function drawMG(u) {
  if (!imgMG.complete) return drawFallback(u);

  const walking = u.state === "walk" && !u.inTrench;
  const frame = getFrame(u, walking ? 5 : 3, walking ? 120 : 180);

  let sx, sy, sw, sh;

  if (walking) {
    const frames = [
      [289, 114, 95, 78],
      [387, 114, 87, 78],
      [482, 114, 94, 78],
      [579, 114, 87, 78],
      [674, 114, 79, 78]
    ];
    [sx, sy, sw, sh] = frames[frame];
  } else {
    const frames = [
      [1250, 19, 89, 78],
      [1346, 19, 81, 78],
      [1442, 19, 87, 78]
    ];
    [sx, sy, sw, sh] = frames[frame];
  }

  drawSpriteFrame(u, imgMG, sx, sy, sw, sh, 1.05, 0, 2);
}

/* GAAR - sniper */
function drawSniper(u) {
  let img = imgSniperStand;

  if (u.state === "walk" && !u.inTrench) img = imgSniperRun;
  if (u.state === "shoot" || u.inTrench) img = imgSniperCrouch;

  if (!img.complete) return drawFallback(u);

  const scale = u.state === "walk" && !u.inTrench ? 1.65 : 1.9;

  drawWholeImage(u, img, scale, 0, 0);
}

/* CAVADDU - tank */
function drawTank(u) {
  if (!imgTank.complete) return drawFallbackTank(u);

  const frame = getFrame(u, 3, 180);
  const sx = frame * 200;

  drawSpriteFrame(u, imgTank, sx, 0, 200, 200, 0.52, 0, 22);
}

function drawSpriteFrame(u, img, sx, sy, sw, sh, scale, ox, oy) {
  const dw = sw * scale;
  const dh = sh * scale;

  ctx.save();
  ctx.translate(u.x, u.y);

  if (u.side === "enemy") ctx.scale(-1, 1);

  ctx.drawImage(
    img,
    sx, sy, sw, sh,
    -dw / 2 + ox,
    -dh + 12 + oy,
    dw,
    dh
  );

  if (u.state === "shoot") drawMuzzleFlash(u, dw);

  ctx.restore();

  if (u.inTrench) drawDefenseRing(u);
}

function drawWholeImage(u, img, scale, ox, oy) {
  const dw = img.width * scale;
  const dh = img.height * scale;

  ctx.save();
  ctx.translate(u.x, u.y);

  if (u.side === "enemy") ctx.scale(-1, 1);

  ctx.drawImage(
    img,
    -dw / 2 + ox,
    -dh + 8 + oy,
    dw,
    dh
  );

  if (u.state === "shoot") drawMuzzleFlash(u, dw);

  ctx.restore();

  if (u.inTrench) drawDefenseRing(u);
}

function drawMuzzleFlash(u, width) {
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(width * 0.34, -34, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDefenseRing(u) {
  ctx.strokeStyle = "rgba(34,197,94,0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(u.x, u.y - 28, 22, 0, Math.PI * 2);
  ctx.stroke();
}

function drawFallback(u) {
  ctx.fillStyle = u.side === "player" ? "#1d4ed8" : "#b91c1c";
  ctx.beginPath();
  ctx.arc(u.x, u.y - 30, 14, 0, Math.PI * 2);
  ctx.fill();
}

function drawFallbackTank(u) {
  ctx.fillStyle = u.side === "player" ? "#1f2937" : "#7f1d1d";
  ctx.fillRect(u.x - 35, u.y - 35, 70, 30);
}

function drawHpBar(u) {
  const bw = u.type === "tank" ? 58 : 42;
  const bh = 5;
  const bx = u.x - bw / 2;
  const by = u.y - (u.type === "tank" ? 72 : 82);

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

/* =========================
   CARTE
========================= */

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

/* =========================
   LOOP
========================= */

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
