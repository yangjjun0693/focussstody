/**
 * @file: app.js
 * Single-page app — no redirects. Swaps between login and app views
 * using body[data-view]. Eliminates all redirect loop possibilities.
 */
import { StudyTimer } from './timer.js';
import { ProManager, THEMES } from './pro.js';
import { PomodoroManager } from './pomodoro.js';
import { StoreManager, STORE_ITEMS, EXTRA_THEMES, SOUNDS } from './store.js';
import { supabase, signUp, signIn, signOut, getSession, getProfile, getStudyData, saveStudyData, debouncedSave } from './supabase.js';
import { StudyRoom } from './room.js';
import { ChallengeManager } from './challenges.js';
import { SlidingTabs } from './sliding-tabs.js';

/* ── Main ────────────────────────────────────────────── */
class AppController {
    constructor() {
        this.pro = new ProManager();
        this.DOM = {
            html:            document.documentElement,
            body:            document.body,

            // App
            startBtn:        document.getElementById('startBtn'),
            subjectSelect:   document.getElementById('subjectSelect'),
            customSelectBtn: document.getElementById('customSelectBtn'),
            customOptions:   document.getElementById('customOptions'),
            selectedDisplay: document.getElementById('selectedDisplay'),
            modeBtn:         document.getElementById('darkModeToggle'),
            logList:         document.getElementById('logList'),
            tokenDisplay:    document.getElementById('token-display'),
            expBar:          document.getElementById('expBar'),
            expValue:        document.getElementById('expValue'),
            progressCircle:  document.getElementById('progressCircle'),
            rankTextTop:     document.getElementById('rankTextTop'),
            rankText:        document.getElementById('rankText'),
            resetBtn:        document.getElementById('resetBtn'),
            chartCanvas:     document.getElementById('focusChart'),
            userBtn:         document.getElementById('userBtn'),
            userLabel:       document.getElementById('userLabel'),
            logoutBtn:       document.getElementById('logoutBtn'),
            fullMenuOverlay: document.getElementById('fullMenuOverlay'),
            fullMenuClose:   document.getElementById('fullMenuClose'),
            menuUsername:    document.getElementById('menuUsername'),
            menuBtn2:        document.getElementById('menuBtn2'),
            mNavStats:       document.getElementById('mNavStats'),
            mNavLeaderboard: document.getElementById('mNavLeaderboard'),
            mNavFriends:     document.getElementById('mNavFriends'),
            mNavStore:       document.getElementById('mNavStore'),
            mPro:            document.getElementById('mPro'),
            mExport:         document.getElementById('mExport'),
            mDarkMode:       document.getElementById('mDarkMode'),
            mDarkModeLabel:  document.getElementById('mDarkModeLabel'),
            mLogout:         document.getElementById('mLogout'),
            mReset:          document.getElementById('mReset'),
            exportBtn:       document.getElementById('exportBtn'),
            proBtn:          document.getElementById('proBtn'),
            proModal:        document.getElementById('proModal'),
            proModalClose:   document.getElementById('proModalClose'),
            proCodeInput:    document.getElementById('proCodeInput'),
            proCodeSubmit:   document.getElementById('proCodeSubmit'),
            proCodeError:    document.getElementById('proCodeError'),
            themeCard:       document.getElementById('themeCard'),
            themeGrid:       document.getElementById('themeGrid'),
            bmcBtn:          document.getElementById('bmcBtn'),
            menuBtn:         document.getElementById('menuBtn'),
            menuDropdown:    document.getElementById('menuDropdown'),
            menuContainer:   document.getElementById('menuContainer'),
            userMenuItem:    document.getElementById('userMenuItem'),
            statsBtn:        document.getElementById('statsBtn'),
            roomList:        document.getElementById('roomList'),
            challengeDesc:   document.getElementById('challengeDesc'),
            challengeBar:    document.getElementById('challengeBar'),
            challengeProgress: document.getElementById('challengeProgress'),
            challengeReward: document.getElementById('challengeReward'),
            challengeClaimBtn: document.getElementById('challengeClaimBtn'),
            challengeDone:   document.getElementById('challengeDone'),
            roomCount:       document.getElementById('roomCount'),
            leaderboardBtn:  document.getElementById('leaderboardBtn'),
            friendsBtn:      document.getElementById('friendsBtn'),
            donateToggle:    document.getElementById('donateToggle'),
            rankUpOverlay:   document.getElementById('rankUpOverlay'),
            rankUpCard:      document.getElementById('rankUpCard'),
            rankUpName:      document.getElementById('rankUpName'),
            streakDisplay:   document.getElementById('streakDisplay'),
            streakCount:     document.getElementById('streakCount'),
            pomodoroToggle:  document.getElementById('pomodoroToggle'),
            pomodoroPhase:   document.getElementById('pomodoroPhase'),
            pomodoroSettings:document.getElementById('pomodoroSettings'),
            pomoFocusInput:  document.getElementById('pomoFocusInput'),
            pomoBreakInput:  document.getElementById('pomoBreakInput'),
            pomoSaveBtn:     document.getElementById('pomoSaveBtn'),
            goalBar:         document.getElementById('goalBar'),
            goalDisplay:     document.getElementById('goalDisplay'),
            goalEditBtn:     document.getElementById('goalEditBtn'),
            goalModal:       document.getElementById('goalModal'),
            goalInput:       document.getElementById('goalInput'),
            goalSubjectLabel:document.getElementById('goalSubjectLabel'),
            goalSaveBtn:     document.getElementById('goalSaveBtn'),
            goalCancelBtn:   document.getElementById('goalCancelBtn'),
            notesModal:      document.getElementById('notesModal'),
            notesInput:      document.getElementById('notesInput'),
            notesSaveBtn:    document.getElementById('notesSaveBtn'),
            notesSkipBtn:    document.getElementById('notesSkipBtn'),
            storeBtn:        document.getElementById('storeBtn'),
            storePanel:      document.getElementById('storePanel'),
            storeGrid:       document.getElementById('storeGrid'),
            storeBalance:    document.getElementById('storeBalance'),
            storeMsg:        document.getElementById('storeMsg'),
            cryptoBtn:       document.getElementById('cryptoBtn'),
            cryptoModal:     document.getElementById('cryptoModal'),
            cryptoModalClose:document.getElementById('cryptoModalClose'),
            cryptoCopyBtn:   document.getElementById('cryptoCopyBtn'),
            cryptoCopied:    document.getElementById('cryptoCopied'),
            tossCopyBtn:     document.getElementById('tossCopyBtn'),
            tossCopied:      document.getElementById('tossCopied'),
            cryptoAddress:   document.getElementById('cryptoAddress'),
            cryptoCoinLabel: document.getElementById('cryptoCoinLabel'),
        };

        this.CIRCUMFERENCE = 2 * Math.PI * 110;
        this.chart = null;
        this.userId = null;
        this.currentUser = null;
        this.dbRow = null;

        this.timer = new StudyTimer(
            (data) => this.render(data),
            (payload) => { if (this.userId) debouncedSave(this.userId, payload); }
        );

        this.boot();

        // Stop presence when user leaves the page
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.timer.isRunning) {
                this.room?.stopStudying();
            } else if (!document.hidden && this.timer.isRunning) {
                const subject = this.DOM.subjectSelect?.value || 'STUDY';
                this.room?.startStudying(subject);
            }
        });
        window.addEventListener('beforeunload', () => {
            this.room?.stopStudying();
        });
    }

    /* ── Boot ────────────────────────────────────────── */
    async boot() {
        const isDark = localStorage.getItem('darkMode') === 'true';
        this.DOM.html.classList.toggle('dark', isDark);
        this.updateThemeBtn(isDark);

        try {
            const session = await getSession();
            if (session) {
                await this.loadAndEnterApp(session.user);
                document.body.classList.add('app-ready');
            } else {
                window.location.replace('./login.html');
            }
        } catch (e) {
            console.error('Boot error:', e);
            window.location.replace('./login.html');
        }
    }

    async loadAndEnterApp(user) {
        let profile = null;
        let studyRow = null;

        // Retry up to 5 times — DB trigger may not have fired yet on new signup
        for (let i = 0; i < 5; i++) {
            try {
                [profile, studyRow] = await Promise.all([
                    getProfile(user.id),
                    getStudyData(user.id)
                ]);
            } catch (e) { /* ignore, retry */ }

            if (profile) break;
            await new Promise(r => setTimeout(r, 800));
        }

        // If trigger never fired, create rows manually
        if (!profile) {
            const username = user.user_metadata?.username || user.email?.split('@')[0] || 'user';
            await supabase.from('profiles').upsert(
                { id: user.id, username, email: user.email },
                { onConflict: 'id' }
            );
            await supabase.from('study_data').upsert(
                { user_id: user.id },
                { onConflict: 'user_id' }
            );
            profile = await getProfile(user.id);
            studyRow = await getStudyData(user.id);
        }

        this.userId   = user.id;
        this.dbRow    = studyRow || {};
        this.timer.loadFromDB(studyRow || {});
        this.pro.isPro = profile?.is_pro || false;
        await this.enterApp(profile?.username || 'User');
    }

    /* ── View: App ───────────────────────────────────── */
    async enterApp(username) {
        this.currentUser = username;

        // Update user badge
        if (this.DOM.userLabel) this.DOM.userLabel.textContent = username.toUpperCase();
        if (this.DOM.userBtn)   this.DOM.userBtn.classList.remove('hidden');
        if (this.DOM.userMenuItem) this.DOM.userMenuItem.classList.remove('hidden');
        if (this.DOM.menuUsername) this.DOM.menuUsername.textContent = username;

        // ── Avatar initials for glassmorphism bottom sheet ──
        const fmAvatar = document.getElementById('fmAvatar');
        if (fmAvatar) fmAvatar.textContent = username.slice(0, 2).toUpperCase();

        // ── Full screen menu ────────────────────────────────
        const openMenu = () => {
            if (!this.DOM.fullMenuOverlay) return;
            this.DOM.fullMenuOverlay.style.display = 'flex';
            // Update dark mode label
            const isDark = this.DOM.html.classList.contains('dark');
            if (this.DOM.mDarkModeLabel) this.DOM.mDarkModeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';
            // Show export if pro
            if (this.DOM.mExport) this.DOM.mExport.style.display = this.pro?.isPro ? 'flex' : 'none';
        };
        const closeMenu = () => {
            if (!this.DOM.fullMenuOverlay) return;
            this.DOM.fullMenuOverlay.style.animation = 'none';
            this.DOM.fullMenuOverlay.style.opacity = '0';
            this.DOM.fullMenuOverlay.style.transform = 'translateY(20px)';
            this.DOM.fullMenuOverlay.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            setTimeout(() => {
                this.DOM.fullMenuOverlay.style.display = 'none';
                this.DOM.fullMenuOverlay.style.opacity = '';
                this.DOM.fullMenuOverlay.style.transform = '';
                this.DOM.fullMenuOverlay.style.transition = '';
                this.DOM.fullMenuOverlay.style.animation = '';
            }, 200);
        };

        this.DOM.menuBtn?.addEventListener('click', openMenu);
        this.DOM.menuBtn2?.addEventListener('click', openMenu);
        this.DOM.fullMenuClose?.addEventListener('click', closeMenu);

        // Nav rows
        this.DOM.mNavStats?.addEventListener('click', () => { closeMenu(); setTimeout(() => window.location.href = './stats.html', 200); });
        this.DOM.mNavLeaderboard?.addEventListener('click', () => { closeMenu(); setTimeout(() => window.location.href = './leaderboard.html', 200); });
        this.DOM.mNavFriends?.addEventListener('click', () => { closeMenu(); setTimeout(() => window.location.href = './friends.html', 200); });
        this.DOM.mNavStore?.addEventListener('click', () => { closeMenu(); setTimeout(() => window.location.href = './store.html', 200); });

        // Pro
        this.DOM.mPro?.addEventListener('click', () => {
            closeMenu();
            setTimeout(() => this.DOM.proModal?.classList.remove('hidden'), 200);
        });

        // Export
        this.DOM.mExport?.addEventListener('click', () => {
            closeMenu();
            setTimeout(() => this.DOM.exportBtn?.click(), 200);
        });

        // Dark mode toggle
        this.DOM.mDarkMode?.addEventListener('click', () => {
            const isNowDark = this.DOM.html.classList.toggle('dark');
            localStorage.setItem('darkMode', isNowDark);
            document.documentElement.style.setProperty('--dropdown-bg',
                isNowDark ? 'rgba(30,28,50,0.97)' : 'rgba(255,255,255,0.92)');
            if (this.DOM.mDarkModeLabel) this.DOM.mDarkModeLabel.textContent = isNowDark ? 'Light Mode' : 'Dark Mode';
            this.updateThemeBtn(isNowDark);
            if (this.chart) this.updateChartTheme();
        });

        // Logout
        this.DOM.mLogout?.addEventListener('click', async () => {
            if (this.timer.isRunning) this.timer.pause();
            await this.room?.stopStudying();
            await this.room?.leave();
            await signOut();
            window.location.replace('./index.html');
        });

        // Reset
        this.DOM.mReset?.addEventListener('click', () => {
            closeMenu();
            setTimeout(() => {
                if (!confirm('Reset all data? This cannot be undone.')) return;
                this.timer.reset();
                this.DOM.startBtn.textContent = 'START FOCUS';
                this.DOM.body.setAttribute('data-focus-state', 'inactive');
                this.renderTimerDigits({ h: '00', m: '00', s: '00' });
                this.updateLogs();
                this.updateChart();
            }, 200);
        });

        // Init store
        this.store = new StoreManager(username);
        this.currentTokens = 0;

        // Init study room
        this.room = new StudyRoom(username, (users) => this.renderRoom(users));
        await this.room.join();

        // Init daily challenge
        this.challenge = new ChallengeManager(this.userId, (reward) => {
            this.timer.data.total_exp = (this.timer.data.total_exp || 0) + reward;
            this.updateChallenge();
            this.showToast(`⚡ +${(reward * 0.016).toFixed(0)} $STUDY earned!`);
        });
        await this.challenge.load();
        this.updateChallenge();

        // Init pomodoro
        this.pomo = new PomodoroManager();
        this.pomodoroMode = false;
        this.lastSessionDelta = 0;

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Load custom subjects
        this.subjects = this.loadSubjects(username);
        this.buildSubjectList();

        // Restore Pro theme & show Pro UI if unlocked
        this.pro.restoreTheme();
        if (this.DOM.cryptoBtn) this.DOM.cryptoBtn.dataset.theme = this.pro.themeKey || 'default';
        this.updateProUI();

        // Set progress circle
        this.DOM.progressCircle?.setAttribute('stroke-dasharray', this.CIRCUMFERENCE);
        this.DOM.progressCircle?.setAttribute('stroke-dashoffset', this.CIRCUMFERENCE);

        this.initAppHandlers();
        this.initChart();

        // Rebuild theme grid when returning from store.html
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) this.buildThemeGrid();
        });
        this.updateLogs();

        const stats = this.timer.getStats();
        if (this.DOM.rankTextTop) this.DOM.rankTextTop.textContent = stats.rank.name;
        if (this.DOM.rankText)    this.DOM.rankText.textContent    = stats.rank.name;

        // Update bottom sheet sub-label with current rank
        const fmUserSub = document.getElementById('fmUserSub');
        if (fmUserSub) fmUserSub.textContent = stats.rank.name;

        // Set initial token display from loaded DB data
        if (this.DOM.tokenDisplay) {
            const exp = this.timer.data.total_exp || 0;
            this.DOM.tokenDisplay.textContent = (exp * 0.016).toFixed(3).padStart(7, '0');
            this.currentTokens = exp * 0.016;
        }
        this.updateStreak();
        this.updateGoalBar();
        this.lastRankLevel = this.timer.getRank(this.timer.data.total_exp).level;
        if (this.DOM.tokenDisplay) {
            this.DOM.tokenDisplay.textContent = ((stats.total_exp || 0) * 0.016).toFixed(3).padStart(7, '0');
        }
    }

    initAppHandlers() {
        // Theme
        this.DOM.modeBtn?.addEventListener('click', () => {
            const isNowDark = this.DOM.html.classList.toggle('dark');
            localStorage.setItem('darkMode', isNowDark);
            document.documentElement.style.setProperty('--dropdown-bg',
                isNowDark ? 'rgba(30,28,50,0.97)' : 'rgba(255,255,255,0.92)');
            this.updateThemeBtn(isNowDark);
            this.shuffleText(this.DOM.modeBtn, isNowDark ? 'BRIGHT MODE' : 'DARK MODE');
            if (this.chart) this.updateChartTheme();
            this.popDonateBtn();
        });

        // Dropdown
        this.DOM.customSelectBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this.DOM.customOptions.style.maxHeight !== '0px' && this.DOM.customOptions.style.maxHeight !== '';
            this.DOM.customOptions.style.maxHeight = isOpen ? '0px' : '400px';
            this.DOM.customOptions.style.opacity   = isOpen ? '0'   : '1';
        });
        document.querySelectorAll('.option-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const val = e.target.dataset.value;
                this.DOM.selectedDisplay.textContent = val;
                this.DOM.subjectSelect.value = val;
                this.DOM.customOptions.style.maxHeight = '0px';
                this.DOM.customOptions.style.opacity   = '0';
                const sec = this.timer.getStats().sessions[val] || 0;
                this.renderTimerDigits(this.timer.formatTime(sec));
            });
        });
        document.addEventListener('click', () => {
            this.DOM.customOptions.style.maxHeight = '0px';
            this.DOM.customOptions.style.opacity   = '0';
        });

        // Start / Pause
        this.DOM.startBtn?.addEventListener('click', () => {
            if (this.timer.isRunning) {
                this.timer.pause();
                this.DOM.startBtn.textContent = 'START FOCUS';
                this.DOM.body.setAttribute('data-focus-state', 'inactive');
                this.updateChart();
                this.room?.stopStudying();
                this.showNotesModal();
            } else {
                const subject = this.DOM.subjectSelect.value || 'STUDY';
                this.timer.start(subject);
                this.DOM.startBtn.textContent = 'PAUSE';
                this.DOM.body.setAttribute('data-focus-state', 'active');
                this.room?.startStudying(subject);
            }
        });

        // Reset
        this.DOM.resetBtn?.addEventListener('click', () => {
            if (!confirm('Reset all data? This cannot be undone.')) return;
            this.timer.reset();
            this.DOM.startBtn.textContent = 'START FOCUS';
            this.DOM.body.setAttribute('data-focus-state', 'inactive');
            this.renderTimerDigits({ h: '00', m: '00', s: '00' });
            this.updateLogs();
            this.updateChart();
            if (this.DOM.tokenDisplay)   this.DOM.tokenDisplay.textContent = '000.000';
            if (this.DOM.expBar)         this.DOM.expBar.style.width = '0%';
            if (this.DOM.expValue)       this.DOM.expValue.textContent = '0%';
            if (this.DOM.progressCircle) this.DOM.progressCircle.style.strokeDashoffset = this.CIRCUMFERENCE;
            if (this.DOM.rankTextTop)    this.DOM.rankTextTop.textContent = 'Apprentice';
            if (this.DOM.rankText)       this.DOM.rankText.textContent = 'Apprentice';
        });

        // Pro modal
        this.DOM.proBtn?.addEventListener('click', () => {
            this.DOM.proModal.classList.remove('hidden');
        });
        this.DOM.proModalClose?.addEventListener('click', () => {
            this.DOM.proModal.classList.add('hidden');
        });
        this.DOM.proModal?.addEventListener('click', (e) => {
            if (e.target === this.DOM.proModal) this.DOM.proModal.classList.add('hidden');
        });

        // Unlock code submit
        this.DOM.proCodeSubmit?.addEventListener('click', async () => {
            const code = this.DOM.proCodeInput?.value?.trim();
            if (!code) return;
            const ok = await this.pro.unlock(code);
            if (ok) {
                this.DOM.proModal.classList.add('hidden');
                this.updateProUI();
                this.showProSuccess();
            } else {
                if (this.DOM.proCodeError) {
                    this.DOM.proCodeError.textContent = 'Invalid code. Check your purchase email.';
                    setTimeout(() => { this.DOM.proCodeError.textContent = ''; }, 3000);
                }
            }
        });
        this.DOM.proCodeInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.DOM.proCodeSubmit?.click();
        });

        // Export
        this.DOM.exportBtn?.addEventListener('click', () => {
            if (!this.pro.isPro) { this.DOM.proModal.classList.remove('hidden'); return; }
            this.pro.exportCSV(this.timer.getStats(), this.currentUser);
        });

        // Contact modal
        this.DOM.contactBtn?.addEventListener('click', () => {
            this.DOM.contactModal.classList.remove('hidden');
        });
        this.DOM.contactClose?.addEventListener('click', () => {
            this.DOM.contactModal.classList.add('hidden');
        });
        this.DOM.contactModal?.addEventListener('click', (e) => {
            if (e.target === this.DOM.contactModal) this.DOM.contactModal.classList.add('hidden');
        });

        // ⋯ Menu toggle — waterfall animation
        const openMenu = () => {
            this.DOM.menuDropdown?.classList.remove('hidden');
            requestAnimationFrame(() => this.DOM.menuDropdown?.classList.add('open'));
        };
        const closeMenu = () => {
            this.DOM.menuDropdown?.classList.remove('open');
            setTimeout(() => this.DOM.menuDropdown?.classList.add('hidden'), 280);
        };

        this.DOM.menuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = this.DOM.menuDropdown?.classList.contains('open');
            isOpen ? closeMenu() : openMenu();
        });
        document.addEventListener('click', (e) => {
            if (!this.DOM.menuContainer?.contains(e.target)) closeMenu();
        });
        this.DOM.menuDropdown?.querySelectorAll('.menu-item, button').forEach(btn => {
            btn.addEventListener('click', () => closeMenu());
        });

        // Daily challenge claim
        this.DOM.challengeClaimBtn?.addEventListener('click', async () => {
            const ok = await this.challenge.claim();
            if (ok) this.updateChallenge();
        });

        // Friends
        this.DOM.friendsBtn?.addEventListener('click', () => {
            if (this.timer.isRunning) this.timer.pause();
            window.location.href = './friends.html';
        });

        // Leaderboard
        this.DOM.leaderboardBtn?.addEventListener('click', () => {
            if (this.timer.isRunning) this.timer.pause();
            window.location.href = './leaderboard.html';
        });

        // Stats page
        this.DOM.statsBtn?.addEventListener('click', () => {
            if (this.timer.isRunning) this.timer.pause();
            window.location.href = './stats.html';
        });

        // ── Add Subject Modal ─────────────────────────────────
        const addSubjectInput  = document.getElementById('addSubjectInput');
        const addSubjectModal  = document.getElementById('addSubjectModal');
        document.getElementById('addSubjectSave')?.addEventListener('click', () => {
            const val = addSubjectInput?.value?.trim().toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,20);
            if (val && !this.subjects.includes(val)) {
                this.subjects.push(val);
                this.saveSubjects();
                this.buildSubjectList();
                // Auto select new subject
                const display = document.getElementById('selectedDisplay');
                if (display) display.textContent = val;
                const sel = document.getElementById('subjectSelect');
                if (sel) sel.value = val;
            }
            if (addSubjectInput) addSubjectInput.value = '';
            addSubjectModal?.classList.add('hidden');
        });
        document.getElementById('addSubjectCancel')?.addEventListener('click', () => {
            addSubjectModal?.classList.add('hidden');
        });
        addSubjectInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('addSubjectSave')?.click();
            if (e.key === 'Escape') addSubjectModal?.classList.add('hidden');
        });

        // ── Keyboard shortcut — Space to start/stop ───────────────
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                this.DOM.startBtn?.click();
            }
        });

        // ── Pomodoro ──────────────────────────────────────────
        this.DOM.pomodoroToggle?.addEventListener('click', () => {
            this.pomodoroMode = !this.pomodoroMode;
            this.DOM.pomodoroToggle.style.opacity = this.pomodoroMode ? '1' : '0.3';
            this.DOM.pomodoroSettings?.classList.toggle('hidden', !this.pomodoroMode);
            if (!this.pomodoroMode) {
                this.pomo.stop();
                this.DOM.pomodoroPhase.style.opacity = '0';
            }
            // Load saved settings into inputs
            const s = this.pomo.settings;
            if (this.DOM.pomoFocusInput) this.DOM.pomoFocusInput.value = s.focusMin;
            if (this.DOM.pomoBreakInput) this.DOM.pomoBreakInput.value = s.breakMin;
        });

        this.DOM.pomoSaveBtn?.addEventListener('click', () => {
            const f = Math.max(1, parseInt(this.DOM.pomoFocusInput.value) || 25);
            const b = Math.max(1, parseInt(this.DOM.pomoBreakInput.value) || 5);
            this.pomo.saveSettings(f, b);
            this.DOM.pomoFocusInput.value = f;
            this.DOM.pomoBreakInput.value = b;
            this.DOM.pomoSaveBtn.textContent = 'Saved ✓';
            setTimeout(() => { this.DOM.pomoSaveBtn.textContent = 'Save'; }, 1500);
        });

        // ── Session Notes ─────────────────────────────────────
        this.DOM.notesSaveBtn?.addEventListener('click', () => {
            const text = this.DOM.notesInput?.value?.trim();
            if (text) {
                this.timer.addNote(this.DOM.subjectSelect.value, text, this.lastSessionDelta);
                this.updateLogs();
            }
            this.DOM.notesModal?.classList.add('hidden');
            this.DOM.notesInput && (this.DOM.notesInput.value = '');
        });
        this.DOM.notesSkipBtn?.addEventListener('click', () => {
            this.DOM.notesModal?.classList.add('hidden');
            this.DOM.notesInput && (this.DOM.notesInput.value = '');
        });

        // ── Goal ──────────────────────────────────────────────
        this.DOM.goalEditBtn?.addEventListener('click', () => {
            const subject = this.DOM.subjectSelect?.value || 'CODING';
            const current = this.timer.getGoal(subject);
            if (this.DOM.goalInput)       this.DOM.goalInput.value = current;
            if (this.DOM.goalSubjectLabel) this.DOM.goalSubjectLabel.textContent = subject;
            this.DOM.goalModal?.classList.remove('hidden');
        });
        this.DOM.goalSaveBtn?.addEventListener('click', () => {
            const subject = this.DOM.subjectSelect?.value || 'CODING';
            const hours   = parseFloat(this.DOM.goalInput?.value) || 4;
            this.timer.setGoal(subject, Math.max(0.5, Math.min(24, hours)));
            this.updateGoalBar();
            this.updateGoalDisplay();
            this.DOM.goalModal?.classList.add('hidden');
        });
        this.DOM.goalCancelBtn?.addEventListener('click', () => {
            this.DOM.goalModal?.classList.add('hidden');
        });
        this.DOM.goalModal?.addEventListener('click', (e) => {
            if (e.target === this.DOM.goalModal) this.DOM.goalModal.classList.add('hidden');
        });

        // Donate button toggle with letter shuffle
        const donateHidden = localStorage.getItem('fv_donate_hidden') === 'true';
        if (donateHidden) {
            this.DOM.cryptoBtn?.classList.add('hidden');
            if (this.DOM.donateToggle) this.DOM.donateToggle.textContent = 'SHOW DONATE';
        }
        this.DOM.donateToggle?.addEventListener('click', () => {
            const isHidden = this.DOM.cryptoBtn?.classList.toggle('hidden');
            localStorage.setItem('fv_donate_hidden', isHidden);
            this.shuffleText(this.DOM.donateToggle, isHidden ? 'SHOW DONATE' : 'HIDE DONATE');
        });

        // Focus Mode — hide everything except the timer card
        const focusBtn = document.getElementById('focusModeToggle');
        const focusActive = localStorage.getItem('fv_focus_mode') === 'true';
        if (focusActive) {
            this.DOM.body.classList.add('focus-mode');
            if (focusBtn) this.shuffleText(focusBtn.querySelector('span') || focusBtn, 'EXIT FOCUS');
        }
        focusBtn?.addEventListener('click', () => {
            const isNow = this.DOM.body.classList.toggle('focus-mode');
            localStorage.setItem('fv_focus_mode', isNow);
            const label = isNow ? 'EXIT FOCUS' : 'FOCUS MODE';
            this.shuffleText(focusBtn.querySelector('span') || focusBtn, label);
        });

        // Go to store from theme card
        document.getElementById('goStoreBtn')?.addEventListener('click', () => {
            if (this.timer.isRunning) this.timer.pause();
            window.location.href = './store.html';
        });

        // Store — navigate to dedicated page
        this.DOM.storeBtn?.addEventListener('click', () => {
            if (this.timer.isRunning) this.timer.pause();
            window.location.href = './store.html';
        });

        // Crypto donate modal
        const CRYPTO_WALLETS = {
            btc: { label: 'Bitcoin (BTC)',  address: 'bc1q3d4rd6sjnjv6m2342f77kx3ahrsepx434804aw' },
            eth: { label: 'Ethereum (ETH)', address: '0xD8fcee8F64345372Af8A45aA06aEa9541e1730E4' },
            sol: { label: 'Solana (SOL)',   address: 'BX9HJdLWTJQJPXKpQpre7mL6fkeiz5W2AmoQXmgTT2Zx' },
        };
        let activeCoin = 'btc';

        const updateCryptoDisplay = (coin) => {
            activeCoin = coin;
            const w = CRYPTO_WALLETS[coin];
            if (this.DOM.cryptoAddress)   this.DOM.cryptoAddress.textContent  = w.address;
            if (this.DOM.cryptoCoinLabel) this.DOM.cryptoCoinLabel.textContent = w.label;
            document.querySelectorAll('.crypto-tab').forEach(t => {
                t.classList.toggle('crypto-tab--active', t.dataset.coin === coin);
            });
        };

        this.DOM.cryptoBtn?.addEventListener('click', () => {
            this.DOM.cryptoModal.classList.remove('hidden');
            updateCryptoDisplay('btc');
        });
        this.DOM.cryptoModalClose?.addEventListener('click', () => {
            this.DOM.cryptoModal.classList.add('hidden');
        });

        // Donate tabs — SlidingTabs
        const donateTrack = document.getElementById('donateTabTrack');
        let donateTabs = null;
        if (donateTrack) {
            const switchPanel = (isCrypto) => {
                const panelCrypto = document.getElementById('donatePanelCrypto');
                const panelToss   = document.getElementById('donatePanelToss');
                if (panelCrypto) {
                    panelCrypto.style.transition = 'opacity 0.18s';
                    panelCrypto.style.opacity    = isCrypto ? '1' : '0';
                    panelCrypto.style.visibility = isCrypto ? 'visible' : 'hidden';
                    panelCrypto.style.position   = isCrypto ? 'relative' : 'absolute';
                }
                if (panelToss) {
                    panelToss.style.transition = 'opacity 0.18s';
                    panelToss.style.opacity    = isCrypto ? '0' : '1';
                    panelToss.style.visibility = isCrypto ? 'hidden' : 'visible';
                    panelToss.style.position   = isCrypto ? 'absolute' : 'relative';
                    panelToss.style.display    = '';
                }
            };
            donateTabs = new SlidingTabs(donateTrack, (i) => switchPanel(i === 0));
        }
        this.DOM.cryptoModal?.addEventListener('click', () => {});
        const origBmcOpen = this.DOM.bmcBtn?.onclick;
        document.querySelectorAll('[data-opens-donate], #bmcBtn').forEach(btn => {
            btn.addEventListener('click', () => {
                requestAnimationFrame(() => requestAnimationFrame(() => donateTabs?.refresh()));
            });
        });
        const donateObserver = new MutationObserver(() => {
            if (!this.DOM.cryptoModal?.classList.contains('hidden')) {
                requestAnimationFrame(() => requestAnimationFrame(() => donateTabs?.refresh()));
            }
        });
        if (this.DOM.cryptoModal) donateObserver.observe(this.DOM.cryptoModal, { attributes: true, attributeFilter: ['class'] });
        window.switchDonateTab = () => {};

        // Toss copy
        this.DOM.tossCopyBtn?.addEventListener('click', () => {
            navigator.clipboard.writeText('1908-1210-4055').then(() => {
                if (this.DOM.tossCopied) {
                    this.DOM.tossCopied.style.opacity = '1';
                    setTimeout(() => { this.DOM.tossCopied.style.opacity = '0'; }, 2000);
                }
                if (this.DOM.tossCopyBtn) {
                    this.DOM.tossCopyBtn.textContent = '복사됐어요! ✓';
                    setTimeout(() => { this.DOM.tossCopyBtn.textContent = '계좌번호 복사'; }, 2000);
                }
            });
        });
        this.DOM.cryptoModal?.addEventListener('click', (e) => {
            if (e.target === this.DOM.cryptoModal) this.DOM.cryptoModal.classList.add('hidden');
        });
        // Crypto coin tabs — sliding pill
        const cryptoCoinTrack = document.getElementById('cryptoCoinTrack');
        if (cryptoCoinTrack) {
            const coins = ['btc', 'eth', 'sol'];
            new SlidingTabs(cryptoCoinTrack, (i) => {
                updateCryptoDisplay(coins[i]);
            });
        }
        this.DOM.cryptoCopyBtn?.addEventListener('click', () => {
            navigator.clipboard.writeText(CRYPTO_WALLETS[activeCoin].address).then(() => {
                if (this.DOM.cryptoCopied) {
                    this.DOM.cryptoCopied.style.opacity = '1';
                    setTimeout(() => { this.DOM.cryptoCopied.style.opacity = '0'; }, 2000);
                }
                if (this.DOM.cryptoCopyBtn) {
                    this.DOM.cryptoCopyBtn.textContent = 'Copied! ✓';
                    setTimeout(() => { this.DOM.cryptoCopyBtn.textContent = 'Copy Address'; }, 2000);
                }
            });
        });

        // Logout
        this.DOM.userBtn?.addEventListener('click', async () => {
            if (!confirm(`Log out of ${this.currentUser}?`)) return;
            if (this.timer.isRunning) this.timer.pause();
            localStorage.removeItem(SESSION_KEY);
            this.currentUser = null;
            window.location.replace('./login.html');
            this.DOM.body.setAttribute('data-focus-state', 'inactive');
            this.DOM.startBtn.textContent = 'START FOCUS';
        });
    }

    /* ── Chart ───────────────────────────────────────── */
    initChart() {
        if (!this.DOM.chartCanvas) return;
        if (this.chart) { this.chart.destroy(); this.chart = null; }

        const weekly     = this.timer.getStats().weeklyData;
        const isDark     = this.DOM.html.classList.contains('dark');
        const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const labelColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(40,36,86,0.4)';
        const barColor   = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(105,100,198,0.25)';
        const barHover   = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(105,100,198,0.6)';

        this.chart = new Chart(this.DOM.chartCanvas, {
            type: 'bar',
            data: {
                labels:   weekly.map(d => d.label),
                datasets: [{ data: weekly.map(d => +(d.seconds / 3600).toFixed(2)), backgroundColor: barColor, hoverBackgroundColor: barHover, borderRadius: 8, borderSkipped: false }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: ctx => { const h = Math.floor(ctx.parsed.y); const m = Math.round((ctx.parsed.y - h) * 60); return ` ${h}h ${m}m`; } },
                        backgroundColor: isDark ? '#222' : '#fff', titleColor: isDark ? '#fff' : '#282456',
                        bodyColor: isDark ? '#aaa' : '#555', borderColor: isDark ? '#333' : '#e5e7eb',
                        borderWidth: 1, padding: 10, cornerRadius: 8,
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: labelColor, font: { size: 9, weight: '700', family: 'Inter' } }, border: { display: false } },
                    y: { grid: { color: gridColor }, ticks: { color: labelColor, font: { size: 9, family: 'Inter' }, callback: v => v === 0 ? '' : v + 'h' }, border: { display: false }, beginAtZero: true }
                },
                animation: { duration: 600, easing: 'easeOutQuart' }
            }
        });
    }

    updateChart() {
        if (!this.chart) return;
        const weekly = this.timer.getStats().weeklyData;
        this.chart.data.labels           = weekly.map(d => d.label);
        this.chart.data.datasets[0].data = weekly.map(d => +(d.seconds / 3600).toFixed(2));
        this.chart.update();
    }

    updateChartTheme() {
        if (!this.chart) return;
        const isDark     = this.DOM.html.classList.contains('dark');
        const gridColor  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
        const labelColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(40,36,86,0.4)';
        const barColor   = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(105,100,198,0.25)';
        this.chart.data.datasets[0].backgroundColor = barColor;
        this.chart.options.scales.x.ticks.color = labelColor;
        this.chart.options.scales.y.ticks.color = labelColor;
        this.chart.options.scales.y.grid.color  = gridColor;
        this.chart.options.plugins.tooltip.backgroundColor = isDark ? '#222' : '#fff';
        this.chart.options.plugins.tooltip.titleColor      = isDark ? '#fff' : '#282456';
        this.chart.update();
    }

    /* ── Render (every tick) ─────────────────────────── */
    render(data) {
        this.renderTimerDigits(data.formatted);

        if (this.DOM.progressCircle) {
            this.DOM.progressCircle.style.strokeDashoffset =
                this.CIRCUMFERENCE * (1 - (data.raw % 3600) / 3600);
        }

        if (this.DOM.tokenDisplay) {
            this.DOM.tokenDisplay.textContent = (data.rawTotalExp * 0.016).toFixed(3).padStart(7, '0');
        }

        const rank         = data.rank;
        const prevThresh   = [0, 0, 3600, 10800, 36000, 86400][rank.level] ?? 0;
        const tierSize     = rank.next === Infinity ? 1 : rank.next - prevThresh;
        const expPct       = rank.next === Infinity ? 100 : Math.min(Math.floor(((data.rawTotalExp - prevThresh) / tierSize) * 100), 100);

        if (this.DOM.expBar)   this.DOM.expBar.style.width   = expPct + '%';
        if (this.DOM.expValue) this.DOM.expValue.textContent = expPct + '%';
        if (this.DOM.rankTextTop && this.DOM.rankTextTop.textContent !== rank.name) this.DOM.rankTextTop.textContent = rank.name;
        if (this.DOM.rankText    && this.DOM.rankText.textContent    !== rank.name) this.DOM.rankText.textContent    = rank.name;

        // Track live tokens
        this.currentTokens = data.rawTotalExp * 0.016;

        // Rank-up detection
        if (data.rank.level > (this.lastRankLevel || 1)) {
            this.lastRankLevel = data.rank.level;
            this.showRankUp(data.rank.name);
            // Update bottom sheet rank sub-label on rank-up
            const fmUserSub = document.getElementById('fmUserSub');
            if (fmUserSub) fmUserSub.textContent = data.rank.name;
        }
        if (this.DOM.storeBalance) {
            this.DOM.storeBalance.textContent = this.currentTokens.toFixed(3);
        }

        // Tick sound
        if (this.store && data.raw % 1 === 0) this.store.playTickSound();

        if (data.raw % 5 === 0) this.updateLogs();
        if (data.raw % 30 === 0) this.updateChallenge();
    }

    renderTimerDigits(formatted) {
        const units = ['hour-tens','hour-ones','min-tens','min-ones','sec-tens','sec-ones'];
        const vals  = [...formatted.h, ...formatted.m, ...formatted.s];
        units.forEach((u, i) => {
            const el = document.querySelector(`[data-unit="${u}"]`);
            if (el && el.textContent !== vals[i]) {
                el.textContent = vals[i];
                el.classList.remove('animate-roll');
                void el.offsetWidth;
                el.classList.add('animate-roll');
            }
        });
    }

    updateLogs() {
        this.updateGoalBar();
        this.updateGoalDisplay();
        this.updateStreak();
        const sessions = this.timer.getStats().sessions || {};
        const notes    = this.timer.data.notes || [];
        const entries  = Object.entries(sessions).filter(([, sec]) => sec > 0);
        if (!this.DOM.logList) return;
        if (!entries.length && !notes.length) {
            this.DOM.logList.innerHTML = '<p class="opacity-20 text-[10px] font-bold uppercase">No session data</p>';
            return;
        }

        const sessionHTML = entries
            .sort(([, a], [, b]) => b - a)
            .map(([sub, sec]) => {
                const time = new Date(sec * 1000).toISOString().substr(11, 8);
                const goal = this.timer.getGoal(sub);
                const pct  = Math.min((sec / (goal * 3600)) * 100, 100).toFixed(0);
                return `<div class="log-entry">
                    <div class="flex justify-between mb-1.5">
                        <span class="text-[10px] font-black uppercase opacity-60">${sub}</span>
                        <span class="text-[10px] font-black opacity-40">${time}</span>
                    </div>
                    <div class="w-full h-0.5 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full bg-current opacity-30 rounded-full transition-all duration-700" style="width:${pct}%"></div>
                    </div>
                </div>`;
            }).join('');

        const notesHTML = notes.slice(0, 5).map(n => {
            const d      = new Date(n.date);
            const label  = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dur    = n.duration ? ` · ${Math.floor(n.duration/60)}m` : '';
            return `<div class="log-entry" style="border-left:2px solid var(--accent,#6964c6);padding-left:0.75rem;opacity:0.7">
                <div class="flex justify-between mb-1">
                    <span class="text-[9px] font-black uppercase opacity-60">${n.subject}${dur}</span>
                    <span class="text-[9px] opacity-30 font-bold">${label}</span>
                </div>
                <p class="text-[10px] font-medium opacity-80">${n.text}</p>
            </div>`;
        }).join('');

        this.DOM.logList.innerHTML = sessionHTML + (notesHTML ? `<div class="mt-4 pt-4" style="border-top:1px solid rgba(255,255,255,0.08)"><p class="text-[9px] font-black uppercase tracking-widest opacity-30 mb-3">Recent Notes</p>${notesHTML}</div>` : '');
    }

    /* ── Pro ────────────────────────────────────────────── */
    updateProUI() {
        this.buildThemeGrid();

        if (this.pro.isPro) {
            if (this.DOM.proBtn) {
                this.DOM.proBtn.textContent = '✦ Pro ✓';
                this.DOM.proBtn.style.color = '#facc15';
                this.DOM.proBtn.style.opacity = '1';
            }
            if (this.DOM.exportBtn) this.DOM.exportBtn.classList.remove('hidden');
        }
    }

    buildThemeGrid() {
        if (!this.DOM.themeGrid) return;

        const storeRaw   = localStorage.getItem(`fv_store:${this.currentUser}`);
        const storeData  = storeRaw ? JSON.parse(storeRaw) : {};
        const ownedItems = storeData.items || [];

        const gradients = {
            default:  '#4f4b84,#3b3861',
            midnight: '#1e3a5f,#60a5fa',
            forest:   '#065f46,#4ade80',
            sunset:   '#c2410c,#f97316',
            ocean:    '#0e7490,#22d3ee',
            mono:     '#404040,#a3a3a3',
            cherry:   '#9f1239,#fb7185',
            galaxy:   '#1e1b4b,#a78bfa',
            gold:     '#78350f,#fbbf24',
        };

        const visible = Object.entries(THEMES).filter(([key, theme]) => {
            if (key === 'default') return true;
            if (this.pro.isPro && theme.free) return true;
            if (ownedItems.includes(key)) return true;
            return false;
        });

        const activeKey = localStorage.getItem('fv_theme') || 'default';

        this.DOM.themeGrid.innerHTML = visible.map(([key, theme]) => {
            const isActive = key === activeKey;
            return `<button data-theme="${key}"
                class="theme-swatch ${isActive ? 'theme-swatch--active' : ''} cursor-pointer hover:scale-105"
                style="background:linear-gradient(135deg,${gradients[key] || '#333,#111'})"
                title="${theme.name}">
                <span class="theme-swatch-label">${theme.name}</span>
                ${isActive ? '<span class="theme-swatch-check">✓</span>' : ''}
            </button>`;
        }).join('');

        this.DOM.themeGrid.querySelectorAll('[data-theme]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.pro.applyTheme(btn.dataset.theme);
                this.buildThemeGrid();
                this.popDonateBtn(btn.dataset.theme);
            });
        });
    }

    showProSuccess() {
        this.buildThemeGrid();
        const toast = document.createElement('div');
        toast.textContent = '✦ Pro unlocked! Enjoy your themes & export.';
        toast.style.cssText = `
            position:fixed; bottom:7rem; left:50%; transform:translateX(-50%);
            background:#facc15; color:#000; padding:.75rem 1.5rem;
            border-radius:2rem; font-size:11px; font-weight:800;
            letter-spacing:.1em; text-transform:uppercase;
            z-index:9999; white-space:nowrap;
            animation: toastIn .3s cubic-bezier(.22,1,.36,1) both;
        `;
        document.head.insertAdjacentHTML('beforeend',
            '<style>@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}</style>');
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    /* ── Letter shuffle ─────────────────────────────────── */
    shuffleText(el, newText) {
        if (!el) return;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const final = newText.toUpperCase();
        let iteration = 0;
        const maxIter = final.length * 3;
        clearInterval(el._shuffleId);
        el._shuffleId = setInterval(() => {
            el.textContent = final.split('').map((char, i) => {
                if (char === ' ') return ' ';
                if (i < iteration / 3) return final[i];
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            iteration++;
            if (iteration >= maxIter) {
                clearInterval(el._shuffleId);
                el.textContent = final;
            }
        }, 30);
    }

    /* ── Rank up animation ──────────────────────────────── */
    showRankUp(rankName) {
        const overlay = this.DOM.rankUpOverlay;
        const card    = this.DOM.rankUpCard;
        const name    = this.DOM.rankUpName;
        if (!overlay || !card) return;

        if (name) name.textContent = rankName;
        overlay.classList.remove('hidden');
        overlay.style.background = 'rgba(0,0,0,0.7)';
        overlay.style.backdropFilter = 'blur(8px)';

        requestAnimationFrame(() => {
            card.style.transform = 'scale(1)';
            card.style.opacity   = '1';
        });

        this.notify('🏆 Rank Up!', `You are now ${rankName}!`);

        setTimeout(() => {
            card.style.transform = 'scale(1.1)';
            card.style.opacity   = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.style.background = '';
                card.style.transform = 'scale(0.5)';
            }, 400);
        }, 2500);
    }

    /* ── Streak / Goal helpers ──────────────────────────── */
    updateStreak() {
        const streak = this.timer.data.streak || 0;
        if (this.DOM.streakDisplay) {
            this.DOM.streakDisplay.classList.toggle('hidden', streak === 0);
        }
        if (this.DOM.streakCount) this.DOM.streakCount.textContent = streak;
    }

    updateGoalBar() {
        const subject  = this.DOM.subjectSelect?.value || 'CODING';
        const progress = this.timer.getNormalizedProgress(subject);
        if (this.DOM.goalBar) this.DOM.goalBar.style.width = `${Math.min(progress * 100, 100)}%`;
    }

    updateGoalDisplay() {
        const subject = this.DOM.subjectSelect?.value || 'CODING';
        const hours   = this.timer.getGoal(subject);
        if (this.DOM.goalDisplay) this.DOM.goalDisplay.textContent = `${hours}h`;
    }

    showNotesModal() {
        if (this.DOM.notesInput) this.DOM.notesInput.value = '';
        this.DOM.notesModal?.classList.remove('hidden');
        setTimeout(() => this.DOM.notesInput?.focus(), 100);
    }

    updateTimerDisplay(formatted) {
        const el = this.DOM.timer;
        if (!el) return;
        const units = el.querySelectorAll('[data-unit]');
        const str   = `${formatted.h}${formatted.m}${formatted.s}`;
        const keys  = ['hour-tens','hour-ones','min-tens','min-ones','sec-tens','sec-ones'];
        units.forEach((u, i) => { if (keys[i]) u.textContent = str[i] || '0'; });
    }

    /* ── Subjects ───────────────────────────────────────── */
    loadSubjects(username) {
        try {
            const saved = JSON.parse(localStorage.getItem(`fv_subjects:${username}`) || 'null');
            return saved || ['CODING', 'STUDY', 'MATH', 'DESIGN'];
        } catch { return ['CODING', 'STUDY', 'MATH', 'DESIGN']; }
    }

    saveSubjects() {
        localStorage.setItem(`fv_subjects:${this.currentUser}`, JSON.stringify(this.subjects));
    }

    buildSubjectList() {
        const ul  = document.getElementById('customOptions');
        const sel = document.getElementById('subjectSelect');
        const cur = this.DOM.subjectSelect?.value || this.subjects[0];
        if (!ul) return;

        ul.innerHTML = this.subjects.map(s => `
            <li class="option-item group flex items-center justify-between p-4 hover:bg-neutral-500 hover:text-white cursor-pointer text-xs font-bold" data-value="${s}">
                <span>${s}</span>
                ${!['CODING','STUDY','MATH','DESIGN'].includes(s) ? `
                <button class="delete-subject opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 px-2 transition-opacity" data-subject="${s}">✕</button>` : ''}
            </li>`).join('') +
            `<li class="p-4 text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-70 cursor-pointer border-t border-white/10 text-center" id="addSubjectTrigger">+ Add Subject</li>`;

        if (sel) {
            sel.innerHTML = this.subjects.map(s => `<option value="${s}">${s}</option>`).join('');
            sel.value = this.subjects.includes(cur) ? cur : this.subjects[0];
        }

        const display = document.getElementById('selectedDisplay');
        if (display && !this.subjects.includes(display.textContent)) {
            display.textContent = this.subjects[0];
        }

        ul.querySelectorAll('.option-item').forEach(li => {
            li.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-subject')) return;
                const val = li.dataset.value;
                if (!val) return;
                const display = document.getElementById('selectedDisplay');
                if (display) display.textContent = val;
                if (sel) sel.value = val;
                ul.style.maxHeight = '0'; ul.style.opacity = '0';
                this.updateGoalBar(); this.updateGoalDisplay();
            });
        });

        ul.querySelectorAll('.delete-subject').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const s = btn.dataset.subject;
                this.subjects = this.subjects.filter(x => x !== s);
                this.saveSubjects();
                this.buildSubjectList();
            });
        });

        document.getElementById('addSubjectTrigger')?.addEventListener('click', () => {
            ul.style.maxHeight = '0'; ul.style.opacity = '0';
            document.getElementById('addSubjectModal')?.classList.remove('hidden');
            setTimeout(() => document.getElementById('addSubjectInput')?.focus(), 100);
        });
    }

    /* ── Notifications ───────────────────────────────────── */
    notify(title, body) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body, icon: './icon.png' });
        }
    }

    /* ── Daily Challenge ────────────────────────────────── */
    updateChallenge() {
        if (!this.challenge?.challenge) {
            if (this.DOM.challengeDesc) this.DOM.challengeDesc.textContent = 'No challenge today — check back tomorrow!';
            return;
        }

        const c        = this.challenge.challenge;
        const progress = this.challenge.getProgress(this.timer.data);
        const pct      = Math.round(progress * 100);
        const claimable = this.challenge.isClaimable(this.timer.data);
        const done     = this.challenge.completed;

        if (this.DOM.challengeDesc)     this.DOM.challengeDesc.textContent = c.description;
        if (this.DOM.challengeReward)   this.DOM.challengeReward.textContent = `+${(c.reward * 0.016).toFixed(0)} $STUDY`;
        if (this.DOM.challengeBar)      this.DOM.challengeBar.style.width = `${pct}%`;
        if (this.DOM.challengeProgress) this.DOM.challengeProgress.textContent = done ? 'Done!' : `${pct}%`;

        if (done) {
            this.DOM.challengeClaimBtn?.classList.add('hidden');
            this.DOM.challengeDone?.classList.remove('hidden');
        } else if (claimable) {
            this.DOM.challengeClaimBtn?.classList.remove('hidden');
            this.DOM.challengeDone?.classList.add('hidden');
        } else {
            this.DOM.challengeClaimBtn?.classList.add('hidden');
            this.DOM.challengeDone?.classList.add('hidden');
        }
    }

    showToast(msg, color = '#facc15') {
        const toast = document.createElement('div');
        toast.textContent = msg;
        toast.style.cssText = `
            position:fixed;bottom:7rem;left:50%;transform:translateX(-50%);
            background:${color};color:#000;padding:.75rem 1.5rem;
            border-radius:2rem;font-size:11px;font-weight:800;
            letter-spacing:.1em;text-transform:uppercase;
            z-index:9999;white-space:nowrap;
            animation:toastIn .3s cubic-bezier(.22,1,.36,1) both;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    /* ── Study Room ─────────────────────────────────────── */
    renderRoom(users) {
        if (!this.DOM.roomList || !this.DOM.roomCount) return;

        const count = users.length;
        this.DOM.roomCount.textContent = count === 0 ? 'Empty' : `${count} studying`;

        if (count === 0) {
            this.DOM.roomList.innerHTML = '<p class="text-[10px] font-bold opacity-20 uppercase">No one studying right now</p>';
            return;
        }

        this.DOM.roomList.innerHTML = users.map(u => {
            const elapsed = u.startedAt ? Math.floor((Date.now() - u.startedAt) / 1000) : 0;
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;
            const initials = (u.username[0] || '?').toUpperCase();
            const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#6964c6';

            return `<div class="flex items-center gap-3 ${u.isMe ? 'opacity-100' : 'opacity-70'}">
                <div style="width:32px;height:32px;border-radius:50%;background:${u.isMe ? accent : 'rgba(255,255,255,0.15)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;flex-shrink:0;">
                    ${initials}
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="display:flex;align-items:center;gap:0.4rem;">
                        <p style="font-size:11px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.username}${u.isMe ? ' <span style="font-size:9px;opacity:0.4;">(you)</span>' : ''}</p>
                        <span style="font-size:9px;font-weight:700;opacity:0.5;text-transform:uppercase;letter-spacing:0.1em;">${u.subject || ''}</span>
                    </div>
                </div>
                <p style="font-size:10px;font-weight:700;opacity:0.4;flex-shrink:0;font-family:'DM Mono',monospace;">${timeStr}</p>
            </div>`;
        }).join('');

        clearTimeout(this._roomTimer);
        this._roomTimer = setTimeout(() => this.renderRoom(users), 60000);
    }

    /* ── Supabase store sync ────────────────────────────── */
    async syncStoreToSupabase() {
        if (!this.userId || !this.store) return;
        const storeData = this.store.getData();
        await saveStudyData(this.userId, {
            store_items:  storeData.items || [],
            active_theme: localStorage.getItem('fv_theme') || 'default',
        });
    }

    /* ── Store ──────────────────────────────────────────── */
    renderStore(cat) {
        if (!this.DOM.storeGrid) return;
        const items = STORE_ITEMS[cat] || [];
        const tokens = this.currentTokens || ((this.timer.data.total_exp || 0) * 0.016);

        this.DOM.storeGrid.innerHTML = items.map(item => {
            const owned   = this.store.owns(item.id);
            const isFree  = this.pro.isPro && item.proFree;
            const cost    = isFree ? 0 : item.price;
            const canAfford = tokens >= cost;

            const isActive = (cat === 'badges' && this.store.activeBadge === item.id)
                           || (cat === 'sounds' && this.store.activeSound === item.id);

            let btnLabel, btnClass;
            if (owned || isFree) {
                btnLabel = isActive ? 'Active ✓' : 'Equip';
                btnClass = isActive ? 'store-btn-active' : 'store-btn-owned';
            } else {
                btnLabel = `${cost} $STUDY`;
                btnClass = canAfford ? 'store-btn-buy' : 'store-btn-locked';
            }

            const previewStyle = item.preview
                ? `background:linear-gradient(135deg,${item.preview[0]},${item.preview[1]})`
                : '';

            return `<div class="store-item">
                <div class="store-item-preview" style="${previewStyle}">${item.emoji}</div>
                <div class="store-item-info">
                    <p class="store-item-name">${item.name}</p>
                    <p class="store-item-desc">${item.desc || (isFree ? '✦ Free with Pro' : `${item.price} $STUDY`)}</p>
                </div>
                <button class="store-item-btn ${btnClass}"
                    data-id="${item.id}" data-cat="${cat}" data-price="${cost}"
                    ${(!owned && !isFree && !canAfford) ? 'disabled' : ''}>
                    ${btnLabel}
                </button>
            </div>`;
        }).join('');

        this.DOM.storeGrid.querySelectorAll('.store-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id    = btn.dataset.id;
                const cat   = btn.dataset.cat;
                const price = parseInt(btn.dataset.price);
                const owned = this.store.owns(id);
                const isFree = this.pro.isPro && STORE_ITEMS[cat]?.find(i => i.id === id)?.proFree;

                if (owned || isFree) {
                    if (cat === 'sounds') {
                        this.store.setActiveSound(id);
                        try { SOUNDS[id]?.(); } catch {}
                    } else if (cat === 'badges') {
                        this.store.setActiveBadge(id);
                        const badge = STORE_ITEMS.badges.find(b => b.id === id);
                        if (badge) {
                            if (this.DOM.rankTextTop) this.DOM.rankTextTop.textContent = `${badge.emoji} ${badge.name}`;
                        }
                    } else if (cat === 'themes') {
                        if (EXTRA_THEMES[id]) Object.assign(THEMES, { [id]: { ...EXTRA_THEMES[id], free: false } });
                        this.pro.applyTheme(id);
                        this.popDonateBtn(id);
                    }
                    this.showStoreMsg('Equipped! ✓', '#4ade80');
                } else {
                    const tokens = this.currentTokens || ((this.timer.data.total_exp || 0) * 0.016);
                    const result = this.store.buy(id, price, tokens, this.pro.isPro);
                    if (result.ok) {
                        this.timer.data.total_exp = Math.max(0, this.timer.data.total_exp - Math.round(result.cost / 0.016));
                        this.timer.data.sessions[this.DOM.subjectSelect?.value || 'CODING'] =
                            this.timer.data.sessions[this.DOM.subjectSelect?.value || 'CODING'] || 0;
                        this.timer.pause();
                        if (cat === 'themes') {
                            if (EXTRA_THEMES[id]) Object.assign(THEMES, { [id]: { ...EXTRA_THEMES[id], free: false } });
                            this.pro.applyTheme(id);
                            this.popDonateBtn(id);
                        } else if (cat === 'sounds') {
                            this.store.setActiveSound(id);
                        } else if (cat === 'badges') {
                            this.store.setActiveBadge(id);
                            const badge = STORE_ITEMS.badges.find(b => b.id === id);
                            if (badge && this.DOM.rankTextTop) this.DOM.rankTextTop.textContent = `${badge.emoji} ${badge.name}`;
                        }
                        const boughtItem = STORE_ITEMS[cat]?.find(i => i.id === id);
                        this.showStoreMsg(`Purchased ${boughtItem?.name || ''}! ✓`, '#4ade80');
                    } else {
                        this.showStoreMsg(result.reason, '#f87171');
                    }
                }
                this.renderStore(cat);
            });
        });
    }

    showStoreMsg(msg, color = '#4ade80') {
        if (!this.DOM.storeMsg) return;
        this.DOM.storeMsg.textContent = msg;
        this.DOM.storeMsg.style.color = color;
        this.DOM.storeMsg.style.opacity = '1';
        setTimeout(() => { this.DOM.storeMsg.style.opacity = '0'; }, 2500);
    }

    popDonateBtn(themeKey) {
        const btn = this.DOM.cryptoBtn;
        if (!btn) return;
        btn.dataset.theme = themeKey || this.pro.themeKey || 'default';
        btn.classList.remove('theme-pop');
        void btn.offsetWidth;
        btn.classList.add('theme-pop');
        setTimeout(() => btn.classList.remove('theme-pop'), 350);
    }

    /* ── Helpers ─────────────────────────────────────── */
    updateThemeBtn(isDark) {
        if (this.DOM.modeBtn) this.DOM.modeBtn.textContent = isDark ? 'BRIGHT MODE' : 'DARK MODE';
    }

    shuffleText(element, newText) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let iteration = 0;
        const interval = setInterval(() => {
            element.textContent = newText.split('').map((ch, idx) =>
                idx < iteration ? newText[idx] : chars[Math.floor(Math.random() * chars.length)]
            ).join('');
            if (iteration >= newText.length) clearInterval(interval);
            iteration += 0.5;
        }, 30);
    }
}

document.addEventListener('DOMContentLoaded', () => new AppController());
