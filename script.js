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
let activeSubPopupTrigger = null;
let measures = [
    { beats: 4, sub: 2, beatSubs: [2,2,2,2], repeat: 1, accents: [], isCustom: false },
    { beats: 4, sub: 4, beatSubs: [4,4,4,4], repeat: 1, accents: [], isCustom: false }
];
let targetCustomIndex = null;
let targetRepeatIndex = null;

// Nomi delle suddivisioni, condivisi tra il popup dei pallini numerati e quello
// della sezione "Sequenza Battute" cosi' i due controlli restano identici.
const SUB_NAMES = ['', 'Quarti', 'Duine', 'Terzine', 'Quartine', 'Quintine', 'Sestine', 'Settimine'];

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
const soundWaveTrigger = document.getElementById('soundWaveTrigger');
const tapTempoBtn = document.getElementById('tapTempoBtn');
const customModal = document.getElementById('customModal');
const customBeatsInput = document.getElementById('customBeatsInput');
const customSubInput = document.getElementById('customSubInput');
const customModalCancel = document.getElementById('customModalCancel');
const customModalSave = document.getElementById('customModalSave');
const customRepeatModal = document.getElementById('customRepeatModal');
const customRepeatInput = document.getElementById('customRepeatInput');
const customRepeatModalCancel = document.getElementById('customRepeatModalCancel');
const customRepeatModalSave = document.getElementById('customRepeatModalSave');
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
        updateSoundWaveTriggerLabel();

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
        updateSoundWaveTriggerLabel();
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
        
        item.innerHTML = `
            <div class="preset-item-info">
                <div class="preset-item-name">${escapeHtml(p.name)}</div>
                <div class="preset-item-meta">${p.bpm || ''} BPM · ${barsCount} battute${dateStr ? ' · ' + dateStr : ''}</div>
            </div>
            <div class="preset-item-actions">
                <button type="button" class="icon-btn active-action" title="Carica e Avvia Preset" data-action="load">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </button>
                <button type="button" class="icon-btn" title="Elimina Preset" data-action="delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
        `;

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
        
    statsGrid.innerHTML = `
        <div class="stat-box">
            <div class="stat-value">${Math.round(practiceStats.totalMinutes)}</div>
            <div class="stat-label">Minuti Totali</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${practiceStats.sessions}</div>
            <div class="stat-label">Sessioni</div>
        </div>
        <div class="stat-box">
            <div class="stat-value">${practiceStats.maxBpm || '—'}</div>
            <div class="stat-label">BPM Massimo</div>
        </div>
        <div class="stat-box">
            <div class="stat-value" style="font-size: 0.95rem;">${lastSessionText}</div>
            <div class="stat-label">Ultima Sessione</div>
        </div>
    `;
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
    if (val < 40) return "Grave";
    if (val < 60) return "Largo";
    if (val < 66) return "Larghetto";
    if (val < 76) return "Adagio";
    if (val < 108) return "Andante";
    if (val < 120) return "Moderato";
    if (val < 168) return "Allegro";
    if (val < 200) return "Presto";
    return "Prestissimo";
}

