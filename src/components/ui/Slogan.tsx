import { cn } from '@/lib/utils';

interface SloganProps {
    className?: string;
}

export const Slogan = ({ className }: SloganProps) => {
    return (
        <p className={cn("text-xs sm:text-sm font-semibold text-muted-foreground mt-1 leading-tight", className)}>
            Авоська — доска объявлений в вашем городе
        </p>
    );
};