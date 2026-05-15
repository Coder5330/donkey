const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const kongImage = new Image();
kongImage.src = "assets/kong.png";
const barrelImage = new Image();
barrelImage.src = "assets/barrel.png";
const playerImage = new Image();
playerImage.src = "assets/player.png";

canvas.width = 750;
canvas.height = 750;

const player  = {
    x: 120,
    y: canvas.height - 45,
    width: 25,
    height: 40,
    y_vel: 0,
    onground: true,
    onladder: false
}

const evilmonkey = {
    x: 50, 
    y: 94,
    width: 75, 
    height: 75,
    stomping: false,
    stompOffset: -25,
    stompDir: 1
}

const platforms = [
    { x: 100, y: canvas.height - 20, width: canvas.width - 200, height: 20, slope: false },
];

const slopeData = [
    { x: 150, baseY: 100 },
    { x: 0,   baseY: 210 },
    { x: 150, baseY: 300 },
    { x: 0,   baseY: 410 },
    { x: 150, baseY: 500 },
    { x: 0,   baseY: 610 },
];

// height of a slope at a given world x (or null if outside)
function heightAt(p, x) {
    if (x < p.x || x > p.x + p.width) return null;
    const t = (x - p.x) / p.width;
    const leftH = canvas.height - p.y1;
    const rightH = canvas.height - p.y2;
    return leftH + (rightH - leftH) * t;
}

const MIN_GAP = 40;
const slopes = [];

slopeData.forEach((s, i) => {
    const leansRight = i % 2 === 0;
    let tries = 0;
    while (true) {
        const steep = randint(20, 45);
        const candidate = {
            x: s.x,
            y1: canvas.height - s.baseY,
            y2: canvas.height - s.baseY + (leansRight ? -steep : steep),
            width: 600,
            slope: true,
        };
        const prev = slopes[slopes.length - 1];
        const ok = !prev || checkGap(prev, candidate);
        if (ok || ++tries > 50) { slopes.push(candidate); break; }
    }
});

function checkGap(a, b) {
    const xs = [Math.max(a.x, b.x), Math.min(a.x + a.width, b.x + b.width)];
    for (const x of xs) {
        const ha = heightAt(a, x), hb = heightAt(b, x);
        if (ha != null && hb != null && Math.abs(ha - hb) < MIN_GAP) return false;
    }
    return true;
}

platforms.push(...slopes);

const barrels = []

const keys = {};
const MAX_GRAVITY = 10;

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

function getPlatformSurfaceY(platform, x) {
    return platform.slope ? getSlopeY(platform, x) : platform.y;
}

let pressed = [];
let cheat = false;

function generateLadders() {
    const result = [];
    const ladderWidth = 20;
    const padding = 40;
    const minSpacing = 60;

    for (let i = 0; i < platforms.length - 1; i++) {
        const lower = platforms[i];
        const upper = platforms[i + 1];

        const overlapStart = Math.max(lower.x, upper.x);
        const overlapEnd = Math.min(lower.x + lower.width, upper.x + upper.width);
        const usable = overlapEnd - overlapStart - padding * 2;

        if (usable < ladderWidth) continue;

        const maxCount = Math.min(2, Math.floor(usable / (ladderWidth + minSpacing)) + 1);
        const count = Math.floor(Math.random() * maxCount) + 1;
        const sectionWidth = usable / count;

        for (let j = 0; j < count; j++) {
            const sectionStart = overlapStart + padding + j * sectionWidth;
            const lx = Math.floor(Math.random() * (sectionWidth - ladderWidth)) + sectionStart;
            const centerX = lx + ladderWidth / 2;
            const lowerY = getPlatformSurfaceY(lower, centerX);
            const upperY = getPlatformSurfaceY(upper, centerX);

            result.push({ x: lx, y: upperY, width: ladderWidth, height: lowerY - upperY });
        }
    }

    return result;
}

const ladders = generateLadders();

