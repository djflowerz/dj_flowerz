const { createClient } = require('@supabase/supabase-js');
const url = "https://yevqnoynsqidtplxggzs.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlldnFub3luc3FpZHRwbHhnZ3pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjQ3ODAsImV4cCI6MjA4NzY0MDc4MH0.cb_79oC-RKNkhJBshhGw_tcFIVG50Wg6K0HIIK2Uyms";
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log("Buckets:", error ? error : data.map(b => b.name));
}
run();
