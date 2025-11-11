// import { createClient } from '@supabase/supabase-js';

// const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);








// import { createClient } from '@supabase/supabase-js';

// // Load environment variables
// const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
// const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// // Temporary console logs for debugging
// console.log('Supabase URL:', SUPABASE_URL);
// console.log('Supabase ANON KEY:', SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 6) + '...' : 'Not Found');

// // Create Supabase client
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);



// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Load environment variables
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create a safe Supabase client that won't crash if env vars are missing
let supabase;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    // Create a dummy client to prevent crashes
    supabase = {
      auth: {
        signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    };
  }
} else {
  console.warn('Supabase URL or ANON KEY is missing. Supabase features will be disabled.');
  // Create a dummy client to prevent crashes
  supabase = {
    auth: {
      signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
}

export { supabase };