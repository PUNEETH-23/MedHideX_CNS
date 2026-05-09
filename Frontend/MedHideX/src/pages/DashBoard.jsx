import { useEffect, useRef } from "react";
import Navbar from "../components/Navbar";

/* ─── 3-D Particle Canvas ─────────────────────────────────────── */
function MedCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let W, H;

    // ── particles
    const PARTICLE_COUNT = 120;
    const particles = [];

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    class Particle {
      constructor() { this.reset(true); }
      reset(initial = false) {
        this.x = Math.random() * W;
        this.y = initial ? Math.random() * H : H + 10;
        this.z = Math.random() * 0.8 + 0.2;   // depth 0.2-1.0
        this.r = this.z * 2.5;
        this.vx = (Math.random() - 0.5) * 0.4 * this.z;
        this.vy = -Math.random() * 0.6 * this.z - 0.1;
        this.alpha = Math.random() * 0.5 + 0.1;
        // colour: cyan / teal / white medical palette
        const hue = Math.random() > 0.5 ? 185 : 195;
        this.color = `hsla(${hue},90%,65%,${this.alpha * this.z})`;
      }
      step() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.y < -10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }

    // ── DNA helix nodes
    const DNA_NODES = 24;
    let tick = 0;

    function drawHelix(cx, speed) {
      ctx.save();
      const amp = 70;
      const step = H / DNA_NODES;
      for (let i = 0; i < DNA_NODES; i++) {
        const t = (tick * speed + i / DNA_NODES) * Math.PI * 2;
        const y = i * step;
        const x1 = cx + Math.sin(t) * amp;
        const x2 = cx + Math.sin(t + Math.PI) * amp;
        const alpha = 0.15 + 0.15 * Math.sin(t);
        // strand dots
        ctx.beginPath();
        ctx.arc(x1, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,210,220,${alpha + 0.2})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x2, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56,210,220,${alpha + 0.2})`;
        ctx.fill();
        // rung
        if (i % 3 === 0) {
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.strokeStyle = `rgba(56,210,220,${alpha * 0.7})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(56,210,220,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function loop() {
      ctx.clearRect(0, 0, W, H);

      // deep gradient background
      const grad = ctx.createLinearGradient(0, 0, W * 0.5, H);
      grad.addColorStop(0, "#030c14");
      grad.addColorStop(1, "#010810");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // helices
      drawHelix(W * 0.12, 0.003);
      drawHelix(W * 0.88, -0.003);

      // connections
      drawConnections();

      // particles
      particles.forEach(p => { p.step(); p.draw(); });

      // subtle cross / plus symbols (medical)
      ctx.save();
      ctx.strokeStyle = "rgba(56,210,220,0.04)";
      ctx.lineWidth = 1;
      const crossPos = [
        [W * 0.2, H * 0.3], [W * 0.7, H * 0.15],
        [W * 0.5, H * 0.75], [W * 0.85, H * 0.55],
      ];
      crossPos.forEach(([cx, cy]) => {
        const s = 18;
        ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx, cy + s); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - s, cy); ctx.lineTo(cx + s, cy); ctx.stroke();
      });
      ctx.restore();

      tick += 0.5;
      animId = requestAnimationFrame(loop);
    }

    resize();
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle());
    loop();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    return () => { cancelAnimationFrame(animId); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        zIndex: 0, pointerEvents: "none",
      }}
    />
  );
}

/* ─── Dashboard ────────────────────────────────────────────────── */
const CARDS = [
  {
    href: "/encrypt",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        <circle cx="12" cy="16" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    title: "Encrypt & Embed",
    desc: "Encrypt medical files and hide them securely inside cover images using adaptive steganography.",
    accent: "#00d4e0",
  },
  {
    href: "/extract",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
        <path d="M12 3v12m0 0-4-4m4 4 4-4" />
        <rect x="3" y="17" width="18" height="4" rx="1" />
      </svg>
    ),
    title: "Extract & Decrypt",
    desc: "Recover hidden payloads from stego images and decrypt them back to the original medical document.",
    accent: "#34d399",
  },
  {
    href: "/metrics",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 36, height: 36 }}>
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Metrics Dashboard",
    desc: "Analyze image quality with PSNR and SSIM metrics to evaluate steganographic invisibility.",
    accent: "#818cf8",
  },
];

