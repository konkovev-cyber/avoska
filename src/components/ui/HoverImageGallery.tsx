'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { motion, AnimatePresence } from 'framer-motion';

interface HoverImageGalleryProps {
    images: string[];
    alt: string;
    href: string;
    imageClass?: string;
    layout?: 'vertical' | 'horizontal';
}

export default function HoverImageGallery({ images, alt, href, imageClass, layout = 'horizontal' }: HoverImageGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(false);

    const displayImages = images && images.length > 0 ? images : [];
    const hasMultiple = displayImages.length > 1;

    useEffect(() => {
        setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isMobile || !hasMultiple || !containerRef.current) return;

        const { left, width } = containerRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const percent = Math.max(0, Math.min(x / width, 1));
        const index = Math.floor(percent * displayImages.length);
        const safeIndex = Math.max(0, Math.min(index, displayImages.length - 1));
        setActiveIndex(safeIndex);
    };

    const handleDragEnd = (e: any, info: any) => {
        if (!hasMultiple) return;
        const threshold = 50;
        if (info.offset.x < -threshold) {
            // Next image
            setActiveIndex((prev) => (prev + 1) % displayImages.length);
        } else if (info.offset.x > threshold) {
            // Previous image
            setActiveIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
        }
    };

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative w-full h-full overflow-hidden group bg-surface dark:bg-muted/20",
                layout === 'vertical' && "bg-gray-50"
            )}
            onMouseMove={handleMouseMove}
        >
            <Link prefetch={false} href={href} className="block w-full h-full">
                <div className="w-full h-full relative flex items-center justify-center">
                    {displayImages.length > 0 ? (
                        <div className="w-full h-full relative overflow-hidden">
                            <AnimatePresence mode="wait" initial={false}>
                                <motion.img
                                    key={activeIndex}
                                    src={getOptimizedImageUrl(displayImages[activeIndex], { width: 500, quality: 85 })}
                                    alt={alt}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className={cn(
                                        "w-full h-full absolute inset-0",
                                        layout === 'horizontal' ? "object-cover" : "object-contain p-2"
                                    )}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0 }}
                                    onDragEnd={handleDragEnd}
                                />
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <span className="text-[9px] uppercase font-semibold tracking-widest">Нет фото</span>
                        </div>
                    )}
                </div>
            </Link>

            {/* Pagination Indicators */}
            {hasMultiple && (
                <div className={cn(
                    "absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 transition-opacity",
                    isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {displayImages.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "rounded-full transition-all shadow-sm",
                                layout === 'horizontal' ? "w-1.5 h-1.5" : "h-1 flex-1 min-w-[20px]",
                                idx === activeIndex
                                    ? "bg-white scale-125"
                                    : "bg-white/50"
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
