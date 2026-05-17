import { SRTPlayer } from './SRTParser.js';

//#region DOM Elements
const mainLabel = document.getElementById('MainLabel');

const menu = document.getElementById('menu');
const textInput = document.getElementById('textInput');
const sizeInput = document.getElementById('sizeInput');
const colorInput = document.getElementById('textColorInput');
const bgColorInput = document.getElementById('bgColorInput');
const weightInput = document.getElementById('weightInput');
const sizeBox = document.getElementById('sizeBox');
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const timeStamp = document.getElementById('timeStamp');

const themeNameInput = document.getElementById('themeNameInput');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const resetThemeBtn = document.getElementById('resetThemeBtn');
//#endregion

//#region Settings State
const SETTINGS_KEY = 'SSS-settings';
const THEMES_KEY = 'SSS-themes';

let BaseSettings = null;
const CurSettings = {};

function initSettingsFromCSS() {
    const mainStyle = getComputedStyle(mainLabel);
    const bodyStyle = getComputedStyle(document.body);

    const base = {
        text: mainLabel.textContent,
        fontSize: parseInt(mainStyle.fontSize),
        textColor: rgbToHex(mainStyle.color),
        bgColor: rgbToHex(bodyStyle.backgroundColor),
        fontWeight: mainStyle.fontWeight,
        fontFamily: mainStyle.fontFamily,
        bgImage: null,
        bgImageMode: 'stretch'
    };

    BaseSettings = structuredClone(base);

    Object.assign(CurSettings, base);
}

function applySettings() {
    mainLabel.textContent = CurSettings.text;
    mainLabel.style.fontSize = `${CurSettings.fontSize}px`;
    mainLabel.style.color = CurSettings.textColor;
    mainLabel.style.fontWeight = CurSettings.fontWeight;
    mainLabel.style.fontFamily = CurSettings.fontFamily;

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

    if (fontSelect) {
        fontSelect.value = CurSettings.fontFamily;
        preview.style.fontFamily = CurSettings.fontFamily;
    }
}

function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(CurSettings));
}

function loadSettings() {
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
//#endregion

//#region Utility Functions
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
//#endregion

//#region SRT Player
const progressBar = document.getElementById('progressBar');
let lastWasBetween = null;

const player = new SRTPlayer(
    (text) => {
        mainLabel.textContent = text;
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
        // snap to 0 instantly
        progressBar.classList.add('no-transition');
        progressBar.style.setProperty('--progress', '0%');
        void progressBar.offsetWidth;
        progressBar.classList.remove('no-transition');
    }

    progressBar.style.setProperty('--progress', `${Math.min(Math.max(progress, 0), 100)}%`);
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

textInput.addEventListener('input', () => {
    CurSettings.text = textInput.value;
    applySettings();
    saveSettings();
});

bindSyncedInputs(sizeInput, sizeBox, value => {
    CurSettings.fontSize = Number(value);
    applySettings();
    saveSettings();
});

colorInput.addEventListener('input', () => {
    CurSettings.textColor = colorInput.value;
    applySettings();
    saveSettings();
});

bgColorInput.addEventListener('input', () => {
    CurSettings.bgColor = bgColorInput.value;
    applySettings();
    saveSettings();
});

weightInput.addEventListener('input', () => {
    CurSettings.fontWeight = weightInput.value;
    applySettings();
    saveSettings();
});

const bgImageInput = document.getElementById('bgImageInput');
const bgImageMode = document.getElementById('bgImageMode');
const clearBgImage = document.getElementById('clearBgImage');

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        CurSettings.bgImage = reader.result;
        applySettings();
        saveSettings();
    };
    reader.readAsDataURL(file);
});

bgImageMode.addEventListener('change', () => {
    CurSettings.bgImageMode = bgImageMode.value;
    applySettings();
    saveSettings();
});

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
    applySettings();
    saveSettings();
});
//#endregion

//#region File Upload
const srtFileInput = document.getElementById('SRTfileInput');

