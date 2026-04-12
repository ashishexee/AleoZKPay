import { ArrowLeftRight, Clock, Database, Fingerprint, Globe, Lock, Radio, ScanLine, Shield, ShieldCheck } from 'lucide-react';
import type { DocsSection } from '../types';
import { Callout, CodeBlock } from '../ui';
import { GlassCard } from '../../../../shared/components/ui/GlassCard';

const oracleQuoteStruct = `struct OracleQuote {
    original_amount_micro: u64,    // Invoice amount in base token micros
    converted_amount_micro: u64,   // Payer amount in their token micros
    from_token_type: u8,           // Base token (0=Credits, 1=USDCx, 2=USAD)
    to_token_type: u8,             // Payer token
    expires_at: u32                // Block-height expiry
}`;

const signatureVerification = `// ─── On-Chain Oracle Verification (inside every cross-token finalizer) ───

// 1. Reconstruct the exact quote struct from the transition inputs
let quote: OracleQuote = OracleQuote {
    original_amount_micro: original_amount,
    converted_amount_micro: converted_amount as u64,
    from_token_type: 0u8,     // Invoice base token
    to_token_type: 1u8,       // Payer's chosen token
    expires_at: expires_at
};

// 2. Hash the quote with BHP256
let quote_hash: field = BHP256::hash_to_field(quote);

// 3. Fetch the trusted oracle address from on-chain mapping
let trusted_oracle: address = oracle_address.get(0u8);

// 4. Verify the backend's signature matches (reverts entire tx if forged)
assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));

// 5. Enforce block-height expiry
if expires_at != 0u32 {
    assert(block.height <= expires_at);
}`;

const backendQuoteEndpoint = `// GET /api/oracle/quote?from_token=CREDITS&to_token=USDCX&amount=10

// 1. Fetch live CREDITS price from Provable API (60s cache)
const fromPrice = await fetchPriceUSD('CREDITS');  // e.g. $0.044
const toPrice   = await fetchPriceUSD('USDCX');    // $1.00 (pegged)

// 2. Convert: 10 CREDITS × $0.044 ÷ $1.00 = 0.44 USDCx
const valueUSD = originalAmount * fromPrice;
const expectedAmount = valueUSD / toPrice;

// 3. Build the same OracleQuote struct as the smart contract
const quotePlaintext = Plaintext.fromString(\`{
    original_amount_micro: \${originalAmountMicro}u64,
    converted_amount_micro: \${convertedAmountMicro}u64,
    from_token_type: \${fromTypeNum}u8,
    to_token_type: \${toTypeNum}u8,
    expires_at: \${expiresAtBlock}u32
}\`);

// 4. Hash and sign — mirror's the contract's BHP256::hash_to_field
const quoteHash = new BHP256().hash(quotePlaintext.toBitsLe());
const signature = Signature.signValue(oraclePrivateKey, quoteHash);

// 5. Return the quote, signature, and oracle address to the frontend
res.json({
    expected_amount, converted_amount_micro,
    expires_at, signature, oracle_address, rates
});`;

const crossTokenTransition = `fn pay_invoice_credits_via_usdcx(
    pay_record:       test_usdcx_stablecoin.aleo::Token,
    merchant:         address,
    public payer_owner: address,
    original_amount:  u64,        // Invoice amount (Credits micros)
    converted_amount: u128,       // Oracle-converted (USDCx micros)
    salt:             field,
    payment_secret:   field,
    payer_note:       field,
    merchant_note:    field,
    public message:   field,
    proofs:          [MerkleProof; 2],  // Stablecoin compliance
    oracle_sig:       signature,       // Oracle's BHP256 signature
    public expires_at: u32             // Block-height deadline
) -> (Token, Token, ComplianceRecord, PayerReceipt, MerchantReceipt, Final)`;

