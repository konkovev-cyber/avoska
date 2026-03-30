'use client';

import { Profile } from '@/lib/types';
import { User, Bell, ShieldCheck, Mail, LogOut, Search, Trash2, Ban, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface UsersTableProps {
    users: Profile[];
    onUpdate: () => Promise<void>;
    searchQuery: string;
}

export function UsersTable({ users, onUpdate, searchQuery }: UsersTableProps) {
    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
    );

    const updateRole = async (userId: string, role: string) => {
        try {
            const { error } = await supabase.from('profiles').update({ role }).eq('id', userId);
            if (error) throw error;
            toast.success('Роль обновлена');
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    const toggleVerify = async (userId: string, isVerified: boolean) => {
        try {
            const { error } = await supabase.from('profiles').update({ is_verified: isVerified }).eq('id', userId);
            if (error) throw error;
            toast.success(isVerified ? 'Пользователь верифицирован' : 'Верификация снята');
            await onUpdate();
        } catch (e: any) {
            toast.error('Ошибка: ' + e.message);
        }
    };

    return (
        <div className="bg-surface rounded-2xl border border-border/40 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted/30 border-b border-border/40">
                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Пользователь</th>
                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Роль</th>
                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hidden md:table-cell">Рейтинг</th>
                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Верификация</th>
                            <th className="p-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-muted/20 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0 border border-primary/5">
                                            {u.avatar_url ? (
                                                <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                                            ) : (
                                                <span className="text-sm font-semibold text-primary">{u.full_name?.charAt(0) || '?'}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold truncate">{u.full_name || 'Без имени'}</p>
                                            <p className="text-[10px] text-muted-foreground truncate">{u.phone || 'Нет телефона'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <select
                                        value={u.role}
                                        onChange={(e) => updateRole(u.id, e.target.value)}
                                        className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer hover:text-primary transition-colors pr-2"
                                    >
                                        <option value="user">Пользователь</option>
                                        <option value="admin">Администратор</option>
                                        <option value="moderator">Модератор</option>
                                    </select>
                                </td>
                                <td className="p-4 hidden md:table-cell">
                                    <div className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-orange-500 fill-current" />
                                        <span className="text-xs font-semibold">{u.rating?.toFixed(1) || '5.0'}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <button
                                        onClick={() => toggleVerify(u.id, !u.is_verified)}
                                        className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider transition-colors",
                                            u.is_verified ? "bg-green-500/10 text-green-500" : "bg-orange-500/10 text-orange-500"
                                        )}
                                    >
                                        {u.is_verified ? 'Верифицирован' : 'Не верифицирован'}
                                    </button>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-all" title="Забанить">
                                            <Ban className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
