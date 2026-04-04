import { type ComponentProps } from 'react';

import { GlobePulse } from '@/components/ui/cobe-globe-pulse';

const heroMarkers = [
    { id: 'nullpay-london', location: [51.5072, -0.1276] as [number, number], delay: 0 },
    { id: 'nullpay-new-york', location: [40.7128, -74.006] as [number, number], delay: 0.45 },
    { id: 'nullpay-singapore', location: [1.3521, 103.8198] as [number, number], delay: 0.9 },
    { id: 'nullpay-mumbai', location: [19.076, 72.8777] as [number, number], delay: 1.35 },
];

type DottedGlobeProps = {
    className?: string;
    globeClassName?: ComponentProps<typeof GlobePulse>['className'];
};

const DottedGlobe = ({ className = '', globeClassName = '' }: DottedGlobeProps) => {
    return (
        <div className={`relative mx-auto aspect-square w-full max-w-[360px] sm:max-w-[500px] md:max-w-[620px] lg:max-w-[760px] ${className}`}>
            <div className="absolute inset-[14%] rounded-full bg-orange-500/8 blur-[110px] md:blur-[150px]" />
            <div className="absolute inset-[11%] rounded-full bg-cyan-400/5 blur-[80px] md:blur-[100px]" />

            <div className="pointer-events-none absolute inset-[12%] rounded-full">
                <GlobePulse
                    className={`h-full w-full opacity-85 drop-shadow-[0_0_65px_rgba(249,115,22,0.12)] ${globeClassName}`}
                    markers={heroMarkers}
                    speed={0.0024}
                />
            </div>
        </div>
    );
};

export default DottedGlobe;
