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
          ? <span style={{ color: "#00d4e0", fontWeight: 600 }}>📄 {fileName}</span>
          : <>
              <span style={{ fontSize: 22, opacity: 0.4 }}>⬆</span>
              <br />
              Drop file here or <span style={{ color: "#00d4e0" }}>browse</span>
            </>
        }
      </label>
    </div>
  );
}

function StepLabel({ n, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "#34d399", flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#4ab898" }}>{text}</span>
    </div>
  );
}

function ExtractPage() {
  const [imageFile, setImageFile] = useState(null);
  const [maskFile, setMaskFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleExtract = async () => {
    try {
      setLoading(true); setError(""); setResult(null);

      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("mask_file", maskFile);
      const extractResponse = await API.post("/extract", formData);
      const payload = extractResponse.data.payload;

      if (extractResponse.data.error || !payload) {
        setError(extractResponse.data.error || "Extraction failed"); return;
      }

      const decryptForm = new FormData();
      decryptForm.append("payload", payload);
      const decryptResponse = await API.post("/decrypt", decryptForm);

      if (decryptResponse.data.error) { setError(decryptResponse.data.error); return; }
      setResult(decryptResponse.data);
    } catch (e) {
      console.log(e);
      setError("Request failed. Login first and make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const verified = result?.integrity_verified;

  return (
    <MedShell>
      <style>{GLOBAL_CSS}</style>
      <Navbar />

      <main style={{ padding: "48px 40px 80px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={badge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 3v12m0 0-4-4m4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="1"/>
            </svg>
            Extract & Decrypt
          </div>
          <h1 className="med-h1">Payload <span style={{ color: "#34d399" }}>Recovery</span></h1>
          <p className="med-subhead">
            Extracts the hidden payload from a stego image using the mask file, then decrypts it back to the original medical document.
          </p>
        </div>

        <div className="med-card">
          <StepLabel n={1} text="Upload Stego Image" />
          <UploadSlot
            label="Stego Image (PNG)"
            accept="image/*"
            onChange={e => setImageFile(e.target.files[0])}
            fileName={imageFile?.name}
          />

          <StepLabel n={2} text="Upload Mask File" />
          <UploadSlot
            label="Mask File"
            onChange={e => setMaskFile(e.target.files[0])}
            fileName={maskFile?.name}
          />

          <div className="med-divider" />

          <button
            className="med-btn"
            onClick={handleExtract}
            disabled={loading || !imageFile || !maskFile}
            style={{
              opacity: (!imageFile || !maskFile) ? 0.5 : 1,
              background: "linear-gradient(135deg, #065f46, #059669)",
            }}
          >
            {loading
              ? <><span>Extracting</span><span className="med-spinner" style={{ borderTopColor: "#34d399" }} /></>
              : <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 3v12m0 0-4-4m4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="1"/>
                  </svg>
                  Extract &amp; Decrypt
                </>
            }
          </button>

          {error && <div className="med-error">{error}</div>}

          {result && (
            <div className="med-result" style={{ borderColor: "rgba(52,211,153,0.2)", background: "rgba(52,211,153,0.04)" }}>
              <p className="med-result-title" style={{ color: "#34d399" }}>✓ Recovery Successful</p>
              <div className="med-result-row">
                <span>Integrity Verified</span>
                <span style={{ color: verified ? "#34d399" : "#f08080" }}>
                  {verified ? "✓ Verified" : "✗ Failed"}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <a
                  className="med-download"
                  style={{ color: "#34d399", borderColor: "rgba(52,211,153,0.35)", background: "rgba(52,211,153,0.06)" }}
                  href={API.fileUrl(result.output_file)}
                  download
                >
                  ↓ Download Recovered Document
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </MedShell>
  );
}

const badge = {
  display: "inline-flex", alignItems: "center", gap: 7,
  fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
  color: "#34d399", border: "1px solid rgba(52,211,153,0.25)",
  borderRadius: 100, padding: "5px 14px", marginBottom: 16,
  background: "rgba(52,211,153,0.06)",
};

export default ExtractPage;
