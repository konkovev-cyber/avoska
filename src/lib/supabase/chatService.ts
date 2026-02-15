import { supabase } from './client';

export const chatService = {
    // Get all conversations for current user
    async getConversations() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        // This is a simplified version. Ideal would be a custom RPC or view for latest messages.
        // For now, we fetch unique pairs of sender/receiver.
        const { data, error } = await supabase
            .from('messages')
            .select(`
        *,
        sender:profiles!sender_id(full_name, avatar_url),
        receiver:profiles!receiver_id(full_name, avatar_url),
        ad:ads!ad_id(id, title, price, images)
      `)
            .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Manual grouping to get unique "conversations"
        const conversationsMap = new Map();
        data.forEach(msg => {
            const otherUser = msg.sender_id === session.user.id ? msg.receiver : msg.sender;
            const otherUserId = msg.sender_id === session.user.id ? msg.receiver_id : msg.sender_id;

            if (!conversationsMap.has(otherUserId)) {
                conversationsMap.set(otherUserId, {
                    user: otherUser,
                    userId: otherUserId,
                    lastMessage: msg,
                });
            }
        });

        return Array.from(conversationsMap.values());
    },

    // Get messages between two users
    async getMessages(otherUserId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return [];

        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${session.user.id})`)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data;
    },

    // Send a message
    async sendMessage(receiverId: string, content: string, adId?: string, type: 'text' | 'image' = 'text', attachmentUrl?: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;

        const { data, error } = await supabase
            .from('messages')
            .insert({
                sender_id: session.user.id,
                receiver_id: receiverId,
                content,
                ad_id: adId,
                type,
                attachment_url: attachmentUrl
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // Mark messages as read
    async markAsRead(senderId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', session.user.id)
            .eq('sender_id', senderId)
            .eq('is_read', false);
    },

    // Realtime subscription
    subscribe(callback: (payload: any) => void) {
        return supabase
            .channel('messages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, callback)
            .subscribe();
    }
};
