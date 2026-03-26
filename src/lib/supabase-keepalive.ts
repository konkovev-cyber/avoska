import { supabase } from './supabase/client';

/**
 * Функция для поддержания активности Supabase (Free Tier)
 * Выполняет минимальный запрос к любой таблице.
 */
export async function supabaseKeepalive() {
    try {
        // Используем максимально легкий запрос
        const { data, error } = await supabase
            .from('categories')
            .select('id')
            .limit(1)
            .single();

        if (error) {
            console.warn('[Supabase Keepalive] Warm-up ping failed:', error.message);
            return false;
        }

        console.log('[Supabase Keepalive] Database is awake');
        return true;
    } catch (err) {
        console.error('[Supabase Keepalive] Error during ping:', err);
        return false;
    }
}
