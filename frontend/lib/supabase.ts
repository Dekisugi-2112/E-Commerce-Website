import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nnywafybvxthtylhntib.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ueXdhZnlidnh0aHR5bGhudGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2OTg1NTUsImV4cCI6MjEwMDI3NDU1NX0.Z5exTmqD6HLHDx6RPfIHmK-fxpjllF_kKaXwVWW0fB0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
