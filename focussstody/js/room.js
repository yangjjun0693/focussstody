/**
 * @file room.js
 * StudyRoom — live presence using Supabase Realtime.
 */
import { supabase } from './supabase.js';

export class StudyRoom {
    #channel    = null;
    #username   = null;
    #onUpdate   = null;
    #subscribed = false;

    constructor(username, onUpdate) {
        this.#username = username;
        this.#onUpdate = onUpdate;
    }

    async join() {
        if (this.#channel) await this.leave();

        this.#channel = supabase.channel('focussstody-room', {
            config: { presence: { key: this.#username } }
        });

        this.#channel
            .on('presence', { event: 'sync' }, () => {
                this.#onUpdate?.(this.#getUsers());
            })
            .on('presence', { event: 'join' }, () => {
                this.#onUpdate?.(this.#getUsers());
            })
            .on('presence', { event: 'leave' }, () => {
                this.#onUpdate?.(this.#getUsers());
            });

        // Wait for subscription to confirm before tracking
        await new Promise((resolve) => {
            this.#channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.#subscribed = true;
                    resolve();
                }
            });
        });
    }

    async startStudying(subject) {
        if (!this.#subscribed) await this.join();
        await this.#channel.track({
            username:  this.#username,
            subject:   subject,
            startedAt: Date.now(),
        });
        this.#onUpdate?.(this.#getUsers());
    }

    async stopStudying() {
        if (!this.#channel || !this.#subscribed) return;
        await this.#channel.untrack();
        this.#onUpdate?.(this.#getUsers());
    }

    async leave() {
        if (this.#channel) {
            await this.#channel.untrack();
            await supabase.removeChannel(this.#channel);
            this.#channel   = null;
            this.#subscribed = false;
        }
    }

    #getUsers() {
        const state = this.#channel?.presenceState() || {};
        return Object.values(state)
            .flat()
            .map(p => ({
                username:  p.username,
                subject:   p.subject,
                startedAt: p.startedAt,
                isMe:      p.username === this.#username,
            }))
            .sort((a, b) => a.startedAt - b.startedAt);
    }
}