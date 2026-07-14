import Dashboard from "./pages/DashBoard";
import EncryptPage from "./pages/EncryptPage";
import ExtractPage from "./pages/ExtractPage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MetricsPage from "./pages/MetricsPage";
import RegisterPage from "./pages/RegisterPage";

import { getCookie } from "./api/api";

function ProtectedPage({ children, isAuthenticated }) {
  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return children;
}

function App() {
  const path = window.location.pathname;
  const isAuthenticated = Boolean(getCookie("medhidex_token"));

  const pages = {
    "/": <LandingPage />,
    "/login": <LoginPage />,
    "/register": <RegisterPage />,
    "/dashboard": <ProtectedPage isAuthenticated={isAuthenticated}><Dashboard /></ProtectedPage>,
    "/encrypt": <ProtectedPage isAuthenticated={isAuthenticated}><EncryptPage /></ProtectedPage>,
    "/extract": <ProtectedPage isAuthenticated={isAuthenticated}><ExtractPage /></ProtectedPage>,
    "/metrics": <ProtectedPage isAuthenticated={isAuthenticated}><MetricsPage /></ProtectedPage>,
    "/history": <ProtectedPage isAuthenticated={isAuthenticated}><HistoryPage /></ProtectedPage>,
  };

  return (
    pages[path] || <LandingPage />
  );
}

const spinnerContainer = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  background: "#030c14",
  color: "#e2f4f8",
  fontFamily: "'DM Sans', sans-serif",
};

const spinnerStyle = {
  width: 50,
  height: 50,
  border: "3px solid rgba(0, 212, 224, 0.1)",
  borderTop: "3px solid #00d4e0",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const loadingTextStyle = {
  marginTop: 18,
  fontSize: 14,
  letterSpacing: "0.08em",
  color: "#5ab0c0",
};

export default App;
