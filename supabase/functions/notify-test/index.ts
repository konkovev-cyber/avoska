import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json()
        const chatId = body.chatId || body.chat_id
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')

        console.log(`Test call: ID=${chatId}, Token exists=${!!botToken}`)

        if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN not set in secrets')
        if (!chatId) throw new Error('chatId is missing in request body')

        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: "🚀 Тестовое сообщение от Avoska! Ваши уведомления работают корректно.",
                parse_mode: 'Markdown'
            })
        })

        const data = await res.json()
        console.log('TG Response:', JSON.stringify(data))

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Test Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
