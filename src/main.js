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

        // force browser to apply that state
        void progressBar.offsetWidth;

        // restore animation and continue filling
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


textInput.addEventListener('input', () => mainLabel.textContent = textInput.value);
bindSyncedInputs(sizeInput, sizeBox, value => {
    mainLabel.style.fontSize = `${value}px`;
});

colorInput.addEventListener('input', () => mainLabel.style.color = colorInput.value);
bgColorInput.addEventListener('input', () => document.body.style.backgroundColor = bgColorInput.value );

const bgImageInput = document.getElementById('bgImageInput');
const bgImageMode = document.getElementById('bgImageMode');
const clearBgImage = document.getElementById('clearBgImage');

bgImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        document.body.style.backgroundImage = `url(${reader.result})`;
        applyBackgroundMode();
    };
    reader.readAsDataURL(file);
});

bgImageMode.addEventListener('change', applyBackgroundMode);

function applyBackgroundMode() {
    const mode = bgImageMode.value;

    if (!document.body.style.backgroundImage) return;

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
    document.body.style.backgroundImage = 'none';
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
rewindFastBtn.addEventListener ('pointerdown', () => scrubAmount = -50 );
rewindSlowBtn.addEventListener ('pointerdown', () => scrubAmount = -10 );
forwardSlowBtn.addEventListener('pointerdown', () => scrubAmount = 10 );
forwardFastBtn.addEventListener('pointerdown', () => scrubAmount = 50 );
document.addEventListener('pointerup', () => scrubAmount = 0);

function animate() {
  if(player.subtitles.length != 0) player.scrub(scrubAmount);
  window.requestAnimationFrame(animate)
}
animate()
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
    mainLabel.style.fontFamily = fontSelect.value;
  });

  // default
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

    // add to dropdown
    const opt = document.createElement("option");
    opt.value = fontName;
    opt.textContent = file.name.replace(/\.(ttf|otf)$/i, "");
    fontSelect.appendChild(opt);

    fontSelect.value = fontName;
    preview.style.fontFamily = fontName;

  } catch (err) {
    console.error("Font load failed:", err);
  }

  // reset input so same file can be re-uploaded
  e.target.value = "";
});
//#endregion


//#region Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (e.repeat) return; // prevents resetting repeatedly while held

    if (e.key === 'h') {
        e.preventDefault();
        menu.classList.toggle('hidden');
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