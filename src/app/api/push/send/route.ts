import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: Request) {
    try {
        webpush.setVapidDetails(
            'mailto:ht-elk@yandex.ru',
            process.env.VAPID_PUBLIC_KEY || '',
            process.env.VAPID_PRIVATE_KEY || ''
        );

        const body = await request.json();
        const { userId, title, body: messageBody, icon, url } = body;

        // Get subscription from Supabase
        const { data: subData, error } = await supabase
            .from('push_subscriptions')
            .select('subscription')
            .eq('user_id', userId)
            .single();

        if (error || !subData) {
            return NextResponse.json({ success: false, error: 'Subscription not found' }, { status: 404 });
        }

        const payload = JSON.stringify({
            title,
            body: messageBody,
            icon: icon || '/logo.png',
            url: url || '/'
        });

        await webpush.sendNotification(subData.subscription, payload);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Push error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
