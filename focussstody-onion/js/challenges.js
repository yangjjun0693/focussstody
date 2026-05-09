/**
 * @file challenges.js
 * Daily challenge manager — fetches today's challenge, tracks progress, awards tokens.
 */
import { supabase } from './supabase.js';

export class ChallengeManager {
    constructor(userId, onClaim) {
        this.userId   = userId;
        this.onClaim  = onClaim;
        this.today    = new Date().toISOString().slice(0, 10);
        this.challenge   = null;
        this.completed   = false;
    }

    async load() {
        // Fetch today's challenge
        const { data: challenge } = await supabase
            .from('daily_challenges')
            .select('*')
            .eq('date', this.today)
            .single();

        if (!challenge) return null;
        this.challenge = challenge;

        // Check if already completed
        const { data: completion } = await supabase
            .from('challenge_completions')
            .select('id')
            .eq('user_id', this.userId)
            .eq('challenge_id', challenge.id)
            .single();

        this.completed = !!completion;
        return { challenge, completed: this.completed };
    }

    getProgress(studyData) {
        if (!this.challenge) return 0;
        const { type, target } = this.challenge;
        let current = 0;

        if (type === 'study_time') {
            // Today's study seconds
            const todayKey = this.today;
            current = (studyData.weekly_log?.[todayKey] || 0);
        } else if (type === 'sessions') {
            // Count sessions started today (use notes as proxy)
            const todayNotes = (studyData.notes || []).filter(n =>
                n.date?.startsWith(this.today)
            );
            current = todayNotes.length;
        } else if (type === 'streak') {
            current = studyData.streak || 0;
        }

        return Math.min(current / target, 1);
    }

    isClaimable(studyData) {
        return !this.completed && this.getProgress(studyData) >= 1;
    }

    async claim() {
        if (!this.challenge || this.completed) return false;

        // Record completion
        const { error } = await supabase
            .from('challenge_completions')
            .insert({ user_id: this.userId, challenge_id: this.challenge.id });

        if (error) return false;

        this.completed = true;

        // Award tokens (add to total_exp)
        const reward = this.challenge.reward;
        await supabase.rpc('increment_exp', { uid: this.userId, amount: reward })
            .catch(async () => {
                // Fallback if RPC not set up
                const { data } = await supabase
                    .from('study_data')
                    .select('total_exp')
                    .eq('user_id', this.userId)
                    .single();
                await supabase
                    .from('study_data')
                    .update({ total_exp: (data?.total_exp || 0) + reward })
                    .eq('user_id', this.userId);
            });

        this.onClaim?.(reward);
        return true;
    }
}