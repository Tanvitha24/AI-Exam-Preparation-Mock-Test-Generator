// Utility helpers for handling authentication in both online (Supabase) and offline/demo modes.
// This centralises logic so that every component behaves consistently.

import { supabase } from '../supabaseClient';

/**
 * Returns the currently logged-in user.
 * 1. Tries Supabase first.
 * 2. Falls back to a user persisted in localStorage under the key "user".
 *
 * @returns {Promise<object|null>} The user object or null if not logged in.
 */
export async function getCurrentUser() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      return session.user;
    }
  } catch (err) {
    // Network or credentials issue – ignore and try localStorage.
  }

  const stored = localStorage.getItem('user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {
      // corrupted, remove it
      localStorage.removeItem('user');
    }
  }
  return null;
}

/**
 * Clears every trace of authentication – works even when the Supabase
 * network call fails (e.g. offline).
 */
export async function clearStoredUser() {
  // Remove demo/offline user token
  localStorage.removeItem('user');

  // Attempt to sign out from Supabase (ignore errors)
  try {
    await supabase.auth.signOut();
  } catch (_) {
    // ignore
  }

  // Remove Supabase cached session keys if still present.
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('sb-')) {
      localStorage.removeItem(key);
    }
  });
}