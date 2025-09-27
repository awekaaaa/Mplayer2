// =================================================================
// UPGRADE APLIKASI DENGAN LOGIKA HIBRIDA (CEPAT & STABIL)
// =================================================================
const API_URL = 'https://script.google.com/macros/s/AKfycbxVe4cDHxJ0FjmD4hcafufyGnPWjx75_n5OYTQENWgEhKffjuTkBSoWyY-CgOustyHosg/exec'; // Pastikan URL ini benar

// --- Variabel State dan Elemen DOM (Tidak Berubah) ---
if ('serviceWorker' in navigator) { /* ... */ }
const audioPlayer = document.getElementById('audio-player');
const playlistElement = document.getElementById('playlist');
const currentTrackElement = document.getElementById('current-track');
const artistNameElement = document.getElementById('artist-name');
let playlistItems = [];
let currentTrackIndex = -1;
let isLoading = false;
let fallbackTimer;

// --- Logika JSONP untuk mengambil daftar lagu (Tidak Berubah) ---
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

// === PERUBAHAN UTAMA: LOGIKA PEMUTARAN HIBRIDA ===
function playTrack(index) {
    if (isLoading || index < 0 || index >= playlistItems.length) return;
    if (index === currentTrackIndex) { // Jika mengklik lagu yang sama, mainkan/jeda
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
    
    // --- Langkah 1: Coba Streaming Cepat ---
    const fastStreamUrl = `https://drive.google.com/uc?export=download&id=${track.id}`;
    audioPlayer.src = fastStreamUrl;
    audioPlayer.play().catch(e => { console.warn("Play() ditolak, biarkan event listener yang menangani.", e); });

    // --- Langkah 2: Atur Rencana Cadangan (Proxy) ---
    fallbackTimer = setTimeout(() => {
        // Jika setelah 3 detik lagu belum mulai, jalankan proxy
        if (audioPlayer.networkState === 3 || (audioPlayer.readyState === 0 && !audioPlayer.paused)) { // networkState 3 = NETWORK_NO_SOURCE
            console.log("Streaming cepat gagal. Beralih ke metode proxy.");
            fetchTrackViaProxy(track.id);
        }
    }, 3000); // Waktu tunggu 3 detik
}

// Fungsi baru untuk memanggil proxy
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

// Event listener untuk menandakan pemutaran berhasil
audioPlayer.addEventListener('playing', () => {
    isLoading = false;
    clearTimeout(fallbackTimer);
});

// Event listener untuk error, ini akan memicu fallback juga
audioPlayer.addEventListener('error', (e) => {
    // Hanya jalankan fallback jika error terjadi pada percobaan streaming
    if (audioPlayer.src.includes('drive.google.com') && currentTrackIndex !== -1) {
        console.error("Error streaming langsung, memicu fallback proxy.", e);
        clearTimeout(fallbackTimer); // Hentikan timer jika ada
        fetchTrackViaProxy(playlistItems[currentTrackIndex].id);
    }
});


// --- Sisa kode Anda (display, download, visualizer, dll) ---
// ... (Salin semua sisa fungsi dari kode `app.js` Anda sebelumnya ke sini) ...
// (Ini penting agar semua fungsi lain tetap ada)
if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js').then(reg=>console.log('Service Worker terdaftar!',reg)).catch(err=>console.error('Gagal mendaftarkan Service Worker:',err))}
const canvas=document.getElementById('visualizer');const ctx=canvas.getContext('2d');let audioContext,analyser,isVisualizerInitialized=!1;function setupAudioVisualizer(){canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;audioContext=new AudioContext;const e=audioContext.createMediaElementSource(audioPlayer);analyser=audioContext.createAnalyser(),e.connect(analyser),analyser.connect(audioContext.destination),analyser.fftSize=256,isVisualizerInitialized=!0,renderRadialFrame()}
function renderRadialFrame(){const e=analyser.frequencyBinCount,t=new Uint8Array(e);analyser.getByteFrequencyData(t);let n=0;for(let r=0;r<e;r++)n+=t[r];const r=n/e;ctx.clearRect(0,0,canvas.width,canvas.height);const a=canvas.width/2,o=canvas.height/2,d=30,c=r/255,i=60;ctx.beginPath(),ctx.arc(a,o,d+c*i*1.2,0,2*Math.PI),ctx.strokeStyle="rgba(168,251,211,0.2)",ctx.lineWidth=2,ctx.stroke(),ctx.beginPath(),ctx.arc(a,o,d+c*i*.8,0,2*Math.PI),ctx.strokeStyle="rgba(168,251,211,0.4)",ctx.lineWidth=3,ctx.stroke(),ctx.beginPath(),ctx.arc(a,o,d+c*i*.5,0,2*Math.PI),ctx.fillStyle="rgba(168,251,211,0.9)",ctx.fill(),requestAnimationFrame(renderRadialFrame)}
function cleanAndSeparateTitle(e){let t=e.replace(/\.(mp3|m4a|wav)$/i,"").replace(/\[[\w-]{11}\]$/,"").trim().split(" - ");return t.length>1?{artist:t[0].trim(),title:t.slice(1).join(" - ").trim()}:{artist:"Unknown Artist",title:cleanName}}
function displayInitialPlaylist(){playlistElement.innerHTML="",playlistItems.forEach((e,t)=>{const n=document.createElement("div");n.className="playlist-item",n.dataset.index=t,n.onclick=e=>{e.target.tagName!=="BUTTON"&&playTrack(t)};const{artist:r,title:a}=cleanAndSeparateTitle(e.name);n.innerHTML=`\n <div class="track-info">\n <span class="track-title">${a}</span>\n <span class="track-subtitle">${r}</span>\n </div>\n <button class="download-btn" data-id="${e.id}">Offline</button>\n `,playlistElement.appendChild(n)}),document.querySelectorAll(".download-btn").forEach(e=>{e.onclick=downloadTrackForOffline}),checkCachedTracks()}
async function downloadTrackForOffline(e){const t=e.target,n=t.dataset.id;t.textContent="...",t.disabled=!0;try{const r=await caches.open("audio-cache");await r.add(`https://drive.google.com/uc?export=download&id=${n}`),t.textContent="✔ Offline",t.classList.add("downloaded")}catch(r){console.error("Gagal men-cache lagu:",r),t.textContent="Gagal",t.disabled=!1}}
async function checkCachedTracks(){const e=await caches.open("audio-cache"),t=(await e.keys()).map(e=>(new URL(e.url)).searchParams.get("id"));document.querySelectorAll(".download-btn").forEach(e=>{t.includes(e.dataset.id)&&(e.textContent="✔ Offline",e.classList.add("downloaded"),e.disabled=!0)})}
function updateActiveTrack(){const e=document.querySelectorAll(".playlist-item");e.forEach((e,t)=>{e.classList.toggle("active",t==currentTrackIndex)})}
function showAudioError(){isLoading=!1,currentTrackElement.textContent="Error",artistNameElement.textContent="Gagal memuat audio"}
audioPlayer.addEventListener("ended",()=>{playlistItems.length>0&&playTrack((currentTrackIndex+1)%playlistItems.length)});
fetchAndDisplayPlaylist();