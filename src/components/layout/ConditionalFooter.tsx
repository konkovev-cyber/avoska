'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
    const pathname = usePathname();
    const isAdPage = pathname.startsWith('/ad');

    if (isAdPage) return null;
    return <Footer />;
}
