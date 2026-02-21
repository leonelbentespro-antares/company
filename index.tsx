
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { TenantProvider } from './services/tenantContext.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Critical: Could not find root element with id 'root'. Check index.html.");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        {/* TenantProvider garante que cada usuário logado acessa apenas seu próprio banco de dados */}
        <TenantProvider>
          <App />
        </TenantProvider>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Error rendering React application:", error);
  }
}
