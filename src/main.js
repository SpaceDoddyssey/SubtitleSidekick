import { SRTPlayer } from './SRTParser.js';
import { renderThemes } from './themes.js';
import { initIndexedDB, loadSavedFonts, fontPreview, fontSelect } from './fonts.js';

//#region DOM Elements
const mainLabel = document.getElementById('MainLabel');

const menu = document.getElementById('menu');
const srtTitle = document.getElementById('srtTitle');
const textInput = document.getElementById('textInput');
const yPosSlider = document.getElementById('yPosSlider');
const yPosBox = document.getElementById('yPosBox');
const sizeInput = document.getElementById('sizeInput');
const colorInput = document.getElementById('textColorInput');
const bgColorInput = document.getElementById('bgColorInput');
const weightInput = document.getElementById('weightInput');
const sizeBox = document.getElementById('sizeBox');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const playBtn = document.getElementById('playBtn');
const resetBtn = document.getElementById('resetBtn');
const timeStamp = document.getElementById('timeStamp');

const progressBar = document.getElementById('progressBar');
const rewindTurboBtn = document.getElementById('rewindTurbo');
const rewindFastBtn = document.getElementById('rewindFast');
const rewindSlowBtn = document.getElementById('rewindSlow');
const forwardSlowBtn = document.getElementById('forwardSlow');
const forwardFastBtn = document.getElementById('forwardFast');
const forwardTurboBtn = document.getElementById('forwardTurbo');

const bgImageInput = document.getElementById('bgImageInput');
const bgImageMode = document.getElementById('bgImageMode');
const clearBgImage = document.getElementById('clearBgImage');

const srtFileInput = document.getElementById('SRTfileInput');
const fileUploadButton = document.getElementById('fileUploadButton');

const mobileControlToggle = document.getElementById('mobileControlToggle');
const mobileControls = document.getElementById('mobileControls');
const mobilePlayBtn = document.getElementById('mobilePlayBtn');
const mobileRewindBtn = document.getElementById('mobileRewindBtn');
const mobileForwardBtn = document.getElementById('mobileForwardBtn');
const mobileFullscreenBtn = document.getElementById('mobileFullscreenBtn');
//#endregion

//#region Settings State
export const SETTINGS_KEY = 'SSS-settings';

export let BaseSettings = null;
export const CurSettings = {};
let fullScreenMode = false;
let mobileControlsShowing = false;

function initSettingsFromCSS() {
    const mainStyle = getComputedStyle(mainLabel);
    const bodyStyle = getComputedStyle(document.body);

    const base = {
        text: "Upload a .SRT file to get started!",
        fontSize: parseInt(mainStyle.fontSize),
        textColor: rgbToHex(mainStyle.color),
        bgColor: rgbToHex(bodyStyle.backgroundColor),
        fontWeight: mainStyle.fontWeight,
        fontFamily: mainStyle.fontFamily,
        bgImage: null,
        bgImageMode: 'stretch',
        textYPos: 50,
    };

    BaseSettings = structuredClone(base);

    Object.assign(CurSettings, base);
}

function setMainLabel(text) {
    mainLabel.setHTML(text, { sanitize: true, allowedTags: ['b', 'i', 'u', 'br'] });
}

export function applySettings() {
    setMainLabel(CurSettings.text);
    mainLabel.style.fontSize = `${CurSettings.fontSize}px`;
    mainLabel.style.color = CurSettings.textColor;
    mainLabel.style.fontWeight = CurSettings.fontWeight;
    mainLabel.style.fontFamily = CurSettings.fontFamily;
    
    const yPosPercentage = (100 - CurSettings.textYPos) / 100;
    mainLabel.style.top = `${yPosPercentage * 100}%`;
    mainLabel.style.position = 'absolute';
    mainLabel.style.transform = 'translateY(-50%)';

    document.body.style.backgroundColor = CurSettings.bgColor;

    if (CurSettings.bgImage) {
        document.body.style.backgroundImage = `url(${CurSettings.bgImage})`;
    } else {
        document.body.style.backgroundImage = 'none';
    }

    applyBackgroundMode();

    // sync UI inputs
    textInput.value = CurSettings.text;
    sizeInput.value = CurSettings.fontSize;
    sizeBox.value = CurSettings.fontSize;
    colorInput.value = CurSettings.textColor;
    bgColorInput.value = CurSettings.bgColor;
    weightInput.value = CurSettings.fontWeight;
    bgImageMode.value = CurSettings.bgImageMode;
    yPosSlider.value = CurSettings.textYPos;
    yPosBox.value = CurSettings.textYPos;

    if (fontSelect) {
        fontSelect.value = CurSettings.fontFamily;
        fontPreview.style.fontFamily = CurSettings.fontFamily;
    }
}

