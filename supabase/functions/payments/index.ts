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

        // =====================
        // WEBHOOK ОТ ЮKASSA
        // =====================
        if (isWebhook) {
            const body = await req.json()
            console.log('Webhook received:', JSON.stringify(body, null, 2))

            // ЮKassa шлет event прямо в теле, игнорируем body.type
            if (body.event !== 'payment.succeeded') {
                console.log(`Ignored event: ${body.event}`)
                return new Response(JSON.stringify({ success: true }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            const payment = body.object
            const metadata = payment?.metadata || {}
            const { transaction_id, ad_id, package_type } = metadata

            console.log(`Payment succeeded: id=${payment.id}, transaction=${transaction_id}, ad=${ad_id}, package=${package_type}`)

            if (!transaction_id || !ad_id) {
                console.error('Missing metadata fields: transaction_id or ad_id')
                return new Response(JSON.stringify({ success: false, error: 'Missing metadata' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                })
            }

            // 1. Обновляем транзакцию
            const { error: trxError } = await supabase.from('transactions').update({
                status: 'success',
                payment_id: payment.id,
                payment_method: payment.payment_method?.type || 'yookassa',
                updated_at: new Date().toISOString()
            }).eq('id', transaction_id)

            if (trxError) console.error('Error updating transaction:', JSON.stringify(trxError))
            else console.log('Transaction updated to success')

            // 2. Обновляем объявление или добавляем баннер
            let packageTitle = ''
            let updatePayload: any = {}

            if (package_type.startsWith('banner_')) {
                const b_title = payment.metadata?.b_title;
                const b_image = payment.metadata?.b_image;
                const b_link = payment.metadata?.b_link;
                const b_pos = payment.metadata?.b_pos;

                packageTitle = b_pos === 'top' ? '✨ Размещение верхнего баннера' : '✨ Размещение бокового баннера';

                const { error: bannerError } = await supabase.from('banners').insert({
                    title: b_title,
                    image_url: b_image,
                    link_url: b_link,
                    position: b_pos,
                    is_active: true,
                    type: 'image'
                });
                if (bannerError) console.error('Error creating banner:', JSON.stringify(bannerError));
                else console.log('Banner created successfully');

            } else {

                if (package_type === 'up_1_time') {
                    updatePayload = { created_at: new Date().toISOString() }
                    packageTitle = '🚀 Поднятие в поиске'
                } else if (package_type === 'urgent_7_days') {
                    updatePayload = { is_urgent: true, promoted_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    packageTitle = '🔥 СРОЧНО (7 дней)'
                } else if (package_type === 'vip_7_days') {
                    updatePayload = { is_vip: true, promoted_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
                    packageTitle = '💎 VIP Статус (7 дней)'
                } else if (package_type === 'highlight_3_days') {
                    updatePayload = { is_color_highlight: true, promoted_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }
                    packageTitle = '⚡ ТОП (3 дня)'
                }

                if (Object.keys(updatePayload).length > 0) {
                    const { error: adError } = await supabase.from('ads').update(updatePayload).eq('id', ad_id)
                    if (adError) console.error('Error updating ad:', JSON.stringify(adError))
                    else console.log(`Ad ${ad_id} promotion updated: ${JSON.stringify(updatePayload)}`)
                }
            }

            // 3. Уведомление в Телеграм
            const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
            const adminIdsStr = Deno.env.get('TELEGRAM_ADMIN_IDS')
            const adminIds = adminIdsStr?.split(',').filter(Boolean) || []

            console.log(`TG Config: token=${!!botToken}, ids=${adminIdsStr}`)

            if (botToken && adminIds.length > 0) {
                const message = `💰 *Успешная оплата!*\n\n` +
                    `📦 Услуга: ${packageTitle}\n` +
                    `💵 Сумма: ${payment.amount.value} ${payment.amount.currency}\n` +
                    (ad_id ? `🔗 [Открыть объявление](https://avoska.353290.ru/ad?id=${ad_id})\n` : '') +
                    `🆔 Платёж: \`${payment.id}\``

                for (const chatId of adminIds) {
                    try {
                        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId.trim(),
                                text: message,
                                parse_mode: 'Markdown',
                                disable_web_page_preview: true
                            })
                        })
                        const tgData = await tgRes.json()
                        if (!tgData.ok) {
                            console.error(`TG Error for chatId=${chatId}:`, JSON.stringify(tgData))
                        } else {
                            console.log(`TG Message sent to ${chatId}`)
                        }
                    } catch (err) {
                        console.error('TG fetch failed:', err)
                    }
                }
            } else {
                console.error('TG secrets not configured!')
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // =====================
        // СОЗДАНИЕ ПЛАТЕЖА
        // =====================
        const { adId, packageType, bannerData } = await req.json()

        const authHeader = req.headers.get('Authorization')
        const { data: { user }, error: authError } = await supabase.auth.getUser(
            authHeader?.replace('Bearer ', '')
        )

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        let amount = 0
        let description = ''
        if (packageType === 'vip_7_days') {
            amount = 149
            description = 'VIP статус на 7 дней'
        } else if (packageType === 'highlight_3_days') {
            amount = 49
            description = 'Выделение ТОП на 3 дня'
        } else if (packageType === 'up_1_time') {
            amount = 29
            description = 'Разовое поднятие в поиске'
        } else if (packageType === 'urgent_7_days') {
            amount = 79
            description = 'Значок СРОЧНО на 7 дней'
        } else if (packageType === 'banner_top_7_days') {
            amount = 1000;
            description = 'Верхний баннер на 7 дней';
        } else if (packageType === 'banner_sidebar_7_days') {
            amount = 500;
            description = 'Боковой баннер на 7 дней';
        } else {
            return new Response(JSON.stringify({ error: 'Invalid package' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
        }

        // Создаём транзакцию в БД
        const { data: transaction, error: dbError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                ad_id: adId || null,
                amount,
                currency: 'RUB',
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

        const payload: any = {
            amount: { value: amount.toFixed(2), currency: 'RUB' },
            capture: true,
            confirmation: {
                type: 'redirect',
                return_url: `${siteUrl}/profile?payment=success`
            },
            description: `${description} (объявление ${adId})`,
            metadata: {
                transaction_id: transaction.id,
                ad_id: adId,
                user_id: user.id,
                package_type: packageType
            }
        }

        // Чек (54-ФЗ) — только если есть email
        if (user.email) {
            payload.receipt = {
                customer: { email: user.email },
                items: [{
                    description,
                    quantity: '1.00',
                    amount: { value: amount.toFixed(2), currency: 'RUB' },
                    vat_code: 1,
                    payment_mode: 'full_payment',
                    payment_subject: 'service'
                }]
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

        await supabase.from('transactions')
            .update({ payment_id: paymentData.id })
            .eq('id', transaction.id)

        return new Response(JSON.stringify({
            success: true,
            confirmationUrl: paymentData.confirmation.confirmation_url
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    } catch (err: any) {
        console.error('Unhandled error:', err.message)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})
