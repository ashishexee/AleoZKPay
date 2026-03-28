import { useEffect, useState } from 'react';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { useWalletErrorHandler } from './Wallet/WalletErrorBoundary';

export interface WalletTokenBalance {
    name: 'Credits' | 'USDCx' | 'USAD';
    public: string;
    private: string;
    publicAmount: number;
    privateAmount: number;
    loading: boolean;
}

const INITIAL_BALANCES: WalletTokenBalance[] = [
    { name: 'Credits', public: '0.00', private: '0.00', publicAmount: 0, privateAmount: 0, loading: true },
    { name: 'USDCx', public: '0.00', private: '0.00', publicAmount: 0, privateAmount: 0, loading: true },
    { name: 'USAD', public: '0.00', private: '0.00', publicAmount: 0, privateAmount: 0, loading: true },
];

const TOKENS = [
    { programId: 'credits.aleo', name: 'Credits' as const, fieldName: 'microcredits', typeSuffix: 'u64', mappingName: 'account' },
    { programId: 'test_usdcx_stablecoin.aleo', name: 'USDCx' as const, fieldName: 'amount', typeSuffix: 'u128', mappingName: 'balances' },
    { programId: 'test_usad_stablecoin.aleo', name: 'USAD' as const, fieldName: 'amount', typeSuffix: 'u128', mappingName: 'balances' },
];

export const useWalletBalances = () => {
    const { address, requestRecords, decrypt } = useWallet();
    const { handleWalletError } = useWalletErrorHandler();
    const [balances, setBalances] = useState<WalletTokenBalance[]>(INITIAL_BALANCES);

    useEffect(() => {
        let cancelled = false;

        const extractAmount = async (record: any, fieldName: string, typeSuffix: string): Promise<bigint> => {
            try {
                if (record.data && record.data[fieldName]) {
                    return BigInt(String(record.data[fieldName]).replace(typeSuffix, ''));
                }

                if (record.plaintext) {
                    const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${typeSuffix}`);
                    const match = record.plaintext.match(regex);
                    if (match && match[1]) {
                        return BigInt(match[1].replace(/_/g, ''));
                    }
                }

                if (record.recordCiphertext && !record.plaintext && decrypt) {
                    try {
                        const decrypted = await decrypt(record.recordCiphertext);
                        if (decrypted) {
                            record.plaintext = decrypted;
                            const regex = new RegExp(`${fieldName}:\\s*([\\d_]+)${typeSuffix}`);
                            const match = decrypted.match(regex);
                            if (match && match[1]) {
                                return BigInt(match[1].replace(/_/g, ''));
                            }
                        }
                    } catch {
                        return 0n;
                    }
                }

                return 0n;
            } catch {
                return 0n;
            }
        };

        const fetchTokenData = async (
            programId: string,
            name: WalletTokenBalance['name'],
            fieldName: string,
            typeSuffix: string,
            mappingName: string
        ): Promise<WalletTokenBalance> => {
            let publicAmount = 0;
            let privateAmount = 0;

            try {
                const response = await fetch(`https://api.explorer.aleo.org/v1/testnet/program/${programId}/mapping/${mappingName}/${address}`);
                if (response.ok) {
                    const data = await response.json();
                    const value = String(data).replace(typeSuffix, '').replace(/"/g, '');
                    publicAmount = Number(value) / 1_000_000;
                }
            } catch {
                publicAmount = 0;
            }

            try {
                if (requestRecords) {
                    const records = await requestRecords(programId, false);
                    let total = 0n;

                    for (const record of records as any[]) {
                        if (record.spent) continue;
                        total += await extractAmount(record, fieldName, typeSuffix);
                    }

                    privateAmount = Number(total) / 1_000_000;
                }
            } catch (error) {
                handleWalletError(error);
            }

            return {
                name,
                public: publicAmount.toFixed(2),
                private: privateAmount.toFixed(2),
                publicAmount,
                privateAmount,
                loading: false,
            };
        };

        const fetchAllBalances = async () => {
            if (!address) {
                if (!cancelled) {
                    setBalances(INITIAL_BALANCES.map((balance) => ({ ...balance, loading: false })));
                }
                return;
            }

            if (!cancelled) {
                setBalances(INITIAL_BALANCES);
            }

            try {
                const results = await Promise.all(
                    TOKENS.map((token) =>
                        fetchTokenData(
                            token.programId,
                            token.name,
                            token.fieldName,
                            token.typeSuffix,
                            token.mappingName
                        )
                    )
                );

                if (!cancelled) {
                    setBalances(results);
                }
            } catch (error) {
                console.error('Failed to fetch wallet balances', error);
                if (!cancelled) {
                    setBalances(INITIAL_BALANCES.map((balance) => ({ ...balance, loading: false })));
                }
            }
        };

        fetchAllBalances();

        return () => {
            cancelled = true;
        };
    }, [address, requestRecords, decrypt, handleWalletError]);

    return { balances };
};