function colliderect(a, b) {
    return !(
        ((a.y + a.height) < (b.y)) ||  // a is above b
        (a.y > (b.y + b.height)) ||    // a is below b
        ((a.x + a.width) < b.x) ||     // a is left of b
        (a.x > (b.x + b.width))        // a is right of b
    );
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    platforms.forEach((p) => {
        if (p.slope) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y1);                        // top-left
            ctx.lineTo(p.x + p.width, p.y2);              // top-right
            ctx.lineTo(p.x + p.width, p.y2 + 10);        // bottom-right (just 10px thick)
            ctx.lineTo(p.x, p.y1 + 10);                   // bottom-left
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(p.x, p.y, p.width, p.height);
        }
    });

    ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
    ctx.drawImage(kongImage, evilmonkey.x, evilmonkey.y + evilmonkey.stompOffset, evilmonkey.width, evilmonkey.height);
    ctx.fillStyle = "orange";
    barrels.forEach((b) => {
        ctx.save();
        ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
        ctx.rotate(b.angle * Math.PI / 180);
        ctx.drawImage(barrelImage, -b.width / 2, -b.height / 2, b.width, b.height);
        ctx.restore();
    });
    ladders.forEach((l) => {
        ctx.fillStyle = "white";
        // left & right rails
        ctx.fillRect(l.x, l.y, 3, l.height);
        ctx.fillRect(l.x + l.width - 3, l.y, 3, l.height);
        // rungs between rails
        for (let ry = l.y; ry < l.y + l.height; ry += 15) {
            ctx.fillRect(l.x, ry, l.width, 3);
        }
    });
}

function move() {
    if (keys["a"] || keys["ArrowLeft"]) {
        player.x -= 3;
    } if (keys["d"] || keys["ArrowRight"]) {
        player.x += 3;
    } if (keys["w"] || keys[" "] || keys["ArrowUp"]) {
        if (player.onground && !player.onladder) {
            player.y_vel = -16;
            player.onground = false;
        }
    }
    if (player.x < 0) {
        player.x = 0;
    } if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    } if (player.y < 0) {
        player.y = 0;
    } if (player.y > canvas.height - player.height) {
        player.y = canvas.height - player.height;
    } 
}

function getSlopeY(platform, x) {
    // Returns the Y of the slope surface at a given x position
    const t = (x - platform.x) / platform.width; // 0 to 1 across the platform
    return platform.y1 + t * (platform.y2 - platform.y1);
}

function gravity() {
    if (player.onladder) {
        return;
    }
    if (player.y_vel < MAX_GRAVITY) {
        player.y_vel += 1;
    }
    player.y += player.y_vel;
    player.onground = false;

    platforms.forEach((platform) => {
        if (platform.slope) {
            const playerCenterX = player.x + player.width / 2;
            if (playerCenterX < platform.x || playerCenterX > platform.x + platform.width) return;

            const surfaceY = getSlopeY(platform, playerCenterX);

            if (player.y + player.height >= surfaceY && player.y < surfaceY + 10) {
                if (player.y_vel >= 0) {
                    // falling or standing — land on top
                    player.y = surfaceY - player.height;
                    player.y_vel = 0;
                    player.onground = true;
                } else {
                    // jumping up — bump head on bottom
                    player.y = surfaceY + 10;
                    player.y_vel = 0;
                }
            }
        } else {
            const rect = { x: platform.x, y: platform.y, width: platform.width, height: platform.height };
            if (colliderect(rect, player)) {
                if (player.y_vel > 0) {
                    player.y_vel = 0;
                    player.y = platform.y - player.height;
                    player.onground = true;
                } else {
                    player.y_vel = 0;
                    player.y = platform.y + platform.height;
                }
            }
        }
    });
}

function spawnBarrel() {
    barrels.push({
        x: evilmonkey.x + evilmonkey.width / 2,
        y: evilmonkey.y + evilmonkey.stompOffset + evilmonkey.height,
        width: 30,
        height: 30,
        x_vel: 1,
        y_vel: 0,
        angle: 0,
        onLadder: null
    });
}

