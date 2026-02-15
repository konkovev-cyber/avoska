'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Bell, ChevronLeft, MessageCircle, Star, Package, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

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

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-surface rounded-full">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-black">Уведомления</h1>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : notifications.length > 0 ? (
                <div className="space-y-3">
                    {notifications.map((n) => (
                        <Link
                            key={n.id}
                            href={n.link}
                            className="block p-4 rounded-2xl border border-border bg-surface transition-all hover:shadow-md active:scale-[0.99]"
                        >
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-muted/10 flex items-center justify-center shrink-0">
                                    <MessageCircle className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold truncate pr-4 text-sm">{n.title}</div>
                                        <div className="text-[10px] text-muted font-bold uppercase shrink-0">{new Date(n.date).toLocaleDateString()}</div>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p>
                                </div>
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
