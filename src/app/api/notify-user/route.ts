import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const body = await request.json();
        const { email, fullName, uid } = body;

        const { data: adminSettings } = await supabaseAdmin
            .from('admin_settings')
            .select('telegram_chat_id, notify_new_users')
            .eq('notify_new_users', true)
            .not('telegram_chat_id', 'is', null)
            .neq('telegram_chat_id', '');

        const message = `
👤 <b>Новая регистрация!</b>

<b>Имя:</b> ${fullName || 'Не указано'}
<b>Email:</b> ${email}
<b>ID:</b> <code>${uid || 'Неизвестен'}</code>

Новый пользователь зарегистрировался на сайте.
        `;

        if (adminSettings && adminSettings.length > 0) {
            await Promise.all(
                adminSettings.map(s => sendTelegramMessage(s.telegram_chat_id, message))
            );
        } else {
            const fallbackId = process.env.TELEGRAM_GROUP_ID || '977966870';
            await sendTelegramMessage(fallbackId, message);
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
