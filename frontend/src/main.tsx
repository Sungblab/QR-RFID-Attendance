import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initPWA } from './pwa.ts'

// PWA 초기화 (프로덕션 환경에서만)
if (import.meta.env.PROD) {
  initPWA();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
