const gameScreen = document.getElementById('game-screen');
const musicScreen = document.getElementById('music-screen');
const skipBtn = document.getElementById('skip-btn');
const navHeader = document.getElementById('nav-header');

const trackLibrary = [
    {
        id: 1,
        title: "Rebel Waves",
        ep: "Corporate Noise EP",
        releaseDate: "2026-05-12",
        duration: "6:12",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        mp3: "music/rebel-waves.mp3",
        wav: "music/rebel-waves.wav",
        cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=150"
    },
    {
        id: 2,
        title: "Corporate Noise",
        ep: "Corporate Noise EP",
        releaseDate: "2026-03-24",
        duration: "7:05",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        mp3: "music/corporate-noise.mp3",
        wav: "music/corporate-noise.wav",
        cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=150"
    },
    {
        id: 3,
        title: "Indie Resurgence",
        ep: "Indie Resurgence EP",
        releaseDate: "2026-06-01",
        duration: "5:44",
        src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        mp3: "music/indie-resurgence.mp3",
        wav: "music/indie-resurgence.wav",
        cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=150"
    }
];

let activePlaylist = [...trackLibrary];
let currentTrackIndex = -1;
let currentPlayingTrackId = -1;
let isPlaying = false;
let skipTimeout;

const masterAudio = new Audio();

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function renderTracklist() {
    const container = document.getElementById('tracklist-container');
    container.innerHTML = '';

    if (activePlaylist.length === 0) {
        container.innerHTML = '<p style="color: #666; margin-top: 20px;">No songs found matching your search.</p>';
        return;
    }

    activePlaylist.forEach((track, index) => {
        const isCurrent = (currentPlayingTrackId !== -1 && track.id === currentPlayingTrackId);
        const rowClass = isCurrent ? 'track-row active-playing' : 'track-row';
        const playIndicator = isCurrent && isPlaying
    ? '<div class="pause-icon-custom"><span></span><span></span></div>'
    : (index + 1);

        const rowHTML = `
<div class="${rowClass}" onclick="playTrack(${index})">
    <div class="row-num">${playIndicator}</div>
    <div class="row-info-col">
        <img class="row-cover" src="${track.cover}" alt="Cover">
        <div>
            <div class="row-title">${track.title}</div>
            <div class="row-ep">${track.ep}</div>
        </div>
    </div>
    <div class="row-date">${track.releaseDate}</div>
    <div class="row-duration">${track.duration}</div>
    <div class="row-downloads">
        <a href="${track.mp3}" download="${track.title}.mp3" class="row-download-btn" onclick="event.stopPropagation();">MP3</a>
        <a href="${track.wav}" download="${track.title}.wav" class="row-download-btn" onclick="event.stopPropagation();">WAV</a>
    </div>
</div>
        `;
        container.insertAdjacentHTML('beforeend', rowHTML);
    });
}

function playTrack(index) {
    if (index < 0 || index >= activePlaylist.length) return;

    const playerBar = document.getElementById('master-player');
    playerBar.classList.remove('hidden');

    const clickedTrack = activePlaylist[index];

    const isAlreadyActive = (currentPlayingTrackId !== -1 && clickedTrack.id === currentPlayingTrackId);

    if (isAlreadyActive) {
        if (masterAudio.paused) {
            masterAudio.play().catch(e => {});
        } else {
            masterAudio.pause();
        }
        return;
    }

    currentTrackIndex = index;
    const track = activePlaylist[currentTrackIndex];
    currentPlayingTrackId = track.id;

    masterAudio.src = track.src;
    masterAudio.load();
    masterAudio.play().then(() => {
        
    }).catch(e => {
        console.log("Playback interrupted.");
    });
}

function togglePlay() {
    if (currentTrackIndex === -1) {
        playTrack(0);
        return;
    }

    if (masterAudio.paused) {
        masterAudio.play().catch(e => {
            console.log("Playback blocked or interrupted.");
        });
    } else {
        masterAudio.pause();
    }
}

function nextTrack() {
    if (activePlaylist.length === 0) return;

    let activeIndex = activePlaylist.findIndex(t => t.id === currentPlayingTrackId);
    let nextIndex = activeIndex + 1;

    if (nextIndex >= activePlaylist.length || activeIndex === -1) {
        nextIndex = 0;
    }
    playTrack(nextIndex);
}

function prevTrack() {
    if (activePlaylist.length === 0) return;

    let activeIndex = activePlaylist.findIndex(t => t.id === currentPlayingTrackId);
    let prevIndex = activeIndex - 1;

    if (prevIndex < 0 || activeIndex === -1) {
        prevIndex = activePlaylist.length - 1;
    }
    playTrack(prevIndex);
}

