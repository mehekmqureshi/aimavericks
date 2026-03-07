import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DashboardLayout, ProtectedRoute } from './components';
import {
  Dashboard,
  CreateDPP,
  ProductsList,
  QRManagement,
  Auditor,
  Settings,
  Login,
  ConsumerLanding,
  ConsumerProduct,
  DigitalPassport
} from './pages';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Consumer Routes */}
          <Route path="/" element={<ConsumerLanding />} />
          <Route path="/product/:serialId" element={<ConsumerProduct />} />
          <Route path="/passport/:serialId" element={<DigitalPassport />} />

          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Manufacturer Routes with Dashboard Layout */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-dpp"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CreateDPP />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProductsList />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/qr-management"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <QRManagement />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/auditor"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Auditor />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
