import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const url = new URL(req.url)
        const isWebhook = url.searchParams.get('type') === 'webhook'

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        if (isWebhook) {
            // WEBHOOK LOGIC
            const body = await req.json()
            if (body.type !== 'notification') {
                return new Response(JSON.stringify({ success: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const event = body.event
            const payment = body.object

            console.log('Webhook received:', JSON.stringify(body, null, 2))

            if (body.event === 'payment.succeeded') {
                const payment = body.object
                const metadata = payment?.metadata || {}
                const { transaction_id, ad_id, package_type } = metadata

                console.log(`Processing successful payment for transaction: ${transaction_id}, ad: ${ad_id}`)

                // 1. Обновляем транзакцию
                const { error: trxError } = await supabase.from('transactions').update({
                    status: 'success',
                    payment_id: payment.id,
                    payment_method: payment.payment_method?.type || 'unknown',
                    updated_at: new Date().toISOString()
                }).eq('id', transaction_id)

                if (trxError) console.error('Error updating transaction:', trxError)

                // 2. Обновляем объявление
                const isVip = String(package_type).includes('vip')
                const isHighlight = String(package_type).includes('highlight')
                const days = isVip ? 7 : 3
                const promotedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()

                const { error: adError } = await supabase.from('ads').update({
                    is_vip: isVip,
                    is_color_highlight: isHighlight,
                    promoted_until: promotedUntil
                }).eq('id', ad_id)

                if (adError) console.error('Error updating ad promotion:', adError)

                // 3. Уведомление в Телеграм
                const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
                const adminIdsStr = Deno.env.get('TELEGRAM_ADMIN_IDS')
                const adminIds = adminIdsStr?.split(',') || []

                console.log(`TG Config: Token exists: ${!!botToken}, IDs: ${adminIdsStr}`)

                if (botToken && adminIds.length > 0) {
                    const message = `💰 *Успешная оплата!*\n\n` +
                        `📦 Услуга: ${isVip ? '💎 VIP Статус' : '🔥 Подсветка'}\n` +
                        `💵 Сумма: ${payment.amount.value} ${payment.amount.currency}\n` +
                        `🔗 Объявление: [Открыть](https://avoska.353290.ru/ad?id=${ad_id})\n` +
                        `🆔 ID Платежа: \`${payment.id}\``

                    for (const chatId of adminIds) {
                        try {
                            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    chat_id: chatId.trim(),
                                    text: message,
                                    parse_mode: 'Markdown'
                                })
                            })
                            const tgData = await tgRes.json()
                            if (!tgData.ok) {
                                console.error(`TG Error for ID ${chatId}:`, JSON.stringify(tgData))
                            } else {
                                console.log(`TG Message successfully sent to ${chatId}`)
                            }
                        } catch (err) {
                            console.error('Fetch to Telegram API failed:', err)
                        }
                    }
                } else {
                    console.error('Telegram config missing in Edge Function secrets!')
                }

                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            } else {
                console.log(`Ignored event type: ${body.event}`)
                return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
        } else {
            // CREATE PAYMENT LOGIC
            const { adId, packageType } = await req.json()

            const authHeader = req.headers.get('Authorization')
            console.log('Auth header present:', !!authHeader)

            const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))

            if (authError || !user) {
                console.error('Auth error:', authError)
                return new Response(JSON.stringify({ error: "Unauthorized", details: authError?.message }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }
            console.log('User verified:', user.id)

            let amount = 0
            let description = ''
            if (packageType === 'vip_7_days') {
                amount = 149
                description = 'VIP статус на 7 дней'
            } else if (packageType === 'highlight_3_days') {
                amount = 49
                description = 'Выделение цветом на 3 дня'
            } else {
                return new Response(JSON.stringify({ error: "Invalid package" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const { data: transaction, error: dbError } = await supabase
                .from('transactions')
                .insert({
                    user_id: user.id,
                    ad_id: adId,
                    amount,
                    package_type: packageType,
                    status: 'pending',
                    payment_method: 'yookassa'
                })
                .select()
                .single()

            if (dbError) throw dbError

            const YOOKASSA_ID = Deno.env.get('YOOKASSA_ACCOUNT_ID')
            const YOOKASSA_KEY = Deno.env.get('YOOKASSA_SECRET_KEY')
            const auth = btoa(`${YOOKASSA_ID}:${YOOKASSA_KEY}`)

            const siteUrl = Deno.env.get('SITE_URL') || 'https://avoska.353290.ru'
            const returnUrl = `${siteUrl}/profile?payment=success`

            const payload: any = {
                amount: { value: amount.toFixed(2), currency: 'RUB' },
                capture: true,
                confirmation: { type: 'redirect', return_url: returnUrl },
                description: `${description} для объявления ${adId}`,
                metadata: {
                    transaction_id: transaction.id,
                    ad_id: adId,
                    user_id: user.id,
                    package_type: packageType
                }
            }

            // Добавляем чек ( Receipt ) для 54-ФЗ (обязательно для многих LIVE аккаунтов)
            if (user.email) {
                payload.receipt = {
                    customer: { email: user.email },
                    items: [
                        {
                            description: description,
                            quantity: "1.00",
                            amount: { value: amount.toFixed(2), currency: 'RUB' },
                            vat_code: 1, // Без НДС. Поменяйте на другое значение, если вы плательщик НДС
                            payment_mode: "full_payment",
                            payment_subject: "service"
                        }
                    ]
                }
            }

            const yooRes = await fetch('https://api.yookassa.ru/v3/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotence-Key': transaction.id,
                    'Authorization': `Basic ${auth}`
                },
                body: JSON.stringify(payload)
            })

            const paymentData = await yooRes.json()
            if (!yooRes.ok) throw new Error(paymentData.description || 'YooKassa error')

            await supabase
                .from('transactions')
                .update({ payment_id: paymentData.id })
                .eq('id', transaction.id)

            return new Response(JSON.stringify({
                success: true,
                confirmationUrl: paymentData.confirmation.confirmation_url
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
})
