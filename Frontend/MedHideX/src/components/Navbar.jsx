import { getCookie, eraseCookie } from "../api/api.js";

function Navbar() {
  const isLoggedIn = Boolean(getCookie("medhidex_token"));

  const logout = () => {
    eraseCookie("medhidex_token");
    window.location.href = "/";
  };

  return (
    <header className="nav-shell">
      <a className="brand" href={isLoggedIn ? "/dashboard" : "/"}>
        Med<span>Hide</span>X+
      </a>

      <nav className="nav-links">
        {isLoggedIn ? (
          <>
            <a href="/dashboard">Dashboard</a>
            <a href="/encrypt">Encrypt</a>
            <a href="/extract">Extract</a>
            <a href="/metrics">Metrics</a>
            <a href="/history">History</a>
            <button className="nav-button" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <a href="#overview">Overview</a>
            <a href="#workflow">Workflow</a>
            <a href="#stack">Stack</a>
            <a href="/login">Login</a>
            <a className="nav-cta" href="/register">Register</a>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;
