let audioCtx = null;
let masterGainNode = null;
let isPlaying = false;
// BPM PREDEFINITO FISSO A 120
let bpm = 120;
let masterVolume = 1.0;
let inCountdown = false;
let countdownBeat = 0;
const COUNTDOWN_TOTAL = 4;
let currentMeasureIndex = 0;
let currentSubBeat = 0;
let currentBeat = 0;
let currentSubBeatInBeat = 0;
let totalCompletedMeasures = 0;
let measureRepeatCounter = 0;
let nextNoteTime = 0.0;
const lookahead = 25.0;
const scheduleAheadTime = 0.1;
let timerID = null;
let uiTimerID = null;
let uiNotes = [];
let activeSubPopup = null;
let measures = [
{ beats: 4, sub: 2, beatSubs: [2,2,2,2], repeat: 1, accents: [], isCustom: false },
{ beats: 4, sub: 4, beatSubs: [4,4,4,4], repeat: 1, accents: [], isCustom: false }
];
let targetCustomIndex = null;
const bpmSlider = document.getElementById('bpmSlider');
const bpmVal = document.getElementById('bpmVal');
const agogicaLabel = document.getElementById('agogicaLabel');
const playBtn = document.getElementById('playBtn');
const dotsContainer = document.getElementById('dotsContainer');
const currentMeasureBadge = document.getElementById('currentMeasureBadge');
const movementDisplay = document.getElementById('movementDisplay');
const measuresContainer = document.getElementById('measuresContainer');
const addMeasureBtn = document.getElementById('addMeasureBtn');
const resetAccentsBtn = document.getElementById('resetAccentsBtn');
const resetSequenceBtn = document.getElementById('resetSequenceBtn');
const countdownToggle = document.getElementById('countdownToggle');
const trainerToggle = document.getElementById('trainerToggle');
const trainerConfigRow = document.getElementById('trainerConfigRow');
const trainerBpmInc = document.getElementById('trainerBpmInc');
const trainerBarsInc = document.getElementById('trainerBarsInc');
const masterKnob = document.getElementById('masterKnob');
const knobIndicator = document.getElementById('knobIndicator');
const masterValueText = document.getElementById('masterValueText');
const valCircle = document.getElementById('valCircle');
const metroVolInput = document.getElementById('metroVol');
const soundWaveSelect = document.getElementById('soundWaveSelect');
const tapTempoBtn = document.getElementById('tapTempoBtn');
const customModal = document.getElementById('customModal');
const customBeatsInput = document.getElementById('customBeatsInput');
const customSubInput = document.getElementById('customSubInput');
const customModalCancel = document.getElementById('customModalCancel');
const customModalSave = document.getElementById('customModalSave');
const savePresetBtn = document.getElementById('savePresetBtn');
const presetsContainer = document.getElementById('presetsContainer');
const presetsEmpty = document.getElementById('presetsEmpty');
const savePresetModal = document.getElementById('savePresetModal');
const presetNameInput = document.getElementById('presetNameInput');
const savePresetCancel = document.getElementById('savePresetCancel');
const savePresetConfirm = document.getElementById('savePresetConfirm');
const shareLinkBtn = document.getElementById('shareLinkBtn');
const sharedImportModal = document.getElementById('sharedImportModal');
const sharedImportConfirm = document.getElementById('sharedImportConfirm');
const sharedImportCancel = document.getElementById('sharedImportCancel');
const swingAmount = document.getElementById('swingAmount');
const swingValueText = document.getElementById('swingValueText');
const silentModeToggle = document.getElementById('silentModeToggle');
const silentConfigRow = document.getElementById('silentConfigRow');
const silentAudibleBars = document.getElementById('silentAudibleBars');
const silentMuteBars = document.getElementById('silentMuteBars');
const visualizerEl = document.querySelector('.visualizer');
const statsBtn = document.getElementById('statsBtn');
const statsModal = document.getElementById('statsModal');
const statsGrid = document.getElementById('statsGrid');
const statsCloseBtn = document.getElementById('statsCloseBtn');
const statsResetBtn = document.getElementById('statsResetBtn');
let presets = [];
let practiceStats = { totalMinutes: 0, sessions: 0, maxBpm: 0, lastSession: null };
let sessionStartTime = null;
let sessionMaxBpm = 0;
function loadPersistedData() {
try {
const savedMeasures = localStorage.getItem('metronome_measures_v5');
if (savedMeasures) {
const parsed = JSON.parse(savedMeasures);
if (Array.isArray(parsed) && parsed.length > 0) {
measures = parsed.map(m => {
if (!m.beatSubs && m.sub) {
m.beatSubs = new Array(m.beats || 4).fill(m.sub);
}
return {
...m,
repeat: m.repeat === undefined ? 1 : m.repeat,
beatSubs: m.beatSubs || new Array(m.beats || 4).fill(m.sub || 2)
};
});
}
}
if (measures.length < 2) {
measures.push({ beats: 4, sub: 4, beatSubs: [4,4,4,4], repeat: 1, accents: [], isCustom: false });
}
const savedBpm = localStorage.getItem('metronome_bpm_v1');
bpm = savedBpm ? Math.min(300, Math.max(20, parseInt(savedBpm, 10) || 120)) : 120;
const savedVol = localStorage.getItem('metronome_vol_v4');
if (savedVol) masterVolume = parseFloat(savedVol);
const savedSound = localStorage.getItem('metronome_sound_v4');
if (savedSound) soundWaveSelect.value = savedSound;
const savedMetroVol = localStorage.getItem('metronome_metrovol_v1');
if (savedMetroVol) metroVolInput.value = savedMetroVol;
const savedSwing = localStorage.getItem('metronome_swing_v1');
if (savedSwing) swingAmount.value = savedSwing;
} catch (e) {
console.error('Errore nel caricamento dei dati', e);
bpm = 120;
}
}
function savePersistedData() {
try {
localStorage.setItem('metronome_measures_v5', JSON.stringify(measures));
localStorage.setItem('metronome_vol_v4', masterVolume);
localStorage.setItem('metronome_sound_v4', soundWaveSelect.value);
localStorage.setItem('metronome_bpm_v1', bpm);
localStorage.setItem('metronome_metrovol_v1', metroVolInput.value);
localStorage.setItem('metronome_swing_v1', swingAmount.value);
} catch (e) {
console.error('Errore nel salvataggio', e);
}
}
loadPersistedData();
function loadPresets() {
try {
const raw = localStorage.getItem('metronome_presets_v1');
presets = raw ? JSON.parse(raw) : [];
if (!Array.isArray(presets)) presets = [];
} catch (e) {
console.error('Errore nel caricamento dei preset', e);
presets = [];
}
}
function savePresetsToStorage() {
try {
localStorage.setItem('metronome_presets_v1', JSON.stringify(presets));
} catch (e) {
console.error('Errore nel salvataggio dei preset', e);
}
}
function buildCurrentSequenceData() {
return {
version: 1,
bpm: bpm,
measures: measures,
countdown: countdownToggle.checked,
swing: parseInt(swingAmount.value, 10) || 0,
soundWave: soundWaveSelect.value
};
}
function applySequenceData(data) {
if (!data || !Array.isArray(data.measures) || data.measures.length === 0) return false;
measures = data.measures.map(m => ({
...m,
repeat: m.repeat === undefined ? 1 : m.repeat,
beatSubs: m.beatSubs || new Array(m.beats || 4).fill(m.sub || 2),
accents: m.accents || []
}));
if (typeof data.bpm === 'number') setValidBpm(data.bpm);
if (typeof data.countdown === 'boolean') countdownToggle.checked = data.countdown;
if (typeof data.swing === 'number') {
swingAmount.value = Math.min(75, Math.max(0, data.swing));
swingValueText.innerText = `${swingAmount.value}%`;
}
if (typeof data.soundWave === 'string') {
const opt = Array.from(soundWaveSelect.options).find(o => o.value === data.soundWave);
if (opt) soundWaveSelect.value = data.soundWave;
}
currentMeasureIndex = 0;
measureRepeatCounter = 0;
renderMeasuresList();
renderDots(0, -1, -1);
savePersistedData();
return true;
}
function renderPresetsList() {
presetsContainer.querySelectorAll('.preset-item').forEach(el => el.remove());
presetsEmpty.style.display = presets.length === 0 ? 'block' : 'none';
presets.forEach((p) => {
const item = document.createElement('div');
item.className = 'preset-item';
const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString('it-IT') : '';
const barsCount = p.measures ? p.measures.length : 0;
item.innerHTML = `<div class="preset-item-info"> <div class="preset-item-name">${escapeHtml(p.name)}</div> <div class="preset-item-meta">${p.bpm || ''} BPM · ${barsCount} battute${dateStr ? ' · ' + dateStr : ''}</div> </div> <div class="preset-item-actions"> <button type="button" class="icon-btn active-action" title="Carica e Avvia Preset" data-action="load"> <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> </button> <button type="button" class="icon-btn" title="Elimina Preset" data-action="delete"> <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> </button> </div>`;
item.querySelector('[data-action="load"]').addEventListener('click', () => {
if (isPlaying) togglePlayback();
applySequenceData(p);
togglePlayback();
});
item.querySelector('[data-action="delete"]').addEventListener('click', () => {
presets = presets.filter(x => x.id !== p.id);
savePresetsToStorage();
renderPresetsList();
});
presetsContainer.appendChild(item);
});
}
function escapeHtml(str) {
const div = document.createElement('div');
div.textContent = str == null ? '' : String(str);
return div.innerHTML;
}
savePresetBtn.addEventListener('click', () => {
presetNameInput.value = '';
savePresetModal.classList.add('active');
setTimeout(() => presetNameInput.focus(), 100);
});
savePresetCancel.addEventListener('click', () => savePresetModal.classList.remove('active'));
savePresetConfirm.addEventListener('click', () => {
const name = presetNameInput.value.trim();
if (!name) {
presetNameInput.focus();
return;
}
const data = buildCurrentSequenceData();
presets.push({
id: 'preset_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
name: name,
createdAt: Date.now(),
...data
});
savePresetsToStorage();
renderPresetsList();
savePresetModal.classList.remove('active');
});
presetNameInput.addEventListener('keydown', (e) => {
if (e.code === 'Enter') savePresetConfirm.click();
});
shareLinkBtn.addEventListener('click', () => {
try {
const data = buildCurrentSequenceData();
const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
const url = `${location.origin}${location.pathname}#preset=${encoded}`;
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText(url).then(() => {
shareLinkBtn.innerText = '✔ Link Copiato!';
setTimeout(() => shareLinkBtn.innerText = '🔗 Copia Link Condivisibile', 1800);
}).catch(() => {
prompt('Copia questo link:', url);
});
} else {
prompt('Copia questo link:', url);
}
} catch (e) {
alert('Impossibile generare il link di condivisione.');
}
});
function checkSharedLinkOnLoad() {
const hash = location.hash;
if (!hash || hash.indexOf('#preset=') !== 0) return;
try {
const encoded = hash.replace('#preset=', '');
const data = JSON.parse(decodeURIComponent(atob(encoded)));
if (!data || !Array.isArray(data.measures)) return;
pendingSharedData = data;
sharedImportModal.classList.add('active');
} catch (e) {
console.warn('Link condiviso non valido', e);
}
}
let pendingSharedData = null;
sharedImportConfirm.addEventListener('click', () => {
if (pendingSharedData) applySequenceData(pendingSharedData);
sharedImportModal.classList.remove('active');
history.replaceState(null, '', location.pathname + location.search);
});
sharedImportCancel.addEventListener('click', () => {
sharedImportModal.classList.remove('active');
history.replaceState(null, '', location.pathname + location.search);
});
function loadStats() {
try {
const raw = localStorage.getItem('metronome_stats_v1');
if (raw) practiceStats = { ...practiceStats, ...JSON.parse(raw) };
} catch (e) {
console.error('Errore nel caricamento delle statistiche', e);
}
}
function saveStats() {
try {
localStorage.setItem('metronome_stats_v1', JSON.stringify(practiceStats));
} catch (e) {
console.error('Errore nel salvataggio delle statistiche', e);
}
}
function renderStats() {
const lastSessionText = practiceStats.lastSession
? new Date(practiceStats.lastSession).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
: '—';
statsGrid.innerHTML = `<div class="stat-box"> <div class="stat-value">${Math.round(practiceStats.totalMinutes)}</div> <div class="stat-label">Minuti Totali</div> </div> <div class="stat-box"> <div class="stat-value">${practiceStats.sessions}</div> <div class="stat-label">Sessioni</div> </div> <div class="stat-box"> <div class="stat-value">${practiceStats.maxBpm || '—'}</div> <div class="stat-label">BPM Massimo</div> </div> <div class="stat-box"> <div class="stat-value" style="font-size: 0.95rem;">${lastSessionText}</div> <div class="stat-label">Ultima Sessione</div> </div>`;
}
statsBtn.addEventListener('click', () => {
renderStats();
statsModal.classList.add('active');
});
statsCloseBtn.addEventListener('click', () => statsModal.classList.remove('active'));
// AZZERAMENTO DIRETTO SENZA POPUP DI CONFERMA
statsResetBtn.addEventListener('click', () => {
practiceStats = { totalMinutes: 0, sessions: 0, maxBpm: 0, lastSession: null };
saveStats();
renderStats();
});
swingAmount.addEventListener('input', () => {
swingValueText.innerText = `${swingAmount.value}%`;
});
swingAmount.addEventListener('change', savePersistedData);
silentModeToggle.addEventListener('change', () => {
silentConfigRow.style.opacity = silentModeToggle.checked ? "1" : "0.5";
});
function getAgogica(val) {
if (val  < 40) return  "Grave ";
if (val  < 60) return  "Largo ";
if (val  < 66) return  "Larghetto ";
if (val  < 76) return  "Adagio ";
if (val  < 108) return  "Andante ";
if (val  < 120) return  "Moderato ";
if (val  < 168) return  "Allegro ";
if (val  < 200) return  "Presto ";
return  "Prestissimo ";
}
function updateMasterKnobUI(vol) {
masterVolume = Math.min(1, Math.max(0, vol));
const angle = -135 + (masterVolume * 270);
knobIndicator.style.transform = `rotate(${angle}deg)`;
masterValueText.innerText = `${Math.round(masterVolume * 100)}%`;
const maxArcLength = 63.61;
if (masterVolume <= 0.005) {
valCircle.style.strokeDasharray = `0, 84.82`;
valCircle.style.opacity = '0';
} else {
valCircle.style.strokeDasharray = `${masterVolume * maxArcLength}, 84.82`;
valCircle.style.opacity = '1';
}
masterKnob.setAttribute('aria-valuenow', Math.round(masterVolume * 100));
if (masterGainNode) masterGainNode.gain.value = masterVolume;
savePersistedData();
}
let isDraggingKnob = false, startY = 0, startVol = 0.5;
masterKnob.addEventListener('mousedown', (e) => {
isDraggingKnob = true; startY = e.clientY; startVol = masterVolume;
});
window.addEventListener('mousemove', (e) => {
if (!isDraggingKnob) return;
updateMasterKnobUI(startVol + ((startY - e.clientY) / 150));
});
window.addEventListener('mouseup', () => isDraggingKnob = false);
masterKnob.addEventListener('touchstart', (e) => {
isDraggingKnob = true; startY = e.touches[0].clientY; startVol = masterVolume;
e.preventDefault();
}, { passive: false });
window.addEventListener('touchmove', (e) => {
if (!isDraggingKnob) return;
updateMasterKnobUI(startVol + ((startY - e.touches[0].clientY) / 150));
e.preventDefault();
}, { passive: false });
window.addEventListener('touchend', () => isDraggingKnob = false);
masterKnob.addEventListener('keydown', (e) => {
if (e.code === 'ArrowUp' || e.code === 'ArrowRight') {
e.preventDefault(); updateMasterKnobUI(masterVolume + 0.05);
} else if (e.code === 'ArrowDown' || e.code === 'ArrowLeft') {
e.preventDefault(); updateMasterKnobUI(masterVolume - 0.05);
}
});
function setupDragToAdjust(inputElem, onUpdate) {
let isDragging = false;
let startY = 0;
let startVal = 0;
inputElem.addEventListener('mousedown', (e) => {
isDragging = true;
startY = e.clientY;
startVal = parseFloat(inputElem.value) || 0;
document.body.style.cursor = 'ns-resize';
});
window.addEventListener('mousemove', (e) => {
if (!isDragging) return;
const deltaY = startY - e.clientY;
const step = parseInt(inputElem.step, 10) || 1;
const sensitivity = 5;
let newVal = startVal + Math.round(deltaY / sensitivity) * step;
const min = inputElem.min !== "" ? parseFloat(inputElem.min) : -Infinity;
const max = inputElem.max !== "" ? parseFloat(inputElem.max) : Infinity;
newVal = Math.min(max, Math.max(min, newVal));
inputElem.value = newVal;
if (onUpdate) onUpdate(newVal);
});
window.addEventListener('mouseup', () => {
if (isDragging) {
isDragging = false;
document.body.style.cursor = 'default';
}
});
}
setupDragToAdjust(bpmVal, (val) => setValidBpm(val));
setupDragToAdjust(customBeatsInput);
setupDragToAdjust(customSubInput);
setupDragToAdjust(trainerBpmInc);
setupDragToAdjust(trainerBarsInc);
let bpmSaveTimeout = null;
function setValidBpm(val) {
let parsed = parseInt(val, 10);
if (isNaN(parsed)) parsed = 120;
bpm = Math.min(300, Math.max(20, parsed));
bpmVal.value = bpm;
bpmSlider.value = bpm;
agogicaLabel.innerText = getAgogica(bpm);
clearTimeout(bpmSaveTimeout);
bpmSaveTimeout = setTimeout(savePersistedData, 300);
if (isPlaying) sessionMaxBpm = Math.max(sessionMaxBpm, bpm);
}
bpmSlider.addEventListener('input', (e) => setValidBpm(e.target.value));
bpmVal.addEventListener('change', (e) => setValidBpm(e.target.value));
document.getElementById('bpmPlus1').addEventListener('click', () => setValidBpm(bpm + 1));
document.getElementById('bpmMinus1').addEventListener('click', () => setValidBpm(bpm - 1));
document.getElementById('bpmPlus5').addEventListener('click', () => setValidBpm(bpm + 5));
document.getElementById('bpmMinus5').addEventListener('click', () => setValidBpm(bpm - 5));
let tapTimes = [];
tapTempoBtn.addEventListener('click', () => {
const now = performance.now();
if (tapTimes.length && now - tapTimes[tapTimes.length - 1] > 2000) tapTimes = [];
tapTimes.push(now);
if (tapTimes.length > 6) tapTimes.shift();
if (tapTimes.length >= 2) {
const intervals = [];
for (let i = 1; i < tapTimes.length; i++) intervals.push(tapTimes[i] - tapTimes[i - 1]);
const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
setValidBpm(Math.round(60000 / avgMs));
}
tapTempoBtn.classList.add('tapped');
setTimeout(() => tapTempoBtn.classList.remove('tapped'), 100);
});
window.addEventListener('keydown', (e) => {
const activeTag = document.activeElement.tagName;
if (activeTag === 'INPUT' || activeTag === 'SELECT' || document.activeElement === masterKnob) return;
if (e.code === 'Space') {
e.preventDefault();
togglePlayback();
} else if (e.code === 'ArrowUp') {
e.preventDefault();
setValidBpm(bpm + (e.shiftKey ? 5 : 1));
} else if (e.code === 'ArrowDown') {
e.preventDefault();
setValidBpm(bpm - (e.shiftKey ? 5 : 1));
}
});
trainerToggle.addEventListener('change', () => {
trainerConfigRow.style.opacity = trainerToggle.checked ? "1" : "0.5";
});
let noiseBuffer = null;
function initAudioContext() {
if (!audioCtx) {
audioCtx = new (window.AudioContext || window.webkitAudioContext)();
masterGainNode = audioCtx.createGain();
masterGainNode.connect(audioCtx.destination);
const bufferSize = audioCtx.sampleRate * 0.02;
noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
const data = noiseBuffer.getChannelData(0);
for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
}
masterGainNode.gain.value = masterVolume;
}
function selectMeasure(index) {
currentMeasureIndex = index;
measureRepeatCounter = 0;
renderMeasuresList();
renderDots(currentMeasureIndex, -1, -1);
}
function renderMeasuresList() {
measuresContainer.innerHTML = '';
measures.forEach((m, index) => {
const isFirst = index === 0;
const isLast = index === measures.length - 1;
const isOnly = measures.length === 1;
const row = document.createElement('div');
 row.className = `measure-row ${index === currentMeasureIndex ? 'current' : ''}`;
 row.onclick = (e) => {
   if (['SELECT', 'BUTTON', 'svg', 'path', 'line', 'rect'].includes(e.target.tagName)) return;
   if (isPlaying) return;
   selectMeasure(index);
 };
 const repeatOptions = [1,2,3,4,5,6,7,8,9,10].map(r => `<option value="${r}" ${m.repeat === r ? 'selected' : ''}>×${r}</option>`).join('') + `<option value="inf" ${m.repeat === 'inf' ? 'selected' : ''}>Loop</option>`;
 const customLabel = m.isCustom ? `${m.beats}/${m.sub}` : 'Custom...';
 row.innerHTML = `
   <div class="measure-left">
     <div class="measure-number">${index + 1}</div>
     <select class="measure-select preset" onchange="handlePresetSelect(${index}, this.value)" onclick="handlePresetClick(${index}, this)" aria-label="Metro">
       <option value="4/4" ${!m.isCustom && m.beats === 4 && m.sub !== 3 ? 'selected' : ''}>4/4</option>
       <option value="2/4" ${!m.isCustom && m.beats === 2 && m.sub !== 3 ? 'selected' : ''}>2/4</option>
       <option value="3/4" ${!m.isCustom && m.beats === 3 && m.sub !== 3 ? 'selected' : ''}>3/4</option>
       <option value="6/8" ${!m.isCustom && m.beats === 2 && m.sub === 3 ? 'selected' : ''}>6/8</option>
       <option value="7/8" ${!m.isCustom && m.beats === 7 && m.sub === 2 ? 'selected' : ''}>7/8</option>
       <option value="12/8" ${!m.isCustom && m.beats === 4 && m.sub === 3 ? 'selected' : ''}>12/8</option>
       <option value="custom" ${m.isCustom ? 'selected' : ''}>${customLabel}</option>
     </select>
     ${m.isCustom ? `
       <button type="button" class="icon-btn edit-btn" onclick="openCustomModal(${index})" title="Modifica Metro Custom">
         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
       </button>
     ` : ''}
     <select class="measure-select subdivision" onchange="updateMeasure(${index}, 'sub', this.value)" aria-label="Suddivisione">
       <option value="1" ${m.sub === 1 ? 'selected' : ''}>Quarti</option>
       <option value="2" ${m.sub === 2 ? 'selected' : ''}>Crome</option>
       <option value="3" ${m.sub === 3 ? 'selected' : ''}>Terzine</option>
       <option value="4" ${m.sub === 4 ? 'selected' : ''}>Quartine</option>
       <option value="5" ${m.sub === 5 ? 'selected' : ''}>Quintine</option>
       <option value="6" ${m.sub === 6 ? 'selected' : ''}>Sestine</option>
     </select>
     <select class="measure-select repeat" onchange="updateMeasure(${index}, 'repeat', this.value)" aria-label="Ripetizioni">
       ${repeatOptions}
     </select>
   </div>
   <div class="measure-right">
     <button type="button" class="icon-btn ${isFirst ? 'disabled' : ''}" 
       ${isFirst ? 'disabled' : ''} onclick="moveMeasureOrder(${index}, -1)">
       <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
     </button>
     <button type="button" class="icon-btn ${isLast ? 'disabled' : ''}" 
       ${isLast ? 'disabled' : ''} onclick="moveMeasureOrder(${index}, 1)">
       <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
     </button>
     <button type="button" class="icon-btn" onclick="resetSingleMeasureAccents(${index})" title="Reset Accenti">
       <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
     </button>
     <button type="button" class="icon-btn active-action" onclick="duplicateMeasure(${index})" title="Duplica">
       <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
     </button>
     <button type="button" class="icon-btn ${isOnly ? 'disabled' : ''}" 
       ${isOnly ? 'disabled' : ''} onclick="removeMeasure(${index}, event)" title="Elimina">
       <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
     </button>
   </div>
 `;
 measuresContainer.appendChild(row);
});
savePersistedData();
}
window.handlePresetSelect = function(index, value) {
if (value === 'custom') {
openCustomModal(index);
} else {
updateMeasure(index, 'preset', value);
}
};
window.handlePresetClick = function(index, selectElem) {
if (selectElem.value === 'custom' && measures[index].isCustom) {
openCustomModal(index);
}
};
function openCustomModal(index) {
targetCustomIndex = index;
const m = measures[index];
customBeatsInput.value = m.beats || 5;
customSubInput.value = m.sub || 4;
customModal.classList.add('active');
setTimeout(() => {
customBeatsInput.focus();
customBeatsInput.select();
}, 100);
}
function closeCustomModal() {
customModal.classList.remove('active');
targetCustomIndex = null;
}
customModalCancel.addEventListener('click', () => {
closeCustomModal();
renderMeasuresList();
});
customModalSave.addEventListener('click', () => {
if (targetCustomIndex !== null) {
const b = parseInt(customBeatsInput.value, 10);
const s = parseInt(customSubInput.value, 10);
if (!isNaN(b) && b > 0 && b <= 64 && !isNaN(s) && s > 0 && s <= 64) {
measures[targetCustomIndex].beats = b;
measures[targetCustomIndex].sub = s;
measures[targetCustomIndex].isCustom = true;
measures[targetCustomIndex].beatSubs = new Array(b).fill(s);
  const totalSubs = b * s;
  if (!measures[targetCustomIndex].accents) measures[targetCustomIndex].accents = [];
  if (measures[targetCustomIndex].accents.length > totalSubs) {
    measures[targetCustomIndex].accents = measures[targetCustomIndex].accents.slice(0, totalSubs);
  } else {
    while (measures[targetCustomIndex].accents.length < totalSubs) measures[targetCustomIndex].accents.push(0);
  }
}
}
closeCustomModal();
renderMeasuresList();
if (!isPlaying) renderDots(currentMeasureIndex, -1, -1);
});
window.resetSingleMeasureAccents = function(index) {
const m = measures[index];
const totalSubs = m.beatSubs.reduce((a, b) => a + b, 0);
m.accents = new Array(totalSubs).fill(0);
if (!isPlaying) renderDots(currentMeasureIndex, -1, -1);
savePersistedData();
};
window.updateMeasure = function(index, key, value) {
if (key === 'preset') {
measures[index].isCustom = false;
const parts = value.split('/');
measures[index].beats = parseInt(parts[0], 10);
measures[index].sub = parts[1] === '8' ? 2 : 1;
if (value === '6/8') { measures[index].beats = 2; measures[index].sub = 3; }
if (value === '7/8') { measures[index].beats = 7; measures[index].sub = 2; }
if (value === '12/8') { measures[index].beats = 4; measures[index].sub = 3; }
measures[index].beatSubs = new Array(measures[index].beats).fill(measures[index].sub);
} else if (key === 'sub') {
const subVal = parseInt(value, 10);
measures[index].sub = subVal;
measures[index].beatSubs = new Array(measures[index].beats).fill(subVal);
if (subVal === 3) {
if (measures[index].beats === 2) {
measures[index].isCustom = false;
} else if (measures[index].beats === 3) {
measures[index].isCustom = true;
} else if (measures[index].beats === 4) {
measures[index].isCustom = false;
}
} else if (subVal === 2) {
if (measures[index].beats === 2) {
measures[index].isCustom = false;
} else if (measures[index].beats === 4) {
measures[index].isCustom = false;
}
}
} else if (key === 'repeat') {
measures[index].repeat = value === 'inf' ? 'inf' : parseInt(value, 10);
} else {
measures[index][key] = parseInt(value, 10);
}
const totalSubs = measures[index].beatSubs.reduce((a, b) => a + b, 0);
if (!measures[index].accents) measures[index].accents = [];
if (measures[index].accents.length > totalSubs) {
measures[index].accents = measures[index].accents.slice(0, totalSubs);
} else {
while (measures[index].accents.length < totalSubs) measures[index].accents.push(0);
}
renderMeasuresList();
if (!isPlaying) renderDots(currentMeasureIndex, -1, -1);
};
window.duplicateMeasure = function(index) {
if (isPlaying) return;
const target = measures[index];
measures.splice(index + 1, 0, {
beats: target.beats,
sub: target.sub,
beatSubs: [...(target.beatSubs || new Array(target.beats).fill(target.sub || 2))],
repeat: target.repeat || 1,
accents: [...target.accents],
isCustom: target.isCustom || false
});
renderMeasuresList();
renderDots(currentMeasureIndex, -1, -1);
};
window.moveMeasureOrder = function(index, direction) {
if (isPlaying) return;
const newIdx = index + direction;
if (newIdx < 0 || newIdx >= measures.length) return;
const item = measures.splice(index, 1)[0];
measures.splice(newIdx, 0, item);
currentMeasureIndex = newIdx;
renderMeasuresList();
renderDots(currentMeasureIndex, -1, -1);
};
addMeasureBtn.addEventListener('click', () => {
if (isPlaying) return;
const last = measures[measures.length - 1] || { beats: 4, sub: 2, beatSubs: [2,2,2,2], repeat: 1, isCustom: false };
measures.push({
beats: last.beats,
sub: last.sub,
beatSubs: [...(last.beatSubs || new Array(last.beats).fill(last.sub || 2))],
repeat: 1,
accents: [],
isCustom: last.isCustom
});
renderMeasuresList();
selectMeasure(measures.length - 1);
});
window.removeMeasure = function(index, event) {
if (event) event.stopPropagation();
if (isPlaying) return;
if (measures.length <= 1) return;
measures.splice(index, 1);
if (currentMeasureIndex >= measures.length) currentMeasureIndex = measures.length - 1;
renderMeasuresList();
renderDots(currentMeasureIndex, -1, -1);
};
resetAccentsBtn.addEventListener('click', () => {
measures.forEach(m => {
const totalSubs = m.beatSubs.reduce((a, b) => a + b, 0);
m.accents = new Array(totalSubs).fill(0);
});
if (!isPlaying) renderDots(currentMeasureIndex, -1, -1);
savePersistedData();
});
resetSequenceBtn.addEventListener('click', () => {
if (isPlaying) return;
measures = [
{ beats: 4, sub: 2, beatSubs: [2,2,2,2], repeat: 1, accents: [], isCustom: false },
{ beats: 4, sub: 4, beatSubs: [4,4,4,4], repeat: 1, accents: [], isCustom: false }
];
currentMeasureIndex = 0;
measureRepeatCounter = 0;
setValidBpm(120);
renderMeasuresList();
renderDots(0, -1, -1);
savePersistedData();
});
function closeBeatSubPopup() {
if (activeSubPopup) {
activeSubPopup.remove();
activeSubPopup = null;
}
}
function showBeatSubPopup(beatNumberElem, measureIndex, beatIndex) {
closeBeatSubPopup();
const popup = document.createElement('div');
popup.className = 'beat-sub-popup';
const m = measures[measureIndex];
const currentSub = m.beatSubs[beatIndex];
const subNames = ['','Quarti','Crome','Terzine','Quartine','Quintine','Sestine','Settime'];
for (let i = 1; i <= 7; i++) {
const opt = document.createElement('div');
opt.className = 'sub-popup-option' + (i === currentSub ? ' selected' : '');
opt.textContent = subNames[i];
opt.addEventListener('click', (e) => {
e.stopPropagation();
updateBeatSubdivision(measureIndex, beatIndex, i);
renderDots(measureIndex, -1, -1);
closeBeatSubPopup();
});
popup.appendChild(opt);
}
beatNumberElem.appendChild(popup);
activeSubPopup = popup;
requestAnimationFrame(() => {
popup.classList.add('active');
});
}
function setupBeatLongPress(elem, measureIndex, beatIndex) {
let timer = null;
const start = (e) => {
timer = setTimeout(() => {
timer = null;
showBeatSubPopup(elem, measureIndex, beatIndex);
}, 500);
};
const end = () => {
if (timer) {
clearTimeout(timer);
timer = null;
}
};
elem.addEventListener('mousedown', start);
elem.addEventListener('touchstart', start, { passive: true });
elem.addEventListener('mouseup', end);
elem.addEventListener('mouseleave', end);
elem.addEventListener('touchend', end);
elem.addEventListener('touchcancel', end);
elem.addEventListener('contextmenu', (e) => e.preventDefault());
}
function updateBeatSubdivision(measureIndex, beatIndex, newSub) {
const m = measures[measureIndex];
const oldBeatSubs = [...m.beatSubs];
const oldTotalSubs = oldBeatSubs.reduce((a, b) => a + b, 0);
const oldAccents = m.accents && m.accents.length === oldTotalSubs ? [...m.accents] : new Array(oldTotalSubs).fill(0);
m.beatSubs[beatIndex] = newSub;
const newTotalSubs = m.beatSubs.reduce((a, b) => a + b, 0);
const newAccents = new Array(newTotalSubs).fill(0);
let oldOffset = 0;
let newOffset = 0;
for (let b = 0; b < m.beats; b++) {
const oldSub = oldBeatSubs[b];
const newSubVal = m.beatSubs[b];
const minSub = Math.min(oldSub, newSubVal);
for (let s = 0; s < minSub; s++) {
newAccents[newOffset + s] = oldAccents[oldOffset + s];
}
oldOffset += oldSub;
newOffset += newSubVal;
}
m.accents = newAccents;
savePersistedData();
}
function renderDots(measureIndex, activeBeat, activeSubBeatInBeat, isCountdownMode = false, currentRepeat = -1) {
dotsContainer.innerHTML = '';
if (isCountdownMode) {
const remainingBeats = COUNTDOWN_TOTAL - activeSubBeatInBeat;
currentMeasureBadge.innerText = `PRONTI... ${remainingBeats}`;
movementDisplay.innerHTML = `COUNTDOWN: <span class="highlight">${activeSubBeatInBeat + 1}</span> DI ${COUNTDOWN_TOTAL}`;
const wrapper = document.createElement('div');
wrapper.className = 'countdown-wrapper';
for (let i = 0; i < COUNTDOWN_TOTAL; i++) {
const dot = document.createElement('div');
dot.className = `dot downbeat ${i === activeSubBeatInBeat ? 'active' : ''}`;
wrapper.appendChild(dot);
}
dotsContainer.appendChild(wrapper);
return;
}
const config = measures[measureIndex];
if (!config) return;
const totalSubs = config.beatSubs.reduce((a, b) => a + b, 0);
if (!config.accents || config.accents.length !== totalSubs) {
config.accents = new Array(totalSubs).fill(0);
}
const maxRepeats = config.repeat || 1;
let repeatText = '';
if (maxRepeats === 'inf') {
repeatText = `(Loop)`;
} else if (maxRepeats > 1) {
const displayRepeat = currentRepeat >= 0 ? (currentRepeat + 1) : 1;
repeatText = `(Ripeti ${displayRepeat}/${maxRepeats})`;
}
currentMeasureBadge.innerText = `Battuta ${measureIndex + 1} di ${measures.length}${repeatText}`;
const currBeat = activeBeat >= 0 ? activeBeat + 1 : 1;
movementDisplay.innerHTML = `MOVIMENTO <span class="highlight">${currBeat}</span> DI ${config.beats}`;
let globalSubBeatIndex = 0;
for (let b = 0; b < config.beats; b++) {
const group = document.createElement('div');
group.className = 'beat-group';
const beatNumber = document.createElement('div');
 beatNumber.className = 'beat-number';
 beatNumber.textContent = b + 1;
 if (b === activeBeat) beatNumber.classList.add('active-beat');
 setupBeatLongPress(beatNumber, measureIndex, b);
 group.appendChild(beatNumber);
 const dotsRow = document.createElement('div');
 dotsRow.className = 'beat-dots-row';
 for (let s = 0; s < config.beatSubs[b]; s++) {
   const dotIdx = globalSubBeatIndex;
   const dot = document.createElement('div');
   dot.className = 'dot';
   if (s === 0) dot.classList.add('downbeat');
   const state = config.accents[dotIdx] || 0;
   if (state === 1) dot.classList.add('state-accent');
   if (state === 2) dot.classList.add('state-mute');
   dot.setAttribute('role', 'button');
   dot.setAttribute('tabindex', '0');
   const stateLabel = state === 1 ? 'accento' : state === 2 ? 'muto' : 'normale';
   dot.setAttribute('aria-label', `Suddivisione ${dotIdx + 1}, stato ${stateLabel}`);
   const cycleState = () => {
     config.accents[dotIdx] = (state + 1) % 3;
     renderDots(measureIndex, activeBeat, activeSubBeatInBeat, isCountdownMode, currentRepeat);
     savePersistedData();
   };
   dot.addEventListener('click', cycleState);
   dot.addEventListener('keydown', (e) => {
     if (e.code === 'Enter' || e.code === 'Space') {
       e.preventDefault();
       cycleState();
     }
   });
   if (b === activeBeat && s === activeSubBeatInBeat) dot.classList.add('active');
   dotsRow.appendChild(dot);
   globalSubBeatIndex++;
 }
 group.appendChild(dotsRow);
 dotsContainer.appendChild(group);
}
document.querySelectorAll('.measure-row').forEach((row, idx) => {
row.classList.toggle('current', idx === measureIndex);
});
}
function nextNote() {
const secondsPerQuarter = 60.0 / bpm;
if (inCountdown) {
countdownBeat++;
if (countdownBeat >= COUNTDOWN_TOTAL) {
inCountdown = false;
currentMeasureIndex = 0;
currentBeat = 0;
currentSubBeatInBeat = 0;
measureRepeatCounter = 0;
}
nextNoteTime += secondsPerQuarter;
} else {
const config = measures[currentMeasureIndex];
if (!config) return;
const safeBeatSubs = config.beatSubs || new Array(config.beats || 4).fill(config.sub || 2);
const totalSubsInBeat = safeBeatSubs[currentBeat] || config.sub || 2;
const baseSubDuration = secondsPerQuarter / totalSubsInBeat;
const swingPct = parseInt(swingAmount.value, 10) || 0;
 let subDuration = baseSubDuration;
 if (swingPct > 0 && totalSubsInBeat >= 2) {
   const swingRatio = Math.min(75, swingPct) / 100;
   subDuration = (currentSubBeatInBeat % 2 === 0)
     ? baseSubDuration * (1 + swingRatio)
     : baseSubDuration * (1 - swingRatio);
 }
 nextNoteTime += subDuration;
 currentSubBeatInBeat++;
 if (currentSubBeatInBeat >= totalSubsInBeat) {
   currentSubBeatInBeat = 0;
   currentBeat++;
   if (currentBeat >= config.beats) {
     currentBeat = 0;
     measureRepeatCounter++;
     totalCompletedMeasures++; 
     if (trainerToggle.checked) {
       const barsTarget = parseInt(trainerBarsInc.value, 10) || 4;
       if (totalCompletedMeasures % barsTarget === 0) {
         const bpmInc = parseInt(trainerBpmInc.value, 10) || 2;
         setValidBpm(bpm + bpmInc);
       }
     }
     const maxRepeats = config.repeat || 1;
     const isInfinite = maxRepeats === 'inf';
     if (!isInfinite) {
       const limit = typeof maxRepeats === 'number' ? maxRepeats : parseInt(maxRepeats, 10) || 1;
       if (measureRepeatCounter >= limit) {
         measureRepeatCounter = 0;
         currentMeasureIndex = (currentMeasureIndex + 1) % measures.length;
       }
     }
   }
 }
}
}
function scheduleNote(time) {
const soundType = soundWaveSelect.value;
const isCountdownStep = inCountdown;
const capturedMeasureIndex = currentMeasureIndex;
const capturedBeat = currentBeat;
const capturedSubBeatInBeat = currentSubBeatInBeat;
const capturedRepeat = measureRepeatCounter;
const capturedCountdownBeat = countdownBeat;
const config = measures[capturedMeasureIndex];
if (!config) return;
let globalSubIdx = 0;
const safeBeatSubs = config.beatSubs || new Array(config.beats || 4).fill(config.sub || 2);
for (let b = 0; b < capturedBeat; b++) {
globalSubIdx += safeBeatSubs[b] || config.sub || 2;
}
globalSubIdx += capturedSubBeatInBeat;
const isMainBeat = (capturedSubBeatInBeat === 0);
const state = (!isCountdownStep && config && config.accents) ? (config.accents[globalSubIdx] || 0) : 0;
const isAccented = state === 1;
let isSilentPhase = false;
if (silentModeToggle.checked && !isCountdownStep) {
const audibleBars = Math.max(1, parseInt(silentAudibleBars.value, 10) || 2);
const muteBars = Math.max(1, parseInt(silentMuteBars.value, 10) || 2);
const cycleLen = audibleBars + muteBars;
const phasePos = totalCompletedMeasures % cycleLen;
isSilentPhase = phasePos >= audibleBars;
}
const isMuted = state === 2 || isSilentPhase;
if (!isMuted) {
const osc = audioCtx.createOscillator();
const gainNode = audioCtx.createGain();
gainNode.connect(masterGainNode);
const vol = parseFloat(metroVolInput.value);
 let subVol = isAccented ? 0.95 : (isMainBeat ? 0.75 : 0.45);
 if (isCountdownStep) subVol = 0.8;
 if (isCountdownStep) {
   const isLastCount = capturedCountdownBeat === COUNTDOWN_TOTAL - 1;
   osc.type = 'triangle';
   osc.frequency.setValueAtTime(isLastCount ? 1200 : 900, time);
   gainNode.gain.setValueAtTime(subVol * vol, time);
   gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
   osc.connect(gainNode);
   osc.start(time);
   osc.stop(time + 0.05);
 } else if (soundType === 'woodblock') {
   osc.type = 'sine';
   osc.frequency.setValueAtTime(isMainBeat || isCountdownStep ? 800 : 600, time);
   gainNode.gain.setValueAtTime(subVol * vol, time);
   gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
   osc.connect(gainNode);
   osc.start(time);
   osc.stop(time + 0.03);
 } else if (soundType === 'cowbell') {
   osc.type = 'square';
   osc.frequency.setValueAtTime(isMainBeat || isCountdownStep ? 550 : 420, time);
   gainNode.gain.setValueAtTime(subVol * 0.4 * vol, time);
   gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
   osc.connect(gainNode);
   osc.start(time);
   osc.stop(time + 0.05);
 } else if (soundType === 'rimshot') {
   const noise = audioCtx.createBufferSource();
   noise.buffer = noiseBuffer;
   gainNode.gain.setValueAtTime(subVol * 0.6 * vol, time);
   gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
   noise.connect(gainNode);
   noise.start(time);
 } else {
   osc.type = soundType;
   osc.frequency.setValueAtTime(isMainBeat || isCountdownStep ? 700 : 500, time);
   gainNode.gain.setValueAtTime(subVol * 0.4 * vol, time);
   gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
   osc.connect(gainNode);
   osc.start(time);
   osc.stop(time + 0.035);
 }
}
uiNotes.push({
time: time,
measureIndex: isCountdownStep ? 0 : capturedMeasureIndex,
beat: isCountdownStep ? 0 : capturedBeat,
subBeatInBeat: isCountdownStep ? capturedCountdownBeat : capturedSubBeatInBeat,
isCountdown: isCountdownStep,
repeat: capturedRepeat,
isSilentPhase: isSilentPhase
});
}
function scheduler() {
while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
scheduleNote(nextNoteTime);
nextNote();
}
timerID = setTimeout(scheduler, lookahead);
}
function updateUI() {
if (!isPlaying || !audioCtx) return;
const now = audioCtx.currentTime;
const notesToRender = uiNotes.filter(n => n.time <= now);
if (notesToRender.length > 0) {
const note = notesToRender[notesToRender.length - 1];
renderDots(note.measureIndex, note.beat, note.subBeatInBeat, note.isCountdown, note.repeat);
if (visualizerEl) visualizerEl.classList.toggle('silent-phase', !!note.isSilentPhase);
if (note.isSilentPhase) {
  currentMeasureBadge.innerHTML += ' <span class="silent-badge">🔇 Silenzio</span>';
}
uiNotes = uiNotes.filter(n => n.time > now);
}
}
let wakeLock = null;
async function requestWakeLock() {
try {
if ('wakeLock' in navigator) {
wakeLock = await navigator.wakeLock.request('screen');
wakeLock.addEventListener('release', () => { wakeLock = null; });
}
} catch (e) {
console.warn('Wake Lock non disponibile:', e);
}
}
function releaseWakeLock() {
if (wakeLock) {
wakeLock.release().catch(() => {});
wakeLock = null;
}
}
document.addEventListener('visibilitychange', () => {
if (isPlaying && document.visibilityState === 'visible' && !wakeLock) {
requestWakeLock();
}
});
function togglePlayback() {
initAudioContext();
isPlaying = !isPlaying;
if (isPlaying) {
if (audioCtx.state === 'suspended') audioCtx.resume();
requestWakeLock();
inCountdown = countdownToggle.checked;
countdownBeat = 0;
currentMeasureIndex = 0;
currentBeat = 0;
currentSubBeatInBeat = 0;
measureRepeatCounter = 0;
totalCompletedMeasures = 0;
nextNoteTime = audioCtx.currentTime + 0.05;
uiNotes = [];
playBtn.innerText = 'FERMA';
playBtn.classList.add('playing');
scheduler();
uiTimerID = setInterval(updateUI, 25);
sessionStartTime = Date.now();
sessionMaxBpm = bpm;
} else {
clearTimeout(timerID);
clearInterval(uiTimerID);
uiNotes = [];
playBtn.innerText = 'AVVIA';
playBtn.classList.remove('playing');
renderDots(currentMeasureIndex, -1, -1);
if (visualizerEl) visualizerEl.classList.remove('silent-phase');
releaseWakeLock();
if (sessionStartTime) {
  const elapsedMinutes = (Date.now() - sessionStartTime) / 60000;
  if (elapsedMinutes > 0.05) {
    practiceStats.totalMinutes += elapsedMinutes;
    practiceStats.sessions += 1;
    practiceStats.maxBpm = Math.max(practiceStats.maxBpm, sessionMaxBpm);
    practiceStats.lastSession = Date.now();
    saveStats();
  }
  sessionStartTime = null;
}
}
}
playBtn.addEventListener('click', togglePlayback);
soundWaveSelect.addEventListener('change', savePersistedData);
metroVolInput.addEventListener('change', savePersistedData);
document.addEventListener('click', (e) => {
if (activeSubPopup && !e.target.closest('.beat-sub-popup') && !e.target.closest('.beat-number')) {
closeBeatSubPopup();
}
});
setValidBpm(bpm);
updateMasterKnobUI(masterVolume);
renderMeasuresList();
renderDots(0, -1, -1);
swingValueText.innerText = `${swingAmount.value}%`;
silentConfigRow.style.opacity = silentModeToggle.checked ? "1" : "0.5";
loadPresets();
renderPresetsList();
loadStats();
checkSharedLinkOnLoad();