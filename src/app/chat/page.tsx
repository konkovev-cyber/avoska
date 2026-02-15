'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { chatService } from '@/lib/supabase/chatService';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Send, Search, MessageCircle, Star, PlusSquare, ChevronLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { compressImage } from '@/lib/image-utils';

function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const adId = searchParams.get('adId');
    const initialReceiverId = searchParams.get('receiverId');

    const [conversations, setConversations] = useState<any[]>([]);
    const [activeChat, setActiveChat] = useState<any>(null);
    const [isSending, setIsSending] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Refs for state accessible inside subscription callback without re-running effect
    const activeChatRef = useRef<any>(null);
    const currentUserRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync refs with state
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    useEffect(() => {
        currentUserRef.current = currentUser;
    }, [currentUser]);

    // Initial load
    useEffect(() => {
        initChat();
    }, []);

    // Real-time subscription - depends on currentUser being set
    useEffect(() => {
        if (!currentUser) return;

        const channel = chatService.subscribe((payload) => {
            const msg = payload.new;
            const currentActive = activeChatRef.current;
            const user = currentUserRef.current;

            // Only add message if it belongs to the active chat
            if (currentActive && user && (
                (msg.sender_id === user.id && msg.receiver_id === currentActive.userId) ||
                (msg.sender_id === currentActive.userId && msg.receiver_id === user.id)
            )) {
                setMessages(prev => [...prev, msg]);
            }
            refreshConversations();
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentUser]);

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
                let adInfo = null;
                if (adId && adId !== 'null') {
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

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !activeChat) return;

        const originalFile = files[0];
        setIsUploading(true);
        const toastId = toast.loading('Обработка и загрузка фото...');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            const compressedFile = await compressImage(originalFile);

            const fileExt = compressedFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `${session.user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('chat-images')
                .upload(filePath, compressedFile, {
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-images')
                .getPublicUrl(filePath);

            const currentAdId = (adId && adId !== 'null' ? adId : null) || activeChat.lastMessage?.ad_id || activeChat.ad?.id || null;

            await chatService.sendMessage(
                activeChat.userId,
                '📷 Фото',
                currentAdId || undefined,
                'image',
                publicUrl
            );

            // Message update handled by subscription
            toast.success('Фото отправлено', { id: toastId });
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(`Ошибка: ${error.message || 'Не удалось отправить фото'}`, { id: toastId });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat || isSending) return;

        const msg = newMessage.trim();
        setNewMessage('');
        setIsSending(true);

        try {
            const currentAdId = (adId && adId !== 'null' ? adId : null) || activeChat.lastMessage?.ad_id || activeChat.ad?.id || null;
            await chatService.sendMessage(activeChat.userId, msg, currentAdId || undefined);
            // Message update handled by subscription
        } catch (error) {
            console.error('Send message error:', error);
            setNewMessage(msg);
            toast.error('Ошибка отправки');
        } finally {
            setIsSending(false);
        }
    };

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

    const getActiveAd = () => {
        if (!activeChat) return null;
        if (activeChat.ad) return activeChat.ad;
        if (activeChat.lastMessage?.ad) return activeChat.lastMessage.ad;
        return null;
    };

    const activeAd = getActiveAd();

    return (
        <div className="max-w-7xl mx-auto md:px-4 h-[calc(100vh-6rem)] md:h-[65vh] md:min-h-[500px] flex flex-col justify-center my-auto pb-4 md:pb-0">
            <div className="bg-white md:border md:border-gray-200 md:rounded-[1.5rem] overflow-hidden md:shadow-xl flex flex-col md:flex-row w-full h-full relative font-sans">
                {/* Global Close Button (Desktop & Mobile) */}
                <button
                    onClick={() => router.push('/')}
                    className="absolute top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all active:scale-90"
                    title="Закрыть"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Sidebar: Conversations */}
                <div className={cn(
                    "w-full md:w-80 border-r border-gray-100 flex flex-col bg-gray-50 z-10",
                    activeChat ? "hidden md:flex" : "flex h-full"
                )}>
                    <div className="p-4 border-b border-gray-100 sticky top-0 bg-gray-50 z-10">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-xl font-black tracking-tight text-gray-900">Сообщения</h2>
                        </div>
                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Поиск чатов..."
                                className="w-full h-10 pl-9 pr-4 rounded-lg bg-white border border-gray-200 focus:border-primary/50 text-sm font-bold outline-none transition-all placeholder:text-gray-400 text-gray-900 shadow-sm"
                            />
                            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-thin">
                        {conversations.length > 0 ? (
                            conversations.map((conv) => (
                                <button
                                    key={conv.userId}
                                    onClick={() => selectChat(conv)}
                                    className={cn(
                                        "w-full p-3 flex items-center gap-3 hover:bg-white transition-all border-b border-gray-100 last:border-0 group relative",
                                        activeChat?.userId === conv.userId && "bg-white shadow-sm z-10 ring-1 ring-gray-100"
                                    )}
                                >
                                    <div className="relative shrink-0">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center font-bold text-lg text-gray-500 overflow-hidden shrink-0 border border-gray-200">
                                            {conv.user.avatar_url ? (
                                                <img src={conv.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                conv.user.full_name?.charAt(0) || '?'
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <div className="font-bold truncate text-[14px] text-gray-900">{conv.user.full_name}</div>
                                            <div className="text-[10px] text-gray-400 font-bold">
                                                {new Date(conv.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 truncate font-medium flex items-center">
                                            {conv.lastMessage?.ad && (
                                                <span className="shrink-0 font-bold text-gray-700 mr-1.5 uppercase tracking-wide text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {conv.lastMessage.ad.title}
                                                </span>
                                            )}
                                            <span className="truncate">{conv.lastMessage.type === 'image' ? '📷 Фото' : conv.lastMessage.content}</span>
                                        </div>
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-center p-8 opacity-40">
                                <MessageCircle className="h-10 w-10 mb-3 text-gray-400" />
                                <p className="font-bold text-gray-400 text-sm">Нет сообщений</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main: Chat Window */}
                <div className={cn(
                    "flex-1 flex flex-col bg-white relative min-h-0",
                    !activeChat ? "hidden md:flex items-center justify-center bg-gray-50" : "flex h-full"
                )}>
                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="h-18 px-5 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0 z-20">
                                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                                    <ChevronLeft className="h-6 w-6 text-gray-800" />
                                </button>

                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg overflow-hidden shrink-0">
                                    {activeChat.user.avatar_url ? (
                                        <img src={activeChat.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        activeChat.user.full_name?.charAt(0) || '?'
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-black text-lg text-gray-900 truncate leading-none mb-1">
                                        {activeChat.user.full_name}
                                    </div>
                                    {activeAd ? (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wide truncate max-w-[200px] bg-gray-100 px-2 py-0.5 rounded">
                                                {activeAd.title}
                                            </span>
                                            <span className="text-xs font-black text-primary whitespace-nowrap">
                                                {activeAd.price ? `${activeAd.price.toLocaleString()} ₽` : 'Цена договорная'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="text-[10px] text-green-600 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                            Онлайн
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-full transition-colors text-gray-300 hover:text-yellow-400">
                                        <Star className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => setActiveChat(null)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                        title="Закрыть чат"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-6 scroll-smooth scrollbar-thin bg-gray-50/50">
                                {(Object.entries(groupedMessages) as [string, any[]][]).map(([date, msgs]) => (
                                    <div key={date} className="space-y-4">
                                        <div className="flex justify-center sticky top-0 z-10 pt-2 pb-2">
                                            <span className="px-3 py-1 bg-gray-200/80 backdrop-blur text-gray-600 text-[10px] font-bold uppercase tracking-widest rounded-full">
                                                {date}
                                            </span>
                                        </div>
                                        <div className="space-y-2 flex flex-col">
                                            {msgs.map((msg) => {
                                                const isOurs = msg.sender_id === currentUser?.id;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={cn(
                                                            "max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-2xl text-[14px] leading-relaxed shadow-sm relative group animate-in fade-in slide-in-from-bottom-1 duration-200",
                                                            isOurs
                                                                ? "self-end bg-[#E8F5E9] text-gray-900 border border-[#C8E6C9] rounded-br-sm"
                                                                : "self-start bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                                                        )}
                                                    >
                                                        {msg.type === 'image' && msg.attachment_url ? (
                                                            <div className="mb-1 rounded-lg overflow-hidden bg-black/5">
                                                                <img src={msg.attachment_url} alt="Photo" className="max-w-full h-auto object-contain max-h-[300px]" />
                                                            </div>
                                                        ) : (
                                                            <div className="font-medium whitespace-pre-wrap">{msg.content}</div>
                                                        )}

                                                        <div className={cn(
                                                            "text-[9px] mt-1 flex items-center justify-end gap-1 opacity-70 font-bold tracking-wide",
                                                            isOurs ? "text-green-800" : "text-gray-400"
                                                        )}>
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {isOurs && (
                                                                msg.is_read
                                                                    ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></svg>
                                                                    : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
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

                            {/* Input Area */}
                            <div className="p-3 md:p-4 bg-white border-t border-gray-100 flex items-end gap-2 shrink-0">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept="image/*"
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="h-10 w-10 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all active:scale-95 shrink-0"
                                >
                                    {isUploading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <PlusSquare className="h-6 w-6" />}
                                </button>

                                <form onSubmit={handleSendMessage} className="flex-1 flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[1.2rem] px-4 py-2 focus-within:bg-white focus-within:border-primary/40 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
                                    <textarea
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage(e);
                                            }
                                        }}
                                        placeholder="Напишите сообщение..."
                                        className="flex-1 bg-transparent border-none outline-none py-1.5 text-[14px] font-medium text-gray-900 resize-none max-h-[100px] scrollbar-hide placeholder:text-gray-400"
                                        rows={1}
                                        style={{ minHeight: '32px' }}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim() || isSending}
                                        className={cn(
                                            "w-8 h-8 mb-0.5 flex items-center justify-center rounded-lg transition-all active:scale-90 shrink-0",
                                            newMessage.trim() ? "bg-primary text-white shadow-md shadow-primary/20 hover:shadow-primary/30 rotate-0" : "text-gray-300 rotate-12"
                                        )}
                                    >
                                        <Send className={cn("h-4 w-4 ml-0.5", isSending && "animate-spin")} />
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="hidden md:flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-6 border border-gray-100">
                                <MessageCircle className="h-10 w-10 text-gray-300" />
                            </div>
                            <h3 className="font-black text-xl text-gray-900 mb-2">Выберите чат</h3>
                            <p className="text-gray-500 font-medium max-w-xs text-sm">Общайтесь с продавцами и покупателями в защищенном чате Авоська+</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense fallback={<div className="h-[60vh] flex items-center justify-center font-bold text-gray-300 uppercase tracking-widest text-xs">Загрузка чата...</div>}>
            <ChatContent />
        </Suspense>
    );
}
