import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

// Replace this with your actual Telegram Chat ID (can be your personal ID or a group ID)
// You can get your ID by messaging @userinfobot in Telegram
const ADMIN_CHAT_ID = "977966870"; // Ваш актуальный ID

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ad, author } = body;

        const message = `
🚀 <b>Новое объявление на Авоське!</b>

<b>Товар:</b> ${ad.title}
<b>Цена:</b> ${ad.price ? ad.price + ' ₽' : 'Договорная'}
<b>Город:</b> ${ad.city}
<b>Автор:</b> ${author}

<a href="${process.env.NEXT_PUBLIC_SITE_URL}/ads/${ad.id}">👀 Посмотреть на сайте</a>
    `;

        await sendTelegramMessage(ADMIN_CHAT_ID, message);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
