import { useCallback, useState } from 'react';
import { fetchAllPrivateBalances } from '../../BurnerWallet/scanner';
import type { BotBalanceView } from '../../../../../types/nullbot';
import { formatPublicMappingBalance } from '../lib/utils';

const EMPTY_BALANCES: BotBalanceView[] = [
    { token: 'Credits', publicBalance: '0.00', privateBalance: '0.00', loading: false },
    { token: 'USDCx', publicBalance: '0.00', privateBalance: '0.00', loading: false },
    { token: 'USAD', publicBalance: '0.00', privateBalance: '0.00', loading: false },
];

const LOADING_BALANCES: BotBalanceView[] = [
    { token: 'Credits', publicBalance: '0.00', privateBalance: '0.00', loading: true },
    { token: 'USDCx', publicBalance: '0.00', privateBalance: '0.00', loading: true },
    { token: 'USAD', publicBalance: '0.00', privateBalance: '0.00', loading: true },
];

export const useBurnerBalanceContext = (
    decryptedBurnerAddress: string | null | undefined,
    decryptedBurnerKey: string | null | undefined
) => {
    const [burnerBalances, setBurnerBalances] = useState<BotBalanceView[]>(EMPTY_BALANCES);

    const loadBurnerBalanceContext = useCallback(async (): Promise<BotBalanceView[]> => {
        const updatePublicBalance = async (walletAddress: string, programId: string, mappingName: string, suffix: string) => {
            try {
                const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/${programId}/mapping/${mappingName}/${walletAddress}`);
                if (!response.ok) {
                    return '0.00';
                }

                const data = await response.json();
                return formatPublicMappingBalance(data, suffix);
            } catch {
                return '0.00';
            }
        };

        if (!decryptedBurnerAddress) {
            setBurnerBalances(EMPTY_BALANCES);
            return EMPTY_BALANCES;
        }

        setBurnerBalances(LOADING_BALANCES);

        try {
            const [creditsPublic, usdcxPublic, usadPublic] = await Promise.all([
                updatePublicBalance(decryptedBurnerAddress, 'credits.aleo', 'account', 'u64'),
                updatePublicBalance(decryptedBurnerAddress, 'test_usdcx_stablecoin.aleo', 'balances', 'u128'),
                updatePublicBalance(decryptedBurnerAddress, 'test_usad_stablecoin.aleo', 'balances', 'u128'),
            ]);

            let privateBalances = { ALEO: 0, USDCx: 0, USAD: 0 };
            if (decryptedBurnerKey) {
                try {
                    privateBalances = await fetchAllPrivateBalances(decryptedBurnerKey);
                } catch (error) {
                    console.warn('Failed to fetch burner private balances for NullBot context:', error);
                }
            }

            const nextBalances: BotBalanceView[] = [
                {
                    token: 'Credits',
                    publicBalance: creditsPublic,
                    privateBalance: privateBalances.ALEO.toFixed(2),
                    loading: false,
                },
                {
                    token: 'USDCx',
                    publicBalance: usdcxPublic,
                    privateBalance: privateBalances.USDCx.toFixed(2),
                    loading: false,
                },
                {
                    token: 'USAD',
                    publicBalance: usadPublic,
                    privateBalance: privateBalances.USAD.toFixed(2),
                    loading: false,
                },
            ];
            setBurnerBalances(nextBalances);
            return nextBalances;
        } catch (error) {
            console.error('Failed to build burner balance context for NullBot:', error);
            setBurnerBalances(EMPTY_BALANCES);
            return EMPTY_BALANCES;
        }
    }, [decryptedBurnerAddress, decryptedBurnerKey]);

    return {
        burnerBalances,
        loadBurnerBalanceContext,
    };
};
