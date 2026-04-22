import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { Shimmer } from '../../../../shared/components/ui/Shimmer';
import type { Invoice } from '../../../../shared/types/invoice';

export type InvoiceTimelineRange = '1D' | '1W' | '1M';
export type InvoiceTimelineStatusFilter = 'BOTH' | 'PENDING' | 'SETTLED';

type DataPoint = {
    label: string;
    timestamp: number;
    pending: number;
    settled: number;
    dateKey?: string;
};

const SERIES = [
    { key: 'pending', label: 'Pending', color: '#F59E0B' },
    { key: 'settled', label: 'Settled', color: '#34D399' },
] as const;

function getTimeParts(ts: number, _timeZone: string) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });

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

    for (let offset = count + 5; offset >= 0; offset -= 1) {
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

function formatTimeLabel(ts: number, range: InvoiceTimelineRange, _timeZone: string): string {
    if (range === '1D') {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        }).format(new Date(ts));
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric'
    }).format(new Date(ts));
}

function roundToQuarterHour(ts: number): number {
    const quarterMs = 15 * 60 * 1000;
    return Math.floor(ts / quarterMs) * quarterMs;
}

function buildBuckets(range: InvoiceTimelineRange, timeZone: string): DataPoint[] {
    if (range === '1D') {
        const base = new Date();
        base.setHours(0, 0, 0, 0);

        return Array.from({ length: 96 }, (_, index) => {
            const ts = base.getTime() + (index * 15 * 60 * 1000);
            const { hour, minute } = getTimeParts(ts, timeZone);
            return {
                label: formatClockLabel(hour, minute),
                timestamp: ts,
                pending: 0,
                settled: 0,
                dateKey: getDateKey(ts, timeZone),
            };
        });
    }

    const count = range === '1W' ? 7 : 30;
    const keys = getRecentDateKeys(count, timeZone);
    return keys.map((key) => {
        const ts = new Date(`${key}T00:00:00`).getTime();
        return {
            label: formatTimeLabel(ts, range, timeZone),
            timestamp: ts,
            pending: 0,
            settled: 0,
            dateKey: key,
        };
    });
}

function getBucketIndex(ts: number, range: InvoiceTimelineRange, buckets: DataPoint[], timeZone: string): number {
    if (range === '1D') {
        const bucketTs = roundToQuarterHour(ts);
        return buckets.findIndex((bucket) => bucket.timestamp === bucketTs);
    }

    const dateKey = getDateKey(ts, timeZone);
    return buckets.findIndex((bucket) => bucket.dateKey === dateKey);
}

function canZoom(range: InvoiceTimelineRange, dataLength: number) {
    if (range === '1D') return dataLength > 16;
    return dataLength > 5;
}

