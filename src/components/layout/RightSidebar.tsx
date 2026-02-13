'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function RightSidebar() {
    const pathname = usePathname();
    const isHidden = pathname.startsWith('/admin') || pathname.startsWith('/login') || pathname.startsWith('/register');

    if (isHidden) return null;

    return (
        <aside className="hidden xl:flex flex-col gap-4 w-[320px] shrink-0 p-4 sticky top-20 h-[calc(100vh-5rem)]">
            {/* Footer Links */}
            <div className="mt-auto pt-4 text-[10px] text-muted-foreground font-medium text-center">
                © 2024 Авоська+ <br />
                <Link href="/privacy" className="hover:underline">Конфиденциальность</Link> • <Link href="/terms" className="hover:underline">Оферта</Link>
            </div>
        </aside>
    );
}
