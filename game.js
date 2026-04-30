const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const soldierSheet = new Image();
soldierSheet.src = "3536007bf41649b984f91dfbe3ea46e6-d9hrf29-sheet.png";

const FRAME_W = 32;
const FRAME_H = 32;
const FRAME_COLS = 10;

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

const deck = [
  { name: "LACAN", type: "rifle", cooldown: 2500, lastUsed: -99999 },
  { name: "MENDEL", type: "mg", cooldown: 5500, lastUsed: -99999 },
  { name: "CAVADDU", type: "tank", cooldown: 9500, lastUsed: -99999 }
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
    side: side,
    type: type,
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
  const types = ["rifle", "rifle", "mg", "tank"];
  const type = types[Math.floor(Math.random() * types.length)];
  const lane = Math.floor(Math.random() * lanes.length);
  units.push(createUnit(type, "enemy", lane));
}

setInterval(spawnEnemy, 2200);

function toggleEnemyAssault() {
  enemyAssaultMode = !enemyAssaultMode;

  units.forEach(function (u) {
    if (u.side === "enemy") {
      u.inTrench = false;
    }
  });
}

setInterval(toggleEnemyAssault, 7000);

function toggleAssault() {
  assaultMode = !assaultMode;

  const btn = document.getElementById("assaultBtn");

  if (assaultMode) {
    btn.textContent = "DIFESA";
    btn.classList.add("defense");

    units.forEach(function (u) {
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
  return units.find(function (u) {
    return (
      u.side !== unit.side &&
      u.lane === unit.lane &&
      Math.abs(u.x - unit.x) < unit.range
    );
  });
}

function updateUnits() {
  units.forEach(function (unit) {
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

    if (unit.cooldown > 0) {
      unit.cooldown--;
    }
  });

  units = units.filter(function (u) {
    return u.hp > 0;
  });
}

function shoot(unit, target) {
  bullets.push({
    x: unit.x,
    y: unit.y - 22,
    target: target,
    dmg: unit.dmg,
    fx: false,
    side: unit.side
  });
}

function updateBullets() {
  bullets.forEach(function (b) {
    if (b.fx) {
      b.life--;
      return;
    }

    if (!b.target || b.target.hp <= 0) {
      b.hit = true;
      return;
    }

    const dx = b.target.x - b.x;
    const dy = b.target.y - 22 - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 6) {
      let damage = b.dmg;

      if (b.target.inTrench) {
        damage *= 0.5;
      }

      b.target.hp -= damage;
      b.hit = true;

      bullets.push({
        x: b.target.x,
        y: b.target.y - 22,
        fx: true,
        life: 9
      });
    } else {
      b.x += (dx / dist) * 7;
      b.y += (dy / dist) * 7;
    }
  });

  bullets = bullets.filter(function (b) {
    if (b.fx) return b.life > 0;
    return !b.hit;
  });
}

function draw() {
  drawBackground();
  drawLanes();
  drawTrenches();

  units.forEach(function (u) {
    drawUnit(u);
  });

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
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = 2;

  lanes.forEach(function (lane) {
    ctx.beginPath();
    ctx.moveTo(baseLeft, lane.y);
    ctx.lineTo(baseRight, lane.y);
    ctx.stroke();
  });
}

function drawTrenches() {
  lanes.forEach(function (lane) {
    drawSmallTrench(trenchPlayer, lane.y, "#3b2f2f", "#8b5a2b");
    drawSmallTrench(trenchEnemy, lane.y, "#2b1f1f", "#7a2b2b");
  });
}

function drawSmallTrench(x, y, dark, light) {
  ctx.fillStyle = dark;
  ctx.fillRect(x - 26, y - 14, 52, 28);

  ctx.strokeStyle = light;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x - 20, y - 7);
  ctx.lineTo(x + 20, y - 7);
  ctx.moveTo(x - 20, y + 7);
  ctx.lineTo(x + 20, y + 7);
  ctx.stroke();

  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 26, y - 14, 52, 28);
}

