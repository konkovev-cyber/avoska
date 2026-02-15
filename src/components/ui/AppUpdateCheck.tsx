'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Download, RefreshCw, X } from 'lucide-react';

const CURRENT_VERSION = '0.1.0'; // Should match package.json
const GITHUB_REPO = 'konkovev-cyber/avoska';

export default function AppUpdateCheck() {
    const [isMobileApp, setIsMobileApp] = useState(false);

    useEffect(() => {
        // Simple check for Capacitor / Mobile environment
        const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor !== undefined;
        setIsMobileApp(isCapacitor);

        if (isCapacitor) {
            // Force light mode for APK
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            checkForUpdates();
        }
    }, []);

    const checkForUpdates = async () => {
        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            if (!response.ok) return;

            const data = await response.json();
            const latestVersion = data.tag_name.replace('v', '');

            if (isNewerVersion(latestVersion, CURRENT_VERSION)) {
                showUpdateToast(latestVersion);
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    };

    const isNewerVersion = (latest: string, current: string) => {
        const l = latest.split('.').map(Number);
        const c = current.split('.').map(Number);

        for (let i = 0; i < Math.max(l.length, c.length); i++) {
            if ((l[i] || 0) > (c[i] || 0)) return true;
            if ((l[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
    };

    const showUpdateToast = (version: string) => {
        toast.custom((t) => (
            <div className="bg-surface border border-border p-4 rounded-2xl shadow-2xl flex flex-col gap-3 max-w-sm animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <RefreshCw className="h-5 w-5 text-green-600 animate-spin-slow" />
                        </div>
                        <div>
                            <h4 className="font-black text-sm uppercase tracking-tight">Доступно обновление!</h4>
                            <p className="text-xs text-muted-foreground font-medium">Версия {version} уже готова для скачивания.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <a
                        href={`https://github.com/${GITHUB_REPO}/releases/latest/download/avoska.apk`}
                        className="flex-1 bg-primary text-white py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                        onClick={() => toast.dismiss(t)}
                    >
                        <Download className="h-3 w-3" />
                        Скачать APK
                    </a>
                    <button
                        onClick={() => toast.dismiss(t)}
                        className="px-4 py-2 bg-muted/10 text-muted-foreground rounded-xl text-xs font-black uppercase tracking-widest hover:bg-muted/20 transition-all"
                    >
                        Позже
                    </button>
                </div>
            </div>
        ), {
            duration: 10000,
            position: 'top-center'
        });
    };

    return null; // This component handles logic and toasts, renders no UI directly
}
