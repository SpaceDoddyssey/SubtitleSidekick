import { CurSettings, BaseSettings, applySettings, saveSettings, SETTINGS_KEY } from './main.js';

const THEMES_KEY = 'SSS-themes';
const themeNameInput = document.getElementById('themeNameInput');
const saveThemeBtn = document.getElementById('saveThemeBtn');
const resetThemeBtn = document.getElementById('resetThemeBtn');
const themeContainer = document.getElementById('themeList');

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

export function renderThemes() {
    const themes = getThemes();

    themeContainer.innerHTML = '';

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
        themeContainer.appendChild(row);
    });
}