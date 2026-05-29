import { CurSettings, BaseSettings, applySettings, saveSettings, SETTINGS_KEY } from './main.js';

const presetFonts = [
    { name: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { name: "System", value: "system-ui" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Georgia", value: "Georgia, serif" },
    { name: "Courier", value: "Courier New, monospace" },
    { name: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
    { name: "Roboto", value: "Roboto, Arial, sans-serif" },
    { name: "Noto Sans", value: "Noto Sans, Arial, sans-serif" },
    { name: "Comic Sans", value: "'Comic Sans MS', cursive, sans-serif" },
    { name: "Impact", value: "Impact, Charcoal, sans-serif" },
    { name: "Webdings", value: "Webdings" }
];

export const fontSelect = document.getElementById("fontSelect");
export const fontPreview = document.getElementById("textPreview");
const applyBtn = document.getElementById("applyFont");
const fontFileInput = document.getElementById('fontFileInput');
const fontFileUploadButton = document.getElementById('fontUploadButton')

let fontDb;

fontFileUploadButton.addEventListener('click', () => { fontFileInput.click(); });

export function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('SubtitleSidekickDB', 4);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (db.objectStoreNames.contains('fonts')) {
                db.deleteObjectStore('fonts');
            }
            db.createObjectStore('fonts', { keyPath: 'id' });
        };

        request.onsuccess = () => {
            fontDb = request.result;
            resolve();
        };

        request.onerror = () => reject(request.error);
    });
}

function initFontPresets() {
    presetFonts.forEach(font => {
        const opt = document.createElement("option");
        opt.value = font.value;
        opt.textContent = font.name;
        fontSelect.appendChild(opt);
    });

    fontSelect.addEventListener("change", () => {
        fontPreview.style.fontFamily = fontSelect.value;
    });

    applyBtn.addEventListener("click", () => {
        CurSettings.fontFamily = fontSelect.value || 'system-ui';
        applySettings();
        saveSettings();
    });

    fontPreview.style.fontFamily = presetFonts[0].value;
}
initFontPresets();

fontFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fontId = `UploadedFont_${crypto.randomUUID()}`;

    const tx = fontDb.transaction('fonts', 'readwrite');

    tx.objectStore('fonts').put({
        id: fontId,
        name: file.name,
        file
    });

    await applyFontFromFile(
        {
            id: fontId,
            name: file.name,
            file
        },
        true
    );

    saveSettings();
});

export async function loadSavedFonts() {
    const tx = fontDb.transaction('fonts', 'readonly');

    const store = tx.objectStore('fonts');

    const fonts = await new Promise((resolve, reject) => {
        const req = store.getAll();

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    for (const savedFont of fonts) {
        await applyFontFromFile(savedFont, false);
    }
}

async function applyFontFromFile(savedFont, selectAfterLoad = true) {
    const { id, name, file } = savedFont;

    if (!(file instanceof Blob)) {
        console.error('Invalid font blob:', savedFont);
        return;
    }

    const fontUrl = URL.createObjectURL(file);

    const font = new FontFace(
        id,
        `url(${fontUrl})`
    );

    await font.load();

    document.fonts.add(font);

    let existing = [...fontSelect.options]
        .find(o => o.value === id);

    if (!existing) {
        existing = document.createElement('option');

        existing.value = id;
        existing.textContent = name;

        fontSelect.appendChild(existing);
    }

    if (selectAfterLoad) {
        fontSelect.value = id;
        fontPreview.style.fontFamily = id;
    }
}