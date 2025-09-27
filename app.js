// =================================================================
// UPGRADE V9.2: PERBAIKAN BUG 'cleanName is not defined'
// =================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxVe4cDHxJ0FjmD4hcafufyGnPWjx75_n5OYTQENWgEhKffjuTkBSoWyY-CgOustyHosg/exec'; // Pastikan URL ini benar

// --- Variabel State dan Elemen DOM ---
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => console.log('Service Worker terdaftar!', reg)).catch(err => console.error('Gagal mendaftarkan Service Worker:', err));
}
const audioPlayer = document.getElementById('audio-player');
const playlistElement = document.getElementById('playlist');
const currentTrackElement = document.getElementById('current-track');
const artistNameElement = document.getElementById('artist-name');
let playlistItems = [];
let currentTrackIndex = -1;
let isLoading = false;
let fallbackTimer;
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
let audioContext, analyser, isVisualizerInitialized = false;

// === FUNGSI PEMBANTU YANG DIPERBAIKI PENEMPATANNYA ===
function cleanAndSeparateTitle(fileName) {
    // Definisi cleanName ada di dalam scope yang benar
    let cleanName = fileName.replace(/\.(mp3|m4a|wav)$/i, "").replace(/\[[\w-]{11}\]$/, "").trim();
    const parts = cleanName.split(" - ");
    if (parts.length > 1) {
        return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
    }
    // Mengembalikan cleanName jika tidak ada pemisah
    return { artist: "Unknown Artist", title: cleanName };
}

// === Logika JSONP untuk mengambil daftar lagu ===
function loadPlaylist(result) {
    if (result.success) {
        playlistItems = result.data;
        displayInitialPlaylist();
    } else {
        showError(result.error);
    }
}

function fetchAndDisplayPlaylist() {
    const script = document.createElement('script');
    script.src = `${API_URL}?callback=loadPlaylist`;
    script.onerror = () => { showError('Gagal memuat API. Cek URL atau blokiran jaringan.'); };
    document.body.appendChild(script);
}

// === LOGIKA PEMUTARAN HIBRIDA (Tidak Berubah) ===
function playTrack(index) {
    if (isLoading || index < 0 || index >= playlistItems.length) return;
    if (index === currentTrackIndex) {
        if (audioPlayer.paused) audioPlayer.play(); else audioPlayer.pause();
        return;
    }
    clearTimeout(fallbackTimer);
    if (!isVisualizerInitialized) { setupAudioVisualizer(); }
    
    isLoading = true;
    currentTrackIndex = index;
    const track = playlistItems[index];
    const { artist, title } = cleanAndSeparateTitle(track.name);
    currentTrackElement.textContent = title;
    artistNameElement.textContent = artist;
    updateActiveTrack();
    
    const fastStreamUrl = `https://drive.google.com/uc?export=download&id=${track.id}`;
    audioPlayer.src = fastStreamUrl;
    audioPlayer.play().catch(e => { console.warn("Play() ditolak, biarkan event listener yang menangani.", e); });

    fallbackTimer = setTimeout(() => {
        if (audioPlayer.networkState === 3 || (audioPlayer.readyState === 0 && !audioPlayer.paused)) {
            console.log("Streaming cepat gagal. Beralih ke metode proxy.");
            fetchTrackViaProxy(track.id);
        }
    }, 3000);
}

async function fetchTrackViaProxy(trackId) {
    try {
        const proxyUrl = `${API_URL}&action=getTrack&id=${trackId}`;
        const response = await fetch(proxyUrl);
        const result = await response.json();
        
        if (result.dataUri.startsWith('data:')) {
            audioPlayer.src = result.dataUri;
            audioPlayer.play();
        } else {
            showAudioError();
        }
    } catch (e) {
        showAudioError();
    }
}

// === EVENT LISTENERS (Tidak Berubah) ===
audioPlayer.addEventListener('playing', () => {
    isLoading = false;
    clearTimeout(fallbackTimer);
});

audioPlayer.addEventListener('error', (e) => {
    if (audioPlayer.src.includes('drive.google.com') && currentTrackIndex !== -1) {
        console.error("Error streaming langsung, memicu fallback proxy.", e);
        clearTimeout(fallbackTimer);
        fetchTrackViaProxy(playlistItems[currentTrackIndex].id);
    }
});

audioPlayer.addEventListener("ended", () => {
    if (playlistItems.length > 0) {
        playTrack((currentTrackIndex + 1) % playlistItems.length);
    }
});

// === Sisa Fungsi Lainnya (Tidak Berubah) ===
function displayInitialPlaylist() {
    playlistElement.innerHTML = "";
    playlistItems.forEach((file, index) => {
        const item = document.createElement("div");
        item.className = "playlist-item";
        item.dataset.index = index;
        item.onclick = e => { if (e.target.tagName !== "BUTTON") { playTrack(index) } };
        const { artist, title } = cleanAndSeparateTitle(file.name);
        item.innerHTML = `
            <div class="track-info">
                <span class="track-title">${title}</span>
                <span class="track-subtitle">${artist}</span>
            </div>
            <button class="download-btn" data-id="${file.id}">Offline</button>
        `;
        playlistElement.appendChild(item);
    });
    document.querySelectorAll(".download-btn").forEach(button => {
        button.onclick = downloadTrackForOffline;
    });
    checkCachedTracks();
}

async function downloadTrackForOffline(event) {
    const button = event.target;
    const id = button.dataset.id;
    button.textContent = "...";
    button.disabled = true;
    try {
        const cache = await caches.open("audio-cache");
        await cache.add(`https://drive.google.com/uc?export=download&id=${id}`);
        button.textContent = "✔ Offline";
        button.classList.add("downloaded");
    } catch (err) {
        console.error("Gagal men-cache lagu:", err);
        button.textContent = "Gagal";
        button.disabled = false;
    }
}

async function checkCachedTracks() {
    const cache = await caches.open("audio-cache");
    const cachedRequests = await cache.keys();
    const cachedIds = cachedRequests.map(req => (new URL(req.url)).searchParams.get("id"));
    document.querySelectorAll(".download-btn").forEach(button => {
        if (cachedIds.includes(button.dataset.id)) {
            button.textContent = "✔ Offline";
            button.classList.add("downloaded");
            button.disabled = true;
        }
    });
}

function updateActiveTrack() {
    const allItems = document.querySelectorAll(".playlist-item");
    allItems.forEach((item, idx) => {
        item.classList.toggle("active", idx == currentTrackIndex);
    });
}

function showAudioError() {
    isLoading = false;
    currentTrackElement.textContent = "Error";
    artistNameElement.textContent = "Gagal memuat audio";
}

function showError(message) {
    playlistElement.innerHTML = `<div class="loader">${message}</div>`;
}

function setupAudioVisualizer() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioPlayer);
    analyser = audioContext.createAnalyser();
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyser.fftSize = 256;
    isVisualizerInitialized = true;
    renderRadialFrame();
}

function renderRadialFrame() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
    }
    const average = sum / bufferLength;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const baseRadius = 30;
    const pulseFactor = average / 255;
    const maxPulse = 60;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + (pulseFactor * maxPulse * 1.2), 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(168,251,211,0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + (pulseFactor * maxPulse * 0.8), 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(168,251,211,0.4)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + (pulseFactor * maxPulse * 0.5), 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(168,251,211,0.9)";
    ctx.fill();
    requestAnimationFrame(renderRadialFrame);
}

// Memulai aplikasi
fetchAndDisplayPlaylist();
