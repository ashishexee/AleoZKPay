import React from 'react';

export const DeveloperStepCard = ({
    step,
    title,
    desc,
    icon: Icon
}: {
    step: string;
    title: string;
    desc: string;
    icon: React.ComponentType<any>;
}) => (
    <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
            <span className="text-[11px] font-black text-gray-600 font-mono">{step}</span>
            <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <Icon className="w-4 h-4 text-gray-300" />
            </div>
        </div>
        <h3 className="text-lg font-bold text-gradient-gold drop-shadow-gold mb-2">{title}</h3>
        <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
    </div>
);

export default DeveloperStepCard;
