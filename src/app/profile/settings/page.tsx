'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Loader2, Upload } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function ProfileSettingsPage() {
    const [profile, setProfile] = useState<any>(null);
    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (data) {
            setProfile(data);
            setFullName(data.full_name || '');
            setAvatarUrl(data.avatar_url || '');
        }
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: fullName,
                avatar_url: avatarUrl
            })
            .eq('id', profile.id);

        setSaving(false);

        if (error) {
            toast.error('Ошибка сохранения: ' + error.message);
        } else {
            toast.success('Профиль обновлен');
            router.refresh();
            setTimeout(() => router.push('/profile'), 500);
        }
    };

    if (loading) return (
        <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <Link href="/profile" className="inline-flex items-center gap-2 text-primary font-black mb-8 hover:translate-x-[-4px] transition-transform">
                <ChevronLeft className="h-5 w-5" /> Назад в профиль
            </Link>

            <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm">
                <h1 className="text-3xl font-black mb-8">Настройки профиля</h1>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="flex justify-center mb-8">
                        <div className="relative group cursor-pointer w-32 h-32 rounded-full bg-accent/10 border-4 border-surface shadow-xl overflow-hidden">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-black text-accent uppercase">
                                    {fullName?.charAt(0) || '?'}
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="h-8 w-8 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Имя пользователя</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full p-4 rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors font-bold"
                            placeholder="Ваше имя"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted uppercase tracking-wider ml-1">Ссылка на аватар</label>
                        <input
                            type="url"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="w-full p-4 rounded-xl bg-background border border-border outline-none focus:border-primary transition-colors"
                            placeholder="https://example.com/avatar.jpg"
                        />
                        <p className="text-xs text-muted ml-1">Вставьте прямую ссылку на изображение</p>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-primary text-white py-4 rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-lg"
                        >
                            {saving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Save className="h-6 w-6" />}
                            Сохранить изменения
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
