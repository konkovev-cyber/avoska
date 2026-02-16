import AuthForm from '@/components/auth/AuthForm';
import { Suspense } from 'react';

export default function RegisterPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4">
            <Suspense fallback={<div>Загрузка...</div>}>
                <AuthForm mode="register" />
            </Suspense>
        </main>
    );
}
