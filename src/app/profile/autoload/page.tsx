'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Play, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

export default function AutoloadPage() {
    const router = useRouter();


    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);

    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [importStats, setImportStats] = useState<{ success: number; failed: number } | null>(null);

    const handlePreview = async () => {
        if (!url) {
            toast.error('Введите URL XML-файла');
            return;
        }

        setIsLoading(true);
        setPreviewData(null);
        setImportStats(null);
        setProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: any = { 'Content-Type': 'application/json' };
            if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

            const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/feed-preview`, {
                method: 'POST',
                headers: {
                    ...headers,
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                },
                body: JSON.stringify({ url }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Ошибка при загрузке фида');
            }

            setPreviewData(data);
            toast.success(`Найдено ${data.totalCount} объявлений`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async () => {
        if (!previewData || !previewData.allAds || previewData.allAds.length === 0) return;

        setIsImporting(true);
        setImportStats({ success: 0, failed: 0 });
        setProgress(0);

        const adsToImport = previewData.allAds;
        const total = adsToImport.length;
        let successCount = 0;
        let failedCount = 0;

        // Импортируем порциями по 3 штуки, чтобы не перегружать сервер/клиент
        const chunkSize = 3;

        for (let i = 0; i < total; i += chunkSize) {
            const chunk = adsToImport.slice(i, i + chunkSize);

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error('Не авторизован');

                const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/feed-import`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                    },
                    body: JSON.stringify({ ads: chunk.map((a: any) => a.raw) }),
                });

                const data = await res.json();

                if (res.ok) {
                    successCount += data.successResults?.length || 0;
                    failedCount += data.failedResults?.length || 0;
                } else {
                    failedCount += chunk.length;
                }
            } catch (e) {
                console.error('Import chunk error:', e);
                failedCount += chunk.length;
            }

            const currentProgress = Math.min(100, Math.round(((i + chunkSize) / total) * 100));
            setProgress(currentProgress);
            setImportStats({ success: successCount, failed: failedCount });
        }

        toast.success('Импорт завершен');
        setIsImporting(false);
    };

    return (
        <div className="max-w-[800px] mx-auto px-4 py-8 pb-32 md:pb-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Назад в профиль</span>
            </button>

            <h1 className="text-3xl font-bold mb-2">Автозагрузка</h1>
            <p className="text-muted-foreground mb-8">
                Загружайте объявления массово с помощью XML-фида в формате Avito.
            </p>

            <div className="bg-surface border border-border rounded-2xl p-6 mb-6 shadow-sm">
                <label className="block text-sm font-semibold mb-2">Ссылка на XML-файл</label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/avito_feed.xml"
                        className="flex-1 h-12 px-4 rounded-xl bg-background border border-border focus:border-primary outline-none transition-all"
                        disabled={isImporting}
                    />
                    <button
                        onClick={handlePreview}
                        disabled={!url || isLoading || isImporting}
                        className="h-12 px-8 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                        <span>Проверить</span>
                    </button>
                </div>
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Ссылка должна быть прямой и публично доступной
                </p>
            </div>

            {previewData && !importStats && (
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            Распознано: {previewData.totalCount} объявлений
                        </h2>

                        <button
                            onClick={handleImport}
                            disabled={isImporting}
                            className="px-6 py-2 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-green-600/20"
                        >
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            <span>{isImporting ? 'Загрузка...' : 'Начать загрузку'}</span>
                        </button>
                    </div>

                    {!isImporting && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground mb-3">Пример найденных объявлений (первые 3):</p>
                            {previewData.sample.map((ad: any, idx: number) => (
                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-border/50 bg-background rounded-xl gap-2">
                                    <div>
                                        <div className="font-semibold">{ad.title}</div>
                                        <div className="text-xs text-muted-foreground">Категория: {ad.category} • Фото: {ad.imagesCount}</div>
                                    </div>
                                    <div className="font-bold text-primary whitespace-nowrap">
                                        {ad.price} ₽
                                    </div>
                                </div>
                            ))}
                            {previewData.totalCount > 3 && (
                                <div className="text-center text-sm text-muted-foreground pt-2">
                                    ...и еще {previewData.totalCount - 3} объявлений
                                </div>
                            )}
                        </div>
                    )}

                    {isImporting && (
                        <div className="mt-8 space-y-4">
                            <div className="flex justify-between text-sm font-medium">
                                <span>Прогресс загрузки</span>
                                <span className="text-primary">{progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground text-center animate-pulse">
                                Пожалуйста, не закрывайте эту страницу до завершения импорта.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {importStats && (
                <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm animate-in fade-in zoom-in-95">
                    {progress === 100 ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-foreground">Загрузка завершена!</h2>
                            <div className="flex items-center justify-center gap-6 mt-4">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600">{importStats.success}</div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Успешно</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-red-500">{importStats.failed}</div>
                                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">С ошибкой</div>
                                </div>
                            </div>
                            <button
                                onClick={() => router.push('/profile')}
                                className="mt-6 px-8 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg"
                            >
                                Вернуться в профиль
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-center mb-6">Загрузка объявлений...</h2>
                            <div className="flex justify-between text-sm font-medium">
                                <span>Прогресс</span>
                                <span className="text-primary">{progress}%</span>
                            </div>
                            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <div className="flex justify-center gap-4 text-sm mt-4">
                                <span className="text-green-600 font-medium">Успешно: {importStats.success}</span>
                                <span className="text-red-500 font-medium">Ошибки: {importStats.failed}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
