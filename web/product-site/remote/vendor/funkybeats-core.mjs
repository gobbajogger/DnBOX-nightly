// SPDX-License-Identifier: MIT
// Copyright (c) 2026 FunkyBeats Contributors
// Actual source port from pepperonas/funkybeats, app.js at809e1e78407f7bf315eee8655387eca8b7ac465b.
// Full permission/warranty notice: ../FUNKYBEATS-MIT-NOTICE.md.
// AudioEngine, scheduler, browser bootstrap, MIDI permissions, AI/network and Actions are NOT imported.
// SequencerState body is verbatim. DnBOX supplies channels/counts and keeps native data in its existing typed model.
export const UPSTREAM=Object.freeze({repository:'pepperonas/funkybeats',commit:'809e1e78407f7bf315eee8655387eca8b7ac465b',appGitBlob:'f31a9a5b4fa10bfcf4ee634360f1d9320ef3a4d7',license:'MIT',authority:'local-offline-only'});
export function createSequencerState({channels,patternCount=32,defaultSteps=16,maxUndo=50}={}){
 if(!Array.isArray(channels)||!channels.length||channels.some(c=>!['drum','synth'].includes(c.type))||![patternCount,defaultSteps,maxUndo].every(v=>Number.isInteger(v)&&v>0))throw Error('Invalid local sequencer configuration');
 const CHANNELS=channels,NUM_PATTERNS=patternCount,DEFAULT_STEPS=defaultSteps,MAX_UNDO=maxUndo;
    class SequencerState {
        constructor() {
            this.patterns = [];
            this.currentPattern = 0;
            this.undoStack = [];
            this.redoStack = [];
            this.patternClipboard = null;
            this.songChain = [];
            // Phase 3: Arrangement (1D array, each slot = pattern index or -1 for empty)
            this.arrangement = [];
            this.initPatterns();
        }

        initPatterns() {
            this.patterns = [];
            for (let p = 0; p < NUM_PATTERNS; p++) {
                this.patterns.push(this.createEmptyPattern(DEFAULT_STEPS));
            }
        }

        createEmptyPattern(length) {
            const stepsCount = length || DEFAULT_STEPS;
            const channels = [];
            for (let ch = 0; ch < CHANNELS.length; ch++) {
                const channel = [];
                for (let s = 0; s < stepsCount; s++) {
                    channel.push({
                        on: false,
                        velocity: 0.8,
                        note: CHANNELS[ch].type === 'synth' ? 48 : 0,
                        open: false,
                        duration: 1,
                        probability: 100
                    });
                }
                channels.push(channel);
            }
            return { stepsCount: stepsCount, channels: channels, automation: {} };
        }

        getSteps() {
            return this.patterns[this.currentPattern].stepsCount;
        }

        getStep(ch, step) {
            return this.patterns[this.currentPattern].channels[ch][step];
        }

        getCurrentPattern() {
            return this.patterns[this.currentPattern];
        }

        getCurrentPatternChannels() {
            return this.patterns[this.currentPattern].channels;
        }

        // Change pattern length, preserving existing data
        setPatternLength(newLength) {
            const pat = this.patterns[this.currentPattern];
            const oldLength = pat.stepsCount;
            if (newLength === oldLength) return;

            for (let ch = 0; ch < CHANNELS.length; ch++) {
                if (newLength > oldLength) {
                    // Extend
                    for (let s = oldLength; s < newLength; s++) {
                        pat.channels[ch].push({
                            on: false,
                            velocity: 0.8,
                            note: CHANNELS[ch].type === 'synth' ? 48 : 0,
                            open: false,
                            duration: 1,
                            probability: 100
                        });
                    }
                } else {
                    // Truncate
                    pat.channels[ch].length = newLength;
                }
            }

            // Fix automation arrays
            if (pat.automation) {
                for (const key of Object.keys(pat.automation)) {
                    const arr = pat.automation[key];
                    if (newLength > oldLength) {
                        while (arr.length < newLength) arr.push(null);
                    } else {
                        arr.length = newLength;
                    }
                }
            }

            pat.stepsCount = newLength;
        }

        // ---- Undo/Redo ----
        pushUndo() {
            const snapshot = JSON.stringify(this.patterns[this.currentPattern]);
            this.undoStack.push({ patternIdx: this.currentPattern, data: snapshot });
            if (this.undoStack.length > MAX_UNDO) {
                this.undoStack.shift();
            }
            this.redoStack = [];
        }

        undo() {
            if (this.undoStack.length === 0) return false;
            const entry = this.undoStack.pop();
            // Save current state to redo
            const currentSnapshot = JSON.stringify(this.patterns[entry.patternIdx]);
            this.redoStack.push({ patternIdx: entry.patternIdx, data: currentSnapshot });
            // Restore
            this.patterns[entry.patternIdx] = JSON.parse(entry.data);
            this.currentPattern = entry.patternIdx;
            return true;
        }

        redo() {
            if (this.redoStack.length === 0) return false;
            const entry = this.redoStack.pop();
            // Save current to undo
            const currentSnapshot = JSON.stringify(this.patterns[entry.patternIdx]);
            this.undoStack.push({ patternIdx: entry.patternIdx, data: currentSnapshot });
            // Restore
            this.patterns[entry.patternIdx] = JSON.parse(entry.data);
            this.currentPattern = entry.patternIdx;
            return true;
        }

        // ---- Copy/Paste/Clear ----
        copyPattern() {
            this.patternClipboard = JSON.parse(JSON.stringify(this.patterns[this.currentPattern]));
        }

        pastePattern() {
            if (!this.patternClipboard) return false;
            this.pushUndo();
            this.patterns[this.currentPattern] = JSON.parse(JSON.stringify(this.patternClipboard));
            return true;
        }

        clearPattern() {
            this.pushUndo();
            const len = this.patterns[this.currentPattern].stepsCount;
            this.patterns[this.currentPattern] = this.createEmptyPattern(len);
        }

        // ---- Serialization ----
        serialize() {
            return {
                patterns: JSON.parse(JSON.stringify(this.patterns)),
                songChain: [...this.songChain],
                arrangement: [...this.arrangement],
                currentPattern: this.currentPattern
            };
        }

        deserialize(data) {
            if (data.patterns) {
                this.patterns = data.patterns;
                // Ensure all patterns have correct structure
                while (this.patterns.length < NUM_PATTERNS) {
                    this.patterns.push(this.createEmptyPattern(DEFAULT_STEPS));
                }
            }
            if (data.songChain) {
                this.songChain = data.songChain;
            }
            if (data.arrangement) {
                this.arrangement = data.arrangement;
            }
            if (typeof data.currentPattern === 'number') {
                this.currentPattern = data.currentPattern;
            }
        }
    }
 return new SequencerState();
}
// Exact upstream expressions from handlePianoRollMouseMove and handleVelocityEdit.
// The adapter converts between DnBOX sample/raw domains; these helpers do not invent a native bar length.
export const noteDuration=(currentCol,startStep,steps)=>Math.max(1,Math.min(currentCol-startStep+1,steps-startStep));
export function velocityAt(canvasY,noteAreaH,velAreaH){const relY=canvasY-noteAreaH;const velocity=Math.max(0.05,Math.min(1,1-(relY/velAreaH)));return Math.round(velocity*100)/100;}
export function createFunkyBeatsUI({document,channels,state,updateSequencerDisplay=()=>{},patternCount=32,patternColors=[]}){
 const CHANNELS=channels,NUM_PATTERNS=patternCount,PATTERN_COLORS=patternColors;
    function el(tag, attrs, children) {
        const elem = document.createElement(tag);
        if (attrs) {
            for (const [k, v] of Object.entries(attrs)) {
                if (k === 'text') elem.textContent = v;
                else if (k === 'style' && typeof v === 'object') Object.assign(elem.style, v);
                else if (k === 'className') elem.className = v;
                else if (k.startsWith('data')) elem.setAttribute(k.replace(/([A-Z])/g, '-$1').toLowerCase(), v);
                else elem.setAttribute(k, v);
            }
        }
        if (children) {
            for (const child of (Array.isArray(children) ? children : [children])) {
                if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
                else if (child) elem.appendChild(child);
            }
        }
        return elem;
    }
 const ui={state,stepElements:[],updateSequencerDisplay,
        buildSequencerGrid() {
            const grid = document.querySelector('.sequencer-grid');
            while (grid.firstChild) grid.removeChild(grid.firstChild);
            this.stepElements = [];
            const steps = this.state.getSteps();

            for (let ch = 0; ch < CHANNELS.length; ch++) {
                const row = el('div', { className: 'seq-row' });

                // Channel info
                const info = el('div', { className: 'seq-channel-info' });
                const colorBar = el('div', { className: 'seq-channel-color' });
                colorBar.style.backgroundColor = CHANNELS[ch].color;
                const name = el('span', { className: 'seq-channel-name', text: CHANNELS[ch].name });
                name.style.color = CHANNELS[ch].color;

                const btns = el('div', { className: 'seq-channel-btns' });
                const muteBtn = el('button', { className: 'seq-mute', text: 'M' });
                muteBtn.dataset.channel = ch;
                const soloBtn = el('button', { className: 'seq-solo', text: 'S' });
                soloBtn.dataset.channel = ch;
                const euclBtn = el('button', { className: 'seq-eucl', text: 'E' });
                euclBtn.dataset.channel = ch;
                btns.appendChild(muteBtn);
                btns.appendChild(soloBtn);
                btns.appendChild(euclBtn);

                info.appendChild(colorBar);
                info.appendChild(name);
                info.appendChild(btns);
                row.appendChild(info);

                // Steps container
                const stepsContainer = el('div', { className: 'seq-steps' });
                const channelSteps = [];

                for (let s = 0; s < steps; s++) {
                    // Group every 4 steps
                    if (s % 4 === 0) {
                        var group = el('div', { className: 'seq-step-group' });
                        stepsContainer.appendChild(group);
                    }

                    const step = el('button', { type: 'button', className: 'seq-step' });
                    step.dataset.channel = ch;
                    step.dataset.step = s;

                    // Fill div (colored background when on)
                    const fill = el('div', { className: 'step-fill' });
                    fill.style.backgroundColor = CHANNELS[ch].color;
                    step.appendChild(fill);

                    // Velocity bar
                    const velBar = el('div', { className: 'velocity-bar' });
                    step.appendChild(velBar);

                    group.appendChild(step);
                    channelSteps.push(step);
                }

                row.appendChild(stepsContainer);
                grid.appendChild(row);
                this.stepElements.push(channelSteps);
            }

            this.updateSequencerDisplay();
        },
        buildPerformGrid() {
            const container = document.getElementById('perform-content');
            if (!container) return;
            while (container.firstChild) container.removeChild(container.firstChild);

            // Toolbar
            const toolbar = el('div', { className: 'perform-toolbar' });
            const indicator = el('span', { className: 'perform-mode-indicator' + (this.performMode ? ' active' : ''), text: this.performMode ? 'PERFORM MODE ACTIVE' : 'PERFORM MODE OFF' });
            indicator.id = 'perform-mode-indicator';
            toolbar.appendChild(indicator);
            const helpText = el('span', { className: 'keyboard-hint', text: 'Click cells to assign patterns per channel. Changes apply at next bar.' });
            toolbar.appendChild(helpText);
            container.appendChild(toolbar);

            // Grid
            const grid = el('div', { className: 'perform-grid' });

            // Header row
            grid.appendChild(el('div', { className: 'perform-header', text: '' })); // empty corner
            for (let p = 0; p < NUM_PATTERNS; p++) {
                grid.appendChild(el('div', { className: 'perform-header', text: 'P' + (p + 1) }));
            }

            this.performCells = [];
            for (let ch = 0; ch < CHANNELS.length; ch++) {
                // Row label
                const label = el('div', { className: 'perform-row-label' });
                const colorDot = el('div');
                colorDot.style.width = '8px';
                colorDot.style.height = '8px';
                colorDot.style.borderRadius = '50%';
                colorDot.style.backgroundColor = CHANNELS[ch].color;
                colorDot.style.flexShrink = '0';
                label.appendChild(colorDot);
                label.appendChild(el('span', { text: CHANNELS[ch].name }));
                label.style.color = CHANNELS[ch].color;
                grid.appendChild(label);

                const rowCells = [];
                for (let p = 0; p < NUM_PATTERNS; p++) {
                    const cell = el('button', { className: 'perform-cell', text: String(p + 1) });
                    cell.dataset.channel = ch;
                    cell.dataset.pattern = p;
                    if (this.performChannelPatterns[ch] === p) {
                        cell.classList.add('active');
                    }
                    cell.style.borderColor = PATTERN_COLORS[p];
                    cell.addEventListener('click', () => {
                        if (this.playing && this.performMode) {
                            // Queue change for next bar
                            this.performQueuedChanges[ch] = p;
                            // Mark as queued
                            rowCells.forEach(c => c.classList.remove('queued'));
                            cell.classList.add('queued');
                        } else {
                            // Apply immediately
                            this.performChannelPatterns[ch] = p;
                            rowCells.forEach(c => c.classList.remove('active', 'queued'));
                            cell.classList.add('active');
                        }
                        this.autoSave();
                    });
                    rowCells.push(cell);
                    grid.appendChild(cell);
                }
                this.performCells.push(rowCells);
            }

            container.appendChild(grid);
        },
        buildMixer() {
            const container = document.getElementById('mixer-channels');
            while (container.firstChild) container.removeChild(container.firstChild);
            this.mixerVUs = [];

            for (let i = 0; i < CHANNELS.length; i++) {
                const ch = el('div', { className: 'mixer-channel' });

                const colorDot = el('div', { className: 'mixer-color-dot' });
                colorDot.style.backgroundColor = CHANNELS[i].color;

                const name = el('div', { className: 'mixer-channel-name', text: CHANNELS[i].name });

                const vuContainer = el('div', { className: 'mixer-vu' });
                const vuFill = el('div', { className: 'mixer-vu-fill' });
                vuFill.style.height = '0%';
                vuContainer.appendChild(vuFill);
                this.mixerVUs.push(vuFill);

                const faderContainer = el('div', { className: 'mixer-fader-container' });
                const fader = el('input', { type: 'range', className: 'mixer-fader', min: '0', max: '100', value: '80' });
                fader.dataset.channel = i;
                faderContainer.appendChild(fader);

                const db = el('div', { className: 'mixer-db', text: '0.0dB' });

                const panContainer = el('div', { className: 'mixer-pan-container' });
                const panLabel = el('label', { text: 'PAN' });
                const pan = el('input', { type: 'range', className: 'mixer-pan', min: '-100', max: '100', value: '0' });
                pan.dataset.channel = i;
                panContainer.appendChild(panLabel);
                panContainer.appendChild(pan);

                // EQ section
                const eqSection = el('div', { className: 'mixer-eq-section' });
                const eqBands = [
                    { label: 'L', band: 'low' },
                    { label: 'M', band: 'mid' },
                    { label: 'H', band: 'high' }
                ];
                for (const eqDef of eqBands) {
                    const eqGroup = el('div', { className: 'mixer-eq-group' });
                    const eqLabel = el('label', { text: eqDef.label });
                    const eqRange = el('input', {
                        type: 'range', className: 'mixer-eq-range',
                        min: '-12', max: '12', value: '0', step: '1'
                    });
                    eqRange.dataset.channel = i;
                    eqRange.dataset.band = eqDef.band;
                    eqGroup.appendChild(eqLabel);
                    eqGroup.appendChild(eqRange);
                    eqSection.appendChild(eqGroup);
                }

                // Send section
                const sendSection = el('div', { className: 'mixer-send-section' });
                const sends = [
                    { label: 'REV', param: 'reverbSend', defaultVal: '20' },
                    { label: 'DLY', param: 'delaySend', defaultVal: '0' }
                ];
                for (const sendDef of sends) {
                    const sendGroup = el('div', { className: 'mixer-send-group' });
                    const sendLabel = el('label', { text: sendDef.label });
                    const sendRange = el('input', {
                        type: 'range', className: 'mixer-send-range',
                        min: '0', max: '100', value: sendDef.defaultVal, step: '1'
                    });
                    sendRange.dataset.channel = i;
                    sendRange.dataset.sendParam = sendDef.param;
                    sendGroup.appendChild(sendLabel);
                    sendGroup.appendChild(sendRange);
                    sendSection.appendChild(sendGroup);
                }

                const btnsDiv = el('div', { className: 'mixer-btns' });
                const muteBtn = el('button', { className: 'mixer-mute', text: 'M' });
                muteBtn.dataset.channel = i;
                const soloBtn = el('button', { className: 'mixer-solo', text: 'S' });
                soloBtn.dataset.channel = i;
                btnsDiv.appendChild(muteBtn);
                btnsDiv.appendChild(soloBtn);

                ch.appendChild(colorDot);
                ch.appendChild(name);
                ch.appendChild(vuContainer);
                ch.appendChild(faderContainer);
                ch.appendChild(db);
                ch.appendChild(panContainer);
                ch.appendChild(eqSection);
                ch.appendChild(sendSection);
                ch.appendChild(btnsDiv);

                container.appendChild(ch);
            }

            // Phase 4: Bus channel strips (DRUMS and SYNTHS)
            const busConfigs = [
                { name: 'DRUMS', busType: 'drums', color: '#ff6b35' },
                { name: 'SYNTHS', busType: 'synths', color: '#00ff87' }
            ];
            for (const busCfg of busConfigs) {
                const busCh = el('div', { className: 'mixer-channel bus-channel' });
                busCh.style.borderColor = busCfg.color;

                const busColorDot = el('div', { className: 'mixer-color-dot' });
                busColorDot.style.backgroundColor = busCfg.color;

                const busName = el('div', { className: 'mixer-channel-name', text: busCfg.name });
                busName.style.color = busCfg.color;

                const busVuContainer = el('div', { className: 'mixer-vu' });
                const busVuFill = el('div', { className: 'mixer-vu-fill' });
                busVuFill.style.height = '0%';
                busVuContainer.appendChild(busVuFill);
                this.mixerVUs.push(busVuFill);

                const busFaderContainer = el('div', { className: 'mixer-fader-container' });
                const busFader = el('input', { type: 'range', className: 'mixer-fader', min: '0', max: '100', value: '100' });
                busFader.dataset.busType = busCfg.busType;
                busFaderContainer.appendChild(busFader);

                const busDb = el('div', { className: 'mixer-db', text: '0.0dB' });

                // Compressor knob
                const busCompGroup = el('div', { className: 'mixer-eq-group' });
                const busCompLabel = el('label', { text: 'COMP' });
                const busCompRange = el('input', {
                    type: 'range', className: 'mixer-eq-range',
                    min: '0', max: '100', value: '30', step: '1'
                });
                busCompRange.dataset.busType = busCfg.busType;
                busCompRange.dataset.busParam = 'compressor';
                busCompGroup.appendChild(busCompLabel);
                busCompGroup.appendChild(busCompRange);

                busCh.appendChild(busColorDot);
                busCh.appendChild(busName);
                busCh.appendChild(busVuContainer);
                busCh.appendChild(busFaderContainer);
                busCh.appendChild(busDb);
                busCh.appendChild(busCompGroup);

                container.appendChild(busCh);
            }

            // Master channel
            const master = el('div', { className: 'mixer-channel master' });
            const masterName = el('div', { className: 'mixer-channel-name', text: 'MASTER' });
            masterName.style.color = '#ff6b35';
            const masterVuContainer = el('div', { className: 'mixer-vu' });
            const masterVuFill = el('div', { className: 'mixer-vu-fill' });
            masterVuFill.style.height = '0%';
            masterVuContainer.appendChild(masterVuFill);
            this.mixerVUs.push(masterVuFill);

            const masterFaderContainer = el('div', { className: 'mixer-fader-container' });
            const masterFader = el('input', { type: 'range', className: 'mixer-fader', min: '0', max: '100', value: '80' });
            masterFader.id = 'master-fader';
            masterFaderContainer.appendChild(masterFader);
            const masterDb = el('div', { className: 'mixer-db', text: '0.0dB' });

            master.appendChild(masterName);
            master.appendChild(masterVuContainer);
            master.appendChild(masterFaderContainer);
            master.appendChild(masterDb);

            container.appendChild(master);
        },
        createParamSlider(label, paramName, value, min, max, step, formatFn) {
            const group = el('div', { className: 'synth-param-group' });
            const lbl = el('label', { text: label });
            const input = el('input', { type: 'range', className: 'synth-range', min: String(min), max: String(max), value: String(value), step: String(step) });
            input.dataset.param = paramName;
            const valSpan = el('span', { className: 'param-val', text: formatFn(value) });
            group.appendChild(lbl);
            group.appendChild(input);
            group.appendChild(valSpan);
            return group;
        }
 };return ui;
}