function updateBarrels() {
    for (let i = barrels.length - 1; i >= 0; i--) {
        const b = barrels[i];
        b.angle += b.x_vel * 3;

        if (b.onLadder) {
            b.x = b.onLadder.x + b.onLadder.width / 2 - b.width / 2;
            b.y += 2;
            if (b.y >= b.onLadder.y + b.onLadder.height - b.height) {
                b.y = b.onLadder.y + b.onLadder.height - b.height;
                b.y_vel = 0;
                b.x_vel = Math.random() < 0.5 ? 1 : -1;
                b.onLadder = null;
            }
            if (b.y > canvas.height) barrels.splice(i, 1);
            continue;
        }

        if (b.y_vel < MAX_GRAVITY) b.y_vel += 1;
        b.y += b.y_vel;
        b.x += b.x_vel;

        if (b.x <= 0) {
            b.x = 0;
            b.x_vel = Math.abs(b.x_vel);
        } else if (b.x + b.width >= canvas.width) {
            b.x = canvas.width - b.width;
            b.x_vel = -Math.abs(b.x_vel);
        }

        let onground = false;

        platforms.forEach((platform) => {
            if (platform.slope) {
                const bCenterX = b.x + b.width / 2;
                if (bCenterX < platform.x || bCenterX > platform.x + platform.width) return;
                const surfaceY = getSlopeY(platform, bCenterX);
                if (b.y + b.height >= surfaceY && b.y < surfaceY + 10) {
                    b.y = surfaceY - b.height;
                    b.y_vel = 0;
                    onground = true;
                    const slope = (platform.y2 - platform.y1) / platform.width;
                    b.x_vel += slope * 1.5;
                    b.x_vel *= 0.98;
                }
            } else {
                const bRect = { x: b.x, y: b.y, width: b.width, height: b.height };
                const pRect = { x: platform.x, y: platform.y, width: platform.width, height: platform.height };
                if (colliderect(bRect, pRect) && b.y_vel > 0) {
                    b.y = platform.y - b.height;
                    b.y_vel = 0;
                    onground = true;
                }
            }
        });

        if (onground) {
            const bCenterX = b.x + b.width / 2;
            for (const ladder of ladders) {
                const overX = bCenterX >= ladder.x && bCenterX <= ladder.x + ladder.width;
                const atTop = Math.abs((b.y + b.height) - ladder.y) < 15;
                if (overX && atTop && Math.random() < 0.1) {
                    b.onLadder = ladder;
                    b.x_vel = 0;
                    break;
                }
            }
        }

        if (b.y > canvas.height) barrels.splice(i, 1);
    }
}

function climbLadder() {
    if (!player.onladder) return;

    if (keys["ArrowUp"] || keys["w"]) {
        player.y -= 2;
    }
    if (keys["ArrowDown"] || keys["s"]) {
        player.y += 2;
    }
}

function isOnLadder() {
    player.onladder = false;
    ladders.forEach((ladder) => {
        if (colliderect(ladder, player)) {
            player.onladder = true;
        }
    });
}

function checkDie() {
    if (cheat) {
        return;
    }
    barrels.forEach((b) => {
        if (colliderect(b, player)) {
            player.x = 120;
            player.y = canvas.height - 45,
            player.width = 25,
            player.height = 25,
            player.y_vel = 0,
            player.onground = true,
            player.onladder = false
        }
    });
}
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    pressed.push(e.key);

    while (pressed.length > 5) {
        pressed.shift();
    }
});

function update() {
    while (pressed.length > 5) {
        pressed.shift()
    }
    if (
        pressed[0] == "c" &&
        pressed[1] == "h" &&
        pressed[2] == "e" &&
        pressed[3] == "a" &&
        pressed[4] == "t"
    ) {
        cheat = !cheat;
        pressed = [];
    }
    checkDie();
    isOnLadder();
    move();
    gravity();
    climbLadder();
    updateBarrels();
    updateMonkey();
    draw();
}

function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

let minSpawn = 50;
let maxSpawn = 4000;

function scheduleBarrel() {
  setTimeout(() => {
    spawnBarrel();
    scheduleBarrel();
  }, randint(minSpawn, maxSpawn));
}

function speedUp() {
    minSpawn = 20;
    maxSpawn = 3000;
    evilmonkey.stomping = true;
    evilmonkey.y = 60
}

function updateMonkey() {
    if (!evilmonkey.stomping) return;
    evilmonkey.stompOffset += evilmonkey.stompDir * 3;
    if (evilmonkey.stompOffset >= 15) evilmonkey.stompDir = -1;
    if (evilmonkey.stompOffset <= 0) evilmonkey.stompDir = 1;
}

setInterval(update, 16);
scheduleBarrel();
setTimeout(speedUp, 20000);
