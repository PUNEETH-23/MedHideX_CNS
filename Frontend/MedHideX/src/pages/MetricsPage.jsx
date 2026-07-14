import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";

function UploadSlot({ label, accept, onChange, fileName }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <span className="med-upload-label">{label}</span>
      <label className="med-upload-box">
        <input type="file" accept={accept} onChange={onChange} />
        {fileName
          ? <span style={{ color: "#818cf8", fontWeight: 600 }}>📄 {fileName}</span>
          : <>
              <span style={{ fontSize: 22, opacity: 0.4 }}>⬆</span>
              <br />
              Drop file here or <span style={{ color: "#818cf8" }}>browse</span>
            </>
        }
      </label>
    </div>
  );
}

function formatMetric(value) {
  if (value == null) return "--";
  if (value === "Infinity" || value === "-Infinity") return value;
  return Number(value).toFixed(2);
}

/* ── Gauge card ── */
function GaugeCard({ title, value, unit, min, max, color, description }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  const angle = -135 + pct * 2.7; // -135° to +135°

  const cx = 80, cy = 80, r = 58;
  const startAngle = -225 * (Math.PI / 180);
  const endAngle = (angle) * (Math.PI / 180);

  // Arc path helper
  function arc(from, to) {
    const x1 = cx + r * Math.cos(from);
    const y1 = cy + r * Math.sin(from);
    const x2 = cx + r * Math.cos(to);
    const y2 = cy + r * Math.sin(to);
    const large = to - from > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const trackPath = arc(-225 * (Math.PI / 180), 45 * (Math.PI / 180));
  const fillPath  = value != null ? arc(-225 * (Math.PI / 180), endAngle) : null;

  return (
    <div style={gaugeCard}>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4a7a9a", marginBottom: 12 }}>{title}</p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <svg width="160" height="100" viewBox="0 0 160 100">
          {/* track */}
          <path d={trackPath} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round" />
          {/* fill */}
          {fillPath && (
            <path d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
          )}
          {/* centre value */}
          <text x="80" y="68" textAnchor="middle" fill="#e8f6fa" fontSize="22" fontWeight="700" fontFamily="DM Sans, sans-serif">
            {formatMetric(value)}
          </text>
          <text x="80" y="82" textAnchor="middle" fill="#3a6a7a" fontSize="10" fontFamily="DM Sans, sans-serif">
            {unit}
          </text>
        </svg>
      </div>

      <p style={{ fontSize: 12, color: "#3a6a7a", lineHeight: 1.5 }}>{description}</p>

      {value != null && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2,
              boxShadow: `0 0 6px ${color}` }} />
          </div>
          <span style={{ fontSize: 11, color: "#4a7a9a" }}>{pct.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

function MetricsPage() {
  const [originalImage, setOriginalImage] = useState(null);
  const [stegoImage, setStegoImage] = useState(null);
  const [originalAudio, setOriginalAudio] = useState(null);
  const [stegoAudio, setStegoAudio] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canCalculate = (originalImage && stegoImage) || (originalAudio && stegoAudio);

  const handleMetrics = async () => {
    try {
      setLoading(true); setError("");
      const formData = new FormData();
      if (originalImage && stegoImage) {
        formData.append("original_image", originalImage);
        formData.append("stego_image", stegoImage);
      }
      if (originalAudio && stegoAudio) {
        formData.append("original_audio", originalAudio);
        formData.append("stego_audio", stegoAudio);
      }
      const response = await API.post("/metrics", formData);
      if (response.data.error) { setError(response.data.error); return; }
      setMetrics(response.data.metrics);
    } catch (e) {
      setError("Request failed. Login first and make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MedShell>
      <style>{GLOBAL_CSS}</style>
      <Navbar />

      <main style={{ padding: "48px 40px 80px", maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={badge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Metrics Analysis
          </div>
          <h1 className="med-h1">Image Quality <span style={{ color: "#818cf8" }}>Metrics</span></h1>
          <p className="med-subhead">
            Compute image and audio comparison metrics to evaluate steganographic imperceptibility.
          </p>
        </div>

        <div className="med-card" style={{ marginBottom: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <UploadSlot
              label="Original Image"
              accept="image/*"
              onChange={e => setOriginalImage(e.target.files[0])}
              fileName={originalImage?.name}
            />
            <UploadSlot
              label="Stego Image"
              accept="image/*"
              onChange={e => setStegoImage(e.target.files[0])}
              fileName={stegoImage?.name}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <UploadSlot
              label="Original Audio (MP3 or WAV)"
              accept="audio/wav,audio/mpeg,.wav,.mp3"
              onChange={e => setOriginalAudio(e.target.files[0])}
              fileName={originalAudio?.name}
            />
            <UploadSlot
              label="Stego Audio (MP3 or WAV)"
              accept="audio/wav,audio/mpeg,.wav,.mp3"
              onChange={e => setStegoAudio(e.target.files[0])}
              fileName={stegoAudio?.name}
            />
          </div>

          <div className="med-divider" />

          <button
            className="med-btn"
            onClick={handleMetrics}
            disabled={loading || !canCalculate}
            style={{
              opacity: !canCalculate ? 0.5 : 1,
              background: "linear-gradient(135deg, #3730a3, #6366f1)",
            }}
          >
            {loading
              ? <><span>Computing</span><span className="med-spinner" style={{ borderTopColor: "#818cf8" }} /></>
              : <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                  Calculate Metrics
                </>
            }
          </button>

          {error && <div className="med-error">{error}</div>}
        </div>

        {/* gauge cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <GaugeCard
            title="PSNR"
            value={metrics?.PSNR}
            unit="dB"
            min={20} max={60}
            color="#818cf8"
            description="Peak Signal-to-Noise Ratio. Values above 40 dB indicate excellent imperceptibility."
          />
          <GaugeCard
            title="SSIM"
            value={metrics?.SSIM}
            unit="index"
            min={0} max={1}
            color="#00d4e0"
            description="Structural Similarity Index. Values close to 1.0 mean the images are perceptually identical."
          />
          <GaugeCard
            title="Audio SNR"
            value={metrics?.Audio_SNR}
            unit="dB"
            min={20} max={100}
            color="#34d399"
            description="Signal-to-noise ratio between original and stego audio. Higher values indicate lower audible distortion."
          />
          <GaugeCard
            title="Audio Correlation"
            value={metrics?.Audio_Correlation}
            unit="index"
            min={0} max={1}
            color="#f59e0b"
            description="Waveform similarity between original and stego audio. Values close to 1.0 indicate very similar audio."
          />
        </div>

        {metrics?.PSNR && metrics?.SSIM && (
          <div style={{ marginTop: 20, padding: "16px 20px", borderRadius: 12,
            background: "rgba(129,140,248,0.05)", border: "1px solid rgba(129,140,248,0.15)",
            fontSize: 13, color: "#5a6a7a", lineHeight: 1.6 }}>
            <strong style={{ color: "#818cf8" }}>Interpretation: </strong>
            {metrics.PSNR > 40 && metrics.SSIM > 0.95
              ? "Excellent steganographic quality. The stego image is visually indistinguishable from the original."
              : metrics.PSNR > 30
              ? "Good quality. Minor imperceptible distortion may be present."
              : "Lower quality detected. Consider reducing the payload size or using a larger cover image."}
          </div>
        )}
      </main>
    </MedShell>
  );
}

const gaugeCard = {
  background: "rgba(4,18,32,0.6)",
  border: "1px solid rgba(0,212,224,0.1)",
  borderRadius: 16,
  padding: "24px 20px",
  backdropFilter: "blur(12px)",
};

const badge = {
  display: "inline-flex", alignItems: "center", gap: 7,
  fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
  color: "#818cf8", border: "1px solid rgba(129,140,248,0.25)",
  borderRadius: 100, padding: "5px 14px", marginBottom: 16,
  background: "rgba(129,140,248,0.06)",
};

export default MetricsPage;
