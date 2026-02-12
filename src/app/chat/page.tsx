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
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        initChat();

        // Subscribe to REALTIME messages
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
            // Use instant scroll for initial load, smooth for new messages
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

        // If starting a new chat from an ad
        if (initialReceiverId) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', initialReceiverId)
                .single();

            if (profile) {
                const chat = { userId: initialReceiverId, user: profile };
                setActiveChat(chat);
                const msgs = await chatService.getMessages(initialReceiverId);
                setMessages(msgs);
            }
        }

        setLoading(false);
    };

    const refreshConversations = async () => {
        const convs = await chatService.getConversations();
        setConversations(convs);
    };

    const selectChat = async (chat: any) => {
        setActiveChat(chat);
        setLoading(true);
        const msgs = await chatService.getMessages(chat.userId);
        setMessages(msgs);
        setLoading(false);
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
            await chatService.sendMessage(activeChat.userId, newMessage, adId || undefined);
            setNewMessage('');
            // Message will be added via realtime subscription
        } catch (error) {
            console.error('Send message error:', error);
            toast.error('Ошибка отправки');
        }
    };

    return (
        <div className="max-w-[1000px] mx-auto px-4 py-8">
            <div className="bg-surface border border-border rounded-[2.5rem] overflow-hidden shadow-2xl flex h-[650px] md:h-[700px]">

                {/* Sidebar: Conversations */}
                <div className={cn(
                    "w-full md:w-80 border-r border-border flex flex-col",
                    activeChat ? "hidden md:flex" : "flex"
                )}>
                    <div className="p-4 border-b border-border bg-surface sticky top-0">
                        <h2 className="text-xl font-black mb-4">Сообщения</h2>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Поиск чатов..."
                                className="w-full p-2 pl-9 rounded-xl bg-background border border-border text-sm outline-none focus:ring-2 focus:ring-primary"
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <button
                                    key={conv.userId}
                                    onClick={() => selectChat(conv)}
                                    className={cn(
                                        "w-full p-4 flex items-center gap-4 hover:bg-background transition-all border-b border-border/50",
                                        activeChat?.userId === conv.userId && "bg-primary/5 border-l-4 border-l-primary"
                                    )}
                                >
                                    <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-lg font-black text-accent overflow-hidden shrink-0">
                                        {conv.user.avatar_url ? (
                                            <img src={conv.user.avatar_url} alt={conv.user.full_name} className="w-full h-full object-cover" />
                                        ) : (
                                            conv.user.full_name?.charAt(0) || '?'
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="font-bold truncate">{conv.user.full_name}</div>
                                        <div className="text-xs text-muted truncate">{conv.lastMessage.content}</div>
                                    </div>
                                    <div className="text-[10px] text-muted shrink-0">
                                        {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-8 text-center text-muted text-sm italic">Здесь еще нет диалогов</div>
                        )}
                    </div>
                </div>

                {/* Main: Chat Window */}
                <div className={cn(
                    "flex-1 flex flex-col bg-background/30",
                    !activeChat ? "hidden md:flex items-center justify-center" : "flex"
                )}>
                    {activeChat ? (
                        <>
                            {/* Chat Header - Compact */}
                            <div className="py-2.5 px-4 bg-surface border-b border-border flex items-center gap-4 shadow-sm">
                                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 hover:bg-background rounded-full">
                                    <ChevronLeft className="h-6 w-6" />
                                </button>
                                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center font-black text-accent overflow-hidden shrink-0">
                                    {activeChat.user.avatar_url ? (
                                        <img src={activeChat.user.avatar_url} alt={activeChat.user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        activeChat.user.full_name?.charAt(0) || '?'
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold leading-tight flex items-center gap-2">
                                        {activeChat.user.full_name}
                                        <Link href={`/user?id=${activeChat.userId}`} className="p-1 hover:bg-background rounded-full transition-colors">
                                            <Star className="h-4 w-4 text-orange-400 fill-current" />
                                        </Link>
                                    </div>
                                    <div className="text-[10px] uppercase text-primary font-black tracking-widest">Онлайн</div>
                                </div>
                            </div>

                            {/* Messages Area - Tighter spacing */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {messages.map((msg) => (
                                    <div
                                        key={msg.id}
                                        className={cn(
                                            "flex flex-col w-fit max-w-[85%] lg:max-w-[450px] py-2 px-4 rounded-2xl text-[13px] md:text-sm shadow-sm",
                                            msg.sender_id === currentUser?.id
                                                ? "ml-auto bg-primary text-white rounded-br-none"
                                                : "mr-auto bg-surface border border-border rounded-bl-none"
                                        )}
                                    >
                                        <div className="leading-snug">{msg.content}</div>
                                        <div className={cn(
                                            "text-[9px] mt-1 opacity-70 flex items-center gap-1",
                                            msg.sender_id === currentUser?.id ? "justify-end" : "justify-start"
                                        )}>
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area - Compact */}
                            <form onSubmit={handleSendMessage} className="p-3 bg-surface border-t border-border flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="Введите сообщение..."
                                    className="flex-1 h-12 px-5 rounded-2xl bg-background border border-border outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-2xl hover:opacity-90 transition-all disabled:opacity-30 shadow-lg active:scale-90 shrink-0"
                                >
                                    <Send className="h-5 w-5" />
                                </button>
                            </form>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-4 text-muted p-10 text-center">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center shadow-inner">
                                <MessageCircle className="h-10 w-10 opacity-30" />
                            </div>
                            <div>
                                <p className="font-black text-xl text-foreground/70">Ваши сообщения</p>
                                <p className="text-sm font-medium opacity-60 mt-1">Выберите диалог, чтобы начать общение</p>
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
