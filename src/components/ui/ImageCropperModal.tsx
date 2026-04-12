'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, Check, RotateCcw, RotateCw, Maximize2, Square, RectangleHorizontal, Layout, RefreshCw, FlipHorizontal2, FlipVertical2, Scan } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageCropperModalProps {
    imageSrc: string;
    onCropComplete: (croppedImageBlob: Blob) => void;
    onClose: () => void;
    aspectRatio?: number; // e.g., 16 / 9, or undefined for free
}

const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

export default function ImageCropperModal({ imageSrc, onCropComplete, onClose, aspectRatio = 16 / 9 }: ImageCropperModalProps) {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [flip, setFlip] = useState({ horizontal: false, vertical: false });
    const [currentAspectRatio, setCurrentAspectRatio] = useState<number | undefined>(aspectRatio);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);

    const onCropChange = (crop: Point) => setCrop(crop);
    const onZoomChange = (zoom: number) => setZoom(zoom);

    const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation: number, flip = { horizontal: false, vertical: false }): Promise<Blob | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        const rotRad = (rotation * Math.PI) / 180;
        const { width: bWidth, height: bHeight } = rotateSize(image.width, image.height, rotation);

        canvas.width = bWidth;
        canvas.height = bHeight;

        ctx.translate(bWidth / 2, bHeight / 2);
        ctx.rotate(rotRad);
        ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);

        const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(data, 0, 0);

        return new Promise((resolve) => {
            canvas.toBlob((file) => {
                resolve(file);
            }, 'image/jpeg', 0.9);
        });
    };

    const rotateSize = (width: number, height: number, rotation: number) => {
        const rotRad = (rotation * Math.PI) / 180;
        return {
            width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
            height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
        };
    };

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setIsCropping(true);
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, flip);
            if (croppedImage) {
                onCropComplete(croppedImage);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCropping(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
            <div className="relative w-full h-full md:w-[80vw] md:h-[80vh] max-w-4xl bg-surface/95 rounded-none md:rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.3)] border md:border-border">
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-border bg-background z-10 shrink-0">
                    <h2 className="text-xl font-bold">Обрезать область</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors active:scale-95"><X className="h-6 w-6" /></button>
                </div>

                <div className="relative flex-1 bg-black/40 overflow-hidden group">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={currentAspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={handleCropComplete}
                        onZoomChange={onZoomChange}
                        onRotationChange={setRotation}
                        transform={`rotate(${rotation}deg) scale(${flip.horizontal ? -1 : 1}, ${flip.vertical ? -1 : 1})`}
                        objectFit="contain"
                        showGrid={true}
                    />

                    {/* Quick Aspect Ratio Overlays */}
                    <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                        {[
                            { label: '16:9', value: 16 / 9, icon: RectangleHorizontal },
                            { label: '4:3', value: 4 / 3, icon: Layout },
                            { label: '1:1', value: 1, icon: Square },
                            { label: '2:3', value: 2 / 3, icon: RotateCw },
                            { label: 'Free', value: undefined, icon: Scan },
                        ].map((ratio) => (
                            <button
                                key={ratio.label}
                                onClick={() => setCurrentAspectRatio(ratio.value)}
                                className={cn(
                                    "p-2.5 rounded-xl backdrop-blur-md border transition-all flex items-center gap-2 text-[10px] font-bold uppercase",
                                    currentAspectRatio === ratio.value ? "bg-primary text-white border-primary" : "bg-black/40 text-white border-white/20 hover:bg-black/60"
                                )}
                            >
                                <ratio.icon className="h-3.5 w-3.5" />
                                {ratio.label}
                            </button>
                        ))}
                    </div>

                    {/* Rotation controls right side */}
                    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                        <button
                            onClick={() => setRotation((r) => r - 90)}
                            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all"
                            title="Повернуть влево"
                        >
                            <RotateCcw className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setRotation((r) => r + 90)}
                            className="p-3 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all"
                            title="Повернуть вправо"
                        >
                            <RotateCw className="h-5 w-5" />
                        </button>
                        <div className="h-px w-8 bg-white/10 my-1 self-center" />
                        <button
                            onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))}
                            className={cn("p-3 backdrop-blur-md border rounded-xl transition-all", flip.horizontal ? "bg-primary border-primary text-white" : "bg-black/40 border-white/20 text-white hover:bg-black/60")}
                            title="Отразить по горизонтали"
                        >
                            <FlipHorizontal2 className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setFlip(f => ({ ...f, vertical: !f.vertical }))}
                            className={cn("p-3 backdrop-blur-md border rounded-xl transition-all", flip.vertical ? "bg-primary border-primary text-white" : "bg-black/40 border-white/20 text-white hover:bg-black/60")}
                            title="Отразить по вертикали"
                        >
                            <FlipVertical2 className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => { setRotation(0); setZoom(1); setCrop({ x: 0, y: 0 }); setFlip({ horizontal: false, vertical: false }); }}
                            className="p-3 bg-red-500/40 hover:bg-red-500/60 backdrop-blur-md border border-white/20 text-white rounded-xl transition-all mt-2"
                            title="Сброс"
                        >
                            <RefreshCw className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-background border-t border-border z-10 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="w-full sm:flex-1 flex flex-col gap-1">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Масштаб ({(zoom * 100).toFixed(0)}%)</span>
                        </div>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.01}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-primary h-1.5 bg-muted rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-8 py-3.5 rounded-2xl border border-border font-bold hover:bg-muted transition-all uppercase text-[10px] tracking-widest active:scale-95"
                        >
                            Отмена
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isCropping}
                            className="flex-[2] sm:flex-none px-12 py-3.5 rounded-2xl bg-primary text-white font-bold inline-flex justify-center items-center gap-2 hover:shadow-xl hover:shadow-primary/20 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 active:scale-95"
                        >
                            {isCropping ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            {isCropping ? "Секунду..." : "Сохранить"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
