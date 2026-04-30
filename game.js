const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
ctx.imageSmoothingEnabled = false;

const imgRifle = new Image();
imgRifle.src = "3536007bf41649b984f91dfbe3ea46e6-d9hrf29-sheet.png";

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
    rifle: { hp: 100, speed: 0.75, range: 145, dmg: 10, rate: 58 },
    mg: { hp: 120, speed: 0.50, range: 180, dmg: 6, rate: 18 },
    sniper: { hp: 75, speed: 0.45, range: 280, dmg: 42, rate: 120 },
    tank: { hp: 340, speed: 0.32, range: 220, dmg: 28, rate: 85 }
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
    y: unit.y - 30,
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

  ctx
