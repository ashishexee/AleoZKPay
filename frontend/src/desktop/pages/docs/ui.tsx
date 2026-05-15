import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useState, useCallback } from 'react';
import { Check, Copy, AlertCircle, Info, AlertTriangle, Lightbulb } from 'lucide-react';

export const CodeBlock = ({ title, code, language = 'text' }: { title: string; code: string; language?: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (!navigator?.clipboard) return;
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // ignore
        }
    }, [code]);

    return (
        <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#08080a]">
            <div className="flex items-center justify-between border-b border-white/[0.05] bg-white/[0.015] px-4 py-2">
                <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                        <div className="h-[9px] w-[9px] rounded-full bg-[#ff5f57]" />
                        <div className="h-[9px] w-[9px] rounded-full bg-[#febc2e]" />
                        <div className="h-[9px] w-[9px] rounded-full bg-[#28c840]" />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400 tracking-wide">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-gray-600">{language}</span>
                    <button
                        onClick={handleCopy}
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-all ${
                            copied
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-white/[0.04] text-gray-500 hover:bg-white/[0.08] hover:text-gray-300'
                        }`}
                        aria-label="Copy code"
                    >
                        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>
            </div>
            <div className="relative">
                <pre className="overflow-x-auto p-4 text-[13px] leading-[1.7] text-gray-300 font-mono">
                    <code>{code}</code>
                </pre>
            </div>
        </div>
    );
};

export const MetricCard = ({ title, description, icon: Icon }: { title: string; description: string; icon: LucideIcon }) => (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 hover:bg-white/[0.035] hover:border-white/[0.1] transition-all duration-200">
        <div className="flex items-center gap-3 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <Icon className="h-4 w-4 text-orange-400" />
            </div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <p className="text-[13px] leading-relaxed text-gray-400">{description}</p>
    </div>
);

export const Callout = ({
    title,
    children,
    tone = 'orange',
}: {
    title: string;
    children: ReactNode;
    tone?: 'orange' | 'blue' | 'emerald' | 'red' | 'purple';
}) => {
    const config = {
        orange:  { border: 'border-l-orange-500/60', bg: 'bg-orange-500/[0.03]',  icon: AlertCircle,    iconColor: 'text-orange-400' },
        blue:    { border: 'border-l-blue-500/60',   bg: 'bg-blue-500/[0.03]',    icon: Info,           iconColor: 'text-blue-400' },
        emerald: { border: 'border-l-emerald-500/60',bg: 'bg-emerald-500/[0.03]', icon: Lightbulb,      iconColor: 'text-emerald-400' },
        red:     { border: 'border-l-red-500/60',     bg: 'bg-red-500/[0.03]',     icon: AlertTriangle,  iconColor: 'text-red-400' },
        purple:  { border: 'border-l-purple-500/60',  bg: 'bg-purple-500/[0.03]',  icon: Info,           iconColor: 'text-purple-400' },
    };

    const c = config[tone];
    const Icon = c.icon;

    return (
        <div className={`rounded-r-lg border-l-[3px] border border-white/[0.04] ${c.border} ${c.bg} px-5 py-4`}>
            <div className="flex items-start gap-3">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${c.iconColor}`} />
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white mb-1">{title}</p>
                    <div className="text-[13px] leading-relaxed text-gray-300">{children}</div>
                </div>
            </div>
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
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.035] transition-all">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/[0.06] bg-black/40">
            <img src={src} alt={alt} className="h-8 w-8 object-contain" />
        </div>
        <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-[13px] text-gray-400">{description}</p>
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
    <figure className="overflow-hidden rounded-xl border border-white/[0.06] bg-black/20">
        <div className="overflow-x-auto p-3 md:p-5">
            <img src={src} alt={alt} className="h-auto w-full min-w-[720px] rounded-lg bg-white object-contain" />
        </div>
        <figcaption className="border-t border-white/[0.05] px-5 py-3 text-[13px] text-gray-400">
            {caption}
        </figcaption>
    </figure>
);

