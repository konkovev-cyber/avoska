'use client';

export type Theme = 'light' | 'dark' | 'system';

export function getTheme(): Theme {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('theme') as Theme) || 'system';
}

export function setTheme(theme: Theme) {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;

    if (theme === 'system') {
        localStorage.removeItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        root.removeAttribute('data-theme');
    } else {
        localStorage.setItem('theme', theme);
        if (theme === 'dark') {
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
        } else {
            root.classList.remove('dark');
            root.setAttribute('data-theme', 'light');
        }
    }
}

export function initTheme() {
    if (typeof window === 'undefined') return;
    setTheme(getTheme());
}
