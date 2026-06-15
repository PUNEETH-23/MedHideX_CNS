import { useState } from "react";
import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";
import { setCookie } from "../api/api";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true); setMessage(""); setError("");
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setError(result.detail || result.error || "Invalid username or password.");
        return;
      }

      if (result.access_token) {
        setCookie("medhidex_token", result.access_token, 3600);
        setMessage("Login Successful");
        window.location.href = "/dashboard";
        return;
      }

      setError("Login failed. Please try again.");
    } catch (e) {
      setError("Unable to login. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MedShell>
      <style>{GLOBAL_CSS}{localCSS}</style>
      <Navbar />

      <main style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* logo mark */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={logoRing}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00d4e0" strokeWidth="1.8">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                <circle cx="12" cy="16" r="1.5" fill="#00d4e0" stroke="none"/>
              </svg>
            </div>
            <h1 style={logoText}>Med<span style={{ color: "#00d4e0" }}>Hide</span>X<span style={{ color: "#34d399" }}>+</span></h1>
            <p style={{ color: "#3a6a7a", fontSize: 13, marginTop: 4 }}>Secure Medical Data Portal</p>
          </div>

          <div className="med-card" style={{ padding: "36px 32px" }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, color: "#e8f6fa",
              fontFamily: "'DM Serif Display', serif" }}>
              Sign In
            </h2>

            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Username</label>
              <input
                className="med-input"
                style={{ marginBottom: 18 }}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
              />

              <label style={labelStyle}>Password</label>
              <input
                className="med-input"
                style={{ marginBottom: 24 }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />

              <button
                className="med-btn"
                type="submit"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={loading}
              >
                {loading
                  ? <><span>Authenticating</span><span className="med-spinner" /></>
                  : "Sign In →"
                }
              </button>
            </form>

            {message && <div className="med-success" style={{ marginTop: 16 }}>✓ {message}</div>}
            {error && <div className="med-error">{error}</div>}

            <div className="med-divider" style={{ marginTop: 24, marginBottom: 16 }} />
            <p style={{ textAlign: "center", fontSize: 13, color: "#3a6a7a" }}>
              No account?{" "}
              <a href="/register" style={{ color: "#00d4e0", fontWeight: 600 }}>Create one</a>
            </p>
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "#1e3a4a", marginTop: 24, letterSpacing: "0.05em" }}>
            🔒 End-to-end encrypted · Zero-knowledge architecture
          </p>
        </div>
      </main>
    </MedShell>
  );
}

const labelStyle = {
  display: "block", marginBottom: 7,
  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "#5ab0c0",
};

const logoRing = {
  width: 72, height: 72, borderRadius: "50%",
  border: "1.5px solid rgba(0,212,224,0.25)",
  background: "rgba(0,212,224,0.06)",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 16px",
  boxShadow: "0 0 30px rgba(0,212,224,0.1)",
};

const logoText = {
  fontSize: 32, fontWeight: 800, letterSpacing: "-1px",
  fontFamily: "'DM Serif Display', serif",
  color: "#e8f6fa",
};

const localCSS = `
  .med-btn[disabled] { opacity: 0.6; cursor: not-allowed; transform: none !important; }
`;

export default LoginPage;
