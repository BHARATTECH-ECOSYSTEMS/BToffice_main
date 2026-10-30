import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { UIContextProvider } from './context/UiContext.jsx'
import { AuthContextProvider } from './context/AuthContext.jsx'
createRoot(document.getElementById('root')).render(
  <AuthContextProvider>
  <UIContextProvider>
  <StrictMode>
    <App />
  </StrictMode></UIContextProvider></AuthContextProvider>,
)
