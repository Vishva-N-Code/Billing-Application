import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uejvaymoaxkfofiwzskz.supabase.co';
const supabaseKey = 'sb_publishable__hKqhOhVDWG6dAShgMUtig_EsMe2Di0';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Business identification for "Silent Sync" without manual login
// This allows us to group your data securely in the cloud
export const BUSINESS_ID = 'om-saravana-cranes-v1';
