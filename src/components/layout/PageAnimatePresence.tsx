'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function PageAnimatePresence({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={pathname}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{
                    duration: 0.3,
                    ease: [0.22, 1, 0.36, 1] // Spring-like ease
                }}
                className="flex-1 flex flex-col"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    );
}
