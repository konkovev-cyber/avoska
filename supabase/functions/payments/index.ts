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

            if (event !== 'payment.succeeded') {
                return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const metadata = payment.metadata
            if (!metadata || !metadata.transaction_id) {
                return new Response(JSON.stringify({ success: false }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            const transactionId = metadata.transaction_id
            const adId = metadata.ad_id
            const packageType = metadata.package_type

            await supabase
                .from('transactions')
                .update({ status: 'success' })
                .eq('id', transactionId)

            const updates: any = {}
            if (packageType === 'vip_7_days') {
                updates.is_vip = true
                const date = new Date()
                date.setDate(date.getDate() + 7)
                updates.promoted_until = date.toISOString()
            } else if (packageType === 'highlight_3_days') {
                updates.is_color_highlight = true
                const date = new Date()
                date.setDate(date.getDate() + 3)
                updates.promoted_until = date.toISOString()
            }

            if (Object.keys(updates).length > 0) {
                await supabase.from('ads').update(updates).eq('id', adId)
            }

            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

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
