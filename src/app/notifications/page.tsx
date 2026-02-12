'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, ChevronLeft, MessageCircle, Star, Package, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }

        // For now, we fetch recent unread messages as generic "notifications"
        // if no notifications table exists.
        const { data: msgs, error } = await supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(full_name, avatar_url)')
            .eq('receiver_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (msgs) {
            setNotifications(msgs.map(m => ({
                id: m.id,
                type: 'message',
                title: m.sender.full_name,
                body: m.content,
                date: m.created_at,
                isRead: m.is_read,
                link: `/chat?receiverId=${m.sender_id}`
            })));
        }
        setLoading(false);
    };

    const markAllRead = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', session.user.id);

        fetchNotifications();
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-surface rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-black">Уведомления</h1>
                </div>
                {notifications.some(n => !n.isRead) && (
                    <button onClick={markAllRead} className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                        <Check className="h-4 w-4" />
                        Прочитать все
                    </button>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : notifications.length > 0 ? (
                <div className="space-y-4">
                    {notifications.map((n) => (
                        <Link
                            key={n.id}
                            href={n.link}
                            className={`block p-6 rounded-2xl border transition-all hover:shadow-md ${n.isRead ? 'bg-surface border-border opacity-70' : 'bg-background border-primary/20 shadow-sm'}`}
                        >
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                                    <MessageCircle className="h-6 w-6 text-accent" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-black truncate pr-4">{n.title}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase shrink-0">{new Date(n.date).toLocaleDateString()}</div>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                                </div>
                                {!n.isRead && (
                                    <div className="w-2 h-2 bg-primary rounded-full mt-2" />
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border">
                    <Bell className="h-12 w-12 text-muted mx-auto mb-4" />
                    <div className="font-bold text-lg">У вас пока нет уведомлений</div>
                    <p className="text-sm text-muted mt-2">Здесь будут появляться новости о ваших сделках и сообщениях</p>
                </div>
            )}
        </div>
    );
}
