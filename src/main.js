import { SRTPlayer } from './SRTParser.js';

//#region DOM Elements
const mainLabel = document.getElementById('MainLabel');
const textInput = document.getElementById('textInput');
const sizeInput = document.getElementById('sizeInput');
const colorInput = document.getElementById('textColorInput');
const bgColorInput = document.getElementById('bgColorInput');
const weightInput = document.getElementById('weightInput');
const sizeBox = document.getElementById('sizeBox');
const weightBox = document.getElementById('weightBox');
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
const player = new SRTPlayer(
    (text) => {
        mainLabel.textContent = text;
    },
    (time) => {
        timeStamp.textContent = formatTime(time);
    }
);
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
bindSyncedInputs(weightInput, weightBox, value => {
    mainLabel.style.fontWeight = value;
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
