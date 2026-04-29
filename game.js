const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ===== CORSIE =====
const lanes = [
  { y: canvas.height * 0.4 },
  { y: canvas.height * 0.5 },
  { y: canvas.height * 0.6 }
];

// ===== UNITÀ =====
let units = [];
let bullets = [];

// ===== BASE =====
const baseLeft = 100;
const baseRight = canvas.width - 100;

// ===== CREAZIONE UNITÀ =====
function createUnit(type, side, laneIndex) {
  let config = {
    rifle: { hp: 100, speed: 1, range: 120, dmg: 10, rate: 60 },
    mg: { hp: 80, speed: 0.8, range: 160, dmg: 5, rate: 20 },
    tank: { hp: 300, speed: 0.5, range: 200, dmg: 20, rate: 80 }
  };

  let c = config[type];

  return {
    x: side === "player" ? baseLeft : baseRight,
    y: lanes[laneIndex].y,
    hp: c.hp,
    speed: side === "player" ? c.speed : -c.speed,
    range: c.range,
    dmg: c.dmg,
    rate: c.rate,
    cooldown: 0,
    side,
    state: "walk",
    lane: laneIndex
  };
}

// ===== SPAWN =====
function spawnPlayer(type) {
  let lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "player", lane));
}

function spawnEnemy() {
  let types = ["rifle", "mg"];
  let type = types[Math.floor(Math.random() * types.length)];
  let lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

// spawn automatico nemici
setInterval(spawnEnemy, 2000);

// ===== TROVA TARGET =====
function findTarget(unit) {
  return units.find(u =>
    u.side !== unit.side &&
    u.lane === unit.lane &&
    Math.abs(u.x - unit.x) < unit.range
  );
}

// ===== UPDATE UNITÀ =====
function updateUnits() {
  units.forEach(unit => {
    let target = findTarget(unit);

    if (target) {
      unit.state = "shoot";

      if (unit.cooldown <= 0) {
        shoot(unit, target);
        unit.cooldown = unit.rate;
      }
    } else {
      unit.state = "walk";
      unit.x += unit.speed;
    }

    if (unit.cooldown > 0) unit.cooldown--;
  });

  // rimuovi morti
  units = units.filter(u => u.hp > 0);
}

// ===== SPARO =====
function shoot(unit, target) {
  bullets.push({
    x: unit.x,
    y: unit.y,
    target,
    dmg: unit.dmg
  });
}

// ===== UPDATE BULLET =====
function updateBullets() {
  bullets.forEach(b => {
    let dx = b.target.x - b.x;
    let dy = b.target.y - b.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      b.target.hp -= b.dmg;
      b.hit = true;
    } else {
      b.x += dx / dist * 5;
      b.y += dy / dist * 5;
    }
  });

  bullets = bullets.filter(b => !b.hit);
}

// ===== DRAW =====
function draw() {
  // sfondo
  ctx.fillStyle = "#3a5f3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // trincee
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, 0, baseLeft, canvas.height);
  ctx.fillRect(baseRight, 0, canvas.width - baseRight, canvas.height);

  // unità
  units.forEach(u => {
    ctx.fillStyle = u.side === "player" ? "blue" : "red";
    ctx.beginPath();
    ctx.arc(u.x, u.y, 10, 0, Math.PI * 2);
    ctx.fill();

    // barra vita
    ctx.fillStyle = "green";
    ctx.fillRect(u.x - 10, u.y - 15, (u.hp / 100) * 20, 3);
  });

  // proiettili
  ctx.fillStyle = "yellow";
  bullets.forEach(b => {
    ctx.fillRect(b.x, b.y, 4, 4);
  });
}

// ===== WIN/LOSE =====
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

// ===== LOOP =====
function gameLoop() {
  updateUnits();
  updateBullets();
  draw();
  checkWin();
  requestAnimationFrame(gameLoop);
}

gameLoop();