export function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(CurSettings));
}

export function loadSettings() {
    initSettingsFromCSS(); // populate defaults first

    const saved = localStorage.getItem(SETTINGS_KEY);

    if (saved) {
        try {
            Object.assign(CurSettings, JSON.parse(saved));
        } catch (err) {
            console.warn('Failed to load settings:', err);
        }
    }

    applySettings();
}

function applyAndSaveSettings() { applySettings(); saveSettings(); }
//#endregion

//#region Utility Functions
function bindSetting(input, key, transform = v => v) {
    input.addEventListener('input', () => {
        CurSettings[key] = transform(input.value);
        applyAndSaveSettings();
    });
}

function bindSyncedInputs(inputA, inputB, apply) {
    inputA.addEventListener('input', () => {
        inputB.value = inputA.value;
        apply(inputA.value);
    });

    inputB.addEventListener('input', () => {
        inputA.value = inputB.value;
        apply(inputB.value);
    });
}

function rgbToHex(rgb) {
    const values = rgb.match(/\d+/g);
    if (!values) return '#000000';

    return '#' + values
        .slice(0, 3)
        .map(v => Number(v).toString(16).padStart(2, '0'))
        .join('');
}

function toggleFullscreen(){
    if(!fullScreenMode) {
        fullScreenMode = true;
        document.documentElement.requestFullscreen();
    } else {
        fullScreenMode = false;
        document.exitFullscreen();
    }
}
//#endregion

//#region SRT Player
let lastWasBetween = null;

const player = new SRTPlayer(
    (text) => {
        setMainLabel(text);
    },
    (time) => {
        timeStamp.textContent = formatTime(time);
        updateProgressBar(time);
    }
);

function updateProgressBar(currentTime) {
    const duration = player.getDuration();
    if (duration === 0) {
        progressBar.style.setProperty('--progress', '0%');
        return;
    }

    const currentSubtitle = player.subtitles.find(s =>
        currentTime >= s.start && currentTime <= s.end
    );

    let startTime, endTime;
    const isBetween = !currentSubtitle;

    if (currentSubtitle) {
        startTime = currentSubtitle.start;
        endTime = currentSubtitle.end;
        progressBar.classList.remove('between');
    } else {
        progressBar.classList.add('between');

        const lastSubtitle = [...player.subtitles].reverse().find(s => s.end <= currentTime);
        const nextSubtitle = player.subtitles.find(s => s.start >= currentTime);

        if (lastSubtitle && nextSubtitle) {
            startTime = lastSubtitle.end;
            endTime = nextSubtitle.start;
        } else if (nextSubtitle) {
            startTime = 0;
            endTime = nextSubtitle.start;
        } else if (lastSubtitle) {
            startTime = lastSubtitle.end;
            endTime = duration;
        } else {
            progressBar.style.setProperty('--progress', '0%');
            return;
        }
    }

    const modeChanged = lastWasBetween !== null && lastWasBetween !== isBetween;
    lastWasBetween = isBetween;

    const rangeSize = endTime - startTime;
    const progress = rangeSize > 0 ? ((currentTime - startTime) / rangeSize) * 100 : 0;

    if (modeChanged) {
        // snap to 0 or 100 instantly
        progressBar.classList.add('no-transition');
        progressBar.style.setProperty('--progress', progress + '%');
        void progressBar.offsetWidth;
        progressBar.classList.remove('no-transition');
    } else {
        progressBar.style.setProperty('--progress', progress + '%');
    }
}
//#endregion

//#region UI Event Handlers
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(content => content.style.display = 'none');
        document.getElementById(`tab-${tab.dataset.tab}`).style.display = 'block';
    });
});

bindSyncedInputs(sizeInput, sizeBox, value => {
    CurSettings.fontSize = Number(value);
    applyAndSaveSettings();
});

bindSyncedInputs(yPosSlider, yPosBox, value => {
    CurSettings.textYPos = Number(value);
    applyAndSaveSettings();
});

bindSetting(textInput, 'text');
bindSetting(colorInput, 'textColor');
bindSetting(bgColorInput, 'bgColor');
bindSetting(weightInput, 'fontWeight');

mobileControlToggle.addEventListener("click", () => {
    mobileControlsShowing = !mobileControlsShowing;

    mobileControlToggle.classList.toggle("active", mobileControlsShowing);
    mobileControlToggle.textContent = `${mobileControlsShowing ? "On" : "Off"}`;
    mobileControls.classList.toggle("visible", mobileControlsShowing);
    mobileFullscreenBtn.classList.toggle("visible", mobileControlsShowing);
});

mobilePlayBtn.addEventListener('pointerdown', () => {
    player.toggle();
    updateMobilePlayBtn();
});

