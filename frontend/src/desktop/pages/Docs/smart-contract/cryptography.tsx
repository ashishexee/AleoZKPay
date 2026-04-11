import { Hash, Lock, Shield, Cpu, Binary } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock, MetricCard } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const hashDerivationExample = `/**
 * THE INVOICE HASH: BHP256 Homomorphic Addition
 * 
 * Unlike SHA3 or Keccak, NullPay uses the BHP256 Pedersen Hash 
 * in a "Summation" pattern to anchor invoice commitments.
 * 
 * Formula:
 * H(Invoice) = BHP256(Merchant) + BHP256(Amount) + BHP256(Salt)
 */

// Implementation in Leo:
let m_hash: field = BHP256::hash_to_field(merchant_address as field);
let a_hash: field = BHP256::hash_to_field(amount_u64 as field);
let s_hash: field = BHP256::hash_to_field(salt_field);

let invoice_hash: field = m_hash + a_hash + s_hash;

/**
 * WHY ADDITION?
 * Arithmetic addition in the 254-bit prime field is extremely 
 * efficient for ZK circuits. It allows the prover to show 
 * knowledge of a sum without revealing the individual parts.
 */`;

const commitmentExample = `/**
 * PAYMENT RECEIPTS: Pedersen Commitment
 * 
 * To prove a payment happened without revealing the user, 
 * NullPay uses a 'hiding and binding' commitment.
 * 
 * Key Variables:
 * 1. payment_secret: The value being committed (Private).
 * 2. salt: The randomness that blinds the value (Private).
 * 
 * BHP256::commit_to_field(message, randomness)
 */

let r_scalar: scalar = BHP256::hash_to_scalar(salt);
let receipt_hash: field = BHP256::commit_to_field(payment_secret, r_scalar);

/**
 * PROPERTY: BINDING
 * Once the receipt_hash is on-chain, the payer cannot claim 
 * the payment was for a different secret or salt.
 * 
 * PROPERTY: HIDING
 * Looking at the receipt_hash gives zero information about 
 * the underlying salt or secret.
 */`;

export const cryptographySection: DocsSection = {
    id: 'sc-cryptography',
    group: 'Contract Architecture',
    label: 'Cryptography',
    eyebrow: 'Smart Contract',
    title: 'The Cryptographic Core — BHP256 Primitives',
    summary:
        'NullPay relies on the BHP256 (Pedersen Hash) algorithm for all on-chain privacy guarantees. This section explains the mathematical choices behind the protocol hashing and commitment schemes.',
    content: (
        <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-4">
                <MetricCard
                    icon={Cpu}
                    title="BHP256"
                    description="Collision-resistant hash function optimized for Zero-Knowledge constraints."
                />
                <MetricCard
                    icon={Binary}
                    title="Prime Field"
                    description="Operates on the BN254 elliptic curve field, offering 254 bits of security."
                />
                <MetricCard
                    icon={Lock}
                    title="Hiding"
                    description="Prevents observers from linking hashes to original merchant or payer data."
                />
                <MetricCard
                    icon={Shield}
                    title="Binding"
                    description="Ensures once a hash is committed, the price and merchant cannot be altered."
                />
            </div>

            <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4 text-orange-300">
                    <Hash className="h-5 w-5" />
                    <h3 className="text-xl font-bold">The Hashing Strategy</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400 leading-relaxed">
                    NullPay uses **Homomorphic Hashing**. By hashing each component (Merchant, Amount, Salt) individually and then adding the results, we create a composite hash. This is more circuit-efficient than hashing a concatenated string of inputs.
                </p>
                <CodeBlock title="BHP256 field addition" language="leo" code={hashDerivationExample} />
            </GlassCard>

            <GlassCard className="p-6 border-blue-500/20 bg-blue-500/5">
                <div className="flex items-center gap-3 mb-4 text-blue-300">
                    <Shield className="h-5 w-5" />
                    <h3 className="text-xl font-bold">Atomic Receipts & Commitments</h3>
                </div>
                <p className="mb-4 text-sm text-gray-400 leading-relaxed">
                    A receipt in NullPay is a <b>Pedersen Commitment</b>. It binds a payer-generated secret to the specific invoice salt. This creates a "dual-key" verification system where both parties can cryptographically prove the transaction occurred without revealing their addresses to the network.
                </p>
                <CodeBlock title="Pedersen Commitment Pattern" language="leo" code={commitmentExample} />
            </GlassCard>

            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Why not SHA-256 or Poseidon?</h3>
                <div className="space-y-4 text-sm text-gray-400">
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-orange-500" />
                        <p><b>Constraint Cost:</b> SHA-256 requires thousands of boolean constraints, making it extremely slow for ZK proofs on mobile devices. BHP256 is native to Aleo and executes in milliseconds.</p>
                    </div>
                    <div className="relative pl-6">
                        <div className="absolute left-0 top-1 h-2 w-2 rounded-full bg-blue-500" />
                        <p><b>Bit Security:</b> While Poseidon is efficient, BHP256 provides a simpler "Hardware-friendly" path for the Pedersen commitments used in our escrow and refund circuits (Phase 2 Roadmap).</p>
                    </div>
                </div>
            </GlassCard>

            <Callout title="Scalar Conversion" tone="blue">
                In Aleo, <code className="text-white/80">commit_to_field</code> requires the randomness to be a <code className="text-emerald-300">scalar</code>. NullPay automatically handles this by converting the 254-bit salt using the <code className="text-white/80">BHP256::hash_to_scalar()</code> helper before committing.
            </Callout>
        </div>
    ),
};
