import AuthForm from '@/components/auth/AuthForm';

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4">
            <AuthForm mode="login" />
        </main>
    );
}