function updatePlayerUI() {
    if (currentTrackIndex === -1) return;
    const track = activePlaylist[currentTrackIndex];

    document.getElementById('player-cover').src = track.cover;
    document.getElementById('player-title').textContent = track.title;
    document.getElementById('player-artist').textContent = track.ep;
    document.getElementById('player-download-mp3').href = track.mp3;
    document.getElementById('player-download-mp3').setAttribute('download', `${track.title}.mp3`);

    document.getElementById('player-download-wav').href = track.wav;
    document.getElementById('player-download-wav').setAttribute('download', `${track.title}.wav`);

    const playBtn = document.getElementById('master-play-btn');
playBtn.innerHTML = isPlaying
    ? '<div class="pause-icon-custom"><span></span><span></span></div>'
    : '▶';

    renderTracklist();
}

function seekAudio() {
    const slider = document.getElementById('progress-slider');
    const targetTime = (slider.value / 100) * masterAudio.duration;
    masterAudio.currentTime = targetTime;
}

let lastVolume = 0.8;

function setVolume() {
    const slider = document.getElementById('volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    const val = slider.value / 100;

    masterAudio.volume = val;

    if (val === 0) {
        masterAudio.muted = true;
        volumeIcon.textContent = '🔇';
    } else {
        masterAudio.muted = false;
        volumeIcon.textContent = '🔊';
        lastVolume = val;
    }
}

function toggleMute() {
    const volumeIcon = document.getElementById('volume-icon');
    const slider = document.getElementById('volume-slider');

    if (masterAudio.muted) {
        masterAudio.muted = false;
        masterAudio.volume = lastVolume;
        slider.value = lastVolume * 100;
        volumeIcon.textContent = '🔊';
    } else {
        lastVolume = masterAudio.volume > 0 ? masterAudio.volume : 0.8;
        masterAudio.muted = true;
        masterAudio.volume = 0;
        slider.value = 0;
        volumeIcon.textContent = '🔇';
    }
}

function handleSearch() {
    const query = document.getElementById('search-bar').value.toLowerCase().trim();

    activePlaylist = trackLibrary.filter(track => {
        return track.title.toLowerCase().includes(query) ||
               track.ep.toLowerCase().includes(query);
    });

    handleSort(true);
}

function handleSort(isSearching = false) {
    if (!isSearching) {
        handleSearch();
        return;
    }

    const sortOption = document.getElementById('sort-select').value;

    activePlaylist.sort((a, b) => {
        if (sortOption === 'title-asc') {
            return a.title.localeCompare(b.title);
        } else if (sortOption === 'date-desc') {
            return new Date(b.releaseDate) - new Date(a.releaseDate);
        } else if (sortOption === 'date-asc') {
            return new Date(a.releaseDate) - new Date(b.releaseDate);
        } else if (sortOption === 'duration-desc') {
            const getSecs = str => str.split(':').reduce((acc, time) => (60 * acc) + parseInt(time), 0);
            return getSecs(b.duration) - getSecs(a.duration);
        }
        return 0;
    });

    renderTracklist();
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

            const title = document.querySelector('#game-screen h1');
            const desc = document.querySelector('#game-screen p');
            if (title) title.classList.remove('fade-out');
            if (desc) desc.classList.remove('fade-out');

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

            lastTime = 0;
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

function stopSkipTimer() {
    clearTimeout(skipTimeout);
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
        lastTime = 0;
        initTarget();
        updateGame();

        skipBtn.classList.remove('visible');
        clearTimeout(skipTimeout);
        skipTimeout = setTimeout(() => {
            skipBtn.classList.add('visible');
        }, 15000);
    }
}

masterAudio.addEventListener('timeupdate', () => {
    const slider = document.getElementById('progress-slider');
    const currentText = document.getElementById('progress-current');
    const totalText = document.getElementById('progress-total');

    if (masterAudio.duration) {
        const percentage = (masterAudio.currentTime / masterAudio.duration) * 100;
        slider.value = percentage;
        currentText.textContent = formatTime(masterAudio.currentTime);
        totalText.textContent = formatTime(masterAudio.duration);
    }
});

masterAudio.addEventListener('ended', () => {
    nextTrack();
});

masterAudio.addEventListener('play', () => {
    isPlaying = true;
    updatePlayerUI();
});

masterAudio.addEventListener('pause', () => {
    isPlaying = false;
    updatePlayerUI();
});

skipBtn.addEventListener('click', transitionToMusic);

initGame();
renderTracklist();