// Web Audio & Metronome Core Engine
class RhythmEngine {
    constructor() {
        this.audioCtx = null;
        this.isPlaying = false;
        this.bpm = 120;
        this.beatsPerMeasure = 4;
        
        // Array holding subdivision count for each beat in the measure (default 1 = quarter)
        this.subdivisions = [1, 1, 1, 1]; 
        
        // Sound voice
        this.soundType = 'digital';
        this.volume = 0.8;

        // Scheduler timing variables
        this.currentBeat = 0;
        this.currentSubIndex = 0;
        this.nextNoteTime = 0.0;
        this.timerID = null;
        this.lookahead = 25.0; // ms
        this.scheduleAheadTime = 0.1; // s

        // Callback for UI updates
        this.onTick = null;
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    setBpm(newBpm) {
        this.bpm = Math.max(30, Math.min(300, newBpm));
    }

    setBeatsPerMeasure(count) {
        this.beatsPerMeasure = count;
        // Resize subdivisions array while preserving existing values
        while (this.subdivisions.length < count) {
            this.subdivisions.push(1);
        }
        if (this.subdivisions.length > count) {
            this.subdivisions = this.subdivisions.slice(0, count);
        }
    }

    setSubdivision(beatIndex, count) {
        if (beatIndex >= 0 && beatIndex < this.subdivisions.length) {
            this.subdivisions[beatIndex] = count;
        }
    }

    start() {
        this.initAudio();
        if (this.isPlaying) return;

        this.isPlaying = true;
        this.currentBeat = 0;
        this.currentSubIndex = 0;
        this.nextNoteTime = this.audioCtx.currentTime + 0.05;

        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    }

    scheduler() {
        while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentBeat, this.currentSubIndex, this.nextNoteTime);
            this.advanceNote();
        }
        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.scheduler(), this.lookahead);
        }
    }

    advanceNote() {
        const currentSubCount = this.subdivisions[this.currentBeat] || 1;
        const secondsPerQuarter = 60.0 / this.bpm;
        const secondsPerSub = secondsPerQuarter / currentSubCount;

        this.nextNoteTime += secondsPerSub;

        this.currentSubIndex++;
        if (this.currentSubIndex >= currentSubCount) {
            this.currentSubIndex = 0;
            this.currentBeat = (this.currentBeat + 1) % this.beatsPerMeasure;
        }
    }

    scheduleNote(beat, subIndex, time) {
        // Trigger audio synthesis
        this.playClick(beat, subIndex, time);

        // Notify UI via callback
        if (this.onTick) {
            const timeUntilNote = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
            setTimeout(() => {
                if (this.isPlaying) {
                    this.onTick(beat, subIndex);
                }
            }, timeUntilNote);
        }
    }

    playClick(beat, subIndex, time) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        const isAccent = (beat === 0 && subIndex === 0);
        const isMainBeat = (subIndex === 0);

        let freq = 800;
        if (isAccent) {
            freq = 1400;
        } else if (isMainBeat) {
            freq = 1000;
        } else {
            freq = 600; // Subdivisions
        }

        if (this.soundType === 'woodblock') {
            osc.type = 'triangle';
            freq = isAccent ? 1200 : (isMainBeat ? 850 : 550);
        } else if (this.soundType === 'cowbell') {
            osc.type = 'square';
            freq = isAccent ? 900 : (isMainBeat ? 650 : 450);
        } else {
            osc.type = 'sine'; // Digital default
        }

        osc.frequency.setValueAtTime(freq, time);

        // Gain envelope for clean click without clipping
        const vol = this.volume * (isAccent ? 1.0 : (isMainBeat ? 0.8 : 0.5));
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(time);
        osc.stop(time + 0.05);
    }
}

// SVG Icons Generator for Musical Notation View
const SVG_NOTES = {
    1: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
    2: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`,
    3: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h-6z"/><text x="16" y="10" font-size="9" font-weight="bold" fill="currentColor">3</text></svg>`,
    4: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h-6z"/><path d="M14 7h4v2h-4z"/></svg>`,
    5: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h-6z"/><text x="16" y="10" font-size="9" font-weight="bold" fill="currentColor">5</text></svg>`,
    6: `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V3h-6z"/><text x="16" y="10" font-size="9" font-weight="bold" fill="currentColor">6</text></svg>`
};

