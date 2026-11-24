const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvas-container');

const spotifyImg = new Image();
spotifyImg.src = 'assets/custom-logo.png';

const customHitSound = new Audio('assets/hit-sound.wav');
const destroySound = new Audio('assets/destroy-sound.wav');

// --- Blood assets ---
// burstN.png: 600x600 sprite sheets, 6 columns of 100x100 frames, 30 frames (the last one is a reset dot we skip)
// splatN.png: 35x32 frames of one splat growing, the last frame is the stain left on the floor
function loadImages(paths) {
    return paths.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });
}
const bloodBurstSheets = loadImages([1, 2, 3, 4, 5].map(n => `assets/blood/burst${n}.png`));
const bloodSplatFrames = loadImages([1, 2, 3, 4, 5].map(n => `assets/blood/splat${n}.png`));
const BLOOD_COLORS = ['#8a0303', '#b0000e', '#6b0000', '#c8101e', '#4a0000'];

// Everything that has been spilled stays on this layer until the game restarts
const stainCanvas = document.createElement('canvas');
stainCanvas.width = canvas.width;
stainCanvas.height = canvas.height;
const stainCtx = stainCanvas.getContext('2d');

// Blood that sticks to the logo itself, drawn on top of it and kept inside its circle
const LOGO_BLOOD_SIZE = 140;
const logoBloodCanvas = document.createElement('canvas');
logoBloodCanvas.width = LOGO_BLOOD_SIZE;
logoBloodCanvas.height = LOGO_BLOOD_SIZE;
const logoBloodCtx = logoBloodCanvas.getContext('2d');

let score = 0;
const targetScore = 3;
let animationFrameId;
let isGameOver = false;

let isFrozen = false;
let isFlashing = false;
let isTargetActive = true;
let particles = [];
let bloodEffects = [];
let lastTime = 0;

const target = {
    x: 180,
    y: 225,
    radius: 35,
    vx: 3,
    vy: 2.5
};

function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function isLoaded(img) {
    return img.complete && img.naturalWidth > 0;
}

// A blood droplet: flies out, slows down, and lands on the floor as a stain
class Particle {
    constructor(x, y, power = 1) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 6 + 2) * power;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 3.5 + 1.5;
        this.alpha = 1;
        this.color = randomItem(BLOOD_COLORS);
        this.landed = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        const friction = Math.pow(0.9, dt);
        this.vx *= friction;
        this.vy *= friction;

        if (Math.hypot(this.vx, this.vy) < 0.4) {
            this.land();
        }
    }

    land() {
        this.landed = true;
        stainCtx.save();
        stainCtx.globalAlpha = 0.85;
        stainCtx.fillStyle = this.color;
        stainCtx.beginPath();
        stainCtx.ellipse(this.x, this.y, this.size * 1.2, this.size * (0.8 + Math.random() * 0.5), Math.random() * Math.PI, 0, Math.PI * 2);
        stainCtx.fill();
        stainCtx.restore();
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    get done() {
        return this.landed;
    }
}

// Animated spray from one of the burst sprite sheets
class BloodBurst {
    constructor(x, y, scale) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.rotation = Math.random() * Math.PI * 2;
        this.sheet = randomItem(bloodBurstSheets);
        this.frame = 0;
    }

    update(dt) {
        this.frame += dt * 0.9;
    }

    get done() {
        return this.frame >= 29;
    }

    draw() {
        if (!isLoaded(this.sheet) || this.done) return;
        const index = Math.floor(this.frame);
        const sx = (index % 6) * 100;
        const sy = Math.floor(index / 6) * 100;
        const size = 100 * this.scale;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.drawImage(this.sheet, sx, sy, 100, 100, -size / 2, -size / 2, size, size);
        ctx.restore();
    }
}

// Splat that grows in a few frames, then is painted onto the floor for good
class BloodSplat {
    constructor(x, y, scale) {
        this.x = x;
        this.y = y;
        this.scale = scale;
        this.rotation = Math.random() * Math.PI * 2;
        this.flip = Math.random() < 0.5 ? -1 : 1;
        this.frame = 0;
        this.stamped = false;
    }

    update(dt) {
        this.frame += dt * 0.3;
        if (this.frame >= bloodSplatFrames.length - 1 && !this.stamped) {
            this.stamped = true;
            this.drawFrame(stainCtx, bloodSplatFrames.length - 1);
        }
    }

    get done() {
        return this.stamped;
    }

