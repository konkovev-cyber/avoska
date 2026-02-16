'use client';

import { useState, useRef, MouseEvent, TouchEvent } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { getOptimizedImageUrl } from '@/lib/image-utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    const [isHovering, setIsHovering] = useState(false);

    const displayImages = images && images.length > 0 ? images : [];
    const hasMultiple = displayImages.length > 1;

    const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
        if (!hasMultiple || !containerRef.current) return;

        const { left, width } = containerRef.current.getBoundingClientRect();
        const x = e.clientX - left;
        const percent = Math.max(0, Math.min(x / width, 1)); // Clamp 0-1
        const index = Math.floor(percent * displayImages.length);
        const safeIndex = Math.max(0, Math.min(index, displayImages.length - 1));
        setActiveIndex(safeIndex);
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        if (layout === 'vertical') {
            setActiveIndex(0);
        }
    };

    const handleTouchSwipe = (e: TouchEvent<HTMLDivElement>) => {
        if (!hasMultiple) return;
        const touch = e.touches[0];
        const startX = containerRef.current?.getBoundingClientRect().left || 0;
        const width = containerRef.current?.getBoundingClientRect().width || 300;
        const x = touch.clientX - startX;
        const percent = x / width;
        const index = Math.floor(percent * displayImages.length);
        const safeIndex = Math.max(0, Math.min(index, displayImages.length - 1));
        setActiveIndex(safeIndex);
    };

    const nextImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev + 1) % displayImages.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActiveIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
    };

    // Horizontal layout (Avito style - mouse swipe only)
    if (layout === 'horizontal') {
        return (
            <div
                ref={containerRef}
                className="relative w-full h-full overflow-hidden group bg-gray-50"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                <Link href={href} className="block w-full h-full">
                    {/* Instagram-style: blurred background + centered image */}
                    <div className="w-full h-full relative flex items-center justify-center">
                        {displayImages.length > 0 ? (
                            <>
                                {/* Blurred background fill */}
                                <img
                                    src={getOptimizedImageUrl(displayImages[activeIndex], { width: 400, quality: 85 })}
                                    alt={alt}
                                    className="absolute inset-0 w-full h-full object-cover blur-xl scale-110"
                                    loading="lazy"
                                    style={{ objectPosition: 'center' }}
                                />
                                {/* Dark overlay for better contrast */}
                                <div className="absolute inset-0 bg-black/10" />
                                
                                {/* Sharp main image - contain to show full image */}
                                <img
                                    src={getOptimizedImageUrl(displayImages[activeIndex], { width: 400, quality: 85 })}
                                    alt={alt}
                                    className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                                    loading="lazy"
                                    style={{ objectPosition: 'center' }}
                                />
                            </>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                <span className="text-[9px] uppercase font-bold tracking-widest">Нет фото</span>
                            </div>
                        )}
                    </div>
                </Link>

                {/* Dots indicator - always visible on hover */}
                {hasMultiple && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                        {displayImages.map((_, idx) => (
                            <div
                                key={idx}
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-all",
                                    idx === activeIndex ? "bg-white scale-125" : "bg-white/50"
                                )}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Vertical layout (old style)
    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-hidden group bg-gray-50"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchSwipe}
        >
            <Link href={href} className="block w-full h-full">
                <div className="w-full h-full relative flex items-center justify-center p-3">
                    {displayImages.length > 0 ? (
                        <>
                            <img
                                src={getOptimizedImageUrl(displayImages[activeIndex], { width: 500, quality: 85 })}
                                alt={alt}
                                className="w-full h-full object-contain transition-all duration-200 group-hover:scale-[1.02]"
                                loading="lazy"
                                style={{ objectPosition: 'center' }}
                            />
                            <div className="absolute inset-0 border border-gray-100/50 pointer-events-none" />
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                            <span className="text-[10px] uppercase font-bold tracking-widest">Нет фото</span>
                        </div>
                    )}
                </div>
            </Link>

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
        </div>
    );
}
