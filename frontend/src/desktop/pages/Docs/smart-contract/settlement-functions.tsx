import { Eye, Lock, Shield, RefreshCw, Key } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const settleInvoiceExample = `/**
 * MERCHANT ESCAPE HATCH: settle_invoice
 * 
 * Allows the merchant to manually confirm a payment on the ledger.
 * This does NOT move funds—it only updates the state registry.
 */

fn settle_invoice(
    public salt:     field,   // The public salt of the target invoice
    private amount:  u64      // Private amount for hash computation
) -> Final

/**
 * FINALIZER LOGIC:
 * 1. Recomputes Hash: BHP256(merchant, amount, salt)
 * 2. Lookup Mapping: gets stored_hash from salt_to_invoice[salt]
 * 3. Verified Ownership: assert_eq(recomputed_hash, stored_hash)
 * 4. Commit State: invoices.set(stored_hash, { status: 1u8 })
 */`;

const recoveryArchitectureExample = `/**
 * THE 10-PART RECOVERY SPLIT
 * 
 * To ensure safe storage of private keys on a public blockchain, 
 * NullPay uses a multi-field fragmentation strategy.
 * 
 * 1. Encryption: Private key is AES-256 encrypted using a user-derived password.
 * 2. Fragmentation: The resulting ciphertext is split into 10 field elements 
 *    (pk_part_1 through pk_part_10).
 * 3. Commitment: The fragments are stored as a 'BurnerWalletRecord'.
 * 
 * SECURITY: Because the fragments are within a PRIVATE Record, 
 * only the owner of the main Aleo address can even view the 
 * existence of the backup.
 */`;

export const settlementFunctionsSection: DocsSection = {
    id: 'sc-settlement',
    group: 'Contract Functions',
    label: 'Settlement & Wallet',
    eyebrow: 'Smart Contract',
    title: 'Settlement Engines — The Lifecycle Terminators',
    summary:
        'Settlement functions manage the transition of an invoice from an active request to a finalized transaction. This section also covers the critical wallet recovery and card management functions of the protocol.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-orange-400" />
                        <h3 className="text-lg font-bold text-white">The Merchant Escape Hatch</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        The <code className="text-white/80">settle_invoice</code> function is a merchant-only utility. It allows a merchant to manually verify an invoice if, for example, a buyer paid in person or via an alternative channel. It requires the merchant to prove they know the original salt and amount, ensuring only the rightful owner can settle the request.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-400" />
                        <h3 className="text-lg font-bold text-white">Wallet Recovery Design</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        NullPay implements a decentralized backup system for burner wallets. By splitting encrypted private keys across multiple Aleo fields and storing them in private records, users can "recover" their funds from any device by just logging in with their main Aleo wallet.
                    </p>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Lock className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Transition: settle_invoice</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Settlement Logic (Leo Implementation)" language="leo" code={settleInvoiceExample} />
                    <Callout title="No Double-Settle" tone="orange">
                        Invoices with <code className="text-white/80">invoice_type = 0u8</code> (Standard) can only be settled once. Subsequent attempts to settle the same salt will fail as the mapping status is checked before modification.
                    </Callout>
                </div>
            </GlassCard>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <RefreshCw className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Transitions: backup_burner_wallet</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The recovery system utilizes a 10-part field splitting technique to accommodate Aleo's 256-bit field constraints while storing a full encrypted private key.
                    </p>
                    <CodeBlock title="Decentralized Recovery Architecture" language="leo" code={recoveryArchitectureExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Recovery Execution Flow</h3>
                <div className="grid gap-3 md:grid-cols-4">
                    {[
                        { step: 'Lookup', desc: 'Scan the Aleo ledger for BurnerWalletRecords owned by the main address.' },
                        { step: 'Fetch', desc: 'Extract the 10 data fields (pk_part_1..10) and the password fragment.' },
                        { step: 'Merge', desc: 'Combine the fields into a single 256-byte ciphertext buffer.' },
                        { step: 'Decrypt', desc: 'Use the user password to derive the key and reconstruct the private key.' },
                    ].map(({ step, desc }) => (
                        <div key={step} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                            <span className="mb-2 block font-mono text-[10px] font-black text-blue-400 uppercase tracking-tighter">{step}</span>
                            <p className="text-[11px] leading-relaxed text-gray-400">{desc}</p>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                    <Eye className="h-5 w-5 text-gray-400" />
                    <h3 className="text-xl font-bold text-white">On-Chain State Verification</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400">
                    The <code className="text-white/80">get_invoice_status</code> transition acts as the "Read Head" for the protocol. It allows any observer to verify the age, merchant, and fulfillment status of an invoice hash.
                </p>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                    <ul className="space-y-2 text-xs text-gray-400">
                        <li>• <b className="text-white">Timestamp Check</b>: Used by the relayers to prune expired invoice requests.</li>
                        <li>• <b className="text-white">Currency Guard</b>: Ensures the token being paid matches the token requested in the mapping.</li>
                    </ul>
                </div>
            </GlassCard>
        </div>
    ),
};
