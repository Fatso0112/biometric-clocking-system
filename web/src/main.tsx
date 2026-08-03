import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { EmployeeProfileProvider } from './context/EmployeeProfileContext';
import { SessionProvider } from './context/SessionContext';
import { clearLegacyBrowserData } from './services/productionDataCleanup';
import './index.css';

clearLegacyBrowserData();

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionProvider>
        <EmployeeProfileProvider>
          <BrowserRouter>
            <ScrollToTop />
            <App />
          </BrowserRouter>
        </EmployeeProfileProvider>
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>,
);