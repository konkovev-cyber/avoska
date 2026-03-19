import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SITE_URL = Deno.env.get('SITE_URL') || 'https://avoska.353290.ru';

async function sendTelegram(chatId: string, text: string) {
    if (!TELEGRAM_TOKEN) return;
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
}

Deno.serve(async (req) => {
    try {
        const payload = await req.json();
        const record = payload.record; // new row from ads table

        // Only notify for new pending ads
        if (payload.type !== 'INSERT' || record?.status !== 'pending') {
            return new Response('Skip', { status: 200 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        // Get author profile
        const { data: author } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', record.user_id)
            .single();

        // Get all admins who want ad notifications
        const { data: adminSettings } = await supabase
            .from('admin_settings')
            .select('telegram_chat_id, notify_new_ads')
            .eq('notify_new_ads', true)
            .not('telegram_chat_id', 'is', null)
            .neq('telegram_chat_id', '');

        const message = `
🚨 <b>Требует модерации: Новое объявление</b>

<b>Заголовок:</b> ${record.title}
<b>Цена:</b> ${record.price ? record.price + ' ₽' : 'Договорная'}
<b>Город:</b> ${record.city || '—'}
<b>Разместил:</b> ${author?.full_name || 'Пользователь'} ${author?.email ? `(${author.email})` : ''}

<a href="${SITE_URL}/ad/?id=${record.id}">👀 Посмотреть и одобрить</a>`.trim();

        const targets = adminSettings?.length
            ? adminSettings
            : [{ telegram_chat_id: Deno.env.get('TELEGRAM_FALLBACK_CHAT_ID') || '977966870' }];

        await Promise.all(targets.map(s => sendTelegram(s.telegram_chat_id, message)));

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
});
