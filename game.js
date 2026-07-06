const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const canvasContainer = document.getElementById('canvas-container');

const spotifyImg = new Image();
spotifyImg.src = 'assets/custom-logo.png'; 

const customHitSound = new Audio('assets/hit-sound.wav'); 
const destroySound = new Audio('assets/destroy-sound.wav'); 

let score = 0;
const targetScore = 3;
let animationFrameId;
let isGameOver = false;

let isFrozen = false;
let isFlashing = false;
let isTargetActive = true; 
let particles = []; 
let lastTime = 0; 

const target = {
    x: 180,
    y: 225,
    radius: 35,
    vx: 3,
    vy: 2.5
};

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2; 
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.size = Math.random() * 5 + 3; 
        this.alpha = 1;
        this.decay = Math.random() * 0.02 + 0.015; 
        
        const colors = ['#ff3366', '#1DB954', '#ffffff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update(dt) { 
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.alpha -= this.decay * dt;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function playPopSound() {
    try {
        customHitSound.currentTime = 0; 
        customHitSound.play().catch(e => {});
    } catch (e) {}
}

function createExplosion(x, y) {
    particles = [];
    for (let i = 0; i < 45; i++) {
        particles.push(new Particle(x, y));
    }
}

function initTarget() {
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

    if (isTargetActive) {
        if (isFlashing) {
            const isRed = Math.floor(Date.now() / 50) % 2 === 0;
            ctx.beginPath();
            ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
            ctx.fillStyle = isRed ? '#ff3366' : '#FFFFFF';
            ctx.fill();
            ctx.closePath();
        } else if (spotifyImg.complete) {
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
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update(dt); 
        p.draw();
        if (p.alpha <= 0) {
            particles.splice(i, 1);
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
            }, 500);

        } else {
            playPopSound();
            isFrozen = true;
            isFlashing = true;
            canvasContainer.classList.add('shake');

            setTimeout(() => {
                isFrozen = false;
                isFlashing = false;
                canvasContainer.classList.remove('shake');
            }, 200);

            const currentSpeed = Math.hypot(target.vx, target.vy);
            const newSpeed = currentSpeed * 1.6;

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

        // 1. Instantly turn the entire webpage pitch black
        document.body.style.backgroundColor = '#000000';

        // 2. Smoothly fade out the game title and description text above the canvas
        const title = document.querySelector('#game-screen h1');
        const desc = document.querySelector('#game-screen p');
        if (title) title.classList.add('fade-out');
        if (desc) desc.classList.add('fade-out');

        // 3. Trigger the screen shake and remove the box border/glow
        canvasContainer.classList.add('shake');
        canvasContainer.classList.add('borderless');

        let flashCount = 0;
        
        // 4. Create a rapid flash loop (runs every 100 milliseconds)
        const flashInterval = setInterval(() => {
            // Draw a black canvas background to blend seamlessly with the black page
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const isRed = flashCount % 2 === 0;
            ctx.fillStyle = isRed ? '#ff3366' : '#ffffff';

            ctx.font = '900 56px "Arial Black", Impact, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            ctx.fillText("SPOTIFY", canvas.width / 2, canvas.height / 2 - 35);
            ctx.fillText("KILLED", canvas.width / 2, canvas.height / 2 + 35);

            flashCount++;
        }, 100);

        // 5. Let the flash run for 1.2 seconds, then clean up and transition smoothly
        setTimeout(() => {
            clearInterval(flashInterval);
            canvasContainer.classList.remove('shake');
            if (typeof transitionToMusic === "function") transitionToMusic();
        }, 1200);
    }
}