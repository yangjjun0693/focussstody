/**
 * @file: pro.js
 * Pro system — unlock codes, theme management, CSV export.
 */

const PRO_KEY = 'fv_pro';
const THEMES_KEY = 'fv_theme';

export const THEMES = {
    default: { name: 'Indigo', free: true, accent: '#6964c6', accentDim: 'rgba(105,100,198,0.4)', bgLight: '#d0cbe5', bgFocus: '#7a6da2', textPrimary: '#282456', miningFrom: '#4f4b84', miningTo: '#3b3861' },
    midnight: {
        name: 'Midnight',
        free: true,
        accent: '#818cf8',
        accentDim: 'rgba(129,140,248,0.4)',
        bgLight: '#c7d2fe',  // Light indigo, not dark!
        bgFocus: '#4f46e5',
        textPrimary: '#1e1b4b',
        miningFrom: '#6366f1',
        miningTo: '#4338ca',
    },
    forest: { name: 'Forest', free: true, accent: '#4ade80', accentDim: 'rgba(74,222,128,0.4)', bgLight: '#d1fae5', bgFocus: '#065f46', textPrimary: '#064e3b', miningFrom: '#065f46', miningTo: '#022c22' },
    sunset: { name: 'Sunset', free: true, accent: '#f97316', accentDim: 'rgba(249,115,22,0.4)', bgLight: '#fef3c7', bgFocus: '#c2410c', textPrimary: '#7c2d12', miningFrom: '#c2410c', miningTo: '#7c2d12' },
    ocean: { name: 'Ocean', free: true, accent: '#22d3ee', accentDim: 'rgba(34,211,238,0.4)', bgLight: '#cffafe', bgFocus: '#0e7490', textPrimary: '#164e63', miningFrom: '#0e7490', miningTo: '#164e63' },
    mono: { name: 'Mono', free: true, accent: '#a3a3a3', accentDim: 'rgba(163,163,163,0.4)', bgLight: '#f5f5f5', bgFocus: '#404040', textPrimary: '#171717', miningFrom: '#404040', miningTo: '#171717' },
    cherry: { name: 'Cherry', free: true, accent: '#fb7185', accentDim: 'rgba(251,113,133,0.4)', bgLight: '#fff1f2', bgFocus: '#9f1239', textPrimary: '#881337', miningFrom: '#9f1239', miningTo: '#500724' },
    galaxy: { name: 'Galaxy', free: true, accent: '#a78bfa', accentDim: 'rgba(167,139,250,0.4)', bgLight: '#ede9fe', bgFocus: '#1e1b4b', textPrimary: '#1e1b4b', miningFrom: '#1e1b4b', miningTo: '#0f0a2e' },
    gold: { name: 'Gold', free: true, accent: '#fbbf24', accentDim: 'rgba(251,191,36,0.4)', bgLight: '#fffbeb', bgFocus: '#78350f', textPrimary: '#451a03', miningFrom: '#78350f', miningTo: '#3a1a05' },
};

async function hashCode(code) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code.trim().toUpperCase()));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class ProManager {
    constructor() {
        this.isPro = localStorage.getItem(PRO_KEY) === 'true';
        this.themeKey = localStorage.getItem(THEMES_KEY) || 'default';
    }

    async unlock(code) {
        const hash = await hashCode(code);
        if (hash === '86f7867293de6219099150ac3959d8ab4450d77da55005ca511b34a337f5e699') {
            localStorage.setItem(PRO_KEY, 'true');
            this.isPro = true;
            return true;
        }
        return false;
    }

applyTheme(key, ownedItems = []) {
    const theme = THEMES[key];
    if (!theme) return false;

    // Check if user can use this theme
    if (key === 'default') {
        // always allowed
    } else {
        // All non-default themes require ownership OR Pro (for free themes)
        if (!ownedItems.includes(key) && !(theme.free && this.isPro)) {
            return false;
        }
    }

    this.themeKey = key;
    localStorage.setItem(THEMES_KEY, key);

    const root = document.documentElement;
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent-dim', theme.accentDim);
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty('--bg-light', theme.bgLight);
    root.style.setProperty('--bg-focus', theme.bgFocus);
    
    const isDark = root.classList.contains('dark');
    root.style.setProperty('--dropdown-bg', isDark ? 'rgba(52,52,52,0.97)' : 'rgba(255,255,255,0.92)');

    const card = document.querySelector('.mining-card');
    if (card) card.style.background = `linear-gradient(135deg, ${theme.miningFrom} 0%, ${theme.miningTo} 100%`;

    if (!isDark) document.body.style.backgroundColor = theme.bgLight;
    return true;
}

    restoreTheme(ownedItems = []) {
        this.applyTheme(this.themeKey, ownedItems);
    }

    exportCSV(timerStats, username) {
        const { sessions, weeklyData, totalExp, rank } = timerStats;
        const lines = [
            ['Focussstody Export', `User: ${username}`, `Date: ${new Date().toLocaleDateString()}`],
            [],
            ['=== TOTAL STATS ==='],
            ['Total EXP', totalExp],
            ['$STUDY Tokens', (totalExp * 0.016).toFixed(3)],
            ['Rank', rank.name],
            [],
            ['=== SESSIONS ==='],
            ['Subject', 'Time (HH:MM:SS)', 'Seconds'],
            ...Object.entries(sessions).filter(([, s]) => s > 0).map(([sub, sec]) => [sub, new Date(sec * 1000).toISOString().substr(11, 8), sec]),
            [],
            ['=== WEEKLY ACTIVITY ==='],
            ['Day', 'Hours', 'Seconds'],
            ...weeklyData.map(d => [d.label, (d.seconds / 3600).toFixed(2), d.seconds]),
        ];
        const csv = lines.map(row => Array.isArray(row) ? row.join(',') : row).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `focusvault_${username}_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}