// --- CORREZIONE LOGICA MASTER KNOB ---
function updateMasterKnobUI(vol) {
    // Clamp volume between 0 and 1
    masterVolume = Math.min(1, Math.max(0, vol));
    
    // 1. Update Text
    const percentage = Math.round(masterVolume * 100);
    masterValueText.innerText = `${percentage}%`;
    masterKnob.setAttribute('aria-valuenow', percentage);

    // 2. Update Knob Indicator Rotation
    // Range is -135deg to +135deg (Total 270 degrees)
    const angle = -135 + (masterVolume * 270);
    knobIndicator.style.transform = `rotate(${angle}deg)`;

    // 3. Update SVG Ring
    // From CSS: stroke-dasharray of bg-circle is "108.385, 144.513". 
    // This means the visible arc length is approx 108.4 units.
    // The gap is 144.5 units.
    // Total circumference handled by dasharray logic = 108.385 + 144.513 = 252.898
    
    const totalCircumference = 252.9; 
    const arcLength = 108.4; // The visual length of the yellow/grey arc
    
    if (masterVolume <= 0.005) {
        // Hide completely at 0%
        valCircle.style.strokeDasharray = `0, ${totalCircumference}`;
        valCircle.style.opacity = '0';
    } else {
        // Calculate current fill length
        const currentFill = masterVolume * arcLength;
        // The second number ensures the rest of the circle is empty
        valCircle.style.strokeDasharray = `${currentFill}, ${totalCircumference}`;
        valCircle.style.opacity = '1';
    }

    // Update Audio Gain
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
setupDragToAdjust(customRepeatInput);
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

        const presetInfo = getPresetInfo(m);
        const repeatLabel = m.repeat === 'inf' ? 'Loop' : `×${m.repeat}`;

        row.innerHTML = `
            <div class="measure-left">
                <div class="measure-number">${index + 1}</div>
                <div class="subdivision-selector">
                    <div class="subdivision-current" tabindex="0" role="button" aria-haspopup="true" aria-label="Metro: ${presetInfo.label}"
                        onclick="event.stopPropagation(); window.togglePresetPopup(${index}, this)"
                        onkeydown="if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();window.togglePresetPopup(${index}, this)}">${presetInfo.label}</div>
                </div>
                ${m.isCustom ? `
                    <button type="button" class="icon-btn edit-btn" onclick="openCustomModal(${index})" title="Modifica Metro Custom">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </button>
                ` : ''}
                <div class="subdivision-selector">
                    <div class="subdivision-current" tabindex="0" role="button" aria-haspopup="true" aria-label="Suddivisione: ${SUB_NAMES[m.sub] || 'Duine'}"
                        onclick="event.stopPropagation(); window.toggleMeasureSubPopup(${index}, this)"
                        onkeydown="if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();window.toggleMeasureSubPopup(${index}, this)}">${SUB_NAMES[m.sub] || 'Duine'}</div>
                </div>
                <div class="subdivision-selector">
                    <div class="subdivision-current" tabindex="0" role="button" aria-haspopup="true" aria-label="Ripetizioni: ${repeatLabel}"
                        onclick="event.stopPropagation(); window.toggleRepeatPopup(${index}, this)"
                        onkeydown="if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();window.toggleRepeatPopup(${index}, this)}">${repeatLabel}</div>
                </div>
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
            if (measures[index].beats === 2) { measures[index].isCustom = false; }
            else if (measures[index].beats === 3) { measures[index].isCustom = true; }
            else if (measures[index].beats === 4) { measures[index].isCustom = false; }
        } else if (subVal === 2) {
            if (measures[index].beats === 2) { measures[index].isCustom = false; }
            else if (measures[index].beats === 4) { measures[index].isCustom = false; }
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
    // "Reset Default" riporta la sequenza, il BPM e lo Swing/Shuffle ai
    // valori di fabbrica.
    measures = [
        { beats: 4, sub: 2, beatSubs: [2,2,2,2], repeat: 1, accents: [], isCustom: false },
        { beats: 4, sub: 4, beatSubs: [4,4,4,4], repeat: 1, accents: [], isCustom: false }
    ];
    currentMeasureIndex = 0;
    measureRepeatCounter = 0;
    setValidBpm(120);

    swingAmount.value = 0;
    swingValueText.innerText = `${swingAmount.value}%`;

    renderMeasuresList();
    renderDots(0, -1, -1);
    savePersistedData();
});

function closeBeatSubPopup() {
    if (activeSubPopup) {
        activeSubPopup.remove();
        activeSubPopup = null;
        activeSubPopupTrigger = null;
        window.removeEventListener('scroll', repositionActiveSubPopup, true);
        window.removeEventListener('resize', repositionActiveSubPopup);
    }
}

// Posiziona un popup (gia' agganciato a document.body, quindi immune al
// clipping causato da contenitori con overflow scrollabile come .beat-dots)
// vicino al triggerElem, scegliendo sopra o sotto in base allo spazio
// disponibile nel viewport e restando sempre entro i bordi dello schermo.
function positionFixedPopup(popup, triggerElem, preferredDirection) {
    const triggerRect = triggerElem.getBoundingClientRect();
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Misura le dimensioni reali del popup (temporaneamente visibile ma
    // invisibile all'occhio) prima di calcolarne la posizione definitiva.
    popup.style.visibility = 'hidden';
    popup.style.display = 'flex';
    const popupRect = popup.getBoundingClientRect();
    const popupWidth = popupRect.width;
    const popupHeight = popupRect.height;

    const spaceAbove = triggerRect.top;
    const spaceBelow = vh - triggerRect.bottom;

    let openUp = preferredDirection === 'up';
    if (openUp && spaceAbove < popupHeight + margin && spaceBelow > spaceAbove) {
        openUp = false;
    } else if (!openUp && spaceBelow < popupHeight + margin && spaceAbove > spaceBelow) {
        openUp = true;
    }

    let top = openUp
        ? triggerRect.top - popupHeight - margin
        : triggerRect.bottom + margin;
    top = Math.max(margin, Math.min(top, vh - popupHeight - margin));

    let left = triggerRect.left + (triggerRect.width / 2) - (popupWidth / 2);
    left = Math.max(margin, Math.min(left, vw - popupWidth - margin));

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;

    // La freccetta del popup punta sempre al centro del trigger, anche se
    // il popup e' stato spostato lateralmente per restare nel viewport.
    const arrowLeft = (triggerRect.left + triggerRect.width / 2) - left;
    popup.style.setProperty('--arrow-left', `${Math.max(10, Math.min(arrowLeft, popupWidth - 10))}px`);
    popup.dataset.dir = openUp ? 'up' : 'down';

    popup.style.visibility = '';
    popup.style.display = '';
}

function repositionActiveSubPopup() {
    if (activeSubPopup && activeSubPopupTrigger) {
        const dir = activeSubPopup.dataset.dir === 'up' ? 'up' : 'down';
        positionFixedPopup(activeSubPopup, activeSubPopupTrigger, dir);
    }
}

function showBeatSubPopup(beatNumberElem, measureIndex, beatIndex) {
    closeBeatSubPopup();
    const popup = document.createElement('div');
    popup.className = 'beat-sub-popup';
    
    const m = measures[measureIndex];
    const currentSub = m.beatSubs[beatIndex];
    
    for (let i = 1; i <= 7; i++) {
        const opt = document.createElement('div');
        opt.className = 'sub-popup-option' + (i === currentSub ? ' selected' : '');
        opt.textContent = SUB_NAMES[i];
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            updateBeatSubdivision(measureIndex, beatIndex, i);
            renderDots(measureIndex, -1, -1);
            closeBeatSubPopup();
        });
        popup.appendChild(opt);
    }
    
    document.body.appendChild(popup);
    activeSubPopup = popup;
    activeSubPopupTrigger = beatNumberElem;
    positionFixedPopup(popup, beatNumberElem, 'up');
    window.addEventListener('scroll', repositionActiveSubPopup, true);
    window.addEventListener('resize', repositionActiveSubPopup);

    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
}

// Meccanismo generico usato da TUTTI i menu a tendina dell'app (Suddivisione,
// Metro, Ripetizioni, Suono Suddivisioni): un menu a comparsa personalizzato
// identico nello stile a quello dei pallini numerati, al posto del <select>
// nativo. optionsList è un array di {value, label}; onPick(value) viene
// chiamata alla scelta di un'opzione.
function showSubdivisionStylePopup(triggerElem, optionsList, selectedValue, onPick) {
    closeBeatSubPopup();

    const popup = document.createElement('div');
    popup.className = 'subdivision-popup';

    optionsList.forEach(opt => {
        const el = document.createElement('div');
        el.className = 'sub-popup-option' + (opt.value === selectedValue ? ' selected' : '');
        el.textContent = opt.label;
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            closeBeatSubPopup();
            onPick(opt.value);
        });
        popup.appendChild(el);
    });

    document.body.appendChild(popup);
    activeSubPopup = popup;
    activeSubPopupTrigger = triggerElem;
    positionFixedPopup(popup, triggerElem, 'down');
    window.addEventListener('scroll', repositionActiveSubPopup, true);
    window.addEventListener('resize', repositionActiveSubPopup);

    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
}

function toggleSubdivisionStylePopup(triggerElem, optionsList, selectedValue, onPick) {
    const wasOpenForThis = activeSubPopup && activeSubPopupTrigger === triggerElem;
    closeBeatSubPopup();
    if (!wasOpenForThis) {
        showSubdivisionStylePopup(triggerElem, optionsList, selectedValue, onPick);
    }
}

window.toggleMeasureSubPopup = function(index, triggerElem) {
    const m = measures[index];
    const options = [];
    for (let i = 1; i <= 6; i++) options.push({ value: String(i), label: SUB_NAMES[i] });
    toggleSubdivisionStylePopup(triggerElem, options, String(m.sub), (value) => {
        updateMeasure(index, 'sub', value);
    });
};

// Ricava valore/etichetta del Metro corrente di una battuta, con la stessa
// logica usata in precedenza dagli <option selected> del <select> nativo.
function getPresetInfo(m) {
    if (!m.isCustom) {
        if (m.beats === 4 && m.sub !== 3) return { value: '4/4', label: '4/4' };
        if (m.beats === 2 && m.sub !== 3) return { value: '2/4', label: '2/4' };
        if (m.beats === 3 && m.sub !== 3) return { value: '3/4', label: '3/4' };
        if (m.beats === 2 && m.sub === 3) return { value: '6/8', label: '6/8' };
        if (m.beats === 7 && m.sub === 2) return { value: '7/8', label: '7/8' };
        if (m.beats === 4 && m.sub === 3) return { value: '12/8', label: '12/8' };
    }
    return { value: 'custom', label: m.isCustom ? `${m.beats}/${m.sub}` : 'Custom...' };
}

window.togglePresetPopup = function(index, triggerElem) {
    const m = measures[index];
    const current = getPresetInfo(m);
    const options = [
        { value: '4/4', label: '4/4' },
        { value: '2/4', label: '2/4' },
        { value: '3/4', label: '3/4' },
        { value: '6/8', label: '6/8' },
        { value: '7/8', label: '7/8' },
        { value: '12/8', label: '12/8' },
        { value: 'custom', label: current.value === 'custom' ? current.label : 'Custom...' }
    ];
    toggleSubdivisionStylePopup(triggerElem, options, current.value, (value) => {
        if (value === 'custom') {
            openCustomModal(index);
        } else {
            updateMeasure(index, 'preset', value);
        }
    });
};

window.toggleRepeatPopup = function(index, triggerElem) {
    const m = measures[index];
    const isCustomValue = typeof m.repeat === 'number' && m.repeat > 5;

    const options = [1,2,3,4,5].map(r => ({ value: String(r), label: `×${r}` }));
    options.push({ value: 'custom', label: isCustomValue ? `×${m.repeat}` : 'Custom...' });
    options.push({ value: 'inf', label: 'Loop' });

    const currentValue = isCustomValue ? 'custom' : String(m.repeat);

    toggleSubdivisionStylePopup(triggerElem, options, currentValue, (value) => {
        if (value === 'custom') {
            openCustomRepeatModal(index);
        } else {
            updateMeasure(index, 'repeat', value);
        }
    });
};

function openCustomRepeatModal(index) {
    targetRepeatIndex = index;
    const m = measures[index];
    customRepeatInput.value = (typeof m.repeat === 'number' && m.repeat > 5) ? m.repeat : 12;
    customRepeatModal.classList.add('active');
    setTimeout(() => {
        customRepeatInput.focus();
        customRepeatInput.select();
    }, 100);
}

function closeCustomRepeatModal() {
    customRepeatModal.classList.remove('active');
    targetRepeatIndex = null;
}

customRepeatModalCancel.addEventListener('click', () => {
    closeCustomRepeatModal();
    renderMeasuresList();
});

customRepeatModalSave.addEventListener('click', () => {
    if (targetRepeatIndex !== null) {
        const r = parseInt(customRepeatInput.value, 10);
        if (!isNaN(r) && r >= 1 && r <= 999) {
            updateMeasure(targetRepeatIndex, 'repeat', String(r));
        }
    }
    closeCustomRepeatModal();
    renderMeasuresList();
});

// Il <select id="soundWaveSelect"> nativo resta nel DOM (nascosto) come unica
// fonte di verità per il valore scelto, così tutto il codice di salvataggio/
// export/import continua a funzionare invariato; il trigger sostituisce solo
// la parte visiva con lo stesso stile a comparsa dei pallini numerati.
function getSoundWaveOptions() {
    return Array.from(soundWaveSelect.options).map(o => ({ value: o.value, label: o.textContent }));
}

function updateSoundWaveTriggerLabel() {
    const opt = Array.from(soundWaveSelect.options).find(o => o.value === soundWaveSelect.value);
    if (soundWaveTrigger) soundWaveTrigger.textContent = opt ? opt.textContent : '';
}

function toggleSoundWavePopup(triggerElem) {
    toggleSubdivisionStylePopup(triggerElem, getSoundWaveOptions(), soundWaveSelect.value, (value) => {
        soundWaveSelect.value = value;
        updateSoundWaveTriggerLabel();
        soundWaveSelect.dispatchEvent(new Event('change'));
    });
}

if (soundWaveTrigger) {
    soundWaveTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSoundWavePopup(soundWaveTrigger);
    });
    soundWaveTrigger.addEventListener('keydown', (e) => {
        if (e.code === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            e.stopPropagation();
            toggleSoundWavePopup(soundWaveTrigger);
        }
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

// Stato della struttura DOM correntemente costruita nel visualizzatore.
// Evita di distruggere e ricreare tutti i pallini ad ogni tick (che causava
// micro-scatti di layout e "tap persi" sul pulsante AVVIA/FERMA durante la
// riproduzione): il DOM viene ricostruito solo quando cambia davvero la
// struttura della battuta (o la battuta stessa); altrimenti si aggiornano
// solo le classi CSS sugli elementi già esistenti.
let dotsRenderState = null;

function applyDotAccentClass(dot, state) {
    dot.classList.remove('state-accent', 'state-mute');
    if (state === 1) dot.classList.add('state-accent');
    if (state === 2) dot.classList.add('state-mute');
    const beatNum = parseInt(dot.dataset.beat, 10) + 1;
    const subNum = parseInt(dot.dataset.sub, 10) + 1;
    const stateLabel = state === 1 ? 'accento' : state === 2 ? 'muto' : 'normale';
    dot.setAttribute('aria-label', `Battuta ${beatNum}, suddivisione ${subNum}, stato ${stateLabel}`);
}

function buildMeasureDots(measureIndex, config, key) {
    dotsContainer.innerHTML = '';
    const dotEls = [];
    const beatNumEls = [];
    let globalSubBeatIndex = 0;

    for (let b = 0; b < config.beats; b++) {
        const group = document.createElement('div');
        group.className = 'beat-group';

        const beatNumber = document.createElement('div');
        beatNumber.className = 'beat-number';
        beatNumber.textContent = b + 1;
        setupBeatLongPress(beatNumber, measureIndex, b);
        group.appendChild(beatNumber);
        beatNumEls.push(beatNumber);

        const dotsRow = document.createElement('div');
        dotsRow.className = 'beat-dots-row';

        for (let s = 0; s < config.beatSubs[b]; s++) {
            const dotIdx = globalSubBeatIndex;
            const dot = document.createElement('div');
            dot.className = 'dot';
            if (s === 0) dot.classList.add('downbeat');
            dot.dataset.beat = String(b);
            dot.dataset.sub = String(s);

            dot.setAttribute('role', 'button');
            dot.setAttribute('tabindex', '0');

            const cycleState = () => {
                const st = config.accents[dotIdx] || 0;
                config.accents[dotIdx] = (st + 1) % 3;
                applyDotAccentClass(dot, config.accents[dotIdx]);
                savePersistedData();
            };

            dot.addEventListener('click', cycleState);
            dot.addEventListener('keydown', (e) => {
                if (e.code === 'Enter' || e.code === 'Space') {
                    e.preventDefault();
                    cycleState();
                }
            });

            applyDotAccentClass(dot, config.accents[dotIdx] || 0);

            dotsRow.appendChild(dot);
            dotEls.push(dot);
            globalSubBeatIndex++;
        }
        group.appendChild(dotsRow);
        dotsContainer.appendChild(group);
    }

    dotsRenderState = { mode: 'measure', key, dotEls, beatNumEls };

    document.querySelectorAll('.measure-row').forEach((row, idx) => {
        row.classList.toggle('current', idx === measureIndex);
    });
}

function renderCountdownDots(activeSubBeatInBeat) {
    const remainingBeats = COUNTDOWN_TOTAL - activeSubBeatInBeat;
    currentMeasureBadge.innerText = `PRONTI... ${remainingBeats}`;
    movementDisplay.innerHTML = `COUNTDOWN: <span class="highlight">${activeSubBeatInBeat + 1}</span> DI ${COUNTDOWN_TOTAL}`;

    if (!dotsRenderState || dotsRenderState.mode !== 'countdown') {
        dotsContainer.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'countdown-wrapper';
        const dotEls = [];
        for (let i = 0; i < COUNTDOWN_TOTAL; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot downbeat';
            wrapper.appendChild(dot);
            dotEls.push(dot);
        }
        dotsContainer.appendChild(wrapper);
        dotsRenderState = { mode: 'countdown', key: 'countdown', dotEls, beatNumEls: [] };
    }

    dotsRenderState.dotEls.forEach((dot, i) => {
        dot.classList.toggle('active', i === activeSubBeatInBeat);
    });
}

function renderDots(measureIndex, activeBeat, activeSubBeatInBeat, isCountdownMode = false, currentRepeat = -1) {
    if (isCountdownMode) {
        renderCountdownDots(activeSubBeatInBeat);
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

    const key = 'm' + measureIndex + ':' + config.beatSubs.join(',');
    if (!dotsRenderState || dotsRenderState.mode !== 'measure' || dotsRenderState.key !== key) {
        buildMeasureDots(measureIndex, config, key);
    }

    dotsRenderState.beatNumEls.forEach((el, b) => {
        el.classList.toggle('active-beat', b === activeBeat);
    });
    dotsRenderState.dotEls.forEach((dot, idx) => {
        applyDotAccentClass(dot, config.accents[idx] || 0);
        const isActive = (parseInt(dot.dataset.beat, 10) === activeBeat && parseInt(dot.dataset.sub, 10) === activeSubBeatInBeat);
        dot.classList.toggle('active', isActive);
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
            currentMeasureBadge.innerHTML += ` <span class="silent-badge">🔇 Silenzio</span>`;
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
    if (typeof activeMode !== 'undefined' && activeMode === 'poliritmia') {
        togglePoliPlayback();
        return;
    }
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
    if (activeSubPopup &&
        !e.target.closest('.beat-sub-popup') && !e.target.closest('.beat-number') &&
        !e.target.closest('.subdivision-popup') && !e.target.closest('.subdivision-current')) {
        closeBeatSubPopup();
    }
});

setValidBpm(bpm);
updateMasterKnobUI(masterVolume);
updateSoundWaveTriggerLabel();
renderMeasuresList();
renderDots(0, -1, -1);
swingValueText.innerText = `${swingAmount.value}%`;
silentConfigRow.style.opacity = silentModeToggle.checked ? "1" : "0.5";
loadPresets();
renderPresetsList();
loadStats();
checkSharedLinkOnLoad();
/* =========================================================
   POLIRITMIA
   Modulo indipendente: riusa audioCtx/masterGainNode del
   metronomo principale ma ha un proprio scheduler, dato che
   ogni livello ha una propria suddivisione all'interno dello
   stesso ciclo condiviso (stesso BPM, stessa durata di ciclo).
   ========================================================= */

let activeMode = 'metronomo';

const POLI_COLORS = ['#facc15', '#fb923c', '#38bdf8', '#4ade80', '#f472b6', '#a78bfa'];

let poliLayers = [];
let poliViewMode = 'linear';
let isPoliPlaying = false;
let poliTimerID = null;
let poliUiTimerID = null;
let poliUiEvents = [];
let poliNextTimes = [];
let poliCycleStartTime = 0;
let poliCycleDuration = 2.0;
let poliRafID = null;

const tabMetronomoBtn = document.getElementById('tabMetronomo');
const tabPoliritmiaBtn = document.getElementById('tabPoliritmia');
const viewMetronomoEl = document.getElementById('viewMetronomo');
const viewPoliritmiaEl = document.getElementById('viewPoliritmia');
const poliCycleBeatsInput = document.getElementById('poliCycleBeats');
const poliRowsContainer = document.getElementById('poliRowsContainer');
const poliLayersContainer = document.getElementById('poliLayersContainer');
const poliAddLayerBtn = document.getElementById('poliAddLayerBtn');
const poliPlayhead = document.getElementById('poliPlayhead');
const poliLinearView = document.getElementById('poliLinearView');
const poliRadialView = document.getElementById('poliRadialView');
const poliViewLinearBtn = document.getElementById('poliViewLinearBtn');
const poliViewRadialBtn = document.getElementById('poliViewRadialBtn');
const poliRadialSvg = document.getElementById('poliRadialSvg');
const poliNeedle = document.getElementById('poliNeedle');
const poliLayerModal = document.getElementById('poliLayerModal');
const poliLayerBeatsInput = document.getElementById('poliLayerBeatsInput');
const poliLayerModalCancel = document.getElementById('poliLayerModalCancel');
const poliLayerModalSave = document.getElementById('poliLayerModalSave');

function loadPoliData() {
    try {
        const savedLayers = localStorage.getItem('metronome_poli_layers_v1');
        if (savedLayers) {
            const parsed = JSON.parse(savedLayers);
            if (Array.isArray(parsed) && parsed.length > 0) poliLayers = parsed;
        }
        if (poliLayers.length === 0) {
            poliLayers = [
                { beats: 3, muted: false },
                { beats: 4, muted: false },
                { beats: 5, muted: false }
            ];
        }
        const savedCycle = localStorage.getItem('metronome_poli_cyclebeats_v1');
        if (savedCycle) poliCycleBeatsInput.value = savedCycle;
        const savedView = localStorage.getItem('metronome_poli_viewmode_v1');
        if (savedView === 'radial' || savedView === 'linear') poliViewMode = savedView;
    } catch (e) {
        console.error('Errore nel caricamento dati Poliritmia', e);
        poliLayers = [{ beats: 3, muted: false }, { beats: 4, muted: false }, { beats: 5, muted: false }];
    }
}

function savePoliData() {
    try {
        localStorage.setItem('metronome_poli_layers_v1', JSON.stringify(poliLayers));
        localStorage.setItem('metronome_poli_cyclebeats_v1', poliCycleBeatsInput.value);
        localStorage.setItem('metronome_poli_viewmode_v1', poliViewMode);
    } catch (e) {
        console.error('Errore nel salvataggio dati Poliritmia', e);
    }
}

function getPoliCycleDuration() {
    const cycleBeats = Math.max(1, parseInt(poliCycleBeatsInput.value, 10) || 4);
    return (60 / bpm) * cycleBeats;
}

function renderPoliLayersList() {
    poliLayersContainer.innerHTML = '';
    if (poliLayers.length === 0) {
        poliLayersContainer.innerHTML = '<div class="presets-empty">Nessun livello. Aggiungine uno per iniziare.</div>';
        return;
    }
    poliLayers.forEach((layer, index) => {
        const color = POLI_COLORS[index % POLI_COLORS.length];
        const row = document.createElement('div');
        row.className = 'poli-layer-row';
        row.innerHTML = `
            <span class="poli-layer-color" style="background:${color};"></span>
            <span class="poli-layer-label">Livello ${index + 1} · ${layer.beats} suddivisioni</span>
            <div class="poli-layer-actions">
                <button type="button" class="icon-btn ${layer.muted ? 'muted' : ''}" data-action="mute" data-index="${index}" title="Muto" aria-label="Muto">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>${layer.muted ? '<line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>' : '<path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>'}</svg>
                </button>
                <button type="button" class="icon-btn" data-action="delete" data-index="${index}" title="Elimina" aria-label="Elimina">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </div>
        `;
        poliLayersContainer.appendChild(row);
    });
}

function renderPoliRows() {
    poliRowsContainer.innerHTML = '';
    poliLayers.forEach((layer, index) => {
        const color = POLI_COLORS[index % POLI_COLORS.length];
        const row = document.createElement('div');
        row.className = 'poli-row';
        const dotsHtml = Array.from({ length: layer.beats }).map((_, i) => `
            <div class="poli-dot-col">
                <span class="poli-dot" data-layer="${index}" data-dot="${i}" style="background:${layer.muted ? '#3f3f46' : color}; color:${color};"></span>
                <span class="poli-dot-num">${i + 1}</span>
            </div>
        `).join('');
        row.innerHTML = `
            <span class="poli-row-label" style="color:${layer.muted ? 'var(--text-muted)' : color};">${layer.beats} suddiv.</span>
            <div class="poli-row-dots">${dotsHtml}</div>
        `;
        poliRowsContainer.appendChild(row);
    });
}

function renderPoliRadial() {
    while (poliRadialSvg.firstChild && poliRadialSvg.firstChild.id !== 'poliNeedle') {
        poliRadialSvg.removeChild(poliRadialSvg.firstChild);
    }
    const baseRadius = 40;
    const step = poliLayers.length > 0 ? (130 - baseRadius) / poliLayers.length : 0;
    poliLayers.forEach((layer, index) => {
        const r = baseRadius + step * (index + 1);
        const color = layer.muted ? '#3f3f46' : POLI_COLORS[index % POLI_COLORS.length];
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', 150); ring.setAttribute('cy', 150); ring.setAttribute('r', r);
        ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', '#1c1c22'); ring.setAttribute('stroke-width', 1);
        poliRadialSvg.insertBefore(ring, poliNeedle);
        for (let i = 0; i < layer.beats; i++) {
            const a = (i / layer.beats) * 2 * Math.PI - Math.PI / 2;
            const cx = 150 + r * Math.cos(a);
            const cy = 150 + r * Math.sin(a);
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('r', 6);
            dot.setAttribute('fill', color);
            dot.setAttribute('data-layer', index); dot.setAttribute('data-dot', i);
            dot.setAttribute('class', 'poli-radial-dot');
            poliRadialSvg.insertBefore(dot, poliNeedle);
            const textR = r + 13;
            const tx = 150 + textR * Math.cos(a);
            const ty = 150 + textR * Math.sin(a);
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', tx); label.setAttribute('y', ty);
            label.setAttribute('text-anchor', 'middle'); label.setAttribute('dominant-baseline', 'middle');
            label.setAttribute('font-size', '10'); label.setAttribute('font-weight', '800');
            label.setAttribute('fill', color);
            label.textContent = i + 1;
            poliRadialSvg.insertBefore(label, poliNeedle);
        }
    });
    poliNeedle.setAttribute('y2', 150 - (baseRadius + step * poliLayers.length + 15));
}

function renderPoliAll() {
    renderPoliLayersList();
    renderPoliRows();
    renderPoliRadial();
}

function setPoliViewMode(mode) {
    poliViewMode = mode;
    poliLinearView.style.display = mode === 'linear' ? 'block' : 'none';
    poliRadialView.style.display = mode === 'radial' ? 'flex' : 'none';
    poliViewLinearBtn.classList.toggle('active', mode === 'linear');
    poliViewRadialBtn.classList.toggle('active', mode === 'radial');
    savePoliData();
}

poliViewLinearBtn.addEventListener('click', () => setPoliViewMode('linear'));
poliViewRadialBtn.addEventListener('click', () => setPoliViewMode('radial'));

poliLayersContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const index = parseInt(btn.getAttribute('data-index'), 10);
    const action = btn.getAttribute('data-action');
    if (action === 'mute') {
        poliLayers[index].muted = !poliLayers[index].muted;
    } else if (action === 'delete') {
        poliLayers.splice(index, 1);
    }
    savePoliData();
    renderPoliAll();
});

poliAddLayerBtn.addEventListener('click', () => {
    poliLayerBeatsInput.value = 4;
    poliLayerModal.classList.add('active');
});

poliLayerModalCancel.addEventListener('click', () => poliLayerModal.classList.remove('active'));

poliLayerModalSave.addEventListener('click', () => {
    const beats = Math.min(32, Math.max(1, parseInt(poliLayerBeatsInput.value, 10) || 4));
    poliLayers.push({ beats: beats, muted: false });
    poliLayerModal.classList.remove('active');
    savePoliData();
    renderPoliAll();
});

poliCycleBeatsInput.addEventListener('change', () => {
    poliCycleBeatsInput.value = Math.min(16, Math.max(1, parseInt(poliCycleBeatsInput.value, 10) || 4));
    savePoliData();
});

function playPoliClick(time, layerIndex) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.connect(masterGainNode);
    const vol = parseFloat(metroVolInput.value);
    const freq = 500 + layerIndex * 140;
    const waveTypes = ['sine', 'triangle', 'square', 'sawtooth'];
    osc.type = waveTypes[layerIndex % waveTypes.length];
    osc.frequency.setValueAtTime(freq, time);
    gainNode.gain.setValueAtTime(0.55 * vol, time);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
    osc.connect(gainNode);
    osc.start(time);
    osc.stop(time + 0.06);
}

function poliScheduler() {
    while (poliNextTimes.some((t, i) => t < audioCtx.currentTime + scheduleAheadTime)) {
        let scheduledAny = false;
        poliLayers.forEach((layer, i) => {
            if (poliNextTimes[i] === undefined) return;
            if (poliNextTimes[i] < audioCtx.currentTime + scheduleAheadTime) {
                const dotIndex = Math.round(((poliNextTimes[i] - poliCycleStartTime) / poliCycleDuration) * layer.beats) % layer.beats;
                if (!layer.muted) playPoliClick(poliNextTimes[i], i);
                poliUiEvents.push({ time: poliNextTimes[i], layerIndex: i, dotIndex: dotIndex });
                poliNextTimes[i] += poliCycleDuration / layer.beats;
                scheduledAny = true;
            }
        });
        if (!scheduledAny) break;
    }
    poliTimerID = setTimeout(poliScheduler, lookahead);
}

function updatePoliUI() {
    if (!isPoliPlaying || !audioCtx) return;
    const now = audioCtx.currentTime;
    const dueEvents = poliUiEvents.filter(ev => ev.time <= now);
    dueEvents.forEach(ev => {
        const linearDot = poliRowsContainer.querySelector(`.poli-dot[data-layer="${ev.layerIndex}"][data-dot="${ev.dotIndex}"]`);
        const radialDot = poliRadialSvg.querySelector(`.poli-radial-dot[data-layer="${ev.layerIndex}"][data-dot="${ev.dotIndex}"]`);
        [linearDot, radialDot].forEach(el => {
            if (!el) return;
            el.classList.add('on');
            setTimeout(() => el.classList.remove('on'), 110);
        });
    });
    poliUiEvents = poliUiEvents.filter(ev => ev.time > now);
}

function poliAnimationLoop() {
    if (!isPoliPlaying || !audioCtx) return;
    const elapsed = (audioCtx.currentTime - poliCycleStartTime) % poliCycleDuration;
    const progress = elapsed / poliCycleDuration;
    poliPlayhead.style.left = (progress * poliLinearView.clientWidth) + 'px';
    poliNeedle.setAttribute('transform', `rotate(${progress * 360} 150 150)`);
    poliRafID = requestAnimationFrame(poliAnimationLoop);
}

function togglePoliPlayback() {
    initAudioContext();
    isPoliPlaying = !isPoliPlaying;

    if (isPoliPlaying) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        requestWakeLock();
        poliCycleDuration = getPoliCycleDuration();
        poliCycleStartTime = audioCtx.currentTime + 0.05;
        poliNextTimes = poliLayers.map(() => poliCycleStartTime);
        poliUiEvents = [];
        playBtn.innerText = 'FERMA';
        playBtn.classList.add('playing');
        poliPlayhead.classList.add('visible');
        poliScheduler();
        poliUiTimerID = setInterval(updatePoliUI, 25);
        poliRafID = requestAnimationFrame(poliAnimationLoop);
    } else {
        clearTimeout(poliTimerID);
        clearInterval(poliUiTimerID);
        cancelAnimationFrame(poliRafID);
        poliUiEvents = [];
        playBtn.innerText = 'AVVIA';
        playBtn.classList.remove('playing');
        poliPlayhead.classList.remove('visible');
        poliPlayhead.style.left = '0px';
        releaseWakeLock();
    }
}

function setActiveMode(mode) {
    if (isPlaying) togglePlayback();
    if (isPoliPlaying) togglePoliPlayback();
    activeMode = mode;
    viewMetronomoEl.style.display = mode === 'metronomo' ? 'flex' : 'none';
    viewPoliritmiaEl.style.display = mode === 'poliritmia' ? 'flex' : 'none';
    tabMetronomoBtn.classList.toggle('active', mode === 'metronomo');
    tabPoliritmiaBtn.classList.toggle('active', mode === 'poliritmia');
    tabMetronomoBtn.setAttribute('aria-selected', mode === 'metronomo' ? 'true' : 'false');
    tabPoliritmiaBtn.setAttribute('aria-selected', mode === 'poliritmia' ? 'true' : 'false');
}

tabMetronomoBtn.addEventListener('click', () => setActiveMode('metronomo'));
tabPoliritmiaBtn.addEventListener('click', () => setActiveMode('poliritmia'));

loadPoliData();
renderPoliAll();
setPoliViewMode(poliViewMode);
