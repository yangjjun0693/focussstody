/**
 * Shared auth helper for stats, store, leaderboard pages.
 * Returns { supabase, userId, username, profile, studyRow }
 * Redirects to login.html if not authenticated.
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabase = createClient(
    'https://intsulsrjxugbqcqtjmg.supabase.co',
    'sb_publishable_eRmbDS22tfZ-SpzazfXjEQ_oDM_DKpx'
);

export async function requireAuth() {
    // getSession reads from localStorage — always fast, no network
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        window.location.replace('./login.html');
        return null;
    }

    const userId = session.user.id;

    const [{ data: profile }, { data: studyRow }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('study_data').select('*').eq('user_id', userId).single(),
    ]);

    if (!profile) {
        window.location.replace('./login.html');
        return null;
    }

    return { supabase, userId, username: profile.username, profile, studyRow: studyRow || {} };
}



















