function Dashboard() {
  return (
    <div style={styles.root}>
      <style>{CSS}</style>
      <MedCanvas />

      {/* grid overlay */}
      <div style={styles.gridOverlay} />

      <div style={{ position: "relative", zIndex: 2 }}>
        <Navbar />

        <main style={styles.main}>
          {/* hero */}
          <div style={styles.heroSection}>
            <div style={styles.badge}>
              <span style={styles.badgeDot} />
              HIPAA-Grade Secure System
            </div>

            <h1 style={styles.h1}>
              Med<span style={{ color: "#00d4e0" }}>Hide</span>X
              <span style={styles.plus}>+</span>
            </h1>

            <p style={styles.subtitle}>
              Dual-Channel Adaptive Crypto-Steganography Framework
              <br />
              for Privacy-Preserving Medical Data Sharing
            </p>

            {/* vitals bar */}
            <div style={styles.vitals}>
              {[
                { label: "Encryption", val: "AES-256", color: "#00d4e0" },
                { label: "Steganography", val: "LSB Adaptive", color: "#34d399" },
                { label: "Integrity", val: "SHA-256", color: "#818cf8" },
              ].map(v => (
                <div key={v.label} style={styles.vitalItem}>
                  <span style={{ ...styles.vitalVal, color: v.color }}>{v.val}</span>
                  <span style={styles.vitalLabel}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* cards */}
          <div style={styles.cardGrid}>
            {CARDS.map(card => (
              <a key={card.href} href={card.href} style={styles.cardLink} className="med-card">
                <div className="med-card-glow" style={{ "--accent": card.accent }} />
                <div style={{ ...styles.cardIcon, color: card.accent }}>
                  {card.icon}
                </div>
                <h2 style={{ ...styles.cardTitle, color: card.accent }}>{card.title}</h2>
                <p style={styles.cardDesc}>{card.desc}</p>
                <div style={{ ...styles.cardArrow, color: card.accent }}>
                  Access Module →
                </div>
              </a>
            ))}
          </div>

          {/* bottom status */}
          <div style={styles.statusBar}>
            <span style={styles.statusDot} />
            All systems operational &nbsp;·&nbsp; End-to-end encrypted &nbsp;·&nbsp; Zero-knowledge architecture
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: "100vh",
    background: "#030c14",
    color: "#e2f4f8",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(0,212,224,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,224,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  main: {
    padding: "60px 40px 80px",
    maxWidth: 1100, margin: "0 auto",
  },
  heroSection: {
    marginBottom: 60,
    textAlign: "center",
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 8,
    fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase",
    color: "#00d4e0", border: "1px solid rgba(0,212,224,0.3)",
    borderRadius: 100, padding: "6px 16px", marginBottom: 28,
    background: "rgba(0,212,224,0.06)",
  },
  badgeDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "#00d4e0", display: "inline-block",
    boxShadow: "0 0 6px #00d4e0",
    animation: "pulse 2s infinite",
  },
  h1: {
    fontSize: "clamp(52px, 8vw, 80px)",
    fontWeight: 800, margin: "0 0 16px",
    letterSpacing: "-2px",
    fontFamily: "'DM Serif Display', Georgia, serif",
    textShadow: "0 0 60px rgba(0,212,224,0.15)",
  },
  plus: {
    color: "#34d399", fontWeight: 900,
  },
  subtitle: {
    color: "#7fb5c5", fontSize: 16, lineHeight: 1.7,
    maxWidth: 540, margin: "0 auto 40px",
  },
  vitals: {
    display: "flex", justifyContent: "center", gap: 0,
    border: "1px solid rgba(0,212,224,0.15)",
    borderRadius: 14, overflow: "hidden",
    maxWidth: 540, margin: "0 auto",
    background: "rgba(0,10,20,0.6)",
    backdropFilter: "blur(12px)",
  },
  vitalItem: {
    flex: 1, padding: "16px 20px", textAlign: "center",
    borderRight: "1px solid rgba(0,212,224,0.1)",
    display: "flex", flexDirection: "column", gap: 4,
  },
  vitalVal: {
    fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
  },
  vitalLabel: {
    fontSize: 10, color: "#4a7a8a", textTransform: "uppercase", letterSpacing: "0.1em",
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 24,
    marginBottom: 48,
  },
  cardLink: {
    textDecoration: "none",
    display: "block",
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
    padding: "36px 32px",
    background: "rgba(8,24,40,0.7)",
    border: "1px solid rgba(0,212,224,0.1)",
    backdropFilter: "blur(16px)",
    transition: "transform 0.3s, border-color 0.3s, box-shadow 0.3s",
  },
  cardIcon: {
    marginBottom: 20,
    opacity: 0.9,
  },
  cardTitle: {
    fontSize: 22, fontWeight: 700,
    marginBottom: 12, letterSpacing: "-0.3px",
    fontFamily: "'DM Serif Display', Georgia, serif",
  },
  cardDesc: {
    color: "#5a8a9f", fontSize: 14, lineHeight: 1.65, marginBottom: 24,
  },
  cardArrow: {
    fontSize: 13, fontWeight: 600, letterSpacing: "0.03em",
  },
  statusBar: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, color: "#3a6070", fontSize: 12, letterSpacing: "0.05em",
  },
  statusDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#34d399",
    boxShadow: "0 0 6px #34d399",
  },
};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap');

  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
  }

  .med-card {
    transition: transform 0.3s cubic-bezier(.22,.68,0,1.2), border-color 0.3s, box-shadow 0.3s !important;
  }
  .med-card:hover {
    transform: translateY(-6px) scale(1.01) !important;
    border-color: rgba(0,212,224,0.35) !important;
    box-shadow: 0 24px 60px rgba(0,0,0,0.4), 0 0 40px rgba(0,212,224,0.07) !important;
  }
  .med-card-glow {
    position: absolute;
    top: -40%; left: -20%;
    width: 60%; height: 60%;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.4s;
  }
  .med-card:hover .med-card-glow { opacity: 1; }

  * { box-sizing: border-box; }
  a { text-decoration: none !important; }
`;

export default Dashboard;