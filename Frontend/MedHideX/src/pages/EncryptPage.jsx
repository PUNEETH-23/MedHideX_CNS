import { useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import FileUpload from "../components/FileUpload";
import Loader from "../components/Loader";
import { MedShell, GLOBAL_CSS } from "./Medshell";

/* ── tiny upload slot ── */
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

function EncryptPage() {
  const [documentFile, setDocumentFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      setLoading(true); setError(""); setResult(null);

      const encryptForm = new FormData();
      encryptForm.append("file", documentFile);
      const encryptResponse = await API.post("/encrypt", encryptForm);
      const payload = encryptResponse.data.payload;

      if (encryptResponse.data.error || !payload) {
        setError(encryptResponse.data.error || "Encryption failed");
        return;
      }

      const embedForm = new FormData();
      embedForm.append("image", imageFile);
      embedForm.append("payload", payload);
      const embedResponse = await API.post("/embed", embedForm);

      if (embedResponse.data.error) { setError(embedResponse.data.error); return; }
      setResult(embedResponse.data);
    } catch (e) {
      console.log(e);
      setError("Request failed. Login first and make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MedShell>
      <style>{GLOBAL_CSS}</style>
      <Navbar />

      <main style={{ padding: "48px 40px 80px", maxWidth: 680, margin: "0 auto" }}>
        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <div style={badge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Encrypt & Embed
          </div>
          <h1 className="med-h1">Secure <span>Payload</span> Embedding</h1>
          <p className="med-subhead">
            Encrypts your medical document with AES-256, then hides it inside a cover image using adaptive LSB steganography.
          </p>
        </div>

        <div className="med-card">
          {/* step 1 */}
          <StepLabel n={1} text="Upload Medical Document" />
          <UploadSlot
            label="Medical Document (PDF, DICOM, etc.)"
            onChange={e => setDocumentFile(e.target.files[0])}
            fileName={documentFile?.name}
          />

          {/* step 2 */}
          <StepLabel n={2} text="Upload Cover Image" />
          <UploadSlot
            label="Cover Image (PNG / BMP recommended)"
            accept="image/*"
            onChange={e => setImageFile(e.target.files[0])}
            fileName={imageFile?.name}
          />

          <div className="med-divider" />

          <button
            className="med-btn"
            onClick={handleSubmit}
            disabled={loading || !documentFile || !imageFile}
            style={{ opacity: (!documentFile || !imageFile) ? 0.5 : 1 }}
          >
            {loading
              ? <><span>Processing</span><span className="med-spinner" /></>
              : <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Encrypt &amp; Embed
                </>
            }
          </button>

          {error && <div className="med-error">{error}</div>}

          {result && (
            <div className="med-result">
              <p className="med-result-title">✓ Embedding Successful</p>
              <div className="med-result-row">
                <span>Embedded Bits</span>
                <span>{result.embedded_bits}</span>
              </div>
              <div className="med-result-row">
                <span>Embedding Time</span>
                <span>{result.embedding_time}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <a className="med-download" href={API.fileUrl(result.stego_image)} download>
                  ↓ Stego Image
                </a>
                <a className="med-download" href={API.fileUrl(result.mask_file)} download>
                  ↓ Mask File
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </MedShell>
  );
}

function StepLabel({ n, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <span style={{
        width: 24, height: 24, borderRadius: "50%",
        background: "rgba(0,212,224,0.15)", border: "1px solid rgba(0,212,224,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700, color: "#00d4e0", flexShrink: 0,
      }}>{n}</span>
      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5ab0c0" }}>{text}</span>
    </div>
  );
}

const badge = {
  display: "inline-flex", alignItems: "center", gap: 7,
  fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
  color: "#00d4e0", border: "1px solid rgba(0,212,224,0.25)",
  borderRadius: 100, padding: "5px 14px", marginBottom: 16,
  background: "rgba(0,212,224,0.06)",
};

export default EncryptPage;
