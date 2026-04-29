const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lanes = [
  { y: canvas.height * 0.4 },
  { y: canvas.height * 0.5 },
  { y: canvas.height * 0.6 }
];

let units = [];
let bullets = [];

const baseLeft = 100;
const baseRight = canvas.width - 100;

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
    type,
    state: "walk",
    lane: laneIndex
  };
}

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

setInterval(spawnEnemy, 2000);

function findTarget(unit) {
  return units.find(u =>
    u.side !== unit.side &&
    u.lane === unit.lane &&
    Math.abs(u.x - unit.x) < unit.range
  );
}

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

  units = units.filter(u => u.hp > 0);
}

function shoot(unit, target) {
  bullets.push({
    x: unit.x,
    y: unit.y,
    target,
    dmg: unit.dmg,
    fx: false
  });
}

function updateBullets() {
  bullets.forEach(b => {
    if (b.fx) {
      b.life--;
      return;
    }

    let dx = b.target.x - b.x;
    let dy = b.target.y - b.y;
    let dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 5) {
      b.target.hp -= b.dmg;
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

  bullets = bullets.filter(b => {
    if (b.fx) return b.life > 0;
    return !b.hit;
  });
}

function draw() {
  ctx.fillStyle = "#3a5f3a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#654321";
  ctx.fillRect(0, 0, baseLeft, canvas.height);
  ctx.fillRect(baseRight, 0, canvas.width - baseRight, canvas.height);

  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 2;
  lanes.forEach(l => {
    ctx.beginPath();
    ctx.moveTo(0, l.y);
    ctx.lineTo(canvas.width, l.y);
    ctx.stroke();
  });

  units.forEach(u => {
    drawSoldier(u);
  });

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

  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("PLAYER", 20, 20);
  ctx.fillText("ENEMY", canvas.width - 90, 20);
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

    ctx.fillRect(-22, -12, 44, 24);
    ctx.strokeRect(-22, -12, 44, 24);

    ctx.fillRect(-8, -20, 16, 14);
    ctx.strokeRect(-8, -20, 16, 14);

    ctx.beginPath();
    ctx.moveTo(8 * dir, -14);
    ctx.lineTo(34 * dir, -14);
    ctx.stroke();
  } else {
    ctx.fillStyle = isPlayer ? "#1d4ed8" : "#b91c1c";
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 2;

    let offset = u.state === "walk" ? Math.sin(Date.now() * 0.01) * 2 : 0;

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

    if (u.state === "shoot") {
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(30 * dir, -8, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (u.type === "mg") {
      ctx.beginPath();
      ctx.moveTo(28 * dir, -8);
      ctx.lineTo(38 * dir, -8);
      ctx.stroke();
    }
  }

  ctx.restore();

  const maxHp = u.type === "tank" ? 300 : u.type === "mg" ? 80 : 100;
  const hpPercent = Math.max(0, u.hp / maxHp);

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(u.x - 16, u.y - 34, 32, 4);

  ctx.fillStyle = hpPercent > 0.5 ? "#22c55e" : hpPercent > 0.25 ? "#facc15" : "#ef4444";
  ctx.fillRect(u.x - 16, u.y - 34, 32 * hpPercent, 4);
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

function gameLoop() {
  updateUnits();
  updateBullets();
  draw();
  checkWin();
  requestAnimationFrame(gameLoop);
}

gameLoop();
