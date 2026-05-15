export const installNodeCommand = 'npm install @nullpay/node@latest';
export const installCliCommand = 'npx @nullpay/cli@latest sdk onboard';
export const installMcpCommand = 'npx -y @nullpay/mcp';
export const installPythonCommand = 'pip install nullpay-python';

export const nodeInitExample = `const path = require('path');
const { NullPay } = require('@nullpay/node');

const nullpay = new NullPay({
  secretKey: process.env.NULLPAY_SECRET_KEY,
  baseURL: process.env.NULLPAY_BASE_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
  projectRoot: __dirname,
  configPath: path.join(__dirname, 'nullpay.json'),
});`;

export const pythonInitExample = `from nullpay import NullPay

client = NullPay(
    secret_key="sk_test_...",
    base_url="https://nullpay-backend-ib5q4.ondigitalocean.app/api"
)`;

export const testingWebsiteBackendExample = `for (const invoice of nullpay.invoices.getAll()) {
  app.post(\`/api/\${invoice.name}\`, async (req, res) => {
    const session = await nullpay.checkout.sessions.create({
      nullpay_invoice_name: invoice.name,
      success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=\${buildSuccessType(invoice)}\`,
      cancel_url: \`\${frontendUrl}?cancel=true\`,
    });

    res.json({ checkoutUrl: session.checkout_url });
  });
}

app.post('/api/checkout/variable', async (req, res) => {
  const { currency, price, tokens } = req.body;

  const session = await nullpay.checkout.sessions.create({
    amount: price,
    currency,
    success_url: \`\${frontendUrl}?session_id={CHECKOUT_SESSION_ID}&type=variable&tokens=\${tokens}\`,
    cancel_url: \`\${frontendUrl}?cancel=true\`,
  });

  res.json({ checkoutUrl: session.checkout_url });
});`;

export const webhookExample = `app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-nullpay-signature'];

  try {
    const event = nullpay.webhooks.constructEvent(req.rawBody, signature);

    if (event.status === 'SETTLED') {
      console.log('FULFILL ORDER', event.id, event.tx_id);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    res.status(400).send(\`Webhook Error: \${err.message}\`);
  }
});`;

export const webhookPythonExample = `from flask import Flask, request, jsonify
from nullpay import NullPay

app = Flask(__name__)
client = NullPay(secret_key="sk_test_...")

@app.route('/webhook/nullpay', methods=['POST'])
def nullpay_webhook():
    signature = request.headers.get('x-nullpay-signature', '')
    payload = request.get_data(as_text=True)

    try:
        event = client.webhooks.construct_event(payload, signature)
        if event.status == 'SETTLED':
            print(f"FULFILL ORDER: {event.id}")
        return jsonify({"received": True}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 400`;

export const nullpayJsonExample = `{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "generated_at": "2026-03-21T09:10:24.522Z",
  "invoices": [
    {
      "name": "pro-plan",
      "type": "multipay",
      "amount": 50,
      "currency": "USDCX",
      "label": "Pro Plan - Monthly",
      "hash": "172487944975353648367817000692546933725872947260115217528616500920474419194field",
      "salt": "189135607550214029684113079727128581168field"
    },
    {
      "name": "basic-credits",
      "type": "multipay",
      "amount": 1,
      "currency": "CREDITS",
      "label": "",
      "hash": "766442430208697001521238286649935030058204507796783004824696233651531638062field",
      "salt": "526148460307750415569870269048374066436field"
    },
    {
      "name": "support-any",
      "type": "donation",
      "amount": null,
      "currency": "ANY",
      "label": "Support the project",
      "hash": "3890137687796658966791726479363108149438945720273892520625084409687425161623field",
      "salt": "64965075528395375647972437556920314428field"
    }
  ]
}`;

export const claudeConfigExample = `{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "YOUR_ALEO_ADDRESS",
        "NULLPAY_MAIN_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
        "NULLPAY_MAIN_PASSWORD": "YOUR_PASSWORD"
      }
    }
  }
}`;

