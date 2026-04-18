import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export const DeveloperCodeBlock = ({
    title,
    code,
    language = 'typescript'
}: {
    title: string;
    code: string;
    language?: string;
}) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mt-4 group">
            <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-t-xl border-b-0">
                <span className="font-mono text-xs text-gradient-gold drop-shadow-gold font-bold uppercase tracking-wider">{title}</span>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-600 font-mono uppercase">{language}</span>
                    <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors">
                        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                </div>
            </div>
            <pre className="p-5 bg-black/80 border border-white/10 rounded-b-xl overflow-x-auto text-xs text-gray-300 font-mono leading-relaxed group-hover:border-white/20 transition-colors">
                <code>{code}</code>
            </pre>
        </div>
    );
};

export default DeveloperCodeBlock;
