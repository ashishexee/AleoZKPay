import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AleoWalletProvider } from './shared/hooks/wallet/WalletProvider.tsx'
import { BurnerWalletProvider } from './shared/hooks/wallet/BurnerWalletProvider.tsx'
import { CardWalletProvider } from './shared/hooks/wallet/CardWalletProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AleoWalletProvider>
      <BurnerWalletProvider>
        <CardWalletProvider>
          <App />
        </CardWalletProvider>
      </BurnerWalletProvider>
    </AleoWalletProvider>
  </StrictMode>,
)