export const openclawConfigExample = `{
  "mcp": {
    "servers": {
      "nullpay": {
        "command": "npx",
        "args": ["-y", "@nullpay/mcp", "server"],
        "env": {
          "NULLPAY_MAIN_ADDRESS": "YOUR_ALEO_ADDRESS",
          "NULLPAY_MAIN_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
          "NULLPAY_MAIN_PASSWORD": "YOUR_PASSWORD"
        }
      }
    }
  }
}`;

export const openclawRestartCommand = 'openclaw restart';
export const openclawGatewayCommand = 'openclaw gateway';
export const openclawInitCommand = 'openclaw config init';

export const codexConfigExample = `model = "gpt-5.4"

[mcp_servers.nullpay]
command = "cmd"
args = ["/c npx -y @nullpay/mcp server"]
enabled = true

[mcp_servers.nullpay.env]
NULLPAY_MAIN_ADDRESS = "aleo1..."
NULLPAY_MAIN_PRIVATE_KEY = "APrivateKey1..."
NULLPAY_MAIN_PASSWORD = "optional"`;

export const antigravityConfigExample = `{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "YOUR_ALEO_ADDRESS",
        "NULLPAY_MAIN_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
        "NULLPAY_MAIN_PASSWORD": "YOUR_PASSWORD"
      }
    }
  }
}`;

export const cursorConfigExample = `{
  "mcpServers": {
    "nullpay": {
      "command": "npx",
      "args": ["-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "YOUR_ALEO_ADDRESS",
        "NULLPAY_MAIN_PRIVATE_KEY": "YOUR_PRIVATE_KEY",
        "NULLPAY_MAIN_PASSWORD": "YOUR_PASSWORD"
      }
    }
  }
}`;

export const manualConfigExample = `{
  "mcpServers": {
    "nullpay": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@nullpay/mcp", "server"],
      "env": {
        "NULLPAY_MAIN_ADDRESS": "aleo1...",
        "NULLPAY_MAIN_PRIVATE_KEY": "APrivateKey1...",
        "NULLPAY_MAIN_PASSWORD": "optional"
      }
    }
  }
}`;

export const contractFunctionSummary = `Invoice creation:
- create_invoice
- create_invoice_usdcx
- create_invoice_usad
- create_invoice_any

Payments:
- pay_invoice
- pay_invoice_usdcx
- pay_invoice_usad
- pay_donation
- pay_donation_usdcx
- pay_donation_usad

Settlement and reads:
- settle_invoice
- get_invoice_status
- delete_invoice

Wallet program helpers:
- backup_password
- backup_burner_wallet
- create_card_profile
- delete_card_profile
- create_gift_card_record

Oracle-backed cross-token (wallet program):
- pay_invoice_credits_via_usdcx
- pay_invoice_credits_via_usad
- pay_invoice_usdcx_via_credits
- pay_invoice_usdcx_via_usad
- pay_invoice_usad_via_credits
- pay_invoice_usad_via_usdcx

Admin:
- set_oracle_address`;

export const invoiceCreateLeoCode = `// Leo: create_invoice (Credits)
// Located in: contracts/zk_pay/src/main.leo
transition create_invoice(
    private merchant: address,
    private amount: u64,
    private salt: field,
    private title: field,
    private memo: field,
    public expiry_hours: u32,
    public invoice_type: u8,
    public wallet_type: u8
) -> (Invoice, public field, Final) {
    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;

    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);

    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

    let invoice_record: Invoice = Invoice {
        owner: merchant,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8,
        invoice_type: invoice_type,
        salt: salt,
        title: title,
        memo: memo,
        wallet_type: wallet_type
    };

    return (
        invoice_record,
        invoice_hash,
        final {
            let blocks_to_add: u32 = expiry_hours * 360u32;
            let expiry_height: u32 =
                expiry_hours != 0u32 ? block.height + blocks_to_add : 0u32;

            let invoice_data: InvoiceData = InvoiceData {
                expiry_height: expiry_height,
                status: 0u8,
                invoice_type: invoice_type,
                token_type: 0u8,
                wallet_type: wallet_type
            };

            invoices.set(invoice_hash, invoice_data);
            salt_to_invoice.set(salt, invoice_hash);
        }
    );
}`;

