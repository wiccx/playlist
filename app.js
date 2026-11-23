/* The player. You shouldn't need to edit this to add or remove songs:
   the list comes from songs.json, which GitHub rebuilds from the audio/ folder. */
const $ = id => document.getElementById(id);
const PLAY = '<path d="M6 4l14 8-14 8z"/>', PAUSE = '<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';
const audio = new Audio();
let songs = [], cur = -1, ctx, analyser, wired = false;

/* Load the playlist */
async function load() {
  try {
    const r = await fetch('songs.json?' + Date.now());
    if (!r.ok) throw new Error(r.status);
    songs = await r.json();
  } catch (e) {
    $('status').textContent = 'Couldn’t load the playlist. Try reloading.';
    window.__ready = true;
    return;
  }
  $('status').textContent = songs.length ? '' : 'No songs yet.';
  $('status').hidden = songs.length > 0;
  render();
  window.__ready = true;
}
function render() {
  const ul = $('tracks'); ul.textContent = '';
  songs.forEach((s, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.className = 'trk'; b.dataset.i = i; b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<span class="ic"><svg viewBox="0 0 24 24">' + PLAY + '</svg></span><span><b></b><small></small></span>';
    b.querySelector('b').textContent = s.title;
    b.querySelector('small').textContent = s.artist || 'Unknown artist';
    li.appendChild(b); ul.appendChild(li);
  });
  ui();
}

/* Playback */
function wire() {
  if (wired) return; wired = true;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaElementSource(audio);
  analyser = ctx.createAnalyser(); analyser.fftSize = 128; analyser.smoothingTimeConstant = .8;
  src.connect(analyser); analyser.connect(ctx.destination);
}
function play(i) {
  const s = songs[i]; if (!s) return;
  wire(); ctx.resume();
  if (i !== cur) {
    cur = i;
    audio.src = 'audio/' + encodeURIComponent(s.file);
    if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata({ title: s.title, artist: s.artist || '' });
  }
  audio.play().catch(() => { $('nowSub').textContent = 'Couldn’t play this song'; });
  ui();
}
const step = d => { if (songs.length) play(cur < 0 ? 0 : (cur + d + songs.length) % songs.length); };
const fmt = t => isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';
function ui() {
  const s = songs[cur], on = !audio.paused && s;
  $('nowTitle').textContent = s ? s.title : 'Nothing playing';
  $('nowSub').textContent = s ? (s.artist || 'Unknown artist') : 'Pick a song below';
  $('mainIcon').innerHTML = on ? PAUSE : PLAY;
  $('main').setAttribute('aria-label', on ? 'Pause' : 'Play');
  document.body.classList.toggle('playing', !!on);
  document.querySelectorAll('.trk').forEach((b, i) => {
    const p = !!on && i === cur; b.setAttribute('aria-pressed', p); b.querySelector('svg').innerHTML = p ? PAUSE : PLAY;
  });
}
$('tracks').addEventListener('click', e => {
  const b = e.target.closest('.trk'); if (!b) return;
  const i = +b.dataset.i; (i === cur && !audio.paused) ? audio.pause() : play(i);
});
$('main').onclick = () => { if (!songs.length) return; (cur >= 0 && !audio.paused) ? audio.pause() : play(cur < 0 ? 0 : cur); };
$('prev').onclick = () => step(-1); $('next').onclick = () => step(1);
$('vol').oninput = e => audio.volume = e.target.value / 100;
$('seek').oninput = e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; };
audio.addEventListener('timeupdate', () => { $('cur').textContent = fmt(audio.currentTime); if (audio.duration) $('seek').value = audio.currentTime / audio.duration * 1000; });
audio.addEventListener('loadedmetadata', () => $('dur').textContent = fmt(audio.duration));
audio.addEventListener('play', ui); audio.addEventListener('pause', ui);
audio.addEventListener('ended', () => songs.length > 1 ? step(1) : ui());
audio.addEventListener('error', () => { if (audio.src) $('nowSub').textContent = 'Couldn’t load this song'; });
if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('previoustrack', () => step(-1));
  navigator.mediaSession.setActionHandler('nexttrack', () => step(1));
}

/* LED panel visualizer (dot matrix). Also shares the bass level with the 3D background. */
window.fx = { lvl: 0 };
const cv = $('viz'), g = cv.getContext('2d'), COLS = 40, ROWS = 8;
function fit() { const r = devicePixelRatio || 1; cv.width = cv.clientWidth * r; cv.height = cv.clientHeight * r; }
addEventListener('resize', fit); fit();
const rowColor = r => r > ROWS - 3 ? '#ff2bd6' : r > ROWS - 5 ? '#ff7a45' : '#ffb400';
function draw(ts) {
  const w = cv.width, h = cv.height, cw = w / COLS, ch = h / ROWS, rad = Math.min(cw, ch) * .32;
  g.clearRect(0, 0, w, h);
  let d = null;
  if (analyser && !audio.paused) { d = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(d); }
  for (let c = 0; c < COLS; c++) {
    const v = d ? d[Math.floor(c * d.length / COLS * .8)] / 255 : .18 + .12 * Math.sin(ts / 700 + c * .45);
    const lit = Math.round(v * ROWS);
    for (let r = 0; r < ROWS; r++) {
      const on = r < lit;
      g.fillStyle = on ? rowColor(r) : 'rgba(255,255,255,.07)';
      g.shadowColor = on ? rowColor(r) : 'transparent'; g.shadowBlur = on ? rad * 2 : 0;
      g.beginPath(); g.arc(c * cw + cw / 2, h - r * ch - ch / 2, rad, 0, 6.2832); g.fill();
    }
  }
  const k = d ? (d[1] + d[2] + d[3] + d[4]) / 4 / 255 : 0;
  window.fx.lvl += (k - window.fx.lvl) * .25;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
load();