const frontendFlow = `// Frontend: useSharedPayment.ts — Cross-token detection & quote fetch

// 1. Detect cross-token scenario
const isCrossToken = invoice.tokenType !== activeTokenType;

// 2. Fetch oracle quote from backend
const quote = await checkOracleQuote(
    getTokenCode(invoice.tokenType),   // e.g. "CREDITS"  
    getTokenCode(activeTokenType),     // e.g. "USDCX"
    invoice.amount                     // e.g. 10
);
// → { expected_amount: 0.44, signature: "sign1...", expires_at: 15720243 }

// 3. Route to wallet contract with cross-token function name
const funcName = \`pay_invoice_credits_via_usdcx\`;
const programId = WALLET_PROGRAM_ID;  // zk_pay_wallet contract

// 4. Build inputs including oracle signature and expiry
inputs.push(quote.signature);
inputs.push(\`\${quote.expires_at}u32\`);`;

const CROSS_TOKEN_PAIRS = [
    { from: 'Credits', to: 'USDCx', fn: 'pay_invoice_credits_via_usdcx', contract: 'Wallet' },
    { from: 'Credits', to: 'USAD', fn: 'pay_invoice_credits_via_usad', contract: 'Wallet' },
    { from: 'USDCx', to: 'Credits', fn: 'pay_invoice_usdcx_via_credits', contract: 'Wallet' },
    { from: 'USDCx', to: 'USAD', fn: 'pay_invoice_usdcx_via_usad', contract: 'Wallet' },
    { from: 'USAD', to: 'Credits', fn: 'pay_invoice_usad_via_credits', contract: 'Wallet' },
    { from: 'USAD', to: 'USDCx', fn: 'pay_invoice_usad_via_usdcx', contract: 'Wallet' },
];

