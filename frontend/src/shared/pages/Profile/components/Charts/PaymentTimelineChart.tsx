import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { MerchantReceipt } from '../../../../utils/aleo-utils';
import { Shimmer } from '../../../../components/ui/Shimmer';

type Range = '1D' | '1W' | '1M';
type TokenFilter = 'ALL' | 'CREDITS' | 'USDCX' | 'USAD';

interface PaymentTimelineChartProps {
    receipts: MerchantReceipt[];
    paymentTimestampsByTxId?: Record<string, string>;
    isLoading?: boolean;
    isRefreshing?: boolean;
    onRefresh?: () => void | Promise<void>;
}

interface DataPoint {
    label: string;
    timestamp: number;
    credits: number;
    usdcx: number;
    usad: number;
    dateKey?: string;
}

type TimezoneOption = {
    label: string;
    value: string;
};

const TOKEN_CONFIG: Record<Exclude<TokenFilter, 'ALL'>, { key: keyof DataPoint; color: string; label: string }> = {
    CREDITS: { key: 'credits', color: '#00FFD1', label: 'Credits' },
    USDCX: { key: 'usdcx', color: '#60A5FA', label: 'USDCx' },
    USAD: { key: 'usad', color: '#F59E0B', label: 'USAD' },
};

const TIMEZONE_OPTIONS: TimezoneOption[] = [
    { label: 'Local Time', value: 'local' },
    { label: 'USA (New York)', value: 'America/New_York' },
    { label: 'USA (Los Angeles)', value: 'America/Los_Angeles' },
    { label: 'UK (London)', value: 'Europe/London' },
    { label: 'India', value: 'Asia/Kolkata' },
    { label: 'Japan', value: 'Asia/Tokyo' },
    { label: 'China', value: 'Asia/Shanghai' },
    { label: 'Singapore', value: 'Asia/Singapore' },
    { label: 'UAE (Dubai)', value: 'Asia/Dubai' },
    { label: 'Australia (Sydney)', value: 'Australia/Sydney' },
];

function getFormatterOptions(timeZone: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
    return timeZone === 'local' ? options : { ...options, timeZone };
}

function getTimeParts(ts: number, timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', getFormatterOptions(timeZone, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }));

    const parts = formatter.formatToParts(new Date(ts));
    const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));

    return {
        year: Number(map.year),
        month: Number(map.month),
        day: Number(map.day),
        hour: Number(map.hour),
        minute: Number(map.minute),
    };
}

