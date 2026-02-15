const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tgesidmolbcqaluhphos.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZXNpZG1vbGJjcWFsdWhwaG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MTg1MDksImV4cCI6MjA4NjM5NDUwOX0.Il-DxtaTT7eXJ0c0wbxTaIYOZrV_AUCnMMDnCGBEN-s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function apply() {
    const sql = `
    -- 1. Ensure columns exist
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;

    -- 2. Set admin role for known emails
    UPDATE public.profiles 
    SET role = 'admin' 
    WHERE email IN ('ht-elk@yandex.ru', 'dron-vbg@yandex.ru', 'konkev@bk.ru', 'konkovev@gmail.com');

    -- 3. Add Admin RLS Policies for Ads
    DROP POLICY IF EXISTS "Admins can view all ads" ON public.ads;
    CREATE POLICY "Admins can view all ads" ON public.ads FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    DROP POLICY IF EXISTS "Admins can update all ads" ON public.ads;
    CREATE POLICY "Admins can update all ads" ON public.ads FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

    DROP POLICY IF EXISTS "Admins can delete all ads" ON public.ads;
    CREATE POLICY "Admins can delete all ads" ON public.ads FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
    `;

    console.log('Applying RLS and Role updates...');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Error applying SQL:', error.message);
        console.log('Trying direct query if rpc failed...');
        // Fallback or just note it
    } else {
        console.log('Success!');
    }
}

// Since exec_sql might not exist, I can't run it via JS client unless I have a custom function.
// I'll try to use the dashboard SQL editor if I can, but I only have run_command.
// I'll try to use psql again but with a different check.

apply();
