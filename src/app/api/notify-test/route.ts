import { NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';

export async function POST(request: Request) {
    try {
        const { chatId } = await request.json();
        if (!chatId) return NextResponse.json({ success: false, error: 'chatId is required' }, { status: 400 });

        await sendTelegramMessage(chatId, `
✅ <b>Тест Авоська+</b>

Это тестовое сообщение от вашего бота.
Если вы его видите — настройки Telegram работают корректно! 🎉
        `);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