function getDateKey(ts: number, timeZone: string) {
    const { year, month, day } = getTimeParts(ts, timeZone);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getRecentDateKeys(count: number, timeZone: string) {
    const keys: string[] = [];
    const seen = new Set<string>();

    for (let offset = count + 5; offset >= 0; offset--) {
        const ts = Date.now() - (offset * 24 * 60 * 60 * 1000);
        const key = getDateKey(ts, timeZone);
        if (!seen.has(key)) {
            seen.add(key);
            keys.push(key);
        }
    }

    return keys.slice(-count);
}

function formatClockLabel(hour: number, minute: number) {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

function formatTimeLabel(ts: number, range: Range, timeZone: string): string {
    if (range === '1D') {
        return new Intl.DateTimeFormat('en-US', getFormatterOptions(timeZone, {
            hour: 'numeric',
            minute: '2-digit'
        })).format(new Date(ts));
    }

    if (range === '1W') {
        return new Intl.DateTimeFormat('en-US', getFormatterOptions(timeZone, {
            weekday: 'short'
        })).format(new Date(ts));
    }

    return new Intl.DateTimeFormat('en-US', getFormatterOptions(timeZone, {
        month: 'numeric',
        day: 'numeric'
    })).format(new Date(ts));
}

function roundToQuarterHour(ts: number): number {
    return Math.floor(ts / (15 * 60 * 1000)) * (15 * 60 * 1000);
}

function buildBuckets(range: Range, timeZone: string): DataPoint[] {
    const buckets: DataPoint[] = [];

    if (range === '1D') {
        for (let h = 0; h < 24; h++) {
            for (let quarter = 0; quarter < 4; quarter++) {
                const minute = quarter * 15;
                buckets.push({
                    label: formatClockLabel(h, minute),
                    timestamp: ((h * 60) + minute) * 60 * 1000,
                    credits: 0,
                    usdcx: 0,
                    usad: 0
                });
            }
        }
        return buckets;
    }

    const dateKeys = getRecentDateKeys(range === '1W' ? 7 : 30, timeZone);
    dateKeys.forEach((dateKey, index) => {
        const referenceTs = Date.now() - (((dateKeys.length - 1) - index) * 24 * 60 * 60 * 1000);
        buckets.push({
            label: formatTimeLabel(referenceTs, range, timeZone),
            timestamp: index,
            credits: 0,
            usdcx: 0,
            usad: 0,
            dateKey
        });
    });

    return buckets;
}

function getBucketIndex(ts: number, range: Range, buckets: DataPoint[], timeZone: string): number {
    if (range === '1D') {
        const date = getTimeParts(ts, timeZone);
        return (date.hour * 4) + Math.floor(date.minute / 15);
    }

    const dateKey = getDateKey(ts, timeZone);
    return buckets.findIndex((bucket) => bucket.dateKey === dateKey);
}

function getDefaultZoomWindow(range: Range) {
    if (range === '1D') return 16;
    if (range === '1W') return 4;
    return 10;
}

function getMinimumZoomWindow(range: Range) {
    if (range === '1D') return 6;
    if (range === '1W') return 3;
    return 5;
}

function canZoom(range: Range, pointCount: number) {
    return pointCount > getMinimumZoomWindow(range);
}

function getAutoZoomRange(data: DataPoint[], range: Range) {
    if (!canZoom(range, data.length)) return null;

    const activity = data.map((point) => point.credits + point.usdcx + point.usad);
    const totalActivity = activity.reduce((sum, value) => sum + value, 0);
    if (totalActivity <= 0) return null;

    const windowSize = Math.min(getDefaultZoomWindow(range), data.length);
    if (windowSize >= data.length) return null;

    let bestStart = 0;
    let currentSum = 0;
    let bestSum = 0;

    for (let index = 0; index < activity.length; index++) {
        currentSum += activity[index];
        if (index >= windowSize) {
            currentSum -= activity[index - windowSize];
        }

        if (index >= windowSize - 1 && currentSum > bestSum) {
            bestSum = currentSum;
            bestStart = index - windowSize + 1;
        }
    }

    const concentrationThreshold = range === '1D' ? 0.6 : 0.7;
    if (bestSum / totalActivity < concentrationThreshold) {
        return null;
    }

    return {
        startIndex: bestStart,
        endIndex: Math.min(data.length - 1, bestStart + windowSize - 1)
    };
}

const CustomTooltip = ({ active, payload, label, filter }: any) => {
    if (!active || !payload || !payload.length) return null;
    const relevant = payload.filter((p: any) => p.value > 0 || filter === 'ALL');

    return (
        <div className="min-w-[140px] rounded-xl border border-white/10 bg-black/85 px-4 py-3 text-sm shadow-xl backdrop-blur-md">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
            {relevant.map((p: any) => (
                <div key={p.dataKey} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-xs text-gray-300">
                        <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                    </span>
                    <span className="text-xs font-bold text-white">{Number(p.value).toFixed(4)}</span>
                </div>
            ))}
        </div>
    );
};

export const PaymentTimelineChart: React.FC<PaymentTimelineChartProps> = ({ receipts, paymentTimestampsByTxId = {}, isLoading, isRefreshing = false, onRefresh }) => {
    const [range, setRange] = useState<Range>('1D');
    const [tokenFilter, setTokenFilter] = useState<TokenFilter>('ALL');
    const [timeZone, setTimeZone] = useState<string>('local');
    const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);

    const { data, totals } = useMemo(() => {
        const buckets = buildBuckets(range, timeZone);
        const totals = { credits: 0, usdcx: 0, usad: 0 };
        const todayKey = getDateKey(Date.now(), timeZone);
        const recentDateKeys = new Set(getRecentDateKeys(range === '1W' ? 7 : 30, timeZone));

        receipts.forEach((receipt) => {
            const storedTimestamp = receipt.transactionId
                ? paymentTimestampsByTxId[receipt.transactionId]
                : undefined;
            const ts = storedTimestamp
                ? new Date(storedTimestamp).getTime()
                : (receipt as any).created_at
                    ? new Date((receipt as any).created_at).getTime()
                    : receipt.timestamp && receipt.timestamp > 0
                        ? receipt.timestamp
                        : null;

            if (ts === null || Number.isNaN(ts)) return;

            const dateKey = getDateKey(ts, timeZone);
            if (range === '1D' && dateKey !== todayKey) return;
            if ((range === '1W' || range === '1M') && !recentDateKeys.has(dateKey)) return;

            const normalizedTs = range === '1D' ? roundToQuarterHour(ts) : ts;
            const idx = getBucketIndex(normalizedTs, range, buckets, timeZone);
            if (idx < 0 || idx >= buckets.length) return;

            const amount = Number(receipt.amount) / 1_000_000;
            if (receipt.tokenType === 1) {
                buckets[idx].usdcx += amount;
                totals.usdcx += amount;
            } else if (receipt.tokenType === 2) {
                buckets[idx].usad += amount;
                totals.usad += amount;
            } else {
                buckets[idx].credits += amount;
                totals.credits += amount;
            }
        });

        return { data: buckets, totals };
    }, [paymentTimestampsByTxId, receipts, range, timeZone]);

    const hasData = data.some((d) => d.credits > 0 || d.usdcx > 0 || d.usad > 0);

    const autoZoomRange = useMemo(() => getAutoZoomRange(data, range), [data, range]);

    useEffect(() => {
        setZoomRange(autoZoomRange);
    }, [autoZoomRange]);

    const visibleStartIndex = zoomRange?.startIndex ?? 0;
    const visibleEndIndex = zoomRange?.endIndex ?? Math.max(0, data.length - 1);
    const visibleData = useMemo(
        () => data.slice(visibleStartIndex, visibleEndIndex + 1),
        [data, visibleEndIndex, visibleStartIndex]
    );

    const isZoomed = visibleStartIndex > 0 || visibleEndIndex < Math.max(0, data.length - 1);

    useEffect(() => {
        const container = chartContainerRef.current;
        if (!container) return;

        const handleWheelZoom = (event: WheelEvent) => {
            if (!canZoom(range, data.length)) return;

            event.preventDefault();
            event.stopPropagation();

            const totalLength = data.length;
            const currentStart = visibleStartIndex;
            const currentEnd = visibleEndIndex;
            const currentSpan = Math.max(1, currentEnd - currentStart + 1);
            const minSpan = Math.min(getMinimumZoomWindow(range), totalLength);

            const bounds = chartContainerRef.current?.getBoundingClientRect();
            const relativeX = bounds ? Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width) : 0;
            const anchorRatio = bounds && bounds.width > 0 ? relativeX / bounds.width : 0.5;
            const anchorIndex = Math.round(currentStart + ((currentSpan - 1) * anchorRatio));

            const zoomStep = Math.max(1, Math.floor(currentSpan * 0.2));
            const nextSpan = event.deltaY < 0
                ? Math.max(minSpan, currentSpan - zoomStep)
                : Math.min(totalLength, currentSpan + zoomStep);

            if (nextSpan === totalLength) {
                setZoomRange(null);
                return;
            }

            let nextStart = anchorIndex - Math.floor(nextSpan * anchorRatio);
            let nextEnd = nextStart + nextSpan - 1;

            if (nextStart < 0) {
                nextStart = 0;
                nextEnd = nextSpan - 1;
            }

            if (nextEnd >= totalLength) {
                nextEnd = totalLength - 1;
                nextStart = nextEnd - nextSpan + 1;
            }

            setZoomRange({ startIndex: nextStart, endIndex: nextEnd });
        };

        container.addEventListener('wheel', handleWheelZoom, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheelZoom);
        };
    }, [data, range, visibleEndIndex, visibleStartIndex]);

    const xTicks = useMemo(() => {
        const tickSource = visibleData.length > 0 ? visibleData : data;

        if (range === '1D') {
            if (!isZoomed) {
                return ['12:00 AM', '6:00 AM', '12:00 PM', '6:00 PM', '11:45 PM'];
            }

            const len = tickSource.length;
            const idxs = new Set<number>([0, Math.floor(len / 2), len - 1]);
            return Array.from(idxs).map((i) => tickSource[i]?.label).filter(Boolean);
        }

        const len = tickSource.length;
        if (len <= 7) return tickSource.map((d) => d.label);
        const idxs = new Set<number>([0, Math.floor(len / 4), Math.floor(len / 2), Math.floor((3 * len) / 4), len - 1]);
        return Array.from(idxs).map((i) => tickSource[i]?.label).filter(Boolean);
    }, [data, isZoomed, range, visibleData]);

    const activeTokens = useMemo<Exclude<TokenFilter, 'ALL'>[]>(() => {
        if (tokenFilter === 'ALL') return ['CREDITS', 'USDCX', 'USAD'];
        return [tokenFilter];
    }, [tokenFilter]);

    const ranges: Range[] = ['1D', '1W', '1M'];
    const tokenTabs: { key: TokenFilter; label: string }[] = [
        { key: 'ALL', label: 'All' },
        { key: 'CREDITS', label: 'Credits' },
        { key: 'USDCX', label: 'USDCx' },
        { key: 'USAD', label: 'USAD' },
    ];

    return (
        <GlassCard className="relative p-6">
            <div className="mb-8 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight text-white">
                            Payments <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Received</span>
                        </h3>
                    </div>

                    <div className="flex p-1 gap-1 rounded-xl border border-white/10 bg-white/5">
                        {tokenTabs.map((tab) => {
                            const isActive = tokenFilter === tab.key;
                            const cfg = tab.key !== 'ALL' ? TOKEN_CONFIG[tab.key] : null;

                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setTokenFilter(tab.key)}
                                    className={`relative rounded-lg px-4 py-1.5 text-[11px] font-bold transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
                                >
                                    {isActive && (
                                        <div
                                            className="absolute inset-0 -z-10 rounded-lg border border-white/10 bg-white/10 animate-in zoom-in-95 fade-in duration-300"
                                            style={cfg ? { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15` } : {}}
                                        />
                                    )}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="relative">
                        <select
                            value={timeZone}
                            onChange={(e) => setTimeZone(e.target.value)}
                            className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2 pl-3 pr-9 text-[11px] font-semibold text-white/80 outline-none transition-all duration-300 hover:border-white/20 focus:border-white/20"
                        >
                            {TIMEZONE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-[#0B0B0B] text-white">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <svg className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <div className="flex self-start rounded-full border border-white/10 bg-black/40 p-1 lg:self-auto gap-0.5">
                    {ranges.map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`rounded-full px-4 py-1.5 text-[11px] font-bold transition-all duration-300 ${range === r ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-gray-500 hover:text-white'}`}
                        >
                            {r}
                        </button>
                    ))}

                    <button
                        type="button"
                        onClick={() => void onRefresh?.()}
                        disabled={!onRefresh || isRefreshing}
                        className={`ml-1 flex items-center justify-center rounded-full border px-3 py-1.5 transition-all duration-300 ${!onRefresh || isRefreshing ? 'cursor-not-allowed border-white/5 text-gray-600' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                        title="Refresh payments"
                    >
                        <svg className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {!isLoading && hasData && (
                <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                    {autoZoomRange && (
                        <button
                            type="button"
                            onClick={() => setZoomRange(autoZoomRange)}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-[11px] font-bold text-cyan-200 transition-all hover:border-cyan-300/40 hover:bg-cyan-400/15"
                        >
                            Focus Activity
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setZoomRange(null)}
                        disabled={!isZoomed}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${isZoomed ? 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10' : 'cursor-not-allowed border-white/5 text-gray-600'}`}
                    >
                        Zoom Out
                    </button>
                </div>
            )}

            {!isLoading && (
                <div className="mb-8 flex flex-wrap items-center gap-x-12 gap-y-4">
                    {(['CREDITS', 'USDCX', 'USAD'] as const).map((t) => {
                        const cfg = TOKEN_CONFIG[t];
                        const amount = totals[cfg.key as keyof typeof totals];
                        const isActive = tokenFilter === 'ALL' || tokenFilter === t;

                        return (
                            <div key={t} className={`transition-all duration-500 ${isActive ? 'opacity-100' : 'grayscale opacity-20'}`}>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-gray-500">{cfg.label}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold tracking-tight text-white">
                                        {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-500">
                                        {range === '1D' ? 'Today' : range}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {isLoading ? (
                <div className="flex h-[200px] w-full items-end gap-1 px-2 pb-2">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <Shimmer key={i} className="flex-1 rounded-t-sm bg-white/5" style={{ height: `${25 + (i % 5) * 12}%` }} />
                    ))}
                </div>
            ) : (
                <div ref={chartContainerRef} className="h-[200px] w-full overscroll-contain">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                {(['CREDITS', 'USDCX', 'USAD'] as const).map((t) => (
                                    <linearGradient key={t} id={`grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={TOKEN_CONFIG[t].color} stopOpacity={0.22} />
                                        <stop offset="100%" stopColor={TOKEN_CONFIG[t].color} stopOpacity={0} />
                                    </linearGradient>
                                ))}
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                            <XAxis
                                dataKey="label"
                                ticks={xTicks as string[]}
                                tick={{ fill: '#6B7280', fontSize: 10, fontWeight: 600 }}
                                axisLine={false}
                                tickLine={false}
                                interval="preserveStartEnd"
                            />

                            <YAxis
                                tick={{ fill: '#6B7280', fontSize: 10 }}
                                axisLine={false}
                                tickLine={false}
                                width={42}
                                tickFormatter={(v: number) => v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                            />

                            <Tooltip
                                content={<CustomTooltip filter={tokenFilter} />}
                                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                            />

                            {activeTokens.map((t) => {
                                const cfg = TOKEN_CONFIG[t];
                                return (
                                    <Area
                                        key={t}
                                        type="monotone"
                                        dataKey={cfg.key as string}
                                        name={cfg.label}
                                        stroke={cfg.color}
                                        strokeWidth={2}
                                        fill={`url(#grad-${t})`}
                                        dot={false}
                                        activeDot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
                                    />
                                );
                            })}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!isLoading && tokenFilter === 'ALL' && (
                <div className="mt-4 flex items-center justify-end gap-4">
                    <span className="mr-auto text-[10px] font-medium text-gray-500">Scroll on the chart to zoom in or out.</span>
                    {(['CREDITS', 'USDCX', 'USAD'] as const).map((t) => (
                        <span key={t} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TOKEN_CONFIG[t].color }} />
                            {TOKEN_CONFIG[t].label}
                        </span>
                    ))}
                </div>
            )}

            {!isLoading && !hasData && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-gray-600">No payments in this period</span>
                </div>
            )}
        </GlassCard>
    );
};