    drawFrame(context, index) {
        const img = bloodSplatFrames[index];
        if (!isLoaded(img)) return;
        const w = img.naturalWidth * this.scale;
        const h = img.naturalHeight * this.scale;
        context.save();
        context.imageSmoothingEnabled = false;
        context.translate(this.x, this.y);
        context.rotate(this.rotation);
        context.scale(this.flip, 1);
        context.drawImage(img, -w / 2, -h / 2, w, h);
        context.restore();
    }

    draw() {
        if (!this.stamped) this.drawFrame(ctx, Math.floor(this.frame));
    }
}

function playPopSound() {
    try {
        customHitSound.currentTime = 0;
        customHitSound.play().catch(e => {});
    } catch (e) {}
}

// Splatter the logo: every hit adds more, and later hits add more than earlier ones
function bloodyLogo(hitNumber) {
    const c = logoBloodCtx;
    const half = LOGO_BLOOD_SIZE / 2;
    c.save();
    c.beginPath();
    c.arc(half, half, half, 0, Math.PI * 2);
    c.clip();

    const splats = hitNumber;
    for (let i = 0; i < splats; i++) {
        const img = randomItem(bloodSplatFrames.slice(2));
        if (!isLoaded(img)) continue;
        const scale = 1.2 + Math.random() * 0.8 + hitNumber * 0.5;
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * half * 0.8;
        c.save();
        c.globalAlpha = 0.9;
        c.imageSmoothingEnabled = false;
        c.translate(half + Math.cos(angle) * dist, half + Math.sin(angle) * dist);
        c.rotate(Math.random() * Math.PI * 2);
        c.drawImage(img, -img.naturalWidth * scale / 2, -img.naturalHeight * scale / 2, img.naturalWidth * scale, img.naturalHeight * scale);
        c.restore();
    }

    const drops = 4 + hitNumber * 8;
    for (let i = 0; i < drops; i++) {
        c.fillStyle = randomItem(BLOOD_COLORS);
        c.beginPath();
        c.arc(Math.random() * LOGO_BLOOD_SIZE, Math.random() * LOGO_BLOOD_SIZE, Math.random() * 3 + 1, 0, Math.PI * 2);
        c.fill();
    }

    // Drips running down from the top half
    const drips = hitNumber + 1;
    for (let i = 0; i < drips; i++) {
        const x = half + (Math.random() - 0.5) * LOGO_BLOOD_SIZE * 0.8;
        const y = Math.random() * half;
        const w = 2.5 + Math.random() * 2.5;
        const len = 15 + Math.random() * 25 * hitNumber;
        c.fillStyle = randomItem(BLOOD_COLORS.slice(0, 3));
        c.fillRect(x - w / 2, y, w, len);
        c.beginPath();
        c.arc(x, y + len, w * 0.8, 0, Math.PI * 2);
        c.fill();
    }

    c.restore();
}

function createBloodHit(x, y) {
    bloodEffects.push(new BloodSplat(x, y, 2 + Math.random() * 0.8));
    bloodEffects.push(new BloodBurst(x, y, 2.6));
    for (let i = 0; i < 22; i++) {
        particles.push(new Particle(x, y, 0.9));
    }
}

function createExplosion(x, y) {
    bloodEffects.push(new BloodSplat(x, y, 4.5));
    for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 30 + Math.random() * 50;
        bloodEffects.push(new BloodSplat(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 1.6 + Math.random() * 1.2));
    }
    for (let i = 0; i < 5; i++) {
        bloodEffects.push(new BloodBurst(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, 3.5 + Math.random() * 1.5));
    }
    for (let i = 0; i < 110; i++) {
        particles.push(new Particle(x, y, 1.8));
    }
}

function resetBlood() {
    stainCtx.clearRect(0, 0, stainCanvas.width, stainCanvas.height);
    logoBloodCtx.clearRect(0, 0, LOGO_BLOOD_SIZE, LOGO_BLOOD_SIZE);
    bloodEffects = [];
}

function initTarget() {
    resetBlood();

    target.x = canvas.width / 2;
    target.y = canvas.height / 2;
    target.radius = 35;

    const angle = Math.random() * Math.PI * 2;
    const speed = 7.5;
    target.vx = Math.cos(angle) * speed;
    target.vy = Math.sin(angle) * speed;
}