mobileRewindBtn.addEventListener('pointerdown', () => {
    scrubAmount = -10;
});

mobileForwardBtn.addEventListener('pointerdown', () => {
    scrubAmount = 10;
});

mobileFullscreenBtn.addEventListener('pointerdown', () => {
    toggleFullscreen();
});

function updateMobilePlayBtn() {
    mobilePlayBtn.textContent = player.isPlaying ? "⏸" : "▶";
}
//#endregion

//#region Background
bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        CurSettings.bgImage = reader.result;
        applyAndSaveSettings();
    };
    reader.readAsDataURL(file);
});

bindSetting(bgImageMode, 'bgImageMode');

function applyBackgroundMode() {
    const mode = CurSettings.bgImageMode;

    if (!CurSettings.bgImage) return;

    if (mode === 'tile') {
        document.body.style.backgroundRepeat = 'repeat';
        document.body.style.backgroundSize = 'auto';
        document.body.style.backgroundPosition = 'top left';
    } else {
        document.body.style.backgroundRepeat = 'no-repeat';
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center center';
    }
}

clearBgImage.addEventListener('click', () => {
    CurSettings.bgImage = null;
    applyAndSaveSettings();
});
//#endregion

//#region File Upload
fileUploadButton.addEventListener('click', () => { srtFileInput.click(); });

async function loadSubtitleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.srt')) return;

    srtTitle.textContent = file.name;

    const text = await file.text();

    localStorage.setItem('lastSRT', JSON.stringify({
        name: file.name,
        text: text
    }));

    player.loadFromText(text);
}

function loadLastSRT() {
    const saved = localStorage.getItem('lastSRT');
    if (!saved) return;

    try {
        const { name, text } = JSON.parse(saved);

        srtTitle.textContent = name;
        player.loadFromText(text);
    } catch (e) {
        console.warn('Failed to load last SRT:', e);
    }
}

let dragCounter = 0;

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

window.addEventListener('dragenter', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;

    dragCounter++;
    document.body.classList.add('dragging');
});

window.addEventListener('dragleave', (e) => {
    if (!e.dataTransfer?.types.includes('Files')) return;

    dragCounter--;

    if (dragCounter <= 0) {
        dragCounter = 0;
        document.body.classList.remove('dragging');
    }
});

window.addEventListener('drop', async (e) => {
    dragCounter = 0;
    document.body.classList.remove('dragging');

    const file = e.dataTransfer.files[0];
    await loadSubtitleFile(file);
});

srtFileInput.addEventListener('change', async (e) => {
    await loadSubtitleFile(e.target.files[0]);
});
//#endregion

//#region Helper Functions
function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0')
    ].join(':');
}
//#endregion

//#region Playback Controls
playBtn.addEventListener('click', () => {
    player.toggle();
    playBtn.textContent = player.isPlaying ? "Pause" : "Play";
    updateMobilePlayBtn();
});
resetBtn.addEventListener('click', () => player.reset());

let scrubAmount = 0;
rewindTurboBtn.addEventListener('pointerdown', () => scrubAmount = -500);
rewindFastBtn.addEventListener('pointerdown', () => scrubAmount = -50);
rewindSlowBtn.addEventListener('pointerdown', () => scrubAmount = -10);
forwardSlowBtn.addEventListener('pointerdown', () => scrubAmount = 10);
forwardFastBtn.addEventListener('pointerdown', () => scrubAmount = 50);
forwardTurboBtn.addEventListener('pointerdown', () => scrubAmount = 500);
document.addEventListener('pointerup', () => scrubAmount = 0);

function animate() {
    if (player.subtitles.length != 0 && scrubAmount !== 0) {
        player.scrub(scrubAmount);
    }
    window.requestAnimationFrame(animate);
}
animate();
//#endregion

//#region Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' 
        || document.activeElement.tagName === 'TEXTAREA'
        || document.activeElement.isContentEditable) return;
    if (e.repeat) return;

    if (e.key === 'h') {
        e.preventDefault();
        const visible = getComputedStyle(menu).display !== 'none';
        menu.style.display = visible ? 'none' : 'block';
    }

    if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrubAmount = -10;
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrubAmount = 10;
    }

    if (e.key === ' ') {
        e.preventDefault();
        player.toggle();
        playBtn.textContent = player.isPlaying ? "Pause" : "Play";
    }

    if (e.key === 'f') {
        e.preventDefault();
        toggleFullscreen();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        scrubAmount = 0;
    }
});
//#endregion

async function init() {
    mainLabel.style.visibility = 'hidden';

    loadLastSRT();
    await initIndexedDB();
    await loadSavedFonts();
    loadSettings();
    renderThemes();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            mainLabel.style.visibility = 'visible';
        });
    });
}

init();