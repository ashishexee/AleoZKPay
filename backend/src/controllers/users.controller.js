const supabase = require('../config/supabase');

const updateProfile = async (req, res) => {
    const { address_hash, main_address, burner_address, encrypted_burner_key, profile_main_invoice_hash, profile_burner_invoice_hash } = req.body;

    if (!address_hash) {
        return res.status(400).json({ error: 'Missing address_hash' });
    }

    try {
        const { data: allUsers, error: fetchError } = await supabase.from('users').select('*').eq('address_hash', address_hash);
        if (fetchError) throw fetchError;

        let existingUser = allUsers && allUsers.length > 0 ? allUsers[0] : null;

        const updates = {
            address_hash: address_hash,
            updated_at: new Date().toISOString()
        };

        if (main_address !== undefined) updates.main_address = main_address;
        if (burner_address !== undefined) updates.burner_address = burner_address;
        if (encrypted_burner_key !== undefined) updates.encrypted_burner_key = encrypted_burner_key;
        if (profile_main_invoice_hash !== undefined) updates.profile_main_invoice_hash = profile_main_invoice_hash;
        if (profile_burner_invoice_hash !== undefined) updates.profile_burner_invoice_hash = profile_burner_invoice_hash;

        let data, error;

        if (existingUser) {
            const response = await supabase
                .from('users')
                .update(updates)
                .eq('address_hash', address_hash)
                .select()
                .single();
            data = response.data;
            error = response.error;
        } else {
            const response = await supabase
                .from('users')
                .insert(updates)
                .select()
                .single();
            data = response.data;
            error = response.error;
        }

        if (error) throw error;

        res.json(data);

    } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).json({ error: err.message });
    }
};

const getProfile = async (req, res) => {
    const { address } = req.params;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('address_hash', address)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({ error: 'Profile not found' });
            }
            return res.status(500).json({ error: error.message });
        }

        res.json(data);

    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ error: err.message });
    }
};

const clearBurner = async (req, res) => {
    const { address_hash } = req.body;
    if (!address_hash) return res.status(400).json({ error: 'Missing address_hash' });

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ burner_address: null, encrypted_burner_key: null, updated_at: new Date().toISOString() })
            .eq('address_hash', address_hash)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error("Error clearing burner data:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = {
    updateProfile,
    getProfile,
    clearBurner
};
