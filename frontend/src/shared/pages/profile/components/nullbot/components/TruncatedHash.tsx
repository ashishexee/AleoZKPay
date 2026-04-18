import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface TruncatedHashProps {
    children: React.ReactNode;
    className?: string;
}

export const TruncatedHash = ({ children, className }: TruncatedHashProps) => {
    const [copied, setCopied] = useState(false);
    const text = String(children).replace(/\n$/, '');
    const isLongHash = !text.includes(' ') && text.length > 30;

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (isLongHash) {
        const display = `${text.slice(0, 8)}...${text.slice(-8)}`;
        return (
            <span className="inline-flex cursor-text items-center gap-1.5 rounded-md bg-white/10 py-[1.5px] pl-1.5 pr-1 align-middle text-[12px] font-mono text-orange-200 group">
                <span>{display}</span>
                <button
                    onClick={handleCopy}
                    className="flex shrink-0 items-center justify-center rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                    title="Copy full sequence"
                >
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                </button>
            </span>
        );
    }

    return <code className={className}>{children}</code>;
};
