import { supabase } from './supabase/client';
import { Capacitor } from '@capacitor/core';

// This utility handles FCM registration for the mobile app
export async function registerPushNotifications() {
    if (Capacitor.getPlatform() === 'web') {
        console.log('Push notifications not supported on web in this demo');
        return;
    }

    // Note: Requires @capacitor/push-notifications to be installed
    // npx cap add android
    // npm install @capacitor/push-notifications

    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            throw new Error('User denied permissions!');
        }

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token: any) => {
            console.log('Push registration success, token: ' + token.value);

            // Save token to user profile
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                await supabase
                    .from('profiles')
                    .update({ fcm_token: token.value })
                    .eq('id', session.user.id);
            }
        });

        PushNotifications.addListener('registrationError', (err: any) => {
            console.error('Registration error: ', err.error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
            console.log('Push received: ', notification);
        });

    } catch (error) {
        console.error('Push error:', error);
    }
}
