export const installNodeCommand = 'npm install @nullpay/node@latest';
export const installCliCommand = 'npx @nullpay/cli@latest sdk onboard';
export const installMcpCommand = 'npx -y @nullpay/mcp';

export const nodeInitExample = `const path = require('path');
const { NullPay } = require('@nullpay/node');

const nullpay = new NullPay({
  secretKey: process.env.NULLPAY_SECRET_KEY,
  baseURL: process.env.NULLPAY_BASE_URL || 'https://nullpay-backend-ib5q4.ondigitalocean.app/api',
  projectRoot: __dirname,
  configPath: path.join(__dirname, 'nullpay.json'),
});`;

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

export const nullpayJsonExample = `{
  "merchant": "aleo1yu926k0jqqzfv06js4jlsxnf2ejah47rfqsxmwfx6tvuxxgvrqpqdlq5y0",
  "generated_at": "2026-03-21T09:10:24.522Z",
  "invoices": [
    {
      "name": "basic-usdcx",
      "type": "multipay",
      "amount": 1,
      "currency": "USDCX",
      "label": "",
      "hash": "172487944975353648367817000692546933725872947260115217528616500920474419194field",
      "salt": "189135607550214029684113079727128581168field"
    },
    {
      "name": "support-any",
      "type": "donation",
      "amount": null,
      "currency": "ANY",
      "label": "dsfbh",
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

Wallet program helpers:
- backup_password
- backup_burner_wallet
- create_card_profile
- set_card_status
- create_gift_card_record`;
