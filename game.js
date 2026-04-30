const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* ===== SPRITE ===== */

const rifleSheet = new Image();
rifleSheet.src = "3536007bf41649b984f91dfbe3ea46e6-d9hrf29-sheet.png";

const mgSheet = new Image();
mgSheet.src = "Soldier Pack.png";

const sniperStand = new Image();
sniperStand.src = "PMC_Stand.bmp";

const sniperRun = new Image();
sniperRun.src = "Kahkis_Run.gif";

const sniperCrouch = new Image();
sniperCrouch.src = "PMC_Crouch.bmp";

const tankSheet = new Image();
tankSheet.src = "tank_right_strip3.png";

/* ===== CONFIG ===== */

const FRAME = 32;

const lanes = [
  { y: canvas.height * 0.34 },
  { y: canvas.height * 0.48 },
  { y: canvas.height * 0.62 }
];

let units = [];
let bullets = [];

let assaultMode = false;
let enemyAssaultMode = false;

const baseLeft = 70;
const baseRight = canvas.width - 70;

const trenchPlayer = canvas.width * 0.30;
const trenchEnemy = canvas.width * 0.70;

/* ===== DECK ===== */

const deck = [
  { name: "LACAN", type: "rifle", cooldown: 2500, lastUsed: -99999 },
  { name: "MENDEL", type: "mg", cooldown: 5500, lastUsed: -99999 },
  { name: "GAAR", type: "sniper", cooldown: 7500, lastUsed: -99999 },
  { name: "CAVADDU", type: "tank", cooldown: 9500, lastUsed: -99999 }
];

/* ===== UNIT CREATION ===== */

function createUnit(type, side, laneIndex) {
  const config = {
    rifle: { hp: 100, speed: 0.75, range: 135, dmg: 10, rate: 58 },
    mg: { hp: 85, speed: 0.55, range: 175, dmg: 5, rate: 18 },
    sniper: { hp: 70, speed: 0.45, range: 260, dmg: 38, rate: 110 },
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
    inTrench: false,
    born: Date.now()
  };
}

/* ===== SPAWN ===== */

function spawnPlayer(type) {
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "player", lane));
}

function spawnEnemy() {
  const types = ["rifle", "mg", "sniper", "tank"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

setInterval(spawnEnemy, 2500);

/* ===== COMBAT ===== */

function findTarget(unit) {
  return units.find(u =>
    u.side !== unit.side &&
    u.lane === unit.lane &&
    Math.abs(u.x - unit.x) < unit.range
  );
}

function shoot(unit, target) {
  bullets.push({
    x: unit.x,
    y: unit.y - 20,
    target,
    dmg: unit.dmg,
    side: unit.side
  });
}

function updateUnits() {
  units.forEach(u => {
    const target = findTarget(u);

    if (target) {
      u.state = "shoot";

      if (u.cooldown <= 0) {
        shoot(u, target);
        u.cooldown = u.rate;
      }
    } else {
      u.state = "walk";
      u.x += u.speed;
    }

    if (u.cooldown > 0) u.cooldown--;
  });

  units = units.filter(u => u.hp > 0);
}

/* ===== DRAW ===== */

function drawUnit(u) {
  if (u.type === "rifle") drawRifle(u);
  else if (u.type === "mg") drawMG(u);
  else if (u.type === "sniper") drawSniper(u);
  else if (u.type === "tank") drawTank(u);

  drawHpBar(u);
}

/* ===== RIFLE ===== */

function drawRifle(u) {
  ctx.drawImage(rifleSheet, 0, 0, 32, 32, u.x - 20, u.y - 40, 40, 40);
}

/* ===== MG ===== */

function drawMG(u) {
  ctx.drawImage(mgSheet, 0, 0, 32, 32, u.x - 20, u.y - 40, 40, 40);
}

/* ===== SNIPER ===== */

function drawSniper(u) {
  let img = sniperStand;

  if (u.state === "walk") img = sniperRun;
  if (u.state === "shoot") img = sniperCrouch;

  ctx.drawImage(img, u.x - 20, u.y - 40, 40, 40);
}

/* ===== TANK ===== */

function drawTank(u) {
  ctx.drawImage(tankSheet, 0, 0, 64, 32, u.x - 30, u.y - 30, 60, 40);
}

/* ===== HP ===== */

function drawHpBar(u) {
  const w = 30;
  const h = 4;

  ctx.fillStyle = "black";
  ctx.fillRect(u.x - 15, u.y - 50, w, h);

  ctx.fillStyle = "lime";
  ctx.fillRect(u.x - 15, u.y - 50, w * (u.hp / u.maxHp), h);
}

/* ===== LOOP ===== */

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  units.forEach(drawUnit);
}

function loop() {
  updateUnits();
  draw();
  requestAnimationFrame(loop);
}

loop();
