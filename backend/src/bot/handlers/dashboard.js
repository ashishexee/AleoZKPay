const {
    getDashboardForTelegramUser,
    normalizePaymentTxIds
} = require('../../services/telegram.service');
const {
    buildInvoiceDetailsUrl,
    buildTransactionExplorerUrl
} = require('../../utils/telegram');
const { requireAuth } = require('../utils');

const DASHBOARD_PAGE_SIZE = 5;

function buildPageButtons(currentPage, totalPages) {
    if (totalPages <= 1) {
        return [];
    }

    const windowSize = 3;
    const startPage = Math.max(
        1,
        Math.min(currentPage - 1, totalPages - windowSize + 1)
    );
    const endPage = Math.min(totalPages, startPage + windowSize - 1);
    const buttons = [];

    for (let page = startPage; page <= endPage; page += 1) {
        buttons.push({
            text: page === currentPage ? `• ${page} •` : String(page),
            callback_data: `DASHBOARD_PAGE_${page}`
        });
    }

    return buttons;
}

function buildDashboardMessage(user, dashboard) {
    let text = `📊 Merchant dashboard for \`${user.aleo_address}\`\n\n`;
    text += `Total invoices: ${dashboard.total_invoices}\n`;
    text += `Settled: ${dashboard.settled_count}\n`;
    text += `Pending: ${dashboard.pending_count}\n`;
    text += `Alerts: ${user.notifications_enabled === false ? 'Off' : 'On'}\n`;
    text += `Page: ${dashboard.current_page}/${dashboard.total_pages}\n\n`;

    if (dashboard.recent_invoices.length > 0) {
        text += 'Recent invoices:\n';
        dashboard.recent_invoices.forEach((invoice, index) => {
            const paymentTxIds = normalizePaymentTxIds(invoice.payment_tx_ids);
            const itemNumber = ((dashboard.current_page - 1) * dashboard.page_size) + index + 1;

            text += `\n${itemNumber}. Hash: \`${invoice.invoice_hash}\`\n`;
            text += `Status: ${invoice.status}\n`;
            if (invoice.invoice_transaction_id) {
                text += `Creation tx: \`${invoice.invoice_transaction_id}\`\n`;
            }
            if (paymentTxIds.length) {
                text += `Payments: ${paymentTxIds.length}\n`;
            }
            if (invoice.created_at) {
                text += `Created: ${new Date(invoice.created_at).toLocaleString()}\n`;
            }
        });
    } else {
        text += 'No invoices yet. Use /create to issue your first one.';
    }

    return text;
}

function buildDashboardKeyboard(dashboard) {
    const keyboard = [];

    dashboard.recent_invoices.forEach((invoice, index) => {
        const itemNumber = ((dashboard.current_page - 1) * dashboard.page_size) + index + 1;
        const row = [
            { text: `📄 Invoice ${itemNumber}`, url: buildInvoiceDetailsUrl(invoice.invoice_hash) }
        ];

        if (invoice.invoice_transaction_id) {
            row.push({
                text: `🔗 Tx ${itemNumber}`,
                url: buildTransactionExplorerUrl(invoice.invoice_transaction_id)
            });
        }

        keyboard.push(row);
    });

    const pageButtons = buildPageButtons(dashboard.current_page, dashboard.total_pages);
    if (pageButtons.length) {
        keyboard.push(pageButtons);
    }

    keyboard.push([
        { text: '🧾 Recent Invoices', callback_data: 'LIST_INVOICES' },
        { text: '🔔 Toggle Alerts', callback_data: 'NOTIFICATIONS_MENU' }
    ]);

    return keyboard;
}

async function sendDashboard(bot, msgLike, page = 1) {
    const chatId = msgLike.chat.id;
    const user = await requireAuth(bot, msgLike);
    if (!user) return;

    const dashboard = await getDashboardForTelegramUser(user, {
        page,
        pageSize: DASHBOARD_PAGE_SIZE
    });

    const payload = {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: buildDashboardKeyboard(dashboard)
        }
    };

    if (msgLike.message_id) {
        try {
            await bot.editMessageText(buildDashboardMessage(user, dashboard), {
                chat_id: chatId,
                message_id: msgLike.message_id,
                ...payload
            });
            return;
        } catch (error) {
            const description = error?.response?.body?.description || '';
            if (!description.toLowerCase().includes("message can't be edited")) {
                throw error;
            }
        }
    }

    await bot.sendMessage(chatId, buildDashboardMessage(user, dashboard), payload);
}

module.exports = (bot) => {
    bot.onText(/^\/dashboard(?:\s|$)/, async (msg) => {
        try {
            await sendDashboard(bot, msg, 1);
        } catch (error) {
            console.error('Telegram dashboard failed:', error);
            await bot.sendMessage(msg.chat.id, 'I could not load your merchant dashboard right now. Please try again in a moment.');
        }
    });

    bot.on('callback_query', async (query) => {
        const data = query.data || '';
        const pageMatch = data.match(/^DASHBOARD_PAGE_(\d+)$/);

        if (data !== 'OPEN_DASHBOARD' && !pageMatch) {
            return;
        }

        const syntheticMsg = {
            chat: query.message.chat,
            from: query.from,
            message_id: query.message.message_id
        };
        const nextPage = pageMatch ? Number(pageMatch[1]) : 1;

        try {
            await bot.answerCallbackQuery(query.id);
            await sendDashboard(bot, syntheticMsg, nextPage);
        } catch (error) {
            console.error('Telegram dashboard callback failed:', error);
            await bot.sendMessage(query.message.chat.id, 'I could not refresh your merchant dashboard right now. Please try again in a moment.');
        }
    });
};
