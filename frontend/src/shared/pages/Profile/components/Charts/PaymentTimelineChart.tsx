import React, { useMemo, useState } from 'react';
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
}

interface DataPoint {
    label: string;
    timestamp: number;
    credits: number;
    usdcx: number;
    usad: number;
}

// ── token config ──────────────────────────────────────────────────────────────

const TOKEN_CONFIG: Record<Exclude<TokenFilter, 'ALL'>, { key: keyof DataPoint; color: string; label: string }> = {
    CREDITS: { key: 'credits', color: '#00FFD1', label: 'Credits' },
    USDCX:   { key: 'usdcx',   color: '#60A5FA', label: 'USDCx'   },
    USAD:    { key: 'usad',    color: '#F59E0B', label: 'USAD'    },
};

// ── helpers ───────────────────────────────────────────────────────────────────

function startOf(range: Range): Date {
    const now = new Date();
    if (range === '1D') { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    if (range === '1W') { const d = new Date(now); d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    const d = new Date(now); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d;
}

function bucketKey1D(h: number): string {
    const ampm = h < 12 ? 'AM' : 'PM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display} ${ampm}`;
}

function buildBuckets(range: Range): DataPoint[] {
    const buckets: DataPoint[] = [];
    const now = new Date();
    if (range === '1D') {
        for (let h = 0; h < 24; h++) {
            const ts = new Date(); ts.setHours(h, 0, 0, 0);
            buckets.push({ label: bucketKey1D(h), timestamp: ts.getTime(), credits: 0, usdcx: 0, usad: 0 });
        }
    } else if (range === '1W') {
        for (let d = 6; d >= 0; d--) {
            const day = new Date(now); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
            buckets.push({ label: day.toLocaleDateString('en-US', { weekday: 'short' }), timestamp: day.getTime(), credits: 0, usdcx: 0, usad: 0 });
        }
    } else {
        for (let d = 29; d >= 0; d--) {
            const day = new Date(now); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
            const label = `${day.getMonth() + 1}/${day.getDate()}`;
            buckets.push({ label, timestamp: day.getTime(), credits: 0, usdcx: 0, usad: 0 });
        }
    }
    return buckets;
}

function getBucketIndex(ts: number, range: Range, buckets: DataPoint[]): number {
    if (range === '1D') return new Date(ts).getHours();
    const day = new Date(ts); day.setHours(0, 0, 0, 0);
    return buckets.findIndex(b => b.timestamp === day.getTime());
}

// ── custom tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, filter }: any) => {
    if (!active || !payload || !payload.length) return null;
    const relevant = payload.filter((p: any) => p.value > 0 || filter === 'ALL');
    return (
        <div className="bg-black/85 backdrop-blur-md border border-white/10 px-4 py-3 rounded-xl text-sm shadow-xl min-w-[140px]">
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-2">{label}</p>
            {relevant.map((p: any) => (
                <div key={p.dataKey} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-gray-300 text-xs">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                        {p.name}
                    </span>
                    <span className="font-bold text-white text-xs">{Number(p.value).toFixed(4)}</span>
                </div>
            ))}
        </div>
    );
};

// ── main component ─────────────────────────────────────────────────────────────

export const PaymentTimelineChart: React.FC<PaymentTimelineChartProps> = ({ receipts, paymentTimestampsByTxId = {}, isLoading }) => {
    const [range, setRange] = useState<Range>('1W');
    const [tokenFilter, setTokenFilter] = useState<TokenFilter>('ALL');

    const { data, totals } = useMemo(() => {
        const buckets = buildBuckets(range);
        const cutoff = startOf(range).getTime();
        const totals = { credits: 0, usdcx: 0, usad: 0 };

        receipts.forEach(receipt => {
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
            if (ts < cutoff) return;
            const idx = getBucketIndex(ts, range, buckets);
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
    }, [paymentTimestampsByTxId, receipts, range]);

    const hasData = data.some(d => d.credits > 0 || d.usdcx > 0 || d.usad > 0);

    // sparse x-axis ticks
    const xTicks = useMemo(() => {
        const len = data.length;
        if (len <= 7) return data.map(d => d.label);
        const idxs = new Set<number>([0, Math.floor(len / 4), Math.floor(len / 2), Math.floor(3 * len / 4), len - 1]);
        return Array.from(idxs).map(i => data[i]?.label).filter(Boolean);
    }, [data]);

    // which Area lines to render
    const activeTokens = useMemo<Exclude<TokenFilter, 'ALL'>[]>(() => {
        if (tokenFilter === 'ALL') return ['CREDITS', 'USDCX', 'USAD'];
        return [tokenFilter];
    }, [tokenFilter]);

    const ranges: Range[] = ['1D', '1W', '1M'];
    const tokenTabs: { key: TokenFilter; label: string }[] = [
        { key: 'ALL',     label: 'All'     },
        { key: 'CREDITS', label: 'Credits' },
        { key: 'USDCX',   label: 'USDCx'   },
        { key: 'USAD',    label: 'USAD'    },
    ];

    return (
        <GlassCard className="p-6 relative">
            {/* ── header ── */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                    <div>
                        <h3 className="text-2xl font-bold text-white tracking-tight">
                            Payments <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Received</span>
                        </h3>
                    </div>

                    {/* token filter tabs - moved beside title */}
                    <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 gap-1">
                        {tokenTabs.map(tab => {
                            const isActive = tokenFilter === tab.key;
                            const cfg = tab.key !== 'ALL' ? TOKEN_CONFIG[tab.key] : null;

                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setTokenFilter(tab.key)}
                                    className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-300 relative ${
                                        isActive
                                            ? 'text-white'
                                            : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                >
                                    {isActive && (
                                        <div
                                            className="absolute inset-0 rounded-lg bg-white/10 border border-white/10 -z-10 animate-in fade-in zoom-in-95 duration-300"
                                            style={cfg ? { borderColor: `${cfg.color}40`, backgroundColor: `${cfg.color}15` } : {}}
                                        />
                                    )}
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* range pills */}
                <div className="flex p-1 bg-black/40 rounded-full border border-white/10 gap-0.5 self-start lg:self-auto">
                    {ranges.map(r => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={`px-4 py-1.5 text-[11px] font-bold rounded-full transition-all duration-300 ${
                                range === r
                                    ? 'bg-white text-black shadow-lg shadow-white/10'
                                    : 'text-gray-500 hover:text-white'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── range metrics summary ── */}
            {!isLoading && (
                <div className="flex flex-wrap items-center gap-x-12 gap-y-4 mb-8">
                    {(['CREDITS', 'USDCX', 'USAD'] as const).map(t => {
                        const cfg = TOKEN_CONFIG[t];
                        const amount = totals[cfg.key as keyof typeof totals];
                        const isActive = tokenFilter === 'ALL' || tokenFilter === t;

                        return (
                            <div 
                                key={t} 
                                className={`transition-all duration-500 ${
                                    isActive ? 'opacity-100' : 'opacity-20 grayscale'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
                                        {cfg.label}
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-bold text-white tracking-tight">
                                        {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                                        {range === '1D' ? 'Today' : range === '1W' ? '1W' : '1M'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── chart ── */}
            {isLoading ? (
                <div className="w-full h-[200px] flex items-end gap-1 px-2 pb-2">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <Shimmer key={i} className="flex-1 rounded-t-sm bg-white/5" style={{ height: `${25 + (i % 5) * 12}%` }} />
                    ))}
                </div>
            ) : (
                <div className="w-full h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                {(['CREDITS', 'USDCX', 'USAD'] as const).map(t => (
                                    <linearGradient key={t} id={`grad-${t}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%"   stopColor={TOKEN_CONFIG[t].color} stopOpacity={0.22} />
                                        <stop offset="100%" stopColor={TOKEN_CONFIG[t].color} stopOpacity={0}    />
                                    </linearGradient>
                                ))}
                            </defs>

                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />

                            <XAxis
                                dataKey="label"
                                ticks={xTicks}
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
                                tickFormatter={(v: number) =>
                                    v === 0 ? '0' : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
                                }
                            />

                            <Tooltip
                                content={<CustomTooltip filter={tokenFilter} />}
                                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                            />

                            {activeTokens.map(t => {
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

            {/* legend dots (only visible in ALL mode) */}
            {!isLoading && tokenFilter === 'ALL' && (
                <div className="flex items-center gap-4 mt-4 justify-end">
                    {(['CREDITS', 'USDCX', 'USAD'] as const).map(t => (
                        <span key={t} className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOKEN_CONFIG[t].color }} />
                            {TOKEN_CONFIG[t].label}
                        </span>
                    ))}
                </div>
            )}

            {/* empty state */}
            {!isLoading && !hasData && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-gray-600 text-sm">No payments in this period</span>
                </div>
            )}
        </GlassCard>
    );
};
