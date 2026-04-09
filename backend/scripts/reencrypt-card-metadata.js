require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const supabase = require('../src/config/supabase');
const {
    encryptStoredValue,
    isEncryptedValue
} = require('../src/utils/crypto');

async function main() {
    const { data, error } = await supabase
        .from('users')
        .select('id, address_hash, card_label, card_hint')
        .or('card_label.not.is.null,card_hint.not.is.null');

    if (error) {
        throw error;
    }

    let updatedCount = 0;

    for (const row of data || []) {
        const next = {};

        if (row.card_label && !isEncryptedValue(row.card_label)) {
            next.card_label = encryptStoredValue(row.card_label, { label: 'card label' });
        }

        if (row.card_hint && !isEncryptedValue(row.card_hint)) {
            next.card_hint = encryptStoredValue(row.card_hint, { label: 'card hint' });
        }

        if (Object.keys(next).length === 0) {
            continue;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update(next)
            .eq('id', row.id);

        if (updateError) {
            throw updateError;
        }

        updatedCount += 1;
        console.log(`Re-encrypted card metadata for user ${row.address_hash}`);
    }

    console.log(`Done. Updated ${updatedCount} user row(s).`);
}

main().catch((error) => {
    console.error('Failed to re-encrypt card metadata:', error);
    process.exit(1);
});
