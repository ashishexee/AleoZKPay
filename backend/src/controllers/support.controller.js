const fetch = require('node-fetch');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const MAX_MESSAGE_LENGTH = 3000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeRequiredText(value, fieldName) {
    const normalized = String(value || '').trim();
    if (!normalized) {
        throw new Error(`${fieldName} is required.`);
    }
    return normalized;
}

function normalizeOptionalText(value) {
    const normalized = String(value || '').trim();
    return normalized || null;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function resolveSupportType(rawType) {
    const normalized = String(rawType || '').trim().toLowerCase();
    if (normalized !== 'complaint' && normalized !== 'feedback') {
        throw new Error('type must be either complaint or feedback.');
    }
    return normalized;
}

function validateEmail(email) {
    if (!EMAIL_PATTERN.test(email)) {
        throw new Error('A valid email address is required.');
    }
    return email;
}

function buildAcknowledgementHtml({ type, message, walletAddress }) {
    const subjectLabel = type === 'complaint' ? 'complaint' : 'feedback';
    const preview = escapeHtml(message.length > 500 ? `${message.slice(0, 497)}...` : message);
    const safeWallet = walletAddress ? escapeHtml(walletAddress) : null;

    return `
        <html>
            <body style="margin:0;padding:24px;background:#09090b;color:#f4f4f5;font-family:Arial,sans-serif;">
                <div style="max-width:600px;margin:0 auto;background:#111114;border:1px solid rgba(255,255,255,0.08);border-radius:18px;padding:24px;">
                    <h1 style="margin:0 0 16px;font-size:22px;line-height:1.2;color:#ffffff;">We received your NullPay ${subjectLabel}</h1>
                    <p style="margin:0 0 12px;color:#d4d4d8;line-height:1.6;">Thanks for contacting NullPay. Your ${subjectLabel} has been registered and sent to our support inbox.</p>
                    <p style="margin:0 0 18px;color:#d4d4d8;line-height:1.6;">Our team will review it and follow up if needed.</p>
                    <div style="background:#18181b;border:1px solid rgba(255,255,255,0.06);border-radius:14px;padding:16px;">
                        <p style="margin:0 0 8px;color:#fafafa;"><strong>Type:</strong> ${escapeHtml(type)}</p>
                        ${safeWallet ? `<p style="margin:0 0 8px;color:#fafafa;"><strong>Wallet:</strong> ${safeWallet}</p>` : ''}
                        <p style="margin:0;color:#fafafa;"><strong>Your message:</strong></p>
                        <p style="margin:10px 0 0;color:#d4d4d8;white-space:pre-wrap;line-height:1.6;">${preview}</p>
                    </div>
                </div>
            </body>
        </html>
    `.trim();
}

function buildSupportCopyHtml({ email, type, message, walletAddress }) {
    const safeWallet = walletAddress ? escapeHtml(walletAddress) : 'Not provided';
    return `
        <html>
            <body style="margin:0;padding:24px;background:#ffffff;color:#111827;font-family:Arial,sans-serif;">
                <div style="max-width:680px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;padding:24px;">
                    <h1 style="margin:0 0 16px;font-size:22px;color:#111827;">New NullPay ${escapeHtml(type)}</h1>
                    <p style="margin:0 0 8px;"><strong>Sender email:</strong> ${escapeHtml(email)}</p>
                    <p style="margin:0 0 8px;"><strong>Wallet address:</strong> ${safeWallet}</p>
                    <p style="margin:0 0 8px;"><strong>Type:</strong> ${escapeHtml(type)}</p>
                    <p style="margin:0 0 8px;"><strong>Submitted at:</strong> ${escapeHtml(new Date().toISOString())}</p>
                    <p style="margin:16px 0 8px;"><strong>Message</strong></p>
                    <div style="white-space:pre-wrap;line-height:1.6;background:#f9fafb;border-radius:12px;padding:16px;">${escapeHtml(message)}</div>
                </div>
            </body>
        </html>
    `.trim();
}

async function sendBrevoEmail(payload, apiKey) {
    const response = await fetch(BREVO_API_URL, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const message = data?.message || data?.code || 'Brevo request failed.';
        throw new Error(message);
    }

    return data;
}

const submitSupportFeedback = async (req, res) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || 'NullPay Team';
    const supportEmail = process.env.BREVO_SUPPORT_EMAIL || senderEmail;

    if (!apiKey || !senderEmail || !supportEmail) {
        return res.status(500).json({ error: 'Brevo email service is not configured.' });
    }

    try {
        const email = validateEmail(normalizeRequiredText(req.body?.email, 'email'));
        const type = resolveSupportType(req.body?.type);
        const message = normalizeRequiredText(req.body?.message, 'message');
        const walletAddress = normalizeOptionalText(req.body?.walletAddress);

        if (message.length > MAX_MESSAGE_LENGTH) {
            return res.status(400).json({ error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` });
        }

        const userSubject = type === 'complaint'
            ? 'We received your NullPay complaint'
            : 'We received your NullPay feedback';
        const supportSubject = type === 'complaint'
            ? `[NullPay Complaint] ${email}`
            : `[NullPay Feedback] ${email}`;
        const tags = [type === 'complaint' ? 'nullpay-complaint' : 'nullpay-feedback'];

        await sendBrevoEmail({
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [{ email }],
            subject: userSubject,
            htmlContent: buildAcknowledgementHtml({ type, message, walletAddress }),
            tags
        }, apiKey);

        await sendBrevoEmail({
            sender: {
                name: senderName,
                email: senderEmail
            },
            to: [{ email: supportEmail }],
            replyTo: { email },
            subject: supportSubject,
            htmlContent: buildSupportCopyHtml({ email, type, message, walletAddress }),
            tags
        }, apiKey);

        return res.json({
            success: true,
            message: `${type === 'complaint' ? 'Complaint' : 'Feedback'} registered and emails sent.`
        });
    } catch (error) {
        console.error('Support feedback email error:', error);
        const statusCode = /required|valid|either complaint or feedback|characters or fewer/i.test(error.message) ? 400 : 500;
        return res.status(statusCode).json({ error: error.message || 'Failed to send support email.' });
    }
};

module.exports = {
    submitSupportFeedback
};
