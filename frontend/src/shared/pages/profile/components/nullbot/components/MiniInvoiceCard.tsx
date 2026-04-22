import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { InvoiceData } from '../../../../../types/invoice';

export const MiniInvoiceCard: React.FC<{ invoiceData: InvoiceData }> = ({ invoiceData }) => {
    const [copiedLink, setCopiedLink] = useState(false);
    const [copiedHash, setCopiedHash] = useState(false);

    const copyLink = () => {
        navigator.clipboard.writeText(invoiceData.link);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const copyHash = () => {
        navigator.clipboard.writeText(invoiceData.hash);
        setCopiedHash(true);
        setTimeout(() => setCopiedHash(false), 2000);
    };

    return (
        <div className="mt-3 rounded-2xl border border-white/10 bg-black/35 p-3 sm:p-4">
            <div className="flex flex-col items-center gap-3">
                <div className="rounded-2xl bg-white p-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
                    <div className="relative">
                        <QRCodeSVG value={invoiceData.link} size={164} level="H" includeMargin={false} />
                        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white p-1.5 shadow-[0_8px_22px_rgba(0,0,0,0.2)]">
                            <img
                                src="/assets/nullpay_logo.png"
                                alt="NullPay"
                                className="h-full w-full object-contain"
                                style={{ filter: 'brightness(0)' }}
                            />
                        </div>
                    </div>
                </div>
                <div className="w-full space-y-2">
                    <div className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400">Payment Link</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-orange-200">{invoiceData.link}</div>
                    </div>
                    <div className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400">Invoice Hash</div>
                        <div className="mt-1 truncate font-mono text-[11px] text-cyan-200">{invoiceData.hash}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={copyLink}
                            className="flex-1 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-orange-100"
                        >
                            {copiedLink ? 'Link Copied' : 'Copy Link'}
                        </button>
                        <button
                            type="button"
                            onClick={copyHash}
                            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
                        >
                            {copiedHash ? 'Hash Copied' : 'Copy Hash'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
