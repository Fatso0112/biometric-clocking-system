import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';
import { EmployeeProfileProvider } from './context/EmployeeProfileContext';
import { SessionProvider } from './context/SessionContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionProvider>
        <EmployeeProfileProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <ScrollToTop />
            <App />
          </BrowserRouter>
        </EmployeeProfileProvider>
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>,
);
