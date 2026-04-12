'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import { Skeleton } from './Skeleton';

interface OptimizedImageProps extends Omit<ImageProps, 'src' | 'fill' | 'width' | 'height'> {
    src: string | null | undefined;
    width?: number;
    height?: number;
    fallback?: React.ReactNode;
    objectFit?: 'contain' | 'cover' | 'fill' | 'none';
}

/**
 * Custom loader for Supabase Image Transformation.
 * Uses the fill prop — parent must be position:relative with defined dimensions.
 */
const supabaseLoader = ({ src, width, quality }: { src: string; width: number; quality?: number }) => {
    if (!src.includes('supabase.co')) return src;
    const baseUrl = src.split('?')[0];
    const renderUrl = baseUrl.replace('/object/public/', '/render/image/public/');
    return `${renderUrl}?width=${width}&quality=${quality || 80}`;
};

export function OptimizedImage({
    src,
    alt,
    className,
    fallback,
    onLoad,
    objectFit,
    width,
    ...props
}: OptimizedImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);

    // Parse object-fit from className for backward compatibility
    const safeClassName = className || "";
    const fitFromClass = safeClassName.includes('object-contain') ? 'contain' :
        safeClassName.includes('object-cover') ? 'cover' : undefined;
    const fit: 'contain' | 'cover' | 'fill' | 'none' | undefined = objectFit || fitFromClass || 'cover';

    // Strip object-* classes to avoid conflict with style prop
    const cleanClassName = safeClassName.replace(/\bobject-\w+\b/g, '').trim();

    if (!src || isError) {
        return (
            <div className={cn("absolute inset-0 flex items-center justify-center bg-muted/30", cleanClassName)}>
                {fallback || (
                    <div className="flex flex-col items-center gap-2 opacity-20">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            {isLoading && <Skeleton className="absolute inset-0 z-10" />}
            <Image
                loader={supabaseLoader}
                src={src}
                alt={alt || "Изображение"}
                fill
                sizes={width ? `${width}px` : "(max-width: 768px) 100vw, 50vw"}
                className={cn(
                    "transition-all duration-300",
                    isLoading ? "scale-105 blur-lg" : "scale-100 blur-0",
                    cleanClassName
                )}
                style={{ objectFit: fit }}
                onLoad={(e) => {
                    setIsLoading(false);
                    if (onLoad) onLoad(e);
                }}
                onError={() => {
                    setIsLoading(false);
                    setIsError(true);
                }}
                {...props}
            />
        </>
    );
}
