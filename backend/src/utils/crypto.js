const crypto = require('crypto');

const readMerchantStoredValue = (value) => value || null;

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = {
    readMerchantStoredValue,
    sha256Hex
};