export const payInvoiceLeoCode = `// Leo: pay_invoice (Credits)
// Located in: contracts/zk_pay/src/main.leo
transition pay_invoice(
    pay_record: credits.aleo::credits,
    merchant: address,
    public payer_owner: address,
    amount: u64,
    salt: field,
    private payment_secret: field,
    private payer_note: field,
    private merchant_note: field,
    public message: field
) -> (credits.aleo::credits, credits.aleo::credits, PayerReceipt, MerchantReceipt, Final) {
    let (r1, r2): (credits.aleo::credits, credits.aleo::credits) = 
        credits.aleo::transfer_private(pay_record, merchant, amount);

    let merchant_field: field = merchant as field;
    let amount_field: field = amount as field;

    let merchant_hash: field = BHP256::hash_to_field(merchant_field);
    let amount_hash: field = BHP256::hash_to_field(amount_field);
    let salt_hash: field = BHP256::hash_to_field(salt);

    let invoice_hash: field = merchant_hash + amount_hash + salt_hash;

    let salt_scalar: scalar = BHP256::hash_to_scalar(salt);
    let receipt_hash: field = BHP256::commit_to_field(payment_secret, salt_scalar);

    let payer_receipt: PayerReceipt = PayerReceipt {
        owner: payer_owner,
        merchant: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8,
        payer_note: payer_note,
        timestamp: 0u64
    };

    let merchant_receipt: MerchantReceipt = MerchantReceipt {
        owner: merchant,
        receipt_hash: receipt_hash,
        invoice_hash: invoice_hash,
        amount: amount,
        token_type: 0u8,
        merchant_note: merchant_note
    };

    return (
        r1, r2, payer_receipt, merchant_receipt,
        final {
            let stored_hash: field = salt_to_invoice.get(salt);
            assert_eq(invoice_hash, stored_hash);

            let invoice_data: InvoiceData = invoices.get(stored_hash);

            if invoice_data.token_type != 3u8 {
                assert_eq(invoice_data.token_type, 0u8);
            }

            if invoice_data.expiry_height != 0u32 {
                assert(block.height <= invoice_data.expiry_height);
            }

            assert_eq(invoice_data.status, 0u8);

            if invoice_data.invoice_type == 0u8 {
                let updated_data: InvoiceData = InvoiceData {
                    expiry_height: invoice_data.expiry_height,
                    status: 1u8,
                    invoice_type: invoice_data.invoice_type,
                    token_type: invoice_data.token_type,
                    wallet_type: invoice_data.wallet_type
                };
                invoices.set(stored_hash, updated_data);
            }
        }
    );
}`;