function getMinimumZoomWindow(range: InvoiceTimelineRange) {
    return range === '1D' ? 12 : 3;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const rows = payload.filter((entry: any) => Number(entry?.value || 0) > 0);
    if (!rows.length) return null;

    return (
        <div className="rounded-xl border border-white/8 bg-[#0b0b0b]/88 px-3 py-2 shadow-[0_10px_28px_rgba(0,0,0,0.32)] backdrop-blur-md">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500">{label}</p>
            <div className="mt-1.5 space-y-1.5">
                {rows.map((entry: any) => (
                    <div key={entry.dataKey} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-[11px] font-medium text-gray-100">{entry.name}: {Number(entry.value)} {Number(entry.value) === 1 ? 'invoice' : 'invoices'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface InvoiceCreationTimelineChartProps {
    transactions: Invoice[];
    isLoading?: boolean;
    range: InvoiceTimelineRange;
    sdkOnly?: boolean;
    statusFilter?: InvoiceTimelineStatusFilter;
}

export const InvoiceCreationTimelineChart = ({ transactions, isLoading = false, range, sdkOnly = false, statusFilter = 'BOTH' }: InvoiceCreationTimelineChartProps) => {
    const timeZone = 'local';
    const [zoomRange, setZoomRange] = useState<{ startIndex: number; endIndex: number } | null>(null);
    const chartContainerRef = useRef<HTMLDivElement | null>(null);

    const { data } = useMemo(() => {
        const buckets = buildBuckets(range, timeZone);
        const todayKey = getDateKey(Date.now(), timeZone);
        const recentDateKeys = new Set(getRecentDateKeys(range === '1W' ? 7 : 30, timeZone));

        transactions.forEach((transaction) => {
            if (sdkOnly && !transaction.for_sdk) return;

            const source = transaction.created_at || transaction.updated_at;
            if (!source) return;

            const ts = new Date(source).getTime();
            if (Number.isNaN(ts)) return;

            const dateKey = getDateKey(ts, timeZone);
            if (range === '1D' && dateKey !== todayKey) return;
            if ((range === '1W' || range === '1M') && !recentDateKeys.has(dateKey)) return;

            const normalizedTs = range === '1D' ? roundToQuarterHour(ts) : ts;
            const idx = getBucketIndex(normalizedTs, range, buckets, timeZone);
            if (idx < 0 || idx >= buckets.length) return;

            if (transaction.status === 'SETTLED') {
                buckets[idx].settled += 1;
            } else {
                buckets[idx].pending += 1;
            }
        });

        return { data: buckets };
    }, [range, sdkOnly, timeZone, transactions]);

    const hasData = data.some((entry) => entry.pending > 0 || entry.settled > 0);

    useEffect(() => {
        setZoomRange(null);
    }, [range, sdkOnly, timeZone, transactions]);

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
        if (len <= 7) return tickSource.map((entry) => entry.label);
        const idxs = new Set<number>([0, Math.floor(len / 4), Math.floor(len / 2), Math.floor((3 * len) / 4), len - 1]);
        return Array.from(idxs).map((i) => tickSource[i]?.label).filter(Boolean);
    }, [data, isZoomed, range, visibleData]);

    return (
        <div className="flex h-full flex-col">
            {!isLoading && (
                <div className="mb-3 flex min-h-[36px] items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => setZoomRange(null)}
                        disabled={!hasData || !isZoomed}
                        className={`min-w-[96px] rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all duration-200 ${hasData && isZoomed
                            ? 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10 opacity-100'
                            : hasData
                                ? 'cursor-not-allowed border-white/5 text-gray-600 opacity-100'
                                : 'pointer-events-none border-transparent bg-transparent text-transparent opacity-0'
                            }`}
                    >
                        Zoom Out
                    </button>
                </div>
            )}

            {isLoading ? (
                <div className="flex h-[160px] w-full items-end gap-1 px-2 pb-2">
                    {Array.from({ length: 14 }).map((_, i) => (
                        <Shimmer key={i} className="flex-1 rounded-t-sm bg-white/5" style={{ height: `${25 + (i % 5) * 12}%` }} />
                    ))}
                </div>
            ) : (
                <div ref={chartContainerRef} className="h-[160px] w-full overscroll-contain">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={visibleData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                            <defs>
                                {SERIES.map((series) => (
                                    <linearGradient key={series.key} id={`grad-${series.key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={series.color} stopOpacity={0.2} />
                                        <stop offset="100%" stopColor={series.color} stopOpacity={0} />
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
                                allowDecimals={false}
                            />

                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: 'rgba(255,255,255,0.06)', strokeWidth: 1 }}
                            />

                            {SERIES.filter((series) => statusFilter === 'BOTH' || statusFilter === series.label.toUpperCase()).map((series) => (
                                <Area
                                    key={series.key}
                                    type="monotone"
                                    dataKey={series.key}
                                    name={series.label}
                                    stroke={series.color}
                                    strokeWidth={2}
                                    fill={`url(#grad-${series.key})`}
                                    dot={false}
                                    activeDot={{ r: 4, fill: series.color, strokeWidth: 0 }}
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}

            {!isLoading && (
                <div className="mt-4 flex items-center justify-end gap-4">
                    <span className="mr-auto text-[10px] font-medium text-gray-500">Scroll on the chart to zoom in or out.</span>
                    {SERIES.filter((series) => statusFilter === 'BOTH' || statusFilter === series.label.toUpperCase()).map((series) => (
                        <span key={series.key} className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: series.color }} />
                            {series.label}
                        </span>
                    ))}
                </div>
            )}

            {!isLoading && !hasData && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="text-sm text-gray-600">{sdkOnly ? 'No SDK invoices in this period' : 'No invoices created in this period'}</span>
                </div>
            )}
        </div>
    );
};
