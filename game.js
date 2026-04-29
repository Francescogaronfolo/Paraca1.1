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

// ===== TRINCEE =====
const trenchLeft = 250;
const trenchRight = canvas.width - 250;

// ===== CREAZIONE UNITÀ =====
function createUnit(type, side, laneIndex) {
  const config = {
    rifle: { hp: 100, speed: 1, range: 120, dmg: 10, rate: 60 },
    mg: { hp: 80, speed: 0.8, range: 160, dmg: 5, rate: 20 },
    tank: { hp: 300, speed: 0.5, range: 200, dmg: 20, rate: 80 }
  };

  const c = config[type];

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
    type,
    state: "walk",
    lane: laneIndex,
    inTrench: false
  };
}

// ===== SPAWN =====
function spawnPlayer(type) {
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "player", lane));
}

function spawnEnemy() {
  const types = ["rifle", "mg"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

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

    // entra in trincea
    if (unit.side === "player" && unit.x >= trenchLeft) {
      unit.inTrench = true;
    }
    if (unit.side === "enemy" && unit.x <= trenchRight) {
      unit.inTrench = true;
    }

    let target = findTarget(unit);

    if (target) {
      unit.state = "shoot";

      if (unit.cooldown <= 0) {
        shoot(unit, target);
        unit.cooldown = unit.rate;
      }
    } else {
      unit.state = "walk";

      // si fermano in trincea
      if (!unit.inTrench) {
        unit.x += unit.speed;
      }
    }

    if (unit.cooldown > 0) unit.cooldown--;
  });

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

// ===== UPDATE BULLETS =====
function updateBullets() {
  bullets.forEach(b => {
    if (b.fx) return;

    let dx = b.target.x - b.x;
    let dy = b.target.y - b.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      let damage = b.dmg;

      // riduzione danno in trincea
      if (b.target.inTrench) {
        damage *= 0.5;
      }

      b.target.hp -= damage;
      b.hit = true;

      bullets.push({
        x: b.target.x,
        y: b.target.y,
        fx: true,
        life: 10
      });

    } else {
      b.x += dx / dist * 5;
      b.y += dy / dist * 5;
    }
  });

  bullets.forEach(b => {
    if (b.fx) b.life--;
  });

  bullets = bullets.filter(b => {
    if (b.fx) return b.life > 0;
    return !b.hit;
  });
}

// ===== DRAW =====
function draw() {
  ctx.fillStyle = "#3a5f3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // basi
  ctx.fillStyle = "#654321";
  ctx.fillRect(0, 0, baseLeft, canvas.height);
  ctx.fillRect(baseRight, 0, canvas.width - baseRight, canvas.height);

  // trincee
  ctx.fillStyle = "#3b2f2f";
  ctx.fillRect(trenchLeft - 20, 0, 40, canvas.height);
  ctx.fillRect(trenchRight - 20, 0, 40, canvas.height);

  // corsie
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  lanes.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(0, l.y);
    ctx.lineTo(canvas.width, l.y);
    ctx.stroke();
  });

  // unità
  units.forEach(u => drawSoldier(u));

  // proiettili
  bullets.forEach(b => {
    if (b.fx) {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#facc15";
      ctx.fillRect(b.x, b.y, 4, 4);
    }
  });
}

// ===== SOLDATO =====
function drawSoldier(u) {
  const isPlayer = u.side === "player";
  const dir = isPlayer ? 1 : -1;

  ctx.save();
  ctx.translate(u.x, u.y);

  ctx.fillStyle = isPlayer ? "#1d4ed8" : "#b91c1c";
  ctx.beginPath();
  ctx.ellipse(0, 0, 8, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d6b48c";
  ctx.beginPath();
  ctx.arc(0, -17, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#222";
  ctx.beginPath();
  ctx.moveTo(5 * dir, -4);
  ctx.lineTo(28 * dir, -8);
  ctx.stroke();

  ctx.restore();
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
