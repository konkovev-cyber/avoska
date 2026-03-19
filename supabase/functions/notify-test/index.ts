const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Max-Age': '86400',
            }
        });
    }

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Content-Type': 'application/json',
    };

    try {
        const { chatId } = await req.json();
        if (!chatId) {
            return new Response(JSON.stringify({ success: false, error: 'chatId is required' }), {
                status: 400,
                headers: corsHeaders
            });
        }

        if (!TELEGRAM_TOKEN) {
            return new Response(JSON.stringify({ success: false, error: 'TELEGRAM_BOT_TOKEN not set' }), {
                status: 500,
                headers: corsHeaders
            });
        }

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: `✅ <b>Тест Авоська+</b>\n\nЭто тестовое сообщение.\nЕсли вы его видите — настройки Telegram работают! 🎉`,
                parse_mode: 'HTML',
            }),
        });

        const data = await res.json();
        if (!data.ok) {
            return new Response(JSON.stringify({ success: false, error: data.description }), {
                status: 400,
                headers: corsHeaders
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: corsHeaders
        });
    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: String(e) }), {
            status: 500,
            headers: corsHeaders
        });
    }
});