function updateGame(timestamp) {
    if (!timestamp) timestamp = performance.now();

    if (!lastTime) lastTime = timestamp;
    let dt = (timestamp - lastTime) / 16.667;

    if (isNaN(dt) || dt > 4) {
        dt = 1;
    }
    lastTime = timestamp;

    if (!isFrozen && isTargetActive) {
        target.x += target.vx * dt;
        target.y += target.vy * dt;

        if (target.x - target.radius < 0) {
            target.x = target.radius;
            target.vx = -target.vx;
        } else if (target.x + target.radius > canvas.width) {
            target.x = canvas.width - target.radius;
            target.vx = -target.vx;
        }

        if (target.y - target.radius < 0) {
            target.y = target.radius;
            target.vy = -target.vy;
        } else if (target.y + target.radius > canvas.height) {
            target.y = canvas.height - target.radius;
            target.vy = -target.vy;
        }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Blood already on the floor goes under everything else
    ctx.drawImage(stainCanvas, 0, 0);

    if (isTargetActive) {
        if (spotifyImg.complete) {
            ctx.drawImage(
                spotifyImg,
                target.x - target.radius,
                target.y - target.radius,
                target.radius * 2,
                target.radius * 2
            );
        } else {
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#1DB954';
            ctx.fill();
            ctx.closePath();
        }

        ctx.drawImage(
            logoBloodCanvas,
            target.x - target.radius,
            target.y - target.radius,
            target.radius * 2,
            target.radius * 2
        );

        if (isFlashing) {
            const isDark = Math.floor(Date.now() / 50) % 2 === 0;
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fillStyle = isDark ? '#5c0000' : '#c8101e';
            ctx.fill();
            ctx.restore();
        }
    }

    for (let i = bloodEffects.length - 1; i >= 0; i--) {
        const effect = bloodEffects[i];
        effect.update(dt);
        effect.draw();
        if (effect.done) {
            bloodEffects.splice(i, 1);
        }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt);
        if (p.done) {
            particles.splice(i, 1);
        } else {
            p.draw();
        }
    }

    if (!isGameOver) {
        animationFrameId = requestAnimationFrame(updateGame);
    }
}

canvas.addEventListener('mousedown', handleHit);
canvas.addEventListener('touchstart', function(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];

    const clickX = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (touch.clientY - rect.top) * (canvas.height / rect.height);
    processHit(clickX, clickY);
});

function handleHit(e) {
    const rect = canvas.getBoundingClientRect();

    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    processHit(clickX, clickY);
}

function processHit(clickX, clickY) {
    if (isGameOver || isFrozen || !isTargetActive) return;

    const dist = Math.hypot(clickX - target.x, clickY - target.y);

    if (dist < target.radius + 35) {
        score++;

        if (score >= targetScore) {
            isFrozen = true;
            isTargetActive = false;

            if (typeof stopSkipTimer === "function") stopSkipTimer();

            try {
                destroySound.currentTime = 0;
                destroySound.play().catch(e => {});
            } catch (e) {}

            createExplosion(target.x, target.y);
            canvasContainer.classList.add('shake');

            setTimeout(() => {
                canvasContainer.classList.remove('shake');
                endGame(true);
            }, 700);

        } else {
            playPopSound();
            createBloodHit(target.x, target.y);
            bloodyLogo(score);
            isFrozen = true;
            isFlashing = true;
            canvasContainer.classList.add('shake');

            setTimeout(() => {
                isFrozen = false;
                isFlashing = false;
                canvasContainer.classList.remove('shake');
            }, 200);

            const currentSpeed = Math.hypot(target.vx, target.vy);
            const newSpeed = currentSpeed * 1.45;

            const randomAngle = Math.random() * Math.PI * 2;
            target.vx = Math.cos(randomAngle) * newSpeed;
            target.vy = Math.sin(randomAngle) * newSpeed;
        }
    }
}

function endGame(won) {
    isGameOver = true;
    cancelAnimationFrame(animationFrameId);

    if (won) {
        isFrozen = true;

        // Land any blood still in the air so it shows behind the text
        particles.forEach(p => p.land());
        particles = [];

        document.body.style.backgroundColor = '#000000';

        const title = document.querySelector('#game-screen h1');
        const desc = document.querySelector('#game-screen p');
        if (title) title.classList.add('fade-out');
        if (desc) desc.classList.add('fade-out');

        canvasContainer.classList.add('shake');
        canvasContainer.classList.add('borderless');

        let flashCount = 0;

        const flashInterval = setInterval(() => {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.drawImage(stainCanvas, 0, 0);
            ctx.restore();

            const isRed = flashCount % 2 === 0;
            ctx.fillStyle = isRed ? '#c8101e' : '#ffffff';

            ctx.font = '900 56px "Arial Black", Impact, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.fillText("SPOTIFY", canvas.width / 2, canvas.height / 2 - 35);
            ctx.fillText("KILLED", canvas.width / 2, canvas.height / 2 + 35);

            flashCount++;
        }, 100);

        setTimeout(() => {
            clearInterval(flashInterval);
            canvasContainer.classList.remove('shake');
            if (typeof transitionToMusic === "function") transitionToMusic();
        }, 1200);
    }
}
