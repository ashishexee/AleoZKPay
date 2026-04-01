const supabase = require('../../config/supabase');
const { requireAuth } = require('../utils');

module.exports = (bot) => {
    bot.onText(/\/dashboard/, async (msg) => {
        const chatId = msg.chat.id;
        
        const user = await requireAuth(bot, msg);
        if (!user) return;

        bot.sendMessage(chatId, "📊 Fetching your merchant dashboard...");

        const address = user.aleo_address;

        const { data: invoices, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('merchant_address', address)
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Dashboard error:", error);
            return bot.sendMessage(chatId, "❌ Failed to fetch dashboard data.");
        }

        const totalInvoices = invoices.length;
        const paidInvoices = invoices.filter(inv => inv.status === 'SETTLED');
        const unpaidInvoices = invoices.filter(inv => inv.status === 'PENDING');

        // Note: For actual total volume we'd need to parse token arrays, but for MVP we just sum amounts if it's a simple number 
        // Our controller createInvoice takes a single "amount", or "invoice_items" array. Depending on your invoice structure.
        let text = `📈 *Your Merchant Dashboard*\n\n`;
        text += `*Address:* \`${address.slice(0, 8)}...${address.slice(-6)}\`\n`;
        text += `*Total Invoices:* ${totalInvoices}\n`;
        text += `*Paid Invoices:*  ${paidInvoices.length}\n`;
        text += `*Pending/Unpaid:* ${unpaidInvoices.length}\n\n`;

        if (invoices.length > 0) {
            text += `*Recent Invoices:*\n`;
            invoices.slice(0, 3).forEach((inv, i) => {
                const statusIcon = inv.status === 'SETTLED' ? '✅' : '⏳';
                text += `${i + 1}. \`${inv.invoice_hash.slice(0, 10)}...\` - ${statusIcon} ${inv.status}\n`;
            });
        } else {
            text += `No invoices found yet. Use /create to make one!`;
        }

        bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
    });
};