// Application Controller & UI Binder
document.addEventListener('DOMContentLoaded', () => {
    const engine = new RhythmEngine();
    let currentView = 'dots'; // 'dots' or 'notation'
    let activeBeatTriggerBtn = null;
    let targetBeatForPopup = null;

    // DOM Elements
    const playBtn = document.getElementById('playBtn');
    const playText = playBtn.querySelector('.play-text');
    const playIcon = playBtn.querySelector('.play-icon');
    const bpmInput = document.getElementById('bpmInput');
    const bpmSlider = document.getElementById('bpmSlider');
    const tempoMinus = document.getElementById('tempoMinus');
    const tempoPlus = document.getElementById('tempoPlus');
    const tapTempoBtn = document.getElementById('tapTempoBtn');
    const timeSigSelect = document.getElementById('timeSigSelect');
    const volumeSlider = document.getElementById('volumeSlider');
    const soundSelect = document.getElementById('soundSelect');
    const measureGrid = document.getElementById('measureGrid');
    const viewDotsBtn = document.getElementById('viewDotsBtn');
    const viewNotationBtn = document.getElementById('viewNotationBtn');
    const subPopup = document.getElementById('subdivisionPopup');

    // Tap Tempo variables
    let tapTimes = [];

    // --- RENDER GRID FUNCTION (Strict visual parity) ---
    function renderMeasureGrid() {
        measureGrid.innerHTML = '';

        for (let b = 0; b < engine.beatsPerMeasure; b++) {
            const beatCol = document.createElement('div');
            beatCol.className = 'beat-column';
            beatCol.dataset.beat = b;

            // Header with Beat Number Button
            const header = document.createElement('div');
            header.className = 'beat-header';

            const numBtn = document.createElement('button');
            numBtn.className = 'beat-num-btn';
            numBtn.textContent = b + 1;
            numBtn.setAttribute('aria-label', `Modifica suddivisione beat ${b + 1}`);

            // === REQUIREMENT 1: SINGLE CLICK LISTENERS FOR SUBDIVISION POPUP ===
            numBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Stop propagation to prevent immediate document close
                if (activeBeatTriggerBtn === numBtn) {
                    closeSubPopup();
                } else {
                    openSubPopup(numBtn, b);
                }
            });

            header.appendChild(numBtn);
            beatCol.appendChild(header);

            // Subdivisions Track (Identical layout container)
            const subTrack = document.createElement('div');
            subTrack.className = 'subdivision-track';

            const subCount = engine.subdivisions[b] || 1;

            for (let s = 0; s < subCount; s++) {
                if (currentView === 'dots') {
                    // Render Dot Item
                    const dotWrapper = document.createElement('div');
                    dotWrapper.className = 'sub-element-dot';

                    const dot = document.createElement('div');
                    dot.className = 'dot' + (b === 0 && s === 0 ? ' accent-dot' : '');
                    dot.dataset.beat = b;
                    dot.dataset.sub = s;

                    dotWrapper.appendChild(dot);
                    subTrack.appendChild(dotWrapper);
                } else {
                    // Render Notation Item
                    const notWrapper = document.createElement('div');
                    notWrapper.className = 'sub-element-notation';
                    notWrapper.dataset.beat = b;
                    notWrapper.dataset.sub = s;

                    const iconWrap = document.createElement('div');
                    iconWrap.className = 'note-svg-wrapper';
                    iconWrap.innerHTML = SVG_NOTES[subCount] || SVG_NOTES[1];

                    notWrapper.appendChild(iconWrap);
                    subTrack.appendChild(notWrapper);
                }
            }

            beatCol.appendChild(subTrack);
            measureGrid.appendChild(beatCol);
        }
    }

    // --- SUBDIVISION POPUP MANAGEMENT ---
    function openSubPopup(triggerBtn, beatIndex) {
        closeSubPopup(); // Close any existing open instance

        activeBeatTriggerBtn = triggerBtn;
        targetBeatForPopup = beatIndex;
        triggerBtn.classList.add('active-sub-open');

        // Calculate absolute position near the trigger button
        const rect = triggerBtn.getBoundingClientRect();
        const popupWidth = 200;
        
        let left = rect.left + window.scrollX - (popupWidth / 2) + (rect.width / 2);
        let top = rect.bottom + window.scrollY + 8;

        // Prevent overflow beyond screen edges
        if (left < 10) left = 10;
        if (left + popupWidth > window.innerWidth - 10) {
            left = window.innerWidth - popupWidth - 10;
        }

        subPopup.style.left = `${left}px`;
        subPopup.style.top = `${top}px`;
        subPopup.classList.remove('hidden');
    }

    function closeSubPopup() {
        if (activeBeatTriggerBtn) {
            activeBeatTriggerBtn.classList.remove('active-sub-open');
            activeBeatTriggerBtn = null;
        }
        targetBeatForPopup = null;
        subPopup.classList.add('hidden');
    }

    // Global Click-Away Listener to close popup automatically
    document.addEventListener('click', (e) => {
        if (!subPopup.contains(e.target) && activeBeatTriggerBtn && !activeBeatTriggerBtn.contains(e.target)) {
            closeSubPopup();
        }
    });

    // Close on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSubPopup();
        }
    });

    // Options selection inside popup
    subPopup.querySelectorAll('.sub-option').forEach(option => {
        option.addEventListener('click', (e) => {
            const subVal = parseInt(option.dataset.sub, 10);
            if (targetBeatForPopup !== null) {
                engine.setSubdivision(targetBeatForPopup, subVal);
                renderMeasureGrid();
            }
            closeSubPopup();
        });
    });

    // --- VIEW TOGGLE HANDLERS ---
    viewDotsBtn.addEventListener('click', () => {
        currentView = 'dots';
        viewDotsBtn.classList.add('active');
        viewNotationBtn.classList.remove('active');
        measureGrid.className = 'measure-grid view-dots';
        renderMeasureGrid();
    });

    viewNotationBtn.addEventListener('click', () => {
        currentView = 'notation';
        viewNotationBtn.classList.add('active');
        viewDotsBtn.classList.remove('active');
        measureGrid.className = 'measure-grid view-notation';
        renderMeasureGrid();
    });

    // --- TEMPO & CONTROL LISTENERS ---
    function updateBpm(newBpm) {
        engine.setBpm(newBpm);
        bpmInput.value = engine.bpm;
        bpmSlider.value = engine.bpm;

        // Highlight preset if matching
        document.querySelectorAll('.preset-btn').forEach(btn => {
            if (parseInt(btn.dataset.bpm, 10) === engine.bpm) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    bpmInput.addEventListener('change', () => updateBpm(parseInt(bpmInput.value, 10) || 120));
    bpmSlider.addEventListener('input', () => updateBpm(parseInt(bpmSlider.value, 10)));
    tempoMinus.addEventListener('click', () => updateBpm(engine.bpm - 1));
    tempoPlus.addEventListener('click', () => updateBpm(engine.bpm + 1));

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updateBpm(parseInt(btn.dataset.bpm, 10));
        });
    });

    // Tap Tempo Logic
    tapTempoBtn.addEventListener('click', () => {
        const now = performance.now();
        tapTimes.push(now);

        // Filter out taps older than 3 seconds
        tapTimes = tapTimes.filter(t => now - t < 3000);

        if (tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < tapTimes.length; i++) {
                intervals.push(tapTimes[i] - tapTimes[i - 1]);
            }
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const calculatedBpm = Math.round(60000 / avgInterval);
            updateBpm(calculatedBpm);
        }
    });

    timeSigSelect.addEventListener('change', (e) => {
        const beats = parseInt(e.target.value, 10);
        engine.setBeatsPerMeasure(beats);
        renderMeasureGrid();
    });

    volumeSlider.addEventListener('input', (e) => {
        engine.volume = parseFloat(e.target.value);
    });

    soundSelect.addEventListener('change', (e) => {
        engine.soundType = e.target.value;
    });

    // Play/Stop Button Toggle
    playBtn.addEventListener('click', () => {
        if (engine.isPlaying) {
            engine.stop();
            playBtn.classList.remove('playing');
            playText.textContent = 'AVVIA';
            playIcon.textContent = '▶';
            clearActiveHighlights();
        } else {
            engine.start();
            playBtn.classList.add('playing');
            playText.textContent = 'FERMA';
            playIcon.textContent = '◼';
        }
    });

    // --- PLAYBACK VISUAL TICK HIGHLIGHT ---
    engine.onTick = (beatIndex, subIndex) => {
        clearActiveHighlights();

        // Highlight column
        const beatCols = measureGrid.querySelectorAll('.beat-column');
        if (beatCols[beatIndex]) {
            beatCols[beatIndex].classList.add('active-beat');
        }

        // Highlight element
        if (currentView === 'dots') {
            const activeDot = measureGrid.querySelector(`.dot[data-beat="${beatIndex}"][data-sub="${subIndex}"]`);
            if (activeDot) activeDot.classList.add('active');
        } else {
            const activeNote = measureGrid.querySelector(`.sub-element-notation[data-beat="${beatIndex}"][data-sub="${subIndex}"]`);
            if (activeNote) activeNote.classList.add('active');
        }
    };

    function clearActiveHighlights() {
        measureGrid.querySelectorAll('.beat-column').forEach(col => col.classList.remove('active-beat'));
        measureGrid.querySelectorAll('.dot').forEach(dot => dot.classList.remove('active'));
        measureGrid.querySelectorAll('.sub-element-notation').forEach(note => note.classList.remove('active'));
    }

    // Initial render
    renderMeasureGrid();
});
