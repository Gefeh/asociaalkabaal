const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameScreen = document.getElementById('game-screen');
const musicScreen = document.getElementById('music-screen');
const skipBtn = document.getElementById('skip-btn');
const canvasContainer = document.getElementById('canvas-container');
const navHeader = document.getElementById('nav-header');


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
let skipTimeout;

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

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
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
    const speed = 2.5;
    target.vx = Math.cos(angle) * speed;
    target.vy = Math.sin(angle) * speed;
}

function updateGame() {
    if (!isFrozen && isTargetActive) {
        target.x += target.vx;
        target.y += target.vy;

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
        p.update();
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
    const clickX = touch.clientX - rect.left;
    const clickY = touch.clientY - rect.top;
    processHit(clickX, clickY);
});

function handleHit(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
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

            clearTimeout(skipTimeout);

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
            const newSpeed = currentSpeed * 1.3;

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
        document.body.style.backgroundColor = '#000000';
        canvasContainer.classList.add('shake');
        canvasContainer.classList.add('borderless');

        let flashCount = 0;

        const flashInterval = setInterval(() => {
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

        setTimeout(() => {
            clearInterval(flashInterval);
            canvasContainer.classList.remove('shake');
            transitionToMusic();
        }, 900);
    }
}

function transitionToMusic() {
    clearTimeout(skipTimeout);
    gameScreen.classList.add('fade-out');
    
    setTimeout(() => {
        gameScreen.classList.add('hidden');
        musicScreen.classList.add('fade-out');
        musicScreen.classList.remove('hidden');
        void musicScreen.offsetWidth; 
        window.scrollTo(0, 0);
        musicScreen.classList.remove('fade-out');

        navHeader.classList.remove('hidden');
        void navHeader.offsetWidth; 
        navHeader.classList.add('visible');

        document.getElementById('tab-music').classList.add('active');
        document.getElementById('tab-game').classList.remove('active');
    }, 600);
}

function switchTab(targetTab) {
    const gameTab = document.getElementById('tab-game');
    const musicTab = document.getElementById('tab-music');

    if (targetTab === 'game') {
        if (!gameScreen.classList.contains('hidden')) return;

        if (window.location.hash === '#music') {
            history.pushState("", document.title, window.location.pathname + window.location.search);
        }

        musicScreen.classList.add('fade-out');
        
        setTimeout(() => {
            document.body.style.backgroundColor = '';
            canvasContainer.classList.remove('borderless');

            score = 0;
            isGameOver = false;
            isFrozen = false;
            isFlashing = false;
            isTargetActive = true; 
            particles = []; 
            
            musicScreen.classList.add('hidden');
            gameScreen.classList.add('fade-out');
            gameScreen.classList.remove('hidden');
            void gameScreen.offsetWidth;
            gameScreen.classList.remove('fade-out');

            musicTab.classList.remove('active');
            gameTab.classList.add('active');

            skipBtn.style.display = 'none';

            initTarget();
            cancelAnimationFrame(animationFrameId);
            updateGame();
        }, 600);

    } else if (targetTab === 'music') {
        if (!musicScreen.classList.contains('hidden')) return;

        window.location.hash = 'music';

        gameScreen.classList.add('fade-out');
        
        setTimeout(() => {
            gameScreen.classList.add('hidden');
            musicScreen.classList.add('fade-out');
            musicScreen.classList.remove('hidden');
            void musicScreen.offsetWidth;
            window.scrollTo(0, 0);
            musicScreen.classList.remove('fade-out');

            gameTab.classList.remove('active');
            musicTab.classList.add('active');
        }, 600);
    }
}

function initGame() {
    if (window.location.hash === '#music') {
        isTargetActive = false;
        isGameOver = true;
        
        gameScreen.classList.add('hidden');
        musicScreen.classList.remove('hidden');
        
        navHeader.classList.remove('hidden');
        navHeader.classList.add('visible');
        
        document.getElementById('tab-music').classList.add('active');
        document.getElementById('tab-game').classList.remove('active');
        
        window.scrollTo(0, 0);
    } else {

        isTargetActive = true;
        particles = [];
        initTarget();
        updateGame();

        skipBtn.classList.remove('visible');
        clearTimeout(skipTimeout);
        skipTimeout = setTimeout(() => {
            skipBtn.classList.add('visible');
        }, 15000); 
    }
}

skipBtn.addEventListener('click', transitionToMusic);

initGame();