export const oracleSection: DocsSection = {
    id: 'sc-oracle',
    group: 'Contract Functions',
    label: 'Multi-Token Oracle',
    eyebrow: 'Smart Contract',
    title: 'Multi-Token Oracle — Cross-Token Price Verification',
    summary:
        'The Oracle system enables payers to pay invoices in any supported token, regardless of the merchant\'s base currency. The backend signs a price quote that the smart contract verifies on-chain using BHP256 hashing and Aleo\'s native signature verification, preventing any price manipulation.',
    content: (
        <div className="space-y-6">
            {/* Architecture overview cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Radio className="h-5 w-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Live Price Feed</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        CREDITS price is fetched live from the <b>Provable API</b> every 60 seconds. USDCx and USAD are pegged stablecoins at $1.00. Conversion rates are computed in real-time, not hardcoded.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Fingerprint className="h-5 w-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-white">Signed Quotes</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        The backend Oracle signs each quote with its private key using <code className="text-white/80">BHP256::hash_to_field</code> over the <code className="text-white/80">OracleQuote</code> struct. The signature is verified on-chain — a tampered quote causes a full transaction revert.
                    </p>
                </GlassCard>
                <GlassCard className="p-6">
                    <div className="mb-4 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-white">Block-Height Expiry</h3>
                    </div>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        Each quote expires after ~30 blocks (~5 minutes). The smart contract enforces <code className="text-white/80">block.height ≤ expires_at</code> in the finalizer — stale quotes are rejected atomically.
                    </p>
                </GlassCard>
            </div>

            {/* How it works — end to end flow */}
            <GlassCard className="p-6">
                <h3 className="mb-5 text-xl font-bold text-white">End-to-End Flow</h3>
                <div className="space-y-4">
                    {[
                        {
                            icon: Globe,
                            color: 'text-blue-400',
                            title: '1. Merchant Enables Multi-Token',
                            desc: 'When creating an invoice, the merchant sets allowed_tokens (e.g. ["CREDITS", "USDCX", "USAD"]). This is stored in the database alongside the invoice. The base currency (e.g. USAD) remains the canonical amount.'
                        },
                        {
                            icon: ScanLine,
                            color: 'text-cyan-400',
                            title: '2. Payer Opens Payment Link',
                            desc: 'The payment frontend detects allowed_tokens from the database. If the payer holds a different token than the invoice base, a token selector appears letting them choose their preferred payment token.'
                        },
                        {
                            icon: ArrowLeftRight,
                            color: 'text-purple-400',
                            title: '3. Frontend Requests Oracle Quote',
                            desc: 'A GET request to /api/oracle/quote fetches the live conversion rate. The backend computes the converted amount, constructs an OracleQuote struct, hashes it with BHP256, and signs the hash with the Oracle private key.'
                        },
                        {
                            icon: Lock,
                            color: 'text-orange-400',
                            title: '4. Transaction Routes to Wallet Contract',
                            desc: 'Cross-token payments use the zk_pay_wallet contract (not the main zk_pay contract). The function name encodes the direction: e.g. pay_invoice_credits_via_usdcx. The oracle signature and block expiry are passed as inputs.'
                        },
                        {
                            icon: ShieldCheck,
                            color: 'text-emerald-400',
                            title: '5. On-Chain Verification',
                            desc: 'The finalizer reconstructs the OracleQuote from the transition inputs, hashes it with BHP256, fetches the trusted oracle address from the oracle_address mapping, and runs signature::verify(). If any value was altered, the entire transaction reverts.'
                        },
                    ].map((step, i) => (
                        <div key={i} className="flex items-start gap-4 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                <step.icon className={`h-4 w-4 ${step.color}`} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">{step.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed mt-1">{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            {/* OracleQuote Struct */}
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Database className="h-4 w-4 text-cyan-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Struct: OracleQuote</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The canonical data structure shared between the backend Oracle and the smart contract. Both sides independently
                        construct and hash this struct — if any field differs, the signature verification fails.
                    </p>
                    <CodeBlock title="OracleQuote Definition" language="leo" code={oracleQuoteStruct} />
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {[
                            { field: 'original_amount_micro', desc: 'The invoice amount in the merchant\'s base token, in micros (6 decimals). This is derived from the on-chain invoice hash.' },
                            { field: 'converted_amount_micro', desc: 'The equivalent amount the payer will send in their chosen token, computed using live exchange rates.' },
                            { field: 'from_token_type / to_token_type', desc: '0 = Credits, 1 = USDCx, 2 = USAD. Encodes the conversion direction so the same struct can\'t be replayed across different pairs.' },
                            { field: 'expires_at', desc: 'Block height at which the quote becomes invalid. Set to current_block + 30 (~5 min). The contract asserts block.height ≤ expires_at.' },
                        ].map((item, i) => (
                            <div key={i} className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                                <code className="text-[11px] font-mono text-orange-200">{item.field}</code>
                                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </GlassCard>

            {/* Backend Oracle Logic */}
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-4 w-4 text-purple-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-purple-300">Backend: Oracle Quote Generation</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The backend Oracle (<code className="text-white/80">oracle.controller.js</code>) fetches live prices, computes the conversion,
                        constructs the same <code className="text-white/80">OracleQuote</code> struct as the contract, hashes it with the Aleo SDK's <code className="text-white/80">BHP256</code>,
                        and signs the hash with <code className="text-white/80">ORACLE_PRIVATE_KEY</code>. This signature is what the contract verifies.
                    </p>
                    <CodeBlock title="Backend Quote Signing" language="javascript" code={backendQuoteEndpoint} />
                </div>
            </GlassCard>

            {/* Frontend Integration */}
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <ScanLine className="h-4 w-4 text-blue-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-300">Frontend: Token Selection & Quote Fetch</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        The payment frontend (<code className="text-white/80">useSharedPayment.ts</code>) detects when the payer's chosen token differs from the invoice's base currency.
                        It fetches an oracle quote, caches it, and routes the transaction to the <code className="text-white/80">zk_pay_wallet</code> contract with the appropriate cross-token function.
                    </p>
                    <CodeBlock title="Frontend Cross-Token Logic" language="typescript" code={frontendFlow} />
                </div>
            </GlassCard>

            {/* On-chain Verification */}
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4 text-emerald-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">On-Chain: Signature Verification</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        Every cross-token payment finalizer independently reconstructs the <code className="text-white/80">OracleQuote</code>,
                        hashes it, and verifies the backend's signature against the on-chain <code className="text-white/80">oracle_address</code> mapping.
                        This is the <b>trust anchor</b> — no off-chain entity can manipulate the rate without the Oracle's private key.
                    </p>
                    <CodeBlock title="Smart Contract Verification Logic" language="leo" code={signatureVerification} />
                </div>
            </GlassCard>

            {/* Cross-token transition signature */}
            <GlassCard className="overflow-hidden p-0">
                <div className="border-b border-white/[0.08] bg-white/[0.02] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <ArrowLeftRight className="h-4 w-4 text-orange-300" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-orange-300">Transition: Cross-Token Payment</p>
                    </div>
                </div>
                <div className="px-6 py-5">
                    <p className="mb-4 text-sm text-gray-400">
                        Cross-token transitions live in the <code className="text-white/80">zk_pay_wallet</code> contract. Each function encodes the conversion direction.
                        The <code className="text-white/80">original_amount</code> is the invoice's base value; <code className="text-white/80">converted_amount</code> is the Oracle's computed equivalent.
                    </p>
                    <CodeBlock title="Cross-Token Transition Signature" language="leo" code={crossTokenTransition} />
                </div>
            </GlassCard>

            {/* Supported pairs table */}
            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Supported Cross-Token Pairs</h3>
                <p className="mb-4 text-sm text-gray-400">
                    All 6 conversion directions are implemented as separate transitions in the <code className="text-white/80">zk_pay_wallet</code> contract. Each enforces Oracle signature verification and block-height expiry.
                </p>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Invoice Token</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Pays With</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Transition Function</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Contract</th>
                            </tr>
                        </thead>
                        <tbody>
                            {CROSS_TOKEN_PAIRS.map((pair, i) => (
                                <tr key={i} className="border-b border-white/[0.04]">
                                    <td className="px-4 py-2.5 text-white font-medium">{pair.from}</td>
                                    <td className="px-4 py-2.5 text-cyan-300 font-medium">{pair.to}</td>
                                    <td className="px-4 py-2.5 font-mono text-xs text-orange-200">{pair.fn}</td>
                                    <td className="px-4 py-2.5 text-gray-400">{pair.contract}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Security guarantees */}
            <GlassCard className="p-6">
                <h3 className="mb-4 text-xl font-bold text-white">Security Guarantees</h3>
                <div className="space-y-4">
                    {[
                        { title: 'Tamper Proof', desc: 'The OracleQuote struct is hashed with BHP256 and verified against the Oracle\'s signature. If any field is altered (amount, token type, or expiry), the ZKP verification fails and the transaction is atomically reverted.' },
                        { title: 'No Replay Attacks', desc: 'The from_token_type and to_token_type fields are embedded in the quote hash. A signature for Credits→USDCx cannot be reused for Credits→USAD because the hash will differ.' },
                        { title: 'Time-Bounded', desc: 'Quotes expire after ~30 blocks. Even if a signature is intercepted, it becomes invalid after the expiry block height is surpassed.' },
                        { title: 'Admin-Only Oracle', desc: 'The oracle_address mapping can only be set by the contract admin via set_oracle_address. The trusted Oracle public key cannot be changed by any third party.' },
                        { title: 'Atomic Settlement', desc: 'If any check fails — signature, expiry, amount, or compliance proof — the entire transaction reverts. Funds never leave the payer\'s wallet unless all validations pass.' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-4 rounded-lg border border-white/[0.04] bg-white/[0.01] p-3">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px]">{i + 1}</div>
                            <div>
                                <h4 className="text-sm font-bold text-white">{item.title}</h4>
                                <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Callout title="Oracle Trust Model" tone="blue">
                The Oracle is a <b>centralized price feed</b> — NullPay's backend signs the quote. However, the smart contract enforces that only the <b>admin-registered oracle address</b> can produce valid signatures. This means:
                (1) the Oracle cannot forge a quote for a different amount than it computed,
                (2) the payer cannot substitute a fake rate, and
                (3) expired quotes are rejected by the Aleo validators themselves. A future upgrade path could decentralize the Oracle by accepting signatures from multiple registered feed providers.
            </Callout>

            <Callout title="allowed_tokens vs Currency" tone="orange">
                <b>Don't confuse</b> the invoice's base <code className="text-white/80">currency</code> with <code className="text-white/80">allowed_tokens</code>.
                The currency (e.g. USAD) sets the <b>canonical value</b> of the invoice and is committed into the on-chain BHP256 hash.
                The <code className="text-white/80">allowed_tokens</code> array (stored in the database, not on-chain) tells the payment frontend which alternative tokens the payer is allowed to use. The Oracle then computes the conversion at payment time.
            </Callout>
        </div>
    ),
};
