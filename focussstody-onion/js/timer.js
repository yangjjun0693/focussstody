/**
 * @file timer.js
 * StudyTimer — timing logic, rank, streak, goals, session notes.
 * Data loaded from Supabase, synced back via onSave callback.
 */
export class StudyTimer {
    #timerId        = null;
    #sessionStart   = null;
    #sessionBaseExp = 0;

    constructor(onTick, onSave) {
        this.onTick  = onTick;
        this.onSave  = onSave;
        this.data    = this.#defaults();
    }

    #defaults() {
        return {
            sessions:        {},
            total_exp:       0,
            weekly_log:      {},
            streak:          0,
            last_study_date: null,
            goal_hours:      {},
            notes:           [],
            currentSubject:  'CODING',
        };
    }

    loadFromDB(row) {
        this.data = {
            sessions:        row.sessions        || {},
            total_exp:       row.total_exp       || 0,
            weekly_log:      row.weekly_log      || {},
            streak:          row.streak          || 0,
            last_study_date: row.last_study_date || null,
            goal_hours:      typeof row.goal_hours === 'object' ? (row.goal_hours || {}) : {},
            notes:           row.notes           || [],
            currentSubject:  'CODING',
        };
    }

    toDBPayload() {
        return {
            sessions:        this.data.sessions,
            total_exp:       this.data.total_exp,
            weekly_log:      this.data.weekly_log,
            streak:          this.data.streak,
            last_study_date: this.data.last_study_date,
            goal_hours:      this.data.goal_hours,
            notes:           this.data.notes,
        };
    }

    #updateStreak(todayKey) {
        const last = this.data.last_study_date;
        if (last === todayKey) return;
        if (last) {
            const diff = Math.round((new Date(todayKey) - new Date(last)) / 86400000);
            this.data.streak = diff === 1 ? (this.data.streak || 0) + 1 : 1;
        } else {
            this.data.streak = 1;
        }
        this.data.last_study_date = todayKey;
    }

    getGoal(subject) {
        const g = this.data.goal_hours;
        return (g && g[subject]) ?? 4;
    }

    setGoal(subject, hours) {
        this.data.goal_hours = this.data.goal_hours || {};
        this.data.goal_hours[subject] = hours;
        this.onSave?.(this.toDBPayload());
    }

    getNormalizedProgress(subject) {
        const sub = subject || this.data.currentSubject;
        const sec = this.data.sessions[sub] || 0;
        return Math.min(sec / (this.getGoal(sub) * 3600), 1);
    }

    getRank(exp) {
        if (exp < 3600)  return { name: 'Apprentice', next: 3600,    prev: 0,     level: 1 };
        if (exp < 10800) return { name: 'Scholar',    next: 10800,   prev: 3600,  level: 2 };
        if (exp < 36000) return { name: 'Analyst',    next: 36000,   prev: 10800, level: 3 };
        if (exp < 86400) return { name: 'Researcher', next: 86400,   prev: 36000, level: 4 };
        return            { name: 'Grand Master',      next: Infinity, prev: 86400, level: 5 };
    }

    getStats() {
        return {
            ...this.data,
            rank:       this.getRank(this.data.total_exp),
            progress:   this.getNormalizedProgress(),
            weeklyData: this.getWeeklyData(),
            streak:     this.data.streak || 0,
        };
    }

    getWeeklyData() {
        const result = [];
        const today  = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            result.push({
                label:   d.toLocaleDateString('en-US', { weekday: 'short' }),
                seconds: this.data.weekly_log[key] || 0
            });
        }
        return result;
    }

    start(subject) {
        if (this.#timerId) return;
        this.data.currentSubject = subject;
        this.#sessionStart   = Date.now();
        this.#sessionBaseExp = this.data.total_exp;
        const baseSubjectSec = this.data.sessions[subject] || 0;

        this.#timerId = setInterval(() => {
            const delta        = Math.floor((Date.now() - this.#sessionStart) / 1000);
            const subjectTotal = baseSubjectSec + delta;
            const liveTotalExp = this.#sessionBaseExp + delta;
            this.data.sessions[subject] = subjectTotal;
            this.onTick?.({
                formatted:   this.formatTime(subjectTotal),
                raw:         subjectTotal,
                rawTotalExp: liveTotalExp,
                progress:    this.getNormalizedProgress(subject),
                rank:        this.getRank(liveTotalExp)
            });
        }, 1000);
    }

    pause() {
        if (!this.#timerId) return;
        clearInterval(this.#timerId);
        this.#timerId = null;
        const delta    = Math.floor((Date.now() - this.#sessionStart) / 1000);
        this.data.total_exp = this.#sessionBaseExp + delta;
        const todayKey = new Date().toISOString().slice(0, 10);
        this.data.weekly_log[todayKey] = (this.data.weekly_log[todayKey] || 0) + delta;
        this.#updateStreak(todayKey);
        this.#sessionStart = null;
        this.onSave?.(this.toDBPayload());
        return delta;
    }

    addNote(subject, text, duration) {
        this.data.notes = this.data.notes || [];
        this.data.notes.unshift({ date: new Date().toISOString(), subject, text: text.trim(), duration });
        if (this.data.notes.length > 50) this.data.notes = this.data.notes.slice(0, 50);
        this.onSave?.(this.toDBPayload());
    }

    reset() {
        this.pause();
        this.data = { ...this.#defaults(), currentSubject: this.data.currentSubject };
        this.onSave?.(this.toDBPayload());
    }

    get isRunning() { return this.#timerId !== null; }

    formatTime(sec) {
        return {
            h: Math.floor(sec / 3600).toString().padStart(2, '0'),
            m: Math.floor((sec % 3600) / 60).toString().padStart(2, '0'),
            s: (sec % 60).toString().padStart(2, '0')
        };
    }
}