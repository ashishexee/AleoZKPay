import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export const CodeBlock = ({ title, code, language = 'text' }: { title: string; code: string; language?: string }) => (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black/50">
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
            <span className="text-[11px] font-black uppercase tracking-[0.22em] text-orange-300">{title}</span>
            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-gray-500">{language}</span>
        </div>
        <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-gray-300">
            <code>{code}</code>
        </pre>
    </div>
);

export const MetricCard = ({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) => (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40">
            <Icon className="h-4 w-4 text-orange-300" />
        </div>
        <h3 className="mb-2 text-base font-bold text-white">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-400">{description}</p>
    </div>
);

export const Callout = ({
    title,
    children,
    tone = 'orange',
}: {
    title: string;
    children: ReactNode;
    tone?: 'orange' | 'blue' | 'emerald';
}) => {
    const toneStyles = {
        orange: 'text-orange-300',
        blue: 'text-blue-300',
        emerald: 'text-emerald-300',
    };

    return (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-5 py-4">
            <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.22em] ${toneStyles[tone]}`}>{title}</p>
            <div className="text-sm leading-relaxed text-gray-300">{children}</div>
        </div>
    );
};

export const IntegrationBadge = ({
    src,
    alt,
    title,
    description,
}: {
    src: string;
    alt: string;
    title: string;
    description: string;
}) => (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40">
            <img src={src} alt={alt} className="h-9 w-9 object-contain" />
        </div>
        <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <p className="text-sm leading-relaxed text-gray-400">{description}</p>
        </div>
    </div>
);

export const DiagramFigure = ({
    src,
    alt,
    caption,
}: {
    src: string;
    alt: string;
    caption: string;
}) => (
    <figure className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
        <div className="overflow-x-auto bg-black/30 p-3 md:p-5">
            <img src={src} alt={alt} className="h-auto w-full min-w-[720px] rounded-xl bg-white object-contain" />
        </div>
        <figcaption className="border-t border-white/[0.08] px-5 py-4 text-sm leading-relaxed text-gray-400">
            {caption}
        </figcaption>
    </figure>
);
