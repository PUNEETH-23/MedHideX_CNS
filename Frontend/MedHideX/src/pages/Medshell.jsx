// MedShell.jsx — shared layout wrapper with 3D canvas background
// Import this in every page: <MedShell>...</MedShell>

import { useEffect, useRef } from "react";

/* ─── Canvas ─────────────────────────────────────────────────── */
export function MedCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let id, W, H, tick = 0;
    const pts = [];

    const resize = () => {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    };

    class Pt {
      constructor() { this.init(true); }
      init(rand = false) {
        this.x = Math.random() * W;
        this.y = rand ? Math.random() * H : H + 8;
        this.z = Math.random() * 0.7 + 0.3;
        this.r = this.z * 2;
        this.vx = (Math.random() - 0.5) * 0.35 * this.z;
        this.vy = -(Math.random() * 0.5 + 0.1) * this.z;
        this.a = (Math.random() * 0.4 + 0.1) * this.z;
        const h = Math.random() > 0.5 ? 186 : 168;
        this.col = `hsla(${h},85%,62%,${this.a})`;
      }
      tick() { this.x += this.vx; this.y += this.vy; if (this.y < -8) this.init(); }
      draw() {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fillStyle = this.col; ctx.fill();
      }
    }

    for (let i = 0; i < 90; i++) pts.push(new Pt());

    function helix(cx, dir) {
      const s = H / 20, amp = 55;
      for (let i = 0; i < 20; i++) {
        const t = (tick * 0.003 * dir + i / 20) * Math.PI * 2;
        const y = i * s;
        const x1 = cx + Math.sin(t) * amp;
        const x2 = cx + Math.sin(t + Math.PI) * amp;
        const a = 0.12 + 0.1 * Math.sin(t);
        ctx.beginPath(); ctx.arc(x1, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,224,${a + 0.15})`; ctx.fill();
        ctx.beginPath(); ctx.arc(x2, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,224,${a + 0.15})`; ctx.fill();
        if (i % 3 === 0) {
          ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
          ctx.strokeStyle = `rgba(0,212,224,${a * 0.6})`; ctx.lineWidth = 1; ctx.stroke();
        }
      }
    }

    function lines() {
      for (let i = 0; i < pts.length; i++)
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 90) {
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(0,212,224,${0.06 * (1 - d / 90)})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
    }

    function frame() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#030c14"); g.addColorStop(1, "#010810");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      helix(W * 0.08, 1); helix(W * 0.92, -1);
      lines(); pts.forEach(p => { p.tick(); p.draw(); });
      tick++; id = requestAnimationFrame(frame);
    }

    resize(); frame();
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    return () => { cancelAnimationFrame(id); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={ref} style={{
      position: "fixed", inset: 0, width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none",
    }} />
  );
}

/* ─── Shell ───────────────────────────────────────────────────── */
export function MedShell({ children }) {
  return (
    <div style={shellStyle}>
      <style>{GLOBAL_CSS}</style>
      <MedCanvas />
      <div style={gridStyle} />
      <div style={{ position: "relative", zIndex: 2 }}>{children}</div>
    </div>
  );
}

const shellStyle = {
  minHeight: "100vh",
  background: "#030c14",
  color: "#d8eff5",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  position: "relative",
  overflow: "hidden",
};

