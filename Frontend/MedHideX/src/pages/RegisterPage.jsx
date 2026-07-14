import { useState } from "react";
import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [reEnterPassword, setReEnterPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(""); setError("");
    if (password !== reEnterPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || "https://localhost:8000"}/register_profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          password_confirm: reEnterPassword,
        }),
      });

      const responseData = await response.json();
      if (!response.ok) {
        setError(responseData.error || responseData.detail || "Registration failed.");
        return;
      }

      setMessage("Registration Successful! You can now log in.");
      setUsername(""); setPassword(""); setReEnterPassword("");
    } catch (e) {
      setError("Unable to register. Check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  /* password strength */
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
      : password.length < 10 ? 2
        : 3;
  const strengthLabel = ["", "Weak", "Moderate", "Strong"][strength];
  const strengthColor = ["", "#f08080", "#f0c040", "#34d399"][strength];

  return (
    <MedShell>
      <style>{GLOBAL_CSS}{localCSS}</style>
      <Navbar />

      <main style={{ minHeight: "calc(100vh - 64px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 440 }}>
          {/* logo */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={logoRing}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h1 style={logoText}>Create Account</h1>
            <p style={{ color: "#3a6a7a", fontSize: 13, marginTop: 4 }}>MedHideX+ Secure Portal</p>
          </div>

          <div className="med-card" style={{ padding: "36px 32px" }}>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Username</label>
              <input
                className="med-input"
                style={{ marginBottom: 18 }}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Choose a username"
                required
              />

              <label style={labelStyle}>Password</label>
              <input
                className="med-input"
                style={{ marginBottom: 8 }}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {/* strength bar */}
              {password.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength ? strengthColor : "rgba(255,255,255,0.06)",
                        transition: "background 0.3s",
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strengthColor }}>{strengthLabel}</p>
                </div>
              )}

              <label style={labelStyle}>Re-enter Password</label>
              <input
                className="med-input"
                style={{ marginBottom: 8 }}
                type="password"
                value={reEnterPassword}
                onChange={e => setReEnterPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {reEnterPassword.length > 0 && (
                <p style={{
                  fontSize: 11, marginBottom: 18,
                  color: password === reEnterPassword ? "#34d399" : "#f08080"
                }}>
                  {password === reEnterPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
                </p>
              )}

              <button
                className="med-btn"
                type="submit"
                style={{
                  width: "100%", justifyContent: "center",
                  background: "linear-gradient(135deg, #065f46, #059669)"
                }}
                disabled={loading}
              >
                {loading
                  ? <><span>Creating Account</span><span className="med-spinner" style={{ borderTopColor: "#34d399" }} /></>
                  : "Create Account →"
                }
              </button>
            </form>

            {message && <div className="med-success" style={{ marginTop: 16 }}>✓ {message}</div>}
            {error && <div className="med-error">{error}</div>}

            <div className="med-divider" style={{ marginTop: 24, marginBottom: 16 }} />
            <p style={{ textAlign: "center", fontSize: 13, color: "#3a6a7a" }}>
              Already have an account?{" "}
              <a href="/login" style={{ color: "#34d399", fontWeight: 600 }}>Sign in</a>
            </p>
          </div>
        </div>
      </main>
    </MedShell>
  );
}

const labelStyle = {
  display: "block", marginBottom: 7,
  fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
  textTransform: "uppercase", color: "#4ab898",
};

const logoRing = {
  width: 72, height: 72, borderRadius: "50%",
  border: "1.5px solid rgba(52,211,153,0.25)",
  background: "rgba(52,211,153,0.06)",
  display: "flex", alignItems: "center", justifyContent: "center",
  margin: "0 auto 16px",
  boxShadow: "0 0 30px rgba(52,211,153,0.1)",
};

const logoText = {
  fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px",
  fontFamily: "'DM Serif Display', serif",
  color: "#e8f6fa",
};

const localCSS = `
  .med-btn[disabled] { opacity: 0.6; cursor: not-allowed; transform: none !important; }
`;

export default RegisterPage;
