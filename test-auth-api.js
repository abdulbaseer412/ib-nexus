const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://xyz.supabase.co', 'xyz');

console.log("mfa API:", Object.keys(supabase.auth.mfa));
console.log("auth API:", Object.keys(supabase.auth));
