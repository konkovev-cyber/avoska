/**
 * Telegram Bot Utilities
 */

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function sendTelegramMessage(chatId: string, text: string) {
    if (!TELEGRAM_TOKEN) {
        console.error('Telegram Bot Token not found');
        return;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram Error:', data.description);
        }
        return data;
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}
