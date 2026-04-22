/**
 * @file sliding-tabs.js
 * Universal sliding pill tab component.
 * Usage: new SlidingTabs(trackEl, onChange)
 */

export class SlidingTabs {
    #track   = null;
    #pill    = null;
    #buttons = [];
    #current = 0;
    #onChange = null;

    constructor(trackEl, onChange) {
        if (!trackEl) return;
        this.#track   = trackEl;
        this.#onChange = onChange;
        this.#init();
    }

    #init() {
        // Build pill
        this.#pill = document.createElement('div');
        Object.assign(this.#pill.style, {
            position:   'absolute',
            top:        '3px',
            bottom:     '3px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.15)',
            transition: 'left 0.38s cubic-bezier(0.34,1.45,0.64,1), width 0.38s cubic-bezier(0.34,1.45,0.64,1)',
            pointerEvents: 'none',
            zIndex:     '0',
        });
        this.#track.style.position = 'relative';
        this.#track.insertBefore(this.#pill, this.#track.firstChild);

        this.#buttons = [...this.#track.querySelectorAll('button')];
        this.#buttons.forEach((btn, i) => {
            btn.style.position = 'relative';
            btn.style.zIndex   = '1';
            btn.style.background = 'none';
            btn.style.border   = 'none';
            btn.style.cursor   = 'pointer';
            btn.addEventListener('click', () => this.select(i));
        });

        // Set initial position after layout
        requestAnimationFrame(() => this.#movePill(this.#current, false));
    }

    select(index, animate = true) {
        if (index === this.#current && animate) return;
        this.#current = index;
        this.#movePill(index, animate);

        this.#buttons.forEach((btn, i) => {
            btn.style.opacity = i === index ? '1' : '0.4';
        });

        this.#onChange?.(index, this.#buttons[index]);
    }

    #movePill(index, animate = true) {
        const btn = this.#buttons[index];
        if (!btn || !this.#pill) return;

        if (!animate) {
            this.#pill.style.transition = 'none';
            requestAnimationFrame(() => {
                this.#pill.style.transition = 'left 0.38s cubic-bezier(0.34,1.45,0.64,1), width 0.38s cubic-bezier(0.34,1.45,0.64,1)';
            });
        }

        this.#pill.style.left  = `${btn.offsetLeft}px`;
        this.#pill.style.width = `${btn.offsetWidth}px`;
    }

    // Call this if track width changes (e.g. modal open)
    refresh() {
        this.#movePill(this.#current, false);
    }
}