srtFileInput.addEventListener('change', async () => {
    const file = srtFileInput.files[0];
    if (!file) return;

    const text = await file.text();
    player.loadFromText(text);
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
playBtn.addEventListener('click', () => player.play());
pauseBtn.addEventListener('click', () => player.pause());
resetBtn.addEventListener('click', () => player.reset());

const rewindFastBtn = document.getElementById('rewindFast');
const rewindSlowBtn = document.getElementById('rewindSlow');
const forwardSlowBtn = document.getElementById('forwardSlow');
const forwardFastBtn = document.getElementById('forwardFast');

let scrubAmount = 0;
rewindFastBtn.addEventListener('pointerdown', () => scrubAmount = -50);
rewindSlowBtn.addEventListener('pointerdown', () => scrubAmount = -10);
forwardSlowBtn.addEventListener('pointerdown', () => scrubAmount = 10);
forwardFastBtn.addEventListener('pointerdown', () => scrubAmount = 50);
document.addEventListener('pointerup', () => scrubAmount = 0);

function animate() {
    if (player.subtitles.length != 0) player.scrub(scrubAmount);
    window.requestAnimationFrame(animate);
}
animate();
//#endregion

//#region Font Presets
const presetFonts = [
    { name: "System", value: "system-ui" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Courier", value: "Courier New, monospace" },
    { name: "Comic Sans", value: "'Comic Sans MS', cursive, sans-serif" },
    { name: "Impact", value: "Impact, Charcoal, sans-serif" },
    { name: "Verdana", value: "Verdana, Geneva, sans-serif" }
];

const fontSelect = document.getElementById("fontSelect");
const preview = document.getElementById("textPreview");
const applyBtn = document.getElementById("applyFont");

function initFontPresets() {
    presetFonts.forEach(font => {
        const opt = document.createElement("option");
        opt.value = font.value;
        opt.textContent = font.name;
        fontSelect.appendChild(opt);
    });

    fontSelect.addEventListener("change", () => {
        preview.style.fontFamily = fontSelect.value;
    });

    applyBtn.addEventListener("click", () => {
        CurSettings.fontFamily = fontSelect.value;
        applySettings();
        saveSettings();
    });

    preview.style.fontFamily = presetFonts[0].value;
}
initFontPresets();

let customFontCounter = 0;

document.getElementById("fontUpload").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fontName = `custom_font_${customFontCounter++}`;
    const arrayBuffer = await file.arrayBuffer();
    const font = new FontFace(fontName, arrayBuffer);

    try {
        await font.load();
        document.fonts.add(font);

        const opt = document.createElement("option");
        opt.value = fontName;
        opt.textContent = file.name.replace(/\.(ttf|otf)$/i, "");
        fontSelect.appendChild(opt);

        fontSelect.value = fontName;
        preview.style.fontFamily = fontName;

    } catch (err) {
        console.error("Font load failed:", err);
    }

    e.target.value = "";
});
//#endregion

//#region Theme Presets
function getThemes() {
    try {
        return JSON.parse(localStorage.getItem(THEMES_KEY)) || {};
    } catch {
        return {};
    }
}

function saveThemes(themes) {
    localStorage.setItem(THEMES_KEY, JSON.stringify(themes));
}

function exportCurrentTheme(name) {
    const themes = getThemes();
    themes[name] = structuredClone(CurSettings);
    saveThemes(themes);
    renderThemes();
}

function deleteTheme(name) {
    const themes = getThemes();
    delete themes[name];
    saveThemes(themes);
    renderThemes();
}

function loadTheme(name) {
    const themes = getThemes();
    if (!themes[name]) return;

    Object.assign(CurSettings, themes[name]);
    applySettings();
    saveSettings();
}

function renderThemes() {
    const container = document.getElementById('themeList');
    const themes = getThemes();

    container.innerHTML = '';

    Object.keys(themes).forEach(name => {
        const row = document.createElement('div');
        row.className = 'theme-row';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.marginBottom = '8px';
        row.style.alignItems = 'center';

        const label = document.createElement('span');
        label.textContent = name;

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.onclick = () => loadTheme(name);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteTheme(name);

        const btnGroup = document.createElement('div');
        btnGroup.style.display = 'flex';
        btnGroup.style.gap = '6px';
        btnGroup.append(loadBtn, deleteBtn);

        row.append(label, btnGroup);
        container.appendChild(row);
    });
}

saveThemeBtn.addEventListener('click', () => {
    const name = themeNameInput.value.trim();
    if (!name) return;

    exportCurrentTheme(name);
    themeNameInput.value = '';
});

resetThemeBtn.addEventListener('click', () => {
    if (!BaseSettings) return;

    Object.assign(CurSettings, structuredClone(BaseSettings));

    localStorage.removeItem(SETTINGS_KEY);

    applySettings();
    saveSettings();
});
//endregion

//#region Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
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
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        scrubAmount = 0;
    }
});
//#endregion

loadSettings();
renderThemes();