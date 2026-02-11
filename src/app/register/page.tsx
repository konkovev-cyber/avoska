import AuthForm from '@/components/auth/AuthForm';

export default function RegisterPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4">
            <AuthForm mode="register" />
        </main>
    );
}
