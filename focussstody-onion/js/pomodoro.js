/**
 * @file: pomodoro.js
 * PomodoroManager — custom focus/break intervals, auto-switch, ping sound.
 */
export class PomodoroManager {
    #intervalId  = null;
    #settings    = null;
    #elapsed     = 0;
    #phase       = 'focus'; // 'focus' | 'break'
    #pomosToday  = 0;

    constructor() {
        this.active   = false;
        this.#settings = this.#loadSettings();
    }

    #loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem('fv_pomodoro') || '{}');
            return {
                focusMin: s.focusMin ?? 25,
                breakMin: s.breakMin ?? 5,
            };
        } catch { return { focusMin: 25, breakMin: 5 }; }
    }

    saveSettings(focusMin, breakMin) {
        this.#settings = { focusMin, breakMin };
        localStorage.setItem('fv_pomodoro', JSON.stringify(this.#settings));
    }

    get settings() { return { ...this.#settings }; }
    get phase()    { return this.#phase; }
    get elapsed()  { return this.#elapsed; }
    get pomosToday() { return this.#pomosToday; }

    phaseDuration() {
        return (this.#phase === 'focus' ? this.#settings.focusMin : this.#settings.breakMin) * 60;
    }

    remaining() {
        return Math.max(0, this.phaseDuration() - this.#elapsed);
    }

    remainingFormatted() {
        const r = this.remaining();
        return {
            h: Math.floor(r / 3600).toString().padStart(2, '0'),
            m: Math.floor((r % 3600) / 60).toString().padStart(2, '0'),
            s: (r % 60).toString().padStart(2, '0'),
        };
    }

    /** Start/resume. onPhaseSwitch(phase) called when phase changes. onTick(data) every second. */
    start(onTick, onPhaseSwitch) {
        if (this.#intervalId) return;
        this.active = true;
        this.#intervalId = setInterval(() => {
            this.#elapsed++;
            if (this.#elapsed >= this.phaseDuration()) {
                // Switch phase
                if (this.#phase === 'focus') this.#pomosToday++;
                this.#phase   = this.#phase === 'focus' ? 'break' : 'focus';
                this.#elapsed = 0;
                this.#ping();
                onPhaseSwitch?.(this.#phase);
            }
            onTick?.({
                formatted: this.remainingFormatted(),
                remaining: this.remaining(),
                phase:     this.#phase,
                pomosToday: this.#pomosToday,
            });
        }, 1000);
    }

    pause() {
        if (!this.#intervalId) return;
        clearInterval(this.#intervalId);
        this.#intervalId = null;
    }

    stop() {
        this.pause();
        this.#elapsed  = 0;
        this.#phase    = 'focus';
        this.active    = false;
    }

    get isRunning() { return this.#intervalId !== null; }

    #ping() {
        try {
            const ctx  = new (window.AudioContext || window.webkitAudioContext)();
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            // Two-tone ping
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
        } catch { /* audio unavailable */ }
    }
}