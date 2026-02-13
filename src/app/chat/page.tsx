'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { chatService } from '@/lib/supabase/chatService';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Send, User as UserIcon, ChevronLeft, Search, MessageCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const adId = searchParams.get('adId');
    const initialReceiverId = searchParams.get('receiverId');

    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initChat();

        const channel = chatService.subscribe((payload) => {
            const msg = payload.new;
            if (activeChat && (
                (msg.sender_id === currentUser?.id && msg.receiver_id === activeChat.userId) ||
                (msg.sender_id === activeChat.userId && msg.receiver_id === currentUser?.id)
            )) {
                setMessages(prev => [...prev, msg]);
            }
            refreshConversations();
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeChat, currentUser]);

    useEffect(() => {
        if (messages.length > 0) {
            scrollToBottom(messages.length <= 20 ? 'instant' : 'smooth');
        }
    }, [messages]);

    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    const initChat = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            router.push('/login');
            return;
        }
        setCurrentUser(session.user);
        await refreshConversations();

        if (initialReceiverId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialReceiverId)
                .single();

            if (profile) {
                // Determine Ad info if possible (e.g. from existing conversation or fetch ad)
                let adInfo = null;
                if (adId) {
                    const { data: ad } = await supabase.from('ads').select('title, price, images').eq('id', adId).single();
                    adInfo = ad;
                }

                const chat = { userId: initialReceiverId, user: profile, ad: adInfo };
                setActiveChat(chat);
                const msgs = await chatService.getMessages(initialReceiverId);
                setMessages(msgs);
            }
        }
    };

    const refreshConversations = async () => {
        const convs = await chatService.getConversations();
        setConversations(convs);
    };

    const selectChat = async (chat: any) => {
        setActiveChat(chat);
        const msgs = await chatService.getMessages(chat.userId);
        setMessages(msgs);
        markAsRead(chat.userId);
    };

    const markAsRead = async (otherUserId: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', session.user.id)
            .eq('sender_id', otherUserId)
            .eq('is_read', false);
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        try {
            // Use current ad context if available, or last known ad from conversation
            const currentAdId = adId || activeChat.lastMessage?.ad_id;
            await chatService.sendMessage(activeChat.userId, newMessage, currentAdId);
            setNewMessage('');
        } catch (error) {
            console.error('Send message error:', error);
            toast.error('Ошибка отправки');
        }
    };

    // Helper to group messages by date
    const groupedMessages = messages.reduce((acc: any, msg: any) => {
        const date = new Date(msg.created_at).toLocaleDateString('ru-RU', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
        if (!acc[date]) acc[date] = [];
        acc[date].push(msg);
        return acc;
    }, {});

    // Helper to get ad info for header
    const getActiveAd = () => {
        if (!activeChat) return null;
        // Try to find ad info from:
        // 1. activeChat.ad (if set during init)
        // 2. activeChat.lastMessage.ad (from conversation list)
        // 3. First message with ad info
        if (activeChat.ad) return activeChat.ad;
        if (activeChat.lastMessage?.ad) return activeChat.lastMessage.ad;
        // Search in messages
        const msgWithAd = messages.find(m => m.ad); // fetch messages doesn't return joined ad yet in chatService.getMessages. 
        // We might need to rely on conversation list data for now.
        return null;
    };

    const activeAd = getActiveAd();

    return (
        <div className="max-w-[1000px] mx-auto md:px-4 md:py-8 h-screen md:h-auto flex flex-col">
            <div className="bg-background md:bg-surface md:border md:border-border md:rounded-[2.5rem] overflow-hidden md:shadow-2xl flex flex-col md:flex-row flex-1 h-full md:h-[700px]">

                {/* Sidebar: Conversations (Hidden on mobile if chat active) */}
                <div className={cn(
                    "w-full md:w-80 border-r border-border flex flex-col bg-surface",
                    activeChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b border-border sticky top-0 bg-surface/80 backdrop-blur-md z-10">
                        <h2 className="text-xl font-black mb-4">Сообщения</h2>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Поиск чатов..."
                                className="w-full p-2.5 pl-9 rounded-xl bg-muted/50 border-none text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <button
                                    key={conv.userId}
                                    onClick={() => selectChat(conv)}
                                    className={cn(
                                        "w-full p-3 px-4 flex items-center gap-3 hover:bg-muted/30 transition-all border-b border-border/30 last:border-0",
                                        activeChat?.userId === conv.userId && "bg-primary/5 border-l-4 border-l-primary"
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center font-bold text-lg text-accent overflow-hidden shrink-0">
                                        {conv.user.avatar_url ? (
                                            <img src={conv.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            conv.user.full_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold truncate text-sm">{conv.user.full_name}</div>
                                        <div className="text-xs text-muted-foreground truncate opacity-80 mt-0.5">
                                            {conv.lastMessage?.ad && <span className="font-medium text-foreground/80 mr-1">{conv.lastMessage.ad.title}:</span>}
                                            {conv.lastMessage.content}
                                        </div>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground shrink-0 self-start mt-1 font-medium">
                                        {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted-foreground text-sm">Здесь еще нет диалогов</div>
                        )}
                    </div>
                </div>

                {/* Main: Chat Window */}
                <div className={cn(
                    "flex-1 flex flex-col bg-[#F5F5F5] md:bg-white relative", // Screenshot background looks light greyish
                    !activeChat ? "hidden md:flex items-center justify-center" : "flex"
                )}>
                    {activeChat ? (
                        <>
                            {/* Chat Header - Matching Screenshot */}
                            <div className="h-16 px-4 bg-white border-b border-border/50 flex items-center gap-3 shadow-sm z-20 sticky top-0">
                                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 hover:bg-muted rounded-full transition-colors">
                                    <ChevronLeft className="h-6 w-6 text-foreground" />
                                </button>

                                <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0 shadow-sm">
                                    {activeChat.user.avatar_url ? (
                                        <img src={activeChat.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        activeChat.user.full_name?.charAt(0) || '?'
                                    )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="font-bold text-sm leading-tight text-foreground truncate">
                                        {activeChat.user.full_name}
                                    </div>
                                    {activeAd ? (
                                        <div className="text-xs text-muted-foreground truncate font-medium">
                                            {activeAd.title} · {activeAd.price?.toLocaleString()} ₽
                                        </div>
                                    ) : (
                                        <div className="text-xs text-green-600 truncate font-medium">
                                            Онлайн
                                        </div>
                                    )}
                                </div>

                                {/* Header Actions */}
                                <button className="p-2 hover:bg-muted rounded-full transition-colors text-foreground/70">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                                </button>
                                <button className="p-2 hover:bg-muted rounded-full transition-colors text-foreground/70">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                                </button>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {(Object.entries(groupedMessages) as [string, any[]][]).map(([date, msgs]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex justify-center sticky top-2 z-10">
                                            <span className="px-3 py-1 bg-black/5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider rounded-full backdrop-blur-sm">
                                                {date}
                                            </span>
                                        </div>
                                        <div className="space-y-1.5 flex flex-col">
                                            {msgs.map((msg) => {
                                                const isOurs = msg.sender_id === currentUser?.id;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={cn(
                                                            "max-w-[75%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug shadow-sm relative group",
                                                            isOurs
                                                                ? "self-end bg-primary text-white rounded-br-none"
                                                                : "self-start bg-white text-foreground border border-border/50 rounded-bl-none"
                                                        )}
                                                    >
                                                        {msg.content}
                                                        <div className={cn(
                                                            "text-[9px] mt-1 flex items-center justify-end gap-1 opacity-70",
                                                            isOurs ? "text-white/80" : "text-muted-foreground"
                                                        )}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isOurs && (
                                                                msg.is_read
                                                                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area - Matching Screenshot */}
                            <div className="p-3 bg-white border-t border-border flex items-end gap-2 pb-safe">
                                <button className="p-3 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </button>

                                <form onSubmit={handleSendMessage} className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Сообщение"
                                        className="w-full py-2.5 px-4 pr-10 rounded-2xl bg-muted/40 border-none outline-none text-[15px] placeholder:text-muted-foreground focus:bg-muted/60 transition-colors"
                                    />
                                    {newMessage.trim() && (
                                        <button
                                            type="submit"
                                            className="absolute right-1 top-1 p-1.5 bg-primary text-white rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                                        </button>
                                    )}
                                </form>

                                <button className="p-3 text-muted-foreground hover:text-foreground transition-colors shrink-0">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-muted pt-20 pb-20 px-10 text-center">
                            <div className="w-24 h-24 bg-muted/20 rounded-full flex items-center justify-center shadow-inner">
                                <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
                            </div>
                            <div>
                                <p className="font-black text-xl text-foreground/80 mb-2">Ваши сообщения</p>
                                <p className="text-sm font-medium opacity-60">Выберите диалог слева, чтобы начать общение</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="p-20 text-center">Загрузка чата...</div>}>
            <ChatContent />
        </Suspense>
    );
}
