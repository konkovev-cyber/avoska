'use client';

import { useState, useRef, MouseEvent } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-utils';

interface HoverImageGalleryProps {
    images: string[];
    alt: string;
    href: string;
    imageClass?: string;
}

export default function HoverImageGallery({ images, alt, href, imageClass }: HoverImageGalleryProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Safety check for empty images
    const displayImages = images && images.length > 0 ? images : [];
    const hasMultiple = displayImages.length > 1;

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!hasMultiple || !containerRef.current) return;

        const { left, width } = containerRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const percent = x / width;
        const index = Math.floor(percent * displayImages.length);

        // Clamp index to valid range
        const safeIndex = Math.max(0, Math.min(index, displayImages.length - 1));
        setActiveIndex(safeIndex);
    };

    const handleMouseLeave = () => {
        setActiveIndex(0);
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <Link href={href} className="block w-full h-full">
                {/* Main Image */}
                <div className="w-full h-full relative">
                    {displayImages.length > 0 ? (
                        <img
                            src={getOptimizedImageUrl(displayImages[activeIndex], { width: 400, quality: 75 })}
                            alt={alt}
                            className={cn("w-full h-full object-cover transition-opacity duration-200", imageClass)}
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                            <span className="text-[10px] uppercase font-bold tracking-widest opacity-50">Нет фото</span>
                        </div>
                    )}
                </div>
            </Link>

            {/* Hover Indicators (Dots/Lines) */}
            {hasMultiple && (
                <div className="absolute bottom-2 left-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    {displayImages.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "h-1 rounded-full flex-1 transition-all shadow-sm",
                                idx === activeIndex ? "bg-white" : "bg-white/40 backdrop-blur-sm"
                            )}
                        />
                    ))}
                </div>
            )}

            {/* Invisible Hit Areas - Optional if using pure math based on mouse position (current implementation uses math) */}
        </div>
    );
}
