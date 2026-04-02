const supabase = require('../../config/supabase');
const { requireAuth } = require('../utils');
const crypto = require('crypto');

const userStates = {};

module.exports = (bot) => {
    bot.onText(/\/create/, async (msg) => {
        const chatId = msg.chat.id;
        const user = await requireAuth(bot, msg);
        if (!user) return;

        userStates[chatId] = { step: 'AMOUNT', user };
        bot.sendMessage(chatId, "💰 *Create New Invoice*\n\nPlease enter the amount you want to charge:", { parse_mode: 'Markdown' });
    });

    bot.onText(/\/invoice (.+)/, async (msg, match) => {
        const chatId = msg.chat.id;
        const hash = match[1].trim();
        
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('invoice_hash', hash)
            .single();

        if (error || !invoice) {
            return bot.sendMessage(chatId, "❌ Invoice not found.");
        }

        const itemsDisplay = invoice.invoice_items ? JSON.stringify(invoice.invoice_items) : 'No items specified';
        let text = `🧾 *Invoice Details*\n\n`;
        text += `*Hash:* \`${invoice.invoice_hash}\`\n`;
        text += `*Status:* ${invoice.status === 'SETTLED' ? '✅' : '⏳'} ${invoice.status}\n`;
        text += `*Merchant:* \`${invoice.merchant_address.substring(0, 8)}...\`\n`;
        text += `*Token Type:* ${['ALEO', 'USDCx', 'USAD'][invoice.token_type || 0] || 'Unknown'}\n`;
        text += `*Items:* ${itemsDisplay}\n`;

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    });

    // Handle generic text for conversational flow
    bot.on('message', async (msg) => {
        if (msg.text && msg.text.startsWith('/')) return; // Ignore commands

        const chatId = msg.chat.id;
        const state = userStates[chatId];
        
        if (!state) return; // Not in a flow

        if (state.step === 'AMOUNT') {
            const amount = parseFloat(msg.text);
            if (isNaN(amount) || amount <= 0) {
                return bot.sendMessage(chatId, "❌ Please enter a valid positive number for the amount.");
            }
            state.amount = amount;
            state.step = 'TOKEN';
            
            const opts = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: 'ALEO', callback_data: 'TOKEN_0' },
                            { text: 'USDCx', callback_data: 'TOKEN_1' },
                            { text: 'USAD', callback_data: 'TOKEN_2' }
                        ]
                    ]
                }
            };
            bot.sendMessage(chatId, "Select the token for this invoice:", opts);
        } else if (state.step === 'MEMO') {
            state.memo = msg.text.substring(0, 100);
            
            // Create Invoice!
            const { amount, tokenType, memo, user } = state;
            const merchant_address = user.aleo_address;
            
            // Generate deterministic or random hash
            const salt = crypto.randomBytes(16).toString('hex');
            const dataToHash = merchant_address + amount + tokenType + memo + salt + Date.now();
            const invoice_hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

            const invoice_items = [{
                id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
                description: memo || 'Unknown Item',
                price: amount,
                quantity: 1,
                image: ''
            }];

            bot.sendMessage(chatId, "⏳ Generating your invoice...");

            const { data, error } = await supabase
                .from('invoices')
                .upsert({
                    invoice_hash,
                    merchant_address,
                    merchant_address_hash: crypto.createHash('sha256').update(merchant_address).digest('hex'),
                    designated_address: merchant_address,
                    is_burner: false,
                    status: 'PENDING',
                    salt,
                    invoice_type: 0, // 0 for Standard
                    token_type: tokenType,
                    for_sdk: false,
                    invoice_items,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                console.error("Invoice config error:", error);
                bot.sendMessage(chatId, "❌ Error saving the invoice.");
            } else {
                bot.sendMessage(chatId, `✅ *Invoice Created!* 🎉\n\n*Amount:* ${amount}\n*Memo:* ${memo}\n*Hash:* \`${invoice_hash}\`\n\nYou can pay this invoice by sharing this link:\n[Pay Here](https://app.nullpay.xyz/checkout/${invoice_hash})`, { parse_mode: 'Markdown', disable_web_page_preview: true });
            }

            delete userStates[chatId]; // Clear state
        }
    });

    // Handle token selection
    bot.on('callback_query', (query) => {
        const chatId = query.message.chat.id;
        const state = userStates[chatId];

        if (!state) return;

        if (query.data.startsWith('TOKEN_')) {
            const tokenType = parseInt(query.data.split('_')[1], 10);
            state.tokenType = tokenType;
            state.step = 'MEMO';

            bot.answerCallbackQuery(query.id);
            bot.sendMessage(chatId, `You selected ${['ALEO', 'USDCx', 'USAD'][tokenType]}.\n\nFinally, what is the description/memo for this invoice?`, { parse_mode: 'Markdown' });
        }
    });
};