function drawBullets() {
  bullets.forEach(function (b) {
    if (b.fx) {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = b.side === "player" ? "#facc15" : "#ff4d4d";
      ctx.fillRect(b.x, b.y, 6, 3);
    }
  });
}

function drawUnit(u) {
  if (u.type === "tank") {
    drawTank(u);
  } else {
    drawSpriteSoldier(u);
  }

  drawHpBar(u);
}

function drawSpriteSoldier(u) {
  if (!soldierSheet.complete) {
    drawFallbackSoldier(u);
    return;
  }

  const isEnemy = u.side === "enemy";
  const scale = u.type === "mg" ? 2.15 : 2.0;

  let row = 0;

  if (u.state === "walk" && !u.inTrench) {
    row = 1;
  }

  if (u.state === "shoot" || u.inTrench) {
    row = 0;
  }

  const frameSpeed = u.state === "walk" ? 100 : 160;
  const frame = Math.floor((Date.now() - u.born) / frameSpeed) % FRAME_COLS;

  const sx = frame * FRAME_W;
  const sy = row * FRAME_H;

  const drawW = FRAME_W * scale;
  const drawH = FRAME_H * scale;

  ctx.save();
  ctx.translate(u.x, u.y);

  if (isEnemy) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    soldierSheet,
    sx,
    sy,
    FRAME_W,
    FRAME_H,
    -drawW / 2,
    -drawH + 8,
    drawW,
    drawH
  );

  if (u.type === "mg") {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(18, -32, 18, 4);
  }

  if (u.state === "shoot") {
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(28, -28, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (u.inTrench) {
    ctx.strokeStyle = "rgba(34,197,94,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(u.x, u.y - 18, 18, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawTank(u) {
  const isPlayer = u.side === "player";
  const dir = isPlayer ? 1 : -1;

  ctx.save();
  ctx.translate(u.x, u.y);

  ctx.fillStyle = isPlayer ? "#1f2937" : "#7f1d1d";
  ctx.strokeStyle = "#111";
  ctx.lineWidth = 2;

  ctx.fillRect(-26, -18, 52, 26);
  ctx.strokeRect(-26, -18, 52, 26);

  ctx.fillRect(-10, -30, 20, 14);
  ctx.strokeRect(-10, -30, 20, 14);

  ctx.beginPath();
  ctx.moveTo(8 * dir, -24);
  ctx.lineTo(42 * dir, -24);
  ctx.stroke();

  if (u.state === "shoot") {
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(44 * dir, -24, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  if (u.inTrench) {
    ctx.strokeStyle = "rgba(34,197,94,0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(u.x, u.y - 10, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFallbackSoldier(u) {
  ctx.fillStyle = u.side === "player" ? "#1d4ed8" : "#b91c1c";
  ctx.beginPath();
  ctx.arc(u.x, u.y - 20, 12, 0, Math.PI * 2);
  ctx.fill();
}

function drawHpBar(u) {
  const bw = u.type === "tank" ? 46 : 34;
  const bh = 4;
  const bx = u.x - bw / 2;
  const by = u.y - 58;

  const hpPercent = Math.max(0, u.hp / u.maxHp);

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(bx, by, bw, bh);

  if (hpPercent > 0.5) {
    ctx.fillStyle = "#22c55e";
  } else if (hpPercent > 0.25) {
    ctx.fillStyle = "#facc15";
  } else {
    ctx.fillStyle = "#ef4444";
  }

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
  units.forEach(function (u) {
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

  deck.forEach(function (card, index) {
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

    div.addEventListener("click", function () {
      playCard(index);
    });

    bar.appendChild(div);
  });
}

function playCard(index) {
  const card = deck[index];
  const now = Date.now();

  if (now - card.lastUsed < card.cooldown) {
    return;
  }

  spawnPlayer(card.type);
  card.lastUsed = now;
  renderCardBar();
}

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
