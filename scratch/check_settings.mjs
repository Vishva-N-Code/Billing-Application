import { createClient } from '@supabase/supabase-js';

const clientNew = createClient(
  'https://vhxximkbvriarcjxovvy.supabase.co',
  'sb_publishable_y6c7N9F38sSTTzcnifIYYQ_DtU0ox99'
);

async function checkSettings() {
  const { data, error } = await clientNew
    .from('settings')
    .select('*')
    .eq('business_id', 'om-saravana-cranes-v1');
  console.log('Supabase settings:', data, error);
}

checkSettings();
