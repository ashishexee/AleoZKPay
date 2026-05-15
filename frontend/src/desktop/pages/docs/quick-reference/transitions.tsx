import { FileCode2, ArrowRightLeft, Lock, Hash, Wallet } from 'lucide-react';
import type { DocsSection } from '../types';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';
import { Callout } from '../ui';

export const transitionReferenceSection: DocsSection = {
    id: 'qr-transitions',
    group: 'Contracts',
    label: 'Transitions',
    eyebrow: 'Quick Reference',
    title: 'Smart Contract Transition Reference',
    summary: 'Complete reference of all Leo transitions in both NullPay contracts: zk_pay_proofs_privacy_v29.aleo (core payment) and zk_pay_proofs_privacy_wallet_v6.aleo (wallet/oracle).',
    content: (
        <div className="space-y-6">
            <GlassCard className="p-6">
                <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                    <FileCode2 className="h-5 w-5 text-orange-300" />
                    Core Payment Contract — zk_pay_proofs_privacy_v29.aleo
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Transition</th>
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Purpose</th>
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Token</th>
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Type</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">create_invoice</td><td className="px-3 py-2 text-xs">Create fixed-amount invoice</td><td className="px-3 py-2 text-xs">CREDITS</td><td className="px-3 py-2 text-xs">Standard</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">create_invoice_usdcx</td><td className="px-3 py-2 text-xs">Create fixed-amount invoice</td><td className="px-3 py-2 text-xs">USDCx</td><td className="px-3 py-2 text-xs">Standard</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">create_invoice_usad</td><td className="px-3 py-2 text-xs">Create fixed-amount invoice</td><td className="px-3 py-2 text-xs">USAD</td><td className="px-3 py-2 text-xs">Standard</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">create_invoice_any</td><td className="px-3 py-2 text-xs">Create donation invoice</td><td className="px-3 py-2 text-xs">ANY</td><td className="px-3 py-2 text-xs">Donation</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_invoice</td><td className="px-3 py-2 text-xs">Pay standard invoice</td><td className="px-3 py-2 text-xs">CREDITS</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_invoice_usdcx</td><td className="px-3 py-2 text-xs">Pay standard invoice</td><td className="px-3 py-2 text-xs">USDCx</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_invoice_usad</td><td className="px-3 py-2 text-xs">Pay standard invoice</td><td className="px-3 py-2 text-xs">USAD</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_donation</td><td className="px-3 py-2 text-xs">Pay donation invoice</td><td className="px-3 py-2 text-xs">CREDITS</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_donation_usdcx</td><td className="px-3 py-2 text-xs">Pay donation invoice</td><td className="px-3 py-2 text-xs">USDCx</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">pay_donation_usad</td><td className="px-3 py-2 text-xs">Pay donation invoice</td><td className="px-3 py-2 text-xs">USAD</td><td className="px-3 py-2 text-xs">Payment</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">settle_invoice</td><td className="px-3 py-2 text-xs">Manual settlement by merchant</td><td className="px-3 py-2 text-xs">—</td><td className="px-3 py-2 text-xs">Settlement</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-orange-300">delete_invoice</td><td className="px-3 py-2 text-xs">Remove unpaid invoice</td><td className="px-3 py-2 text-xs">—</td><td className="px-3 py-2 text-xs">Admin</td></tr>
                            <tr><td className="px-3 py-2 font-mono text-xs text-orange-300">get_invoice_status</td><td className="px-3 py-2 text-xs">Read invoice state from mapping</td><td className="px-3 py-2 text-xs">—</td><td className="px-3 py-2 text-xs">Read</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-lg font-bold text-white flex items-center gap-2">
                    <ArrowRightLeft className="h-5 w-5 text-blue-300" />
                    Wallet / Oracle Contract — zk_pay_proofs_privacy_wallet_v6.aleo
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Transition</th>
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Purpose</th>
                                <th className="px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">Category</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-300">
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">backup_password</td><td className="px-3 py-2 text-xs">Store encrypted password on-chain</td><td className="px-3 py-2 text-xs">Wallet</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">backup_burner_wallet</td><td className="px-3 py-2 text-xs">Store encrypted burner key (10 parts)</td><td className="px-3 py-2 text-xs">Wallet</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">create_card_profile</td><td className="px-3 py-2 text-xs">Initialize NullPay Card profile</td><td className="px-3 py-2 text-xs">Card</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">delete_card_profile</td><td className="px-3 py-2 text-xs">Remove existing card profile</td><td className="px-3 py-2 text-xs">Card</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">create_gift_card_record</td><td className="px-3 py-2 text-xs">Mint redeemable gift card</td><td className="px-3 py-2 text-xs">Card</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-blue-300">set_oracle_address</td><td className="px-3 py-2 text-xs">Admin: update trusted oracle address</td><td className="px-3 py-2 text-xs">Admin</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_credits_via_usdcx</td><td className="px-3 py-2 text-xs">Cross-token: pay Credits invoice with USDCx</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_credits_via_usad</td><td className="px-3 py-2 text-xs">Cross-token: pay Credits invoice with USAD</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_usdcx_via_credits</td><td className="px-3 py-2 text-xs">Cross-token: pay USDCx invoice with Credits</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_usdcx_via_usad</td><td className="px-3 py-2 text-xs">Cross-token: pay USDCx invoice with USAD</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                            <tr className="border-b border-white/[0.04]"><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_usad_via_credits</td><td className="px-3 py-2 text-xs">Cross-token: pay USAD invoice with Credits</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                            <tr><td className="px-3 py-2 font-mono text-xs text-emerald-300">pay_invoice_usad_via_usdcx</td><td className="px-3 py-2 text-xs">Cross-token: pay USAD invoice with USDCx</td><td className="px-3 py-2 text-xs">Oracle</td></tr>
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Lock className="h-4 w-4 text-orange-300" />
                        <h4 className="text-sm font-bold text-white">Invoice Type Codes</h4>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between"><span className="font-mono text-orange-300">0u8</span><span>Standard (single settlement)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-orange-300">1u8</span><span>Multi-Pay (reusable)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-orange-300">2u8</span><span>Donation (open amount)</span></div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Hash className="h-4 w-4 text-blue-300" />
                        <h4 className="text-sm font-bold text-white">Token Type Codes</h4>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between"><span className="font-mono text-blue-300">0u8</span><span>CREDITS (native Aleo)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-blue-300">1u8</span><span>USDCx (stablecoin)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-blue-300">2u8</span><span>USAD (stablecoin)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-blue-300">3u8</span><span>ANY (donation only)</span></div>
                    </div>
                </GlassCard>
                <GlassCard className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Wallet className="h-4 w-4 text-emerald-300" />
                        <h4 className="text-sm font-bold text-white">Status Codes</h4>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                        <div className="flex justify-between"><span className="font-mono text-emerald-300">0u8</span><span>Open (accepting payments)</span></div>
                        <div className="flex justify-between"><span className="font-mono text-emerald-300">1u8</span><span>Settled (closed)</span></div>
                    </div>
                </GlassCard>
            </div>

            <Callout title="BHP256 Hash Formula" tone="blue">
                Invoice hash = BHP256(merchant) + BHP256(amount) + BHP256(salt). All three inputs are private.
                Only the resulting field element appears publicly on-chain via the invoices mapping and salt_to_invoice mapping.
            </Callout>
        </div>
    ),
};
