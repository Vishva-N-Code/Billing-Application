import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhxximkbvriarcjxovvy.supabase.co';
const supabaseKey = 'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Business identification for "Silent Sync" without manual login
// This allows us to group your data securely in the cloud
export const BUSINESS_ID = 'om-saravana-cranes-v1';