export const oracleQuoteLeoCode = `// Leo: OracleQuote struct (wallet program)
// Located in: contracts/zk_pay_wallet/src/main.leo
struct OracleQuote {
    original_amount_micro: u64,    // Invoice amount in base token micros
    converted_amount_micro: u64,   // Payer amount in their token micros
    from_token_type: u8,           // Base token (0=Credits, 1=USDCx, 2=USAD)
    to_token_type: u8,             // Payer token
    expires_at: u32                // Block height expiry (~30 blocks = ~5 min)
}

// Example: pay_invoice_credits_via_usdcx
transition pay_invoice_credits_via_usdcx(
    pay_record: test_usdcx_stablecoin.aleo::Token,
    merchant: address,
    public payer_owner: address,
    original_amount: u64,
    converted_amount: u128,
    salt: field,
    private payment_secret: field,
    private payer_note: field,
    private merchant_note: field,
    public message: field,
    private proofs: [test_usdcx_stablecoin.aleo::MerkleProof; 2],
    oracle_sig: signature,
    public expires_at: u32
) -> (...) {
    // 1. Execute the actual private transfer in the payer's token
    let (...) = test_usdcx_stablecoin.aleo::transfer_private(
        merchant, converted_amount, pay_record, proofs
    );

    // 2. Build the OracleQuote and hash it
    let quote: OracleQuote = OracleQuote {
        original_amount_micro: original_amount,
        converted_amount_micro: converted_amount as u64,
        from_token_type: 0u8,
        to_token_type: 1u8,
        expires_at: expires_at
    };
    let quote_hash: field = BHP256::hash_to_field(quote);

    // ... receipt generation ...

    final {
        // 3. Verify the oracle signature and expiry
        let trusted_oracle: address = oracle_address.get(0u8);
        assert(signature::verify(oracle_sig, trusted_oracle, quote_hash));
        if expires_at != 0u32 {
            assert(block.height <= expires_at);
        }
    }
}`;

export const mcpToolsExample = `// NullPay MCP exposes four tools to AI clients:
//
// 1. login
//    - Creates or resumes an MCP session
//    - Validates password against encrypted backend profile
//    - Optionally creates or restores a burner wallet
//
// 2. create_invoice
//    - Creates standard, multipay, or donation invoice
//    - Calls backend relay route for on-chain submission
//    - Returns invoice hash, tx id, and payment link
//
// 3. pay_invoice
//    - Pays a NullPay invoice from the selected wallet
//    - Accepts full payment link as preferred input
//    - Builds Aleo execution authorization locally
//    - Sends authorization to backend sponsor endpoint
//
// 4. get_transaction_info
//    - Fetches one invoice by hash or lists recent invoices
//    - Enriches with record-backed amount if private key available
//
// Session model:
// - Per-process in-memory session
// - Contains main address, hashed address, password, active wallet
// - Private keys are never returned in tool output`;

export const oracleApiExample = `// GET /api/oracle/quote?from_token=Credits&to_token=USDCx&amount=10000000
// Returns a signed OracleQuote for cross-token conversion

// Response:
{
  "from_token": "Credits",
  "to_token": "USDCx",
  "original_amount_micro": 10000000,
  "converted_amount_micro": 12500000,
  "quote_hash": "523...field",
  "oracle_signature": "sign1...",
  "expires_at": 4592000,
  "rate": 0.8
}

// The quote is valid for ~30 blocks (~5 minutes)
// USD-based: CREDITS price is fetched live from Provable API
// Stablecoins (USDCx, USAD) are pegged to $1.00`;

export const checkoutCreateSessionExample = `// Create a hosted checkout session
const session = await nullpay.checkout.sessions.create({
  amount: 50,                    // Amount in major units
  currency: 'USDCX',            // CREDITS | USDCX | USAD | ANY
  type: 'multipay',             // standard | multipay | donation
  success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yourapp.com/cancel',
});

// Response shape:
// {
//   id: "cs_abc123",
//   checkout_url: "https://nullpay.app/checkout/cs_abc123",
//   status: "PENDING",
//   invoice_hash: "523...field",
//   salt: "189...field"
// }

// Use nullpay_invoice_name shorthand (reads from nullpay.json):
const session2 = await nullpay.checkout.sessions.create({
  nullpay_invoice_name: 'pro-plan',
  success_url: 'https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://yourapp.com/cancel',
});`;

export const sessionRetrieveExample = `// Retrieve a session and check its status
const session = await nullpay.checkout.sessions.retrieve('cs_abc123');

// Session status lifecycle:
// PENDING  → Buyer has not yet paid
// SETTLED  → Payment confirmed on-chain
// FAILED   → Payment attempted but failed
// EXPIRED  → Session expired without payment

if (session.status === 'SETTLED') {
  // Safe to fulfill the order
  console.log('Transaction ID:', session.tx_id);
}`;