export const StatusBadge = ({ status, desc }: { status: string; desc: string }) => {
    const colors: Record<string, string> = {
        PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        SETTLED: 'text-green-400 bg-green-400/10 border-green-400/20',
        FAILED: 'text-red-400 bg-red-400/10 border-red-400/20',
        EXPIRED: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        PROCESSING: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    };
    return (
        <div className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${colors[status] ?? 'text-white bg-white/10 border-white/20'}`}>{status}</span>
            <p className="text-gray-400 text-[13px]">{desc}</p>
        </div>
    );
};

export const PropRow = ({ name, type, required, desc }: { name: string; type: string; required?: boolean; desc: string }) => (
    <div className="flex flex-col sm:flex-row items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
        <div className="flex items-center gap-2 min-w-[180px]">
            <code className="text-orange-300 text-[13px] font-mono font-semibold">{name}</code>
            {required && <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider">req</span>}
        </div>
        <code className="text-blue-400 text-[13px] font-mono min-w-[80px]">{type}</code>
        <p className="text-gray-500 text-[13px] flex-1">{desc}</p>
    </div>
);

export const StepCard = ({
    number,
    title,
    description,
    code,
    language = 'bash',
}: {
    number: number;
    title: string;
    description: string;
    code?: string;
    language?: string;
}) => (
    <div className="relative pl-10 pb-8 last:pb-0">
        <div className="absolute left-0 top-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500/10 border border-orange-500/20 text-[11px] font-bold text-orange-400">
            {number}
        </div>
        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-white/[0.05]" />
        <h4 className="text-[14px] font-semibold text-white mb-1">{title}</h4>
        <p className="text-[13px] text-gray-400 leading-relaxed mb-3">{description}</p>
        {code && (
            <div className="rounded-lg border border-white/[0.05] bg-[#08080a] overflow-hidden">
                <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.05] bg-white/[0.015]">
                    <span className="text-[10px] font-semibold text-gray-500 tracking-wide">{language}</span>
                </div>
                <pre className="p-3 text-[13px] text-gray-300 font-mono overflow-x-auto">
                    <code>{code}</code>
                </pre>
            </div>
        )}
    </div>
);

export const EndpointCard = ({
    method,
    path,
    auth,
    description,
}: {
    method: string;
    path: string;
    auth: string;
    description: string;
}) => {
    const methodColors: Record<string, string> = {
        GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
        POST: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
        PATCH: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        DELETE: 'text-red-400 bg-red-400/10 border-red-400/20',
        PUT: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    };

    return (
        <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-3.5 hover:bg-white/[0.03] transition-all">
            <div className="flex items-center gap-2.5 mb-1.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${methodColors[method] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                    {method}
                </span>
                <code className="text-[13px] font-mono text-orange-300/90">{path}</code>
            </div>
            <p className="text-[12px] text-gray-500 mb-1">{description}</p>
            <span className="text-[10px] text-gray-600">Auth: <span className="text-gray-400">{auth}</span></span>
        </div>
    );
};

export const InfoCard = ({
    title,
    value,
    subtitle,
    tone = 'orange',
}: {
    title: string;
    value: string;
    subtitle?: string;
    tone?: 'orange' | 'blue' | 'emerald' | 'purple';
}) => {
    const toneMap = {
        orange: 'border-orange-500/10 bg-orange-500/[0.02]',
        blue: 'border-blue-500/10 bg-blue-500/[0.02]',
        emerald: 'border-emerald-500/10 bg-emerald-500/[0.02]',
        purple: 'border-purple-500/10 bg-purple-500/[0.02]',
    };

    return (
        <div className={`rounded-xl border p-4 ${toneMap[tone]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1">{title}</p>
            <p className="text-xl font-bold text-white">{value}</p>
            {subtitle && <p className="text-[11px] text-gray-500 mt-1">{subtitle}</p>}
        </div>
    );
};
