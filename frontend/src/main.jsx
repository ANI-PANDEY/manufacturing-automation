import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { LanguageProvider } from './context/LanguageContext'
import { AuthProvider } from './context/AuthContext'
import { IndustryProvider } from './context/IndustryContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <IndustryProvider>
          <App />
        </IndustryProvider>
      </LanguageProvider>
    </AuthProvider>
  </React.StrictMode>,
)
