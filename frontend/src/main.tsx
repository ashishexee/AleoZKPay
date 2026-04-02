import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AleoWalletProvider } from './shared/hooks/Wallet/WalletProvider.tsx'
import { BurnerWalletProvider } from './shared/hooks/BurnerWalletProvider.tsx'
import { CardWalletProvider } from './shared/hooks/CardWalletProvider.tsx'

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
