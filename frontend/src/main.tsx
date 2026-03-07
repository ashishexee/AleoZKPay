import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AleoWalletProvider } from './hooks/WalletProvider.tsx'
import { BurnerWalletProvider } from './hooks/BurnerWalletProvider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AleoWalletProvider>
      <BurnerWalletProvider>
        <App />
      </BurnerWalletProvider>
    </AleoWalletProvider>
  </StrictMode>,
)
