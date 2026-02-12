/**
 * Utility to compress and resize images on the client side
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions
                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width *= maxWidth / height;
                        height = maxWidth;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw and compress
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}
/**
 * Utility to get optimized Supabase image URL if possible
 */
export function getOptimizedImageUrl(url: string, opts: { width?: number; quality?: number } = {}) {
    if (!url || !url.includes('supabase.co')) return url;

    const { width = 500, quality = 80 } = opts;

    // Check if it's already a transformed URL
    if (url.includes('/render/image/')) return url;

    // Supabase transformation URL structure
    // From: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    // To:   https://[project].supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=[w]&quality=[q]

    return url.replace('/object/public/', '/render/image/public/') + `?width=${width}&quality=${quality}`;
}
