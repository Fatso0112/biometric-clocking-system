import { Navigate, Route, Routes } from 'react-router-dom';
import ClockInOut from './pages/ClockInOut';
import ConfirmationScreen from './pages/ConfirmationScreen';
import Dashboard from './pages/Dashboard';
import FaceScan from './pages/FaceScan';
import FingerprintScan from './pages/FingerprintScan';
import Login from './pages/Login';
import NotRegistered from './pages/NotRegistered';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/clock" element={<ClockInOut />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/scan/fingerprint" element={<FingerprintScan />} />
      <Route path="/scan/face" element={<FaceScan />} />
      <Route path="/clock-in-confirmation" element={<ConfirmationScreen variant="clockIn" />} />
      <Route path="/clock-out-confirmation" element={<ConfirmationScreen variant="clockOut" />} />
      <Route path="/not-registered" element={<NotRegistered />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
