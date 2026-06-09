import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="app-shell">
      <div className="phone">
        <App />
      </div>
    </div>
  </React.StrictMode>,
)
