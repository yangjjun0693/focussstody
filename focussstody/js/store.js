/**
 * @file: store.js
 * $STUDY Store — spend earned tokens on themes, badges, and sounds.
 * All purchases stored in localStorage per user.
 * Pro users get base themes free.
 */

const STORE_KEY = (username) => `fv_store:${username}`;

// ── Store catalog ────────────────────────────────────────────────────────────
export const STORE_ITEMS = {

    // ── Themes (Pro users get these free) ───────────────────────────────────
    themes: [
        { id: 'midnight', name: 'Midnight',  price: 20,  proFree: true,  preview: ['#1e3a5f','#60a5fa'], emoji: '🌙' },
        { id: 'forest',   name: 'Forest',    price: 50,  proFree: true,  preview: ['#065f46','#4ade80'], emoji: '🌲' },
        { id: 'sunset',   name: 'Sunset',    price: 75,  proFree: true,  preview: ['#c2410c','#f97316'], emoji: '🌅' },
        { id: 'ocean',    name: 'Ocean',     price: 75,  proFree: true,  preview: ['#0e7490','#22d3ee'], emoji: '🌊' },
        { id: 'mono',     name: 'Mono',      price: 100, proFree: true,  preview: ['#404040','#a3a3a3'], emoji: '⬛' },
        { id: 'cherry',   name: 'Cherry',    price: 150, proFree: true, preview: ['#9f1239','#fb7185'], emoji: '🍒' },
        { id: 'galaxy',   name: 'Galaxy',    price: 200, proFree: true, preview: ['#1e1b4b','#a78bfa'], emoji: '🌌' },
        { id: 'gold',     name: 'Gold',      price: 300, proFree: true, preview: ['#78350f','#fbbf24'], emoji: '✨' },
    ],

    // ── Badges / Titles ──────────────────────────────────────────────────────
    badges: [
        { id: 'night_owl',    name: 'Night Owl',     price: 80,  proFree: true, emoji: '🦉', desc: 'For the late night grinders' },
        { id: 'grinder',      name: 'Grinder',       price: 120, proFree: true, emoji: '⚙️', desc: 'Never stops working' },
        { id: 'galaxy_brain', name: 'Galaxy Brain',  price: 200, proFree: true, emoji: '🧠', desc: 'Big brain energy' },
        { id: 'speedrun',     name: 'Speedrunner',   price: 150, proFree: true, emoji: '⚡', desc: 'Fast and focused' },
        { id: 'legend',       name: 'Legend',        price: 300, proFree: true, emoji: '👑', desc: 'The rarest title' },
    ],
};

// ── Extra themes for pro.js to pick up ──────────────────────────────────────
export const EXTRA_THEMES = {
    cherry: {
        name: 'Cherry', accent: '#fb7185', accentDim: 'rgba(251,113,133,0.4)',
        bgLight: '#fff1f2', bgFocus: '#9f1239', textPrimary: '#881337',
        miningFrom: '#9f1239', miningTo: '#500724',
    },
    galaxy: {
        name: 'Galaxy', accent: '#a78bfa', accentDim: 'rgba(167,139,250,0.4)',
        bgLight: '#ede9fe', bgFocus: '#1e1b4b', textPrimary: '#1e1b4b',
        miningFrom: '#1e1b4b', miningTo: '#0f0a2e',
    },
    gold: {
        name: 'Gold', accent: '#fbbf24', accentDim: 'rgba(251,191,36,0.4)',
        bgLight: '#fffbeb', bgFocus: '#78350f', textPrimary: '#451a03',
        miningFrom: '#78350f', miningTo: '#3a1a05',
    },
};

// ── Sound definitions (Web Audio API) ───────────────────────────────────────
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new AudioContext();
    return audioCtx;
}

export const SOUNDS = {
    tick_soft: () => {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.start(); osc.stop(ctx.currentTime + 0.08);
    },
    typewriter: () => {
        const ctx = getAudioCtx();
        const bufSize = ctx.sampleRate * 0.05;
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufSize) * 0.3;
        const src = ctx.createBufferSource();
        const gain = ctx.createGain();
        src.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass'; filter.frequency.value = 2000;
        src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
        gain.gain.value = 0.4;
        src.start();
    },
    lofi_bell: () => {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 523;
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
        osc.start(); osc.stop(ctx.currentTime + 1.2);
    },
    digital: () => {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'square'; osc.frequency.value = 440;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        osc.start(); osc.stop(ctx.currentTime + 0.06);
    },
};

// ── StoreManager ─────────────────────────────────────────────────────────────
export class StoreManager {
    constructor(username) {
        this.username   = username;
        this.purchased  = this.#load();
        this.activeSound = this.purchased.activeSound || null;
        this.activeBadge = this.purchased.activeBadge || null;
    }

    #load() {
        try {
            const raw = localStorage.getItem(STORE_KEY(this.username));
            return raw ? JSON.parse(raw) : { items: [], activeSound: null, activeBadge: null };
        } catch { return { items: [], activeSound: null, activeBadge: null }; }
    }

    #save() {
        localStorage.setItem(STORE_KEY(this.username), JSON.stringify(this.purchased));
    }

    owns(itemId) {
        return this.purchased.items?.includes(itemId);
    }

    /** Buy an item. Returns { ok, reason } */
    buy(itemId, price, currentTokens, isPro) {
        // Find item
        const all = [...STORE_ITEMS.themes, ...STORE_ITEMS.badges, ...STORE_ITEMS.sounds];
        const item = all.find(i => i.id === itemId);
        if (!item) return { ok: false, reason: 'Item not found.' };
        if (this.owns(itemId)) return { ok: false, reason: 'Already owned.' };

        // Pro free check
        const isFree = isPro && item.proFree;
        const cost   = isFree ? 0 : price;

        if (currentTokens < cost) return { ok: false, reason: `Need ${cost} $STUDY (you have ${Math.floor(currentTokens)}).` };

        this.purchased.items = this.purchased.items || [];
        this.purchased.items.push(itemId);
        this.#save();
        return { ok: true, cost };
    }

    setActiveSound(soundId) {
        this.purchased.activeSound = soundId;
        this.activeSound = soundId;
        this.#save();
    }

    setActiveBadge(badgeId) {
        this.purchased.activeBadge = badgeId;
        this.activeBadge = badgeId;
        this.#save();
    }

    playTickSound() {
        if (!this.activeSound || !SOUNDS[this.activeSound]) return;
        try { SOUNDS[this.activeSound](); } catch { /* audio context not ready */ }
    }

    playEndSound() {
        if (!this.activeSound) return;
        try {
            if (this.activeSound === 'lofi_bell') SOUNDS.lofi_bell();
            else SOUNDS[this.activeSound]?.();
        } catch { /* audio context not ready */ }
    }
}