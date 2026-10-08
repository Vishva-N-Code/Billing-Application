import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ulqqatavwuvenuyeyvdb.supabase.co';
const supabaseKey = 'sb_publishable_mk7g8pNykTAHXfV_bHw3SA_EcakrDZq';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Business identification for "Silent Sync" without manual login
// This allows us to group your data securely in the cloud
export const BUSINESS_ID = 'om-saravana-cranes-v1';