const gridStyle = {
  position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
  backgroundImage:
    "linear-gradient(rgba(0,212,224,0.025) 1px, transparent 1px)," +
    "linear-gradient(90deg, rgba(0,212,224,0.025) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

export const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=DM+Serif+Display&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  a { text-decoration: none; color: inherit; }

  /* ── shared form elements ── */
  .med-input {
    display: block; width: 100%;
    background: rgba(0,212,224,0.04);
    border: 1px solid rgba(0,212,224,0.18);
    border-radius: 10px;
    color: #d8eff5;
    font-family: inherit; font-size: 15px;
    padding: 13px 16px;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }
  .med-input:focus {
    border-color: rgba(0,212,224,0.5);
    box-shadow: 0 0 0 3px rgba(0,212,224,0.08);
  }
  .med-input::placeholder { color: #3a6a7a; }

  /* ── primary button ── */
  .med-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #006d7a, #009aa8);
    border: none; border-radius: 10px;
    color: #fff; font-family: inherit;
    font-size: 15px; font-weight: 600;
    padding: 13px 28px; cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
    letter-spacing: 0.02em;
  }
  .med-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0,180,200,0.25);
  }
  .med-btn:active { transform: translateY(0); }

  /* ── card ── */
  .med-card {
    background: rgba(4,18,32,0.75);
    border: 1px solid rgba(0,212,224,0.12);
    border-radius: 20px;
    padding: 36px 32px;
    backdrop-filter: blur(18px);
  }

  /* ── file upload slot ── */
  .med-upload-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #5ab0c0;
  }
  .med-upload-box {
    border: 1.5px dashed rgba(0,212,224,0.22);
    border-radius: 12px;
    padding: 22px 20px;
    text-align: center;
    color: #3a6a7a;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
    margin-bottom: 22px;
    position: relative;
    overflow: hidden;
  }
  .med-upload-box:hover {
    border-color: rgba(0,212,224,0.45);
    background: rgba(0,212,224,0.04);
  }
  .med-upload-box input[type=file] {
    position: absolute; inset: 0; opacity: 0; cursor: pointer;
  }

  /* ── result / success block ── */
  .med-result {
    margin-top: 28px;
    padding: 24px;
    border-radius: 14px;
    background: rgba(0,212,224,0.04);
    border: 1px solid rgba(0,212,224,0.15);
  }
  .med-result-title {
    font-family: 'DM Serif Display', serif;
    font-size: 20px; color: #00d4e0; margin-bottom: 14px;
  }
  .med-result-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(0,212,224,0.07);
    font-size: 14px; color: #7fb5c5;
  }
  .med-result-row span:last-child { color: #d8eff5; font-weight: 500; }

  /* ── download button ── */
  .med-download {
    display: inline-flex; align-items: center; gap: 8px;
    margin-top: 16px; margin-right: 12px;
    padding: 10px 20px;
    border: 1px solid rgba(0,212,224,0.3);
    border-radius: 8px;
    font-size: 13px; font-weight: 600; color: #00d4e0;
    background: rgba(0,212,224,0.06);
    transition: background 0.2s, border-color 0.2s;
    cursor: pointer;
  }
  .med-download:hover {
    background: rgba(0,212,224,0.12);
    border-color: rgba(0,212,224,0.5);
  }

  /* ── error / success messages ── */
  .med-error {
    margin-top: 16px; padding: 12px 16px;
    border-radius: 10px; font-size: 14px;
    background: rgba(240,80,80,0.08);
    border: 1px solid rgba(240,80,80,0.25);
    color: #f08080;
  }
  .med-success {
    margin-top: 16px; padding: 12px 16px;
    border-radius: 10px; font-size: 14px;
    background: rgba(0,212,224,0.07);
    border: 1px solid rgba(0,212,224,0.25);
    color: #00d4e0;
  }

  /* ── section heading ── */
  .med-h1 {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(32px, 5vw, 48px);
    font-weight: 400;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
    color: #e8f6fa;
  }
  .med-h1 span { color: #00d4e0; }
  .med-subhead {
    color: #4a8090; font-size: 14px; margin-bottom: 36px;
  }

  /* ── divider ── */
  .med-divider {
    height: 1px; background: rgba(0,212,224,0.1); margin: 24px 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
  .med-spinner {
    width: 22px; height: 22px;
    border: 2px solid rgba(0,212,224,0.2);
    border-top-color: #00d4e0;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    display: inline-block;
    vertical-align: middle;
    margin-left: 10px;
  }
`;