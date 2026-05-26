import Dashboard from "./pages/DashBoard";
import EncryptPage from "./pages/EncryptPage";
import ExtractPage from "./pages/ExtractPage";
import HistoryPage from "./pages/HistoryPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import MetricsPage from "./pages/MetricsPage";
import RegisterPage from "./pages/RegisterPage";

import { getCookie } from "./api/api";

function ProtectedPage({ children }) {
  const token = getCookie("medhidex_token");

  if (!token) {
    window.location.href = "/login";
    return null;
  }

  return children;
}

function App() {
  const path = window.location.pathname;

  const pages = {
    "/": <LandingPage />,
    "/login": <LoginPage />,
    "/register": <RegisterPage />,
    "/dashboard": <ProtectedPage><Dashboard /></ProtectedPage>,
    "/encrypt": <ProtectedPage><EncryptPage /></ProtectedPage>,
    "/extract": <ProtectedPage><ExtractPage /></ProtectedPage>,
    "/metrics": <ProtectedPage><MetricsPage /></ProtectedPage>,
    "/history": <ProtectedPage><HistoryPage /></ProtectedPage>,
  };

  return (
    pages[path] || <LandingPage />
  );
}

export default App;
