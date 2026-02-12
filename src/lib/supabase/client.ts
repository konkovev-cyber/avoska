import { createClient } from '@supabase/supabase-js';

// Для статического экспорта используем значения по умолчанию при билде
// В рантайме они будут заменены на реальные значения из переменных окружения
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
