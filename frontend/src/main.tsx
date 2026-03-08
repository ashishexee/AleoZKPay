import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AleoWalletProvider } from './shared/hooks/WalletProvider.tsx'
import { BurnerWalletProvider } from './shared/hooks/BurnerWalletProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AleoWalletProvider>
      <BurnerWalletProvider>
        <App />
      </BurnerWalletProvider>
    </AleoWalletProvider>
  </StrictMode>,
)
