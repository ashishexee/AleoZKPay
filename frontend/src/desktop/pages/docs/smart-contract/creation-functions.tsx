import { Plus, Shield, Zap, Info, Clock, Terminal } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const createInvoiceSignatureExample = `/**
 * CORE MINTING TRANSITION: create_invoice
 * 
 * This function "mints" a new payment request onto the Aleo ledger.
 * It is typically called by the NullPay Relayer on behalf of the merchant
 * to sponsor the gas fees and hide the merchant's IP/location.
 */

fn create_invoice(
    private merchant:      address, // Payout destination
    private amount:        u64,     // Fixed price (microunits)
    private salt:          field,   // Random commitment entropy
    private title:         field,   // Short invoice title
    private memo:          field,   // Packed text data
    public  expiry_hours:  u32,     // Duration in hours
    public  invoice_type:  u8,      // Standard=0, Multi=1, Donation=2
    public  wallet_type:   u8       // Context hint
) -> (Invoice, public field, Final)

/**
 * THE PUBLIC COMMITMENT:
 * The function returns a 'field' representing the BHP256 hash.
 * This hash is the ONLY public link between the buyer and the request.
 */`;

const hashDerivationDeepDive = `/**
 * THE INVOICE_HASH DERIVATION
 * 
 * Inside the ZK circuit, the following logic is used to compute 
 * the 256-bit commitment:
 * 
 * let merchant_hash = BHP256::hash_to_field(merchant);
 * let amount_hash   = BHP256::hash_to_field(amount);
 * let salt_hash     = BHP256::hash_to_field(salt);
 * 
 * let invoice_hash = merchant_hash + amount_hash + salt_hash;
 * 
 * Why Addition? Simple point addition on the elliptic curve 
 * ensures that the proof is efficient to generate while being 
 * cryptographically impossible to reverse-engineer back into 
 * the original merchant address or salt.
 */`;

export const creationFunctionsSection: DocsSection = {
    id: 'sc-creation',
    group: 'Contract Functions',
    label: 'Invoice Creation',
    eyebrow: 'Smart Contract',
    title: 'Creation Transitions — Minting Commitments',
    summary:
        'Invoice creation transitions allow merchants to commit to a specific set of payment parameters. These functions generate the Invoice records and the public BHP256 hashes that anchor the ZK payments.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-orange-400" />
                        <h3 className="text-lg font-bold text-white">Relayer Sponsorship</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        In the NullPay ecosystem, invoice creation is usually "sponsored". The CLI/SDK sends the parameters to our relayer, which then submits the <code className="text-white/80">create_invoice</code> transaction. This means the merchant doesn't need to hold Aleo Credits to start accepting payments.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-emerald-400" />
                        <h3 className="text-lg font-bold text-white">Privacy First</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Notice that <code className="text-white/80">merchant</code>, <code className="text-white/80">amount</code>, and <code className="text-white/80">salt</code> are all **PRIVATE** inputs. Even though the resulting hash is public, the inputs remains shielded on-chain.
                    </p>
                </GlassCard>
            </div>

            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Plus className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Transition: create_invoice</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <CodeBlock title="Minter Signature" language="leo" code={createInvoiceSignatureExample} />
                </div>
            </GlassCard>

            <GlassCard className="p-6 bg-orange-500/5 border-orange-500/20">
                <div className="flex items-center gap-3 mb-4 text-orange-300">
                    <Info className="h-5 w-5" />
                    <h3 className="text-xl font-bold">Cryptographic Commitment Design</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400 leading-relaxed">
                    NullPay uses **Homomorphic Commitment** principles. By hashing each input part individually and then summing them, we allow for future protocol upgrades where "blinded amounts" or "merchant groups" can be verified without breaking the original hash format.
                </p>
                <CodeBlock title="Protocol Hashing Strategy" language="js" code={hashDerivationDeepDive} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Enum Definitions: u8 Contexts</h3>
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="mb-2 flex items-center gap-2 font-bold text-white text-sm">
                            <Clock className="h-4 w-4 text-blue-400" />
                            Invoice Types
                        </div>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>• <b className="text-white">0u8: Standard</b> - Single-use, settles after payment.</li>
                            <li>• <b className="text-white">1u8: Multi-Pay</b> - Reusable, remains open.</li>
                            <li>• <b className="text-white">2u8: Donation</b> - Open-amount, remains open.</li>
                        </ul>
                    </div>
                    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
                        <div className="mb-2 flex items-center gap-2 font-bold text-white text-sm">
                            <Terminal className="h-4 w-4 text-emerald-400" />
                            Wallet Context
                        </div>
                        <ul className="space-y-1 text-xs text-gray-400">
                            <li>• <b className="text-white">0u8: Main Wallet</b> - Dashboard display only.</li>
                            <li>• <b className="text-white">1u8: Burner Wallet</b> - Privacy-optimized checkout.</li>
                        </ul>
                    </div>
                </div>
            </GlassCard>

            <Callout title="A Note on Expiry" tone="blue">
                Expiry is defined in <b>Hours</b> for developer convenience. Inside the finalizer, this is converted to Aleo block height: <br />
                <code className="mt-1 block bg-white/5 p-2 rounded text-emerald-300">target_height = current_height + (expiry_hours * 360)</code>
                <br />
                This assumes a 10-second block time (standard for Aleo Testnet).
            </Callout>
        </div>
    ),
};
