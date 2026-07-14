import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";

const features = [
  ["AES-256 Encryption", "Medical documents are encrypted before they ever enter the steganography pipeline."],
  ["DICOM & Hashing Verification", "Linking generated stego videos to the original DICOM's unique UID hash in MongoDB."],
  ["Adaptive LSB Embedding", "Payloads are hidden inside medical images using image-aware multi-bit embedding."],
  ["Authenticity & Ownership", "Decryption requires the original matching DICOM image to verify ownership and match hashes."],
];

const steps = [
  "Register and log in to unlock the secure workspace.",
  "Upload a medical document, a DICOM (.dcm) cover image, and carrier audio.",
  "Embed the payload; the server converts the DICOM to PNG and maps the stego video hash to the DICOM UID hash.",
  "Extract and decrypt the document by providing both the stego video and the matching original DICOM (.dcm) file.",
];

function LandingPage() {
  return (
    <MedShell>
      <style>{GLOBAL_CSS}{landingCSS}</style>
      <Navbar />

      <main className="landing">
        <section className="hero" id="overview">
          <p className="eyebrow">Privacy-preserving medical data sharing</p>
          <h1>MedHideX+ Secure Crypto-Steganography Platform</h1>
          <p className="hero-copy">
            Protect sensitive medical documents by combining encryption,
            hashing, and adaptive image steganography in one authenticated
            workflow.
          </p>
          <div className="hero-actions">
            <a className="med-btn" href="/register">Create Secure Account</a>
            <a className="secondary-btn" href="/login">Login</a>
          </div>
        </section>

        <section className="section-grid">
          {features.map(([title, text]) => (
            <article className="info-card" key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </section>

        <section className="split-section" id="workflow">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Sender and receiver workflows stay cleanly separated.</h2>
            <p>
              The sender encrypts and embeds. The receiver extracts, decrypts,
              verifies integrity, and downloads the recovered document.
            </p>
          </div>
          <div className="timeline">
            {steps.map((step, index) => (
              <div className="timeline-row" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="stack-section" id="stack">
          <p className="eyebrow">Technology stack</p>
          <div className="stack-list">
            <span>React</span>
            <span>FastAPI</span>
            <span>MongoDB</span>
            <span>pydicom</span>
            <span>AES-256</span>
            <span>RSA-2048</span>
            <span>OpenCV</span>
            <span>SHA-256</span>
          </div>
        </section>
      </main>
    </MedShell>
  );
}

const landingCSS = `
  .landing { max-width: 1120px; margin: 0 auto; padding: 72px 24px 96px; }
  .hero { max-width: 820px; padding: 64px 0 54px; }
  .eyebrow { color: #00d4e0; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 16px; }
  .hero h1 { color: #e8f6fa; font-family: 'DM Serif Display', serif; font-size: clamp(42px, 8vw, 76px); line-height: .98; font-weight: 400; max-width: 900px; }
  .hero-copy { color: #80aebb; font-size: 18px; line-height: 1.7; max-width: 650px; margin-top: 24px; }
  .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 34px; }
  .secondary-btn { border: 1px solid rgba(0,212,224,.28); border-radius: 10px; color: #d8eff5; display: inline-flex; padding: 13px 24px; }
  .section-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 22px; }
  .info-card { background: rgba(4,18,32,.72); border: 1px solid rgba(0,212,224,.12); border-radius: 18px; padding: 24px; backdrop-filter: blur(14px); }
  .info-card h3 { color: #e8f6fa; margin-bottom: 10px; font-size: 17px; }
  .info-card p, .split-section p { color: #6f9ead; line-height: 1.65; font-size: 14px; }
  .split-section { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; margin-top: 72px; align-items: start; }
  .split-section h2 { color: #e8f6fa; font-family: 'DM Serif Display', serif; font-size: 36px; font-weight: 400; margin-bottom: 14px; }
  .timeline { background: rgba(4,18,32,.72); border: 1px solid rgba(0,212,224,.12); border-radius: 18px; padding: 20px; }
  .timeline-row { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .timeline-row:last-child { border-bottom: 0; }
  .timeline-row span { width: 28px; height: 28px; border-radius: 999px; background: rgba(0,212,224,.12); color: #00d4e0; display: grid; place-items: center; font-weight: 700; flex: 0 0 auto; }
  .stack-section { margin-top: 70px; }
  .stack-list { display: flex; flex-wrap: wrap; gap: 12px; }
  .stack-list span { border: 1px solid rgba(0,212,224,.18); border-radius: 999px; color: #d8eff5; padding: 10px 16px; background: rgba(0,212,224,.05); }
  @media (max-width: 860px) { .section-grid, .split-section { grid-template-columns: 1fr; } }
`;

export default LandingPage;
