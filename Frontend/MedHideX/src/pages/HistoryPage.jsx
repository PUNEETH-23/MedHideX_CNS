import { useEffect, useState } from "react";

import API from "../api/api";
import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";

function HistoryPage() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await API.get("/reports");
        if (response.data.detail || response.data.error) {
          setError(response.data.detail || response.data.error);
          return;
        }
        setHistory(response.data);
      } catch (requestError) {
        console.log(requestError);
        setError("Unable to load activity history.");
      }
    }

    loadHistory();
  }, []);

  const reports = history?.reports || [];
  const files = history?.encrypted_files || [];
  const auditLogs = history?.audit_logs || [];

  return (
    <MedShell>
      <style>{GLOBAL_CSS}{historyCSS}</style>
      <Navbar />

      <main className="history-page">
        <div className="history-header">
          <p className="eyebrow">User-specific records</p>
          <h1 className="med-h1">Activity <span>History</span></h1>
          <p className="med-subhead">
            Review previous encryptions, embeddings, decryptions, metrics, generated files, and timestamps for your account.
          </p>
        </div>

        {error && <div className="med-error">{error}</div>}

        <section className="history-summary">
          <div className="summary-card">
            <strong>{reports.length}</strong>
            <span>Workflow Events</span>
          </div>
          <div className="summary-card">
            <strong>{files.length}</strong>
            <span>Encrypted Files</span>
          </div>
          <div className="summary-card">
            <strong>{auditLogs.length}</strong>
            <span>Audit Logs</span>
          </div>
          <div className="summary-card">
            <strong>{history?.username || "User"}</strong>
            <span>Account</span>
          </div>
        </section>

        <section className="history-list">
          {reports.length === 0 && (
            <div className="empty-state">No activity yet. Start with Encrypt & Embed.</div>
          )}

          {reports.map((item) => (
            <article className="history-card" key={item._id}>
              <div>
                <h3>{formatType(item.type)}</h3>
                <p>{formatDate(item.created_at)}</p>
              </div>
              <div className="history-meta">
                {item.original_filename && <span>File: {item.original_filename}</span>}
                {item.uploaded_image && <span>Image: {item.uploaded_image}</span>}
                {item.stego_image && <span>Stego: {shortName(item.stego_image)}</span>}
                {item.mask_file && <span>Mask: {shortName(item.mask_file)}</span>}
                {item.output_file && <span>Output: {shortName(item.output_file)}</span>}
                {item.file_size && <span>Size: {item.file_size} bytes</span>}
                {item.embedded_bits && <span>Bits: {item.embedded_bits}</span>}
                {item.PSNR && <span>PSNR: {Number(item.PSNR).toFixed(2)}</span>}
                {item.SSIM && <span>SSIM: {Number(item.SSIM).toFixed(4)}</span>}
              </div>
            </article>
          ))}
        </section>

        <section className="history-list audit-list">
          <h2>Detailed Audit Logs</h2>
          {auditLogs.length === 0 && (
            <div className="empty-state">No detailed audit logs yet.</div>
          )}

          {auditLogs.map((item) => (
            <article className="history-card" key={item._id}>
              <div>
                <h3>{formatType(item.type)}</h3>
                <p>{formatDate(item.created_at)}</p>
              </div>
              <div className="history-meta">
                {item.status && <span>Status: {item.status}</span>}
                {item.reason && <span>Reason: {item.reason}</span>}
                {item.error && <span>Error: {item.error}</span>}
                {item.filename && <span>File: {shortName(item.filename)}</span>}
                {item.original_filename && <span>File: {item.original_filename}</span>}
                {item.image_filename && <span>Image: {item.image_filename}</span>}
                {item.audio_filename && <span>Audio: {item.audio_filename}</span>}
                {item.video_filename && <span>Video: {item.video_filename}</span>}
                {item.stego_video && <span>Video: {shortName(item.stego_video)}</span>}
                {item.output_file && <span>Output: {shortName(item.output_file)}</span>}
                {item.file_size && <span>Size: {item.file_size} bytes</span>}
                {item.payload_size && <span>Payload: {item.payload_size} chars</span>}
                {item.embedded_bits && <span>Bits: {item.embedded_bits}</span>}
                {item.audio_mask_bits && <span>Audio Bits: {item.audio_mask_bits}</span>}
                {item.integrity_verified !== undefined && <span>Integrity: {String(item.integrity_verified)}</span>}
              </div>
            </article>
          ))}
        </section>
      </main>
    </MedShell>
  );
}

function formatType(type) {
  return String(type || "activity")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) {
    return "Timestamp unavailable";
  }

  return new Date(value).toLocaleString();
}

function shortName(value) {
  return String(value).split("/").pop();
}

const historyCSS = `
  .history-page { max-width: 1040px; margin: 0 auto; padding: 52px 24px 90px; }
  .history-header { margin-bottom: 28px; }
  .eyebrow { color: #00d4e0; font-size: 12px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; margin-bottom: 12px; }
  .history-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .summary-card { background: rgba(4,18,32,.72); border: 1px solid rgba(0,212,224,.12); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 4px; }
  .summary-card strong { color: #e8f6fa; font-size: 24px; }
  .summary-card span { color: #6f9ead; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
  .history-list { display: grid; gap: 14px; }
  .audit-list { margin-top: 28px; }
  .audit-list h2 { color: #e8f6fa; font-size: 20px; margin-bottom: 2px; }
  .history-card { background: rgba(4,18,32,.76); border: 1px solid rgba(0,212,224,.12); border-radius: 16px; padding: 18px 20px; display: grid; grid-template-columns: 220px 1fr; gap: 18px; }
  .history-card h3 { color: #e8f6fa; margin-bottom: 6px; }
  .history-card p { color: #578798; font-size: 13px; }
  .history-meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: start; }
  .history-meta span { background: rgba(0,212,224,.06); border: 1px solid rgba(0,212,224,.12); border-radius: 999px; color: #9bc8d3; font-size: 12px; padding: 7px 10px; }
  .empty-state { color: #6f9ead; border: 1px dashed rgba(0,212,224,.18); border-radius: 16px; padding: 28px; text-align: center; }
  @media (max-width: 900px) { .history-summary { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 760px) { .history-summary, .history-card { grid-template-columns: 1fr; } }
`;

export default HistoryPage;
