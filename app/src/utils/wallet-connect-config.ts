import { IProviderMetadata } from '@walletconnect/modal-react-native';

export const providerMetadata: IProviderMetadata = {
    name: 'AleoZKPay',
    description: 'Privacy-first payments on Aleo',
    url: 'https://aleozkpay.com/',
    icons: ['https://aleozkpay.com/logo.png'],
    redirect: {
        native: 'aleozkpay://',
        universal: 'https://aleozkpay.com/'
    }
};

export const projectId = 'bd70a9e3a10715c4982c5593faede837';

export const sessionParams = {
    namespaces: {},
    optionalNamespaces: {
        aleo: {
            methods: [
                'aleo_requestTransaction',
                'aleo_getAccounts',
                'aleo_signMessage',
                'aleo_decrypt',
                'aleo_requestRecords',
                'aleo_getBalance'
            ],
            chains: ['aleo:1'],
            events: ['chainChanged', 'accountsChanged'],
            rpcMap: {}
        }
    }
};