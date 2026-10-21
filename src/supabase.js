import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://eulxftjlgzckbaejekid.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bHhmdGpsZ3pja2JhZWpla2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1ODA5NTIsImV4cCI6MjEwODE1Njk1Mn0.T9zwAlteRpMPVJM4tlMP9ArlTLORlSD9J-YWJBAINXE';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Business identification for "Silent Sync" without manual login
// This allows us to group your data securely in the cloud
export const BUSINESS_ID = 'om-saravana-cranes-v1';
