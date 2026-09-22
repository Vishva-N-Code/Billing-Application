import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tgckwktwugzsujvtdxas.supabase.co';
const supabaseKey = 'sb_publishable_uEDKePdm840Q8dmpmgt_VA_0Al3kivv';

export const supabaseOMS = createClient(supabaseUrl, supabaseKey);

// Business identification for OMS module
export const OMS_BUSINESS_ID = 'om-saravana-oms-v1';
