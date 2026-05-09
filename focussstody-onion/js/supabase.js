/**
 * @file supabase.js
 * Supabase client + all DB operations for Focussstody
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://intsulsrjxugbqcqtjmg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_eRmbDS22tfZ-SpzazfXjEQ_oDM_DKpx';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/* ── Auth ───────────────────────────────────────────────────── */

export async function signUp(username, email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
    });
    if (error) throw new Error(error.message);

    // Store email in profiles for login-by-username lookup
    if (data.user) {
        await supabase.from('profiles')
            .update({ email })
            .eq('id', data.user.id);
    }
    return data;
}

export async function signIn(username, password) {
    // Look up email by username
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', username)
        .single();

    if (profileError || !profile?.email) {
        throw new Error('No account found with that username.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
    });
    if (error) throw new Error('Incorrect password.');
    return data;
}

export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/login.html',
        },
    });
    if (error) throw new Error(error.message);
}

export async function handleOAuthCallback() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    const userId = session.user.id;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', userId)
        .single();

    const isNewUser = !profile || !profile.username;
    return { session, isNewUser };
}

export async function signOut() {
    await supabase.auth.signOut();
}

export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/* ── Profile ────────────────────────────────────────────────── */

export async function getProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
}

/* ── Study Data ─────────────────────────────────────────────── */

export async function getStudyData(userId) {
    const { data, error } = await supabase
        .from('study_data')
        .select('*')
        .eq('user_id', userId)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data || {};
}

export async function saveStudyData(userId, payload) {
    const { error } = await supabase
        .from('study_data')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    if (error) console.error('Save error:', error);
}

/* ── Debounced save ─────────────────────────────────────────── */
let _saveTimer = null;
export function debouncedSave(userId, payload, delay = 5000) {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => saveStudyData(userId, payload), delay);
}
