import { useEffect, useState } from "react";
import API from "../api/api";
import Navbar from "../components/Navbar";
import { MedShell, GLOBAL_CSS } from "./Medshell";

function HistoryPage() {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("timeline"); // "timeline" | "files"
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copyStatus, setCopyStatus] = useState({});

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

  const handleCopyHash = (id, hash) => {
    navigator.clipboard.writeText(hash);
    setCopyStatus(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopyStatus(prev => ({ ...prev, [id]: false }));
    }, 1500);
  };

  const reports = history?.reports || [];
  const files = history?.encrypted_files || [];

  // Filter and search logic for Timeline
  const filteredReports = reports.filter((item) => {
    const matchesFilter = activeFilter === "all" || item.type === activeFilter;
    const matchesSearch = searchQuery === "" || 
      formatType(item.type).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.original_filename && item.original_filename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.counterpart_name && item.counterpart_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.counterpart_email && item.counterpart_email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  // Filter and search logic for Secured Files
  const filteredFiles = files.filter((item) => {
    return searchQuery === "" || 
      (item.original_filename && item.original_filename.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.counterpart_name && item.counterpart_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.counterpart_email && item.counterpart_email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.sha256 && item.sha256.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  return (
    <MedShell>
      <style>{GLOBAL_CSS}{historyCSS}</style>
      <Navbar />

      <main className="history-page">
        {/* Header */}
        <div className="history-header">
          <div className="badge-eyebrow">Audit & Verification</div>
          <h1 className="med-h1">Activity <span>History</span></h1>
          <p className="med-subhead">
            Access secure audit reports of previous cryptographic transactions, stego embeds, decryptions, and structural quality metrics.
          </p>
        </div>

        {error && <div className="med-error" style={{ marginBottom: 24 }}>{error}</div>}

        {/* Overview Summaries */}
        <section className="history-summary">
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00d4e0" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            </div>
            <div>
              <strong>{reports.length}</strong>
              <span>Workflow Events</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <strong>{files.length}</strong>
              <span>Secured Records</span>
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <strong style={{ fontSize: "18px", wordBreak: "break-all" }}>{history?.username || "Authorized User"}</strong>
              <span>{history?.role === "doctor" ? "Doctor Account" : "Patient Account"}</span>
            </div>
          </div>
        </section>

        {/* Tab Controls & Search */}
        <div className="history-toolbar">
          <div className="tab-buttons">
            <button 
              className={`tab-btn ${activeTab === "timeline" ? "active" : ""}`}
              onClick={() => { setActiveTab("timeline"); setSearchQuery(""); }}
            >
              Timeline Events
            </button>
            <button 
              className={`tab-btn ${activeTab === "files" ? "active" : ""}`}
              onClick={() => { setActiveTab("files"); setSearchQuery(""); }}
            >
              Secured Files
            </button>
          </div>

          <div className="search-bar-container">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input 
              type="text" 
              className="med-search-input" 
              placeholder={activeTab === "timeline" ? "Search timeline events..." : "Search by file name or SHA-256..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Pills for Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="filter-pills-row">
            {[
              { value: "all", label: "All Events" },
              { value: "encryption", label: "Encryptions" },
              { value: "embedding", label: "Stego Embeds" },
              { value: "decryption", label: "Decryptions" },
              { value: "extraction", label: "Stego Extracts" },
              { value: "metrics", label: "Quality Metrics" }
            ].map(f => (
              <button 
                key={f.value} 
                className={`filter-pill ${activeFilter === f.value ? "active" : ""}`}
                onClick={() => setActiveFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Tabs */}
        {activeTab === "timeline" ? (
          <section className="timeline-container">
            {filteredReports.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>No timeline activities found matching your criteria.</p>
              </div>
            ) : (
              <div className="timeline-list">
                {filteredReports.map((item) => (
                  <div className="timeline-item-row" key={item._id}>
                    <div className="timeline-badge-column">
                      <div className={`timeline-badge-icon ${item.type}`}>
                        {getEventIcon(item.type)}
                      </div>
                      <div className="timeline-line"></div>
                    </div>
                    
                    <div className="timeline-card-column">
                      <div className="med-card timeline-card">
                        <div className="timeline-card-header">
                          <div>
                            <span className={`event-type-label ${item.type}`}>{formatType(item.type)}</span>
                            <h3 className="timeline-card-title">
                              {item.original_filename ? item.original_filename : (item.uploaded_image ? item.uploaded_image : "System Operation")}
                            </h3>
                          </div>
                          <span className="timeline-card-time">{formatDate(item.created_at)}</span>
                        </div>

                        {/* Event details based on type */}
                        <div className="timeline-card-body">
                          {/* Counterpart profile */}
                          {item.counterpart_name && (
                            <div className="detail-meta-row counterpart">
                              <span className="meta-tag counterpart">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 5 }}>
                                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                                </svg>
                                {history?.role === "doctor" ? "Recipient Patient" : "Sender Doctor"}: <strong>{item.counterpart_name}</strong> ({item.counterpart_email})
                              </span>
                            </div>
                          )}

                          <div className="detail-grid">
                            {item.file_size && (
                              <div className="grid-item">
                                <span className="grid-label">File Size</span>
                                <span className="grid-val">{formatBytes(item.file_size)}</span>
                              </div>
                            )}
                            {item.embedded_bits && (
                              <div className="grid-item">
                                <span className="grid-label">Payload Bits</span>
                                <span className="grid-val">{item.embedded_bits} bits</span>
                              </div>
                            )}
                            {item.embedding_time && (
                              <div className="grid-item">
                                <span className="grid-label">Embedding Speed</span>
                                <span className="grid-val">{Number(item.embedding_time).toFixed(3)}s</span>
                              </div>
                            )}
                            {item.extraction_time && (
                              <div className="grid-item">
                                <span className="grid-label">Extraction Speed</span>
                                <span className="grid-val">{Number(item.extraction_time).toFixed(3)}s</span>
                              </div>
                            )}
                            {item.video_duration && (
                              <div className="grid-item">
                                <span className="grid-label">Video Duration</span>
                                <span className="grid-val">{Number(item.video_duration).toFixed(1)}s</span>
                              </div>
                            )}
                          </div>

                          {/* Quality Metrics parameters */}
                          {(item.PSNR || item.SSIM || item.Audio_PSNR || item.Audio_SNR) && (
                            <div className="metrics-panel">
                              <h4 className="panel-title">Quality Verification Scores</h4>
                              <div className="panel-grid">
                                {item.PSNR && (
                                  <div className="panel-item">
                                    <span className="panel-label">Image PSNR</span>
                                    <span className={`panel-val ${item.PSNR > 38 ? "good" : "warning"}`}>
                                      {Number(item.PSNR).toFixed(2)} dB
                                    </span>
                                  </div>
                                )}
                                {item.SSIM && (
                                  <div className="panel-item">
                                    <span className="panel-label">Image SSIM</span>
                                    <span className={`panel-val ${item.SSIM > 0.98 ? "good" : "warning"}`}>
                                      {Number(item.SSIM).toFixed(4)}
                                    </span>
                                  </div>
                                )}
                                {item.Audio_PSNR && (
                                  <div className="panel-item">
                                    <span className="panel-label">Audio PSNR</span>
                                    <span className="panel-val good">{Number(item.Audio_PSNR).toFixed(2)} dB</span>
                                  </div>
                                )}
                                {item.Audio_SNR && (
                                  <div className="panel-item">
                                    <span className="panel-label">Audio SNR</span>
                                    <span className="panel-val good">{Number(item.Audio_SNR).toFixed(2)} dB</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Download artifacts if available */}
                          {(item.stego_image || item.mask_file || item.stego_audio || item.stego_video) && (
                            <div className="artifacts-downloads">
                              <h4 className="panel-title">Stego Artifacts</h4>
                              <div className="download-buttons-group">
                                {item.stego_image && (
                                  <a className="med-download btn-small" href={API.fileUrl(item.stego_image)} download>
                                    ↓ Image
                                  </a>
                                )}
                                {item.mask_file && (
                                  <a className="med-download btn-small" href={API.fileUrl(item.mask_file)} download>
                                    ↓ Mask
                                  </a>
                                )}
                                {item.stego_audio && (
                                  <a className="med-download btn-small" href={API.fileUrl(item.stego_audio)} download>
                                    ↓ Audio
                                  </a>
                                )}
                                {item.stego_video && (
                                  <a className="med-download btn-small" href={API.fileUrl(item.stego_video)} download>
                                    ↓ Video
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="files-container">
            {filteredFiles.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: 12 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>
                </svg>
                <p>No secured file records found.</p>
              </div>
            ) : (
              <div className="files-grid">
                {filteredFiles.map((file) => (
                  <div className="med-card file-card" key={file._id}>
                    <div className="file-card-header">
                      <div className="file-icon-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00d4e0" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      </div>
                      <div className="file-header-info">
                        <h3 className="file-title">{file.original_filename}</h3>
                        <span className="file-date">{formatDate(file.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="file-card-body">
                      {file.counterpart_name && (
                        <div className="file-meta-item">
                          <span>{history?.role === "doctor" ? "Shared With" : "Shared By"}</span>
                          <span>{file.counterpart_name}</span>
                        </div>
                      )}
                      
                      {file.sha256 && (
                        <div className="file-hash-block">
                          <span className="hash-title">Document SHA-256 Checksum</span>
                          <div className="hash-value-row">
                            <code>{file.sha256}</code>
                            <button 
                              className="copy-hash-btn"
                              title="Copy SHA-256 Checksum"
                              onClick={() => handleCopyHash(file._id, file.sha256)}
                            >
                              {copyStatus[file._id] ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </MedShell>
  );
}

// Helpers
function getEventIcon(type) {
  switch (type) {
    case "encryption":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      );
    case "embedding":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
        </svg>
      );
    case "decryption":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      );
    case "extraction":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      );
    case "metrics":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M18 20V10M12 20V4M6 20v-6"/>
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      );
  }
}

function formatType(type) {
  return String(type || "activity")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return "Timestamp unavailable";
  return new Date(value).toLocaleString();
}

function formatBytes(bytes, decimals = 2) {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

const historyCSS = `
  .history-page { max-width: 960px; margin: 0 auto; padding: 48px 24px 80px; }
  .history-header { margin-bottom: 36px; text-align: left; }
  .badge-eyebrow {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    color: #00d4e0; border: 1px solid rgba(0,212,224,0.25);
    border-radius: 100px; padding: 5px 14px; margin-bottom: 16px;
    background: rgba(0,212,224,0.06); font-weight: 600;
  }
  
  /* Summaries */
  .history-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
  .summary-card { 
    background: rgba(4,18,32,0.6); 
    border: 1px solid rgba(0,212,224,0.12); 
    border-radius: 16px; 
    padding: 24px; 
    display: flex; 
    align-items: center; 
    gap: 20px;
    backdrop-filter: blur(12px);
    transition: transform 0.2s, border-color 0.2s;
  }
  .summary-card:hover {
    transform: translateY(-2px);
    border-color: rgba(0,212,224,0.24);
  }
  .summary-icon {
    width: 44px; height: 44px; border-radius: 12px;
    background: rgba(0,212,224,0.06);
    border: 1px solid rgba(0,212,224,0.15);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .summary-card strong { color: #e8f6fa; font-size: 26px; font-weight: 700; line-height: 1.1; display: block; }
  .summary-card span { color: #507d8c; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; display: block; margin-top: 2px; }
  
  /* Toolbar */
  .history-toolbar { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    gap: 20px; 
    margin-bottom: 24px;
    border-bottom: 1px solid rgba(0,212,224,0.08);
    padding-bottom: 16px;
  }
  .tab-buttons { display: flex; gap: 8px; }
  .tab-btn {
    background: transparent; border: 1px solid transparent;
    color: #4e7d8c; font-size: 14px; font-weight: 600;
    padding: 8px 16px; border-radius: 8px; cursor: pointer;
    transition: all 0.2s;
  }
  .tab-btn:hover { color: #00d4e0; background: rgba(0,212,224,0.03); }
  .tab-btn.active { 
    color: #fff; 
    background: rgba(0,212,224,0.08); 
    border-color: rgba(0,212,224,0.22);
  }
  
  .search-bar-container { position: relative; width: 320px; }
  .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #3a6a7a; pointer-events: none; }
  .med-search-input {
    width: 100%; background: rgba(0,212,224,0.03);
    border: 1px solid rgba(0,212,224,0.14); border-radius: 8px;
    color: #d8eff5; font-size: 14px; padding: 9px 12px 9px 36px; outline: none;
    transition: all 0.2s;
  }
  .med-search-input:focus { border-color: rgba(0,212,224,0.45); background: rgba(0,212,224,0.05); }

  /* Filters */
  .filter-pills-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .filter-pill {
    background: rgba(0,212,224,0.02);
    border: 1px solid rgba(0,212,224,0.1);
    color: #558797; font-size: 12px; font-weight: 600;
    padding: 6px 12px; border-radius: 100px; cursor: pointer;
    transition: all 0.2s;
  }
  .filter-pill:hover { color: #00d4e0; border-color: rgba(0,212,224,0.22); }
  .filter-pill.active {
    background: rgba(0,212,224,0.08);
    border-color: rgba(0,212,224,0.3);
    color: #00d4e0;
  }

  /* Timeline */
  .timeline-container { position: relative; padding-left: 10px; }
  .timeline-list { display: flex; flex-direction: column; }
  .timeline-item-row { display: grid; grid-template-columns: 44px 1fr; gap: 16px; position: relative; }
  .timeline-badge-column { display: flex; flex-direction: column; align-items: center; }
  .timeline-badge-icon {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(0,212,224,0.06); border: 1px solid rgba(0,212,224,0.2);
    display: flex; align-items: center; justify-content: center;
    color: #00d4e0; z-index: 2; flex-shrink: 0;
  }
  .timeline-badge-icon.encryption { color: #38bdf8; background: rgba(56,189,248,0.06); border-color: rgba(56,189,248,0.25); }
  .timeline-badge-icon.embedding { color: #00d4e0; background: rgba(0,212,224,0.06); border-color: rgba(0,212,224,0.25); }
  .timeline-badge-icon.decryption { color: #34d399; background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.25); }
  .timeline-badge-icon.extraction { color: #fb7185; background: rgba(251,113,133,0.06); border-color: rgba(251,113,133,0.25); }
  .timeline-badge-icon.metrics { color: #a78bfa; background: rgba(167,139,250,0.06); border-color: rgba(167,139,250,0.25); }

  .timeline-line { width: 1.5px; flex-grow: 1; background: rgba(0,212,224,0.08); margin: 6px 0; }
  .timeline-item-row:last-child .timeline-line { display: none; }
  
  .timeline-card-column { padding-bottom: 24px; }
  .timeline-card { padding: 22px 24px !important; transition: border-color 0.2s; }
  .timeline-card:hover { border-color: rgba(0,212,224,0.2); }
  
  .timeline-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 16px; }
  .event-type-label { 
    display: inline-block; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; 
    text-transform: uppercase; padding: 2px 8px; border-radius: 4px; margin-bottom: 6px;
    background: rgba(0,212,224,0.06); color: #00d4e0; border: 1px solid rgba(0,212,224,0.12);
  }
  .event-type-label.encryption { color: #38bdf8; background: rgba(56,189,248,0.06); border-color: rgba(56,189,248,0.15); }
  .event-type-label.embedding { color: #00d4e0; background: rgba(0,212,224,0.06); border-color: rgba(0,212,224,0.15); }
  .event-type-label.decryption { color: #34d399; background: rgba(52,211,153,0.06); border-color: rgba(52,211,153,0.15); }
  .event-type-label.extraction { color: #fb7185; background: rgba(251,113,133,0.06); border-color: rgba(251,113,133,0.15); }
  .event-type-label.metrics { color: #a78bfa; background: rgba(167,139,250,0.06); border-color: rgba(167,139,250,0.15); }

  .timeline-card-title { font-size: 16px; color: #e8f6fa; font-weight: 600; }
  .timeline-card-time { color: #3a6a7a; font-size: 12px; }

  /* Inner Details */
  .timeline-card-body { display: flex; flex-direction: column; gap: 14px; }
  .detail-meta-row { display: flex; flex-wrap: wrap; gap: 8px; }
  .meta-tag {
    font-size: 12px; border-radius: 6px; padding: 4px 10px; display: inline-flex; align-items: center;
  }
  .meta-tag.counterpart {
    background: rgba(52,211,153,0.04); border: 1px solid rgba(52,211,153,0.15); color: #84dfb5;
  }

  .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
  .grid-item { background: rgba(0,212,224,0.02); border: 1px dashed rgba(0,212,224,0.08); padding: 8px 12px; border-radius: 8px; }
  .grid-label { display: block; font-size: 10px; color: #507d8c; text-transform: uppercase; font-weight: 600; margin-bottom: 2px; }
  .grid-val { display: block; font-size: 13px; color: #b1d5df; font-weight: 500; }

  /* Panels */
  .metrics-panel, .artifacts-downloads { 
    background: rgba(0,212,224,0.015); border: 1px solid rgba(0,212,224,0.08); 
    border-radius: 10px; padding: 12px 16px; 
  }
  .panel-title { font-size: 11px; color: #507d8c; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 10px; }
  .panel-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .panel-item { display: flex; justify-content: space-between; align-items: center; font-size: 13px; border-bottom: 1px solid rgba(0,212,224,0.04); padding-bottom: 6px; }
  .panel-item:last-child { border-bottom: none; padding-bottom: 0; }
  .panel-label { color: #7cb3c0; }
  .panel-val { font-weight: 600; color: #b1d5df; }
  .panel-val.good { color: #34d399; }
  .panel-val.warning { color: #fb7185; }

  .download-buttons-group { display: flex; flex-wrap: wrap; gap: 8px; }
  .btn-small { margin-top: 0 !important; margin-right: 0 !important; padding: 6px 12px !important; font-size: 12px !important; }

  /* Secured Files */
  .files-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
  .file-card { padding: 24px !important; display: flex; flex-direction: column; justify-content: space-between; height: 100%; transition: border-color 0.2s; }
  .file-card:hover { border-color: rgba(0,212,224,0.22); }
  .file-card-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
  .file-icon-badge {
    width: 40px; height: 40px; border-radius: 8px;
    background: rgba(0,212,224,0.06); border: 1px solid rgba(0,212,224,0.15);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .file-header-info { display: flex; flex-direction: column; gap: 2px; }
  .file-title { font-size: 15px; color: #e8f6fa; font-weight: 600; word-break: break-all; }
  .file-date { color: #3a6a7a; font-size: 11px; }
  
  .file-card-body { display: flex; flex-direction: column; gap: 12px; }
  .file-meta-item { display: flex; justify-content: space-between; font-size: 13px; border-bottom: 1px solid rgba(0,212,224,0.04); padding-bottom: 6px; }
  .file-meta-item span:first-child { color: #507d8c; }
  .file-meta-item span:last-child { color: #b1d5df; font-weight: 500; }

  .file-hash-block { background: rgba(0,212,224,0.02); border: 1px solid rgba(0,212,224,0.08); border-radius: 8px; padding: 10px; }
  .hash-title { display: block; font-size: 9px; color: #507d8c; text-transform: uppercase; font-weight: 700; margin-bottom: 4px; }
  .hash-value-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .hash-value-row code { font-family: monospace; font-size: 11px; color: #00d4e0; word-break: break-all; text-align: left; }
  .copy-hash-btn { 
    background: transparent; border: none; color: #3a6a7a; cursor: pointer; display: flex; align-items: center; justify-content: center;
    padding: 4px; border-radius: 4px; transition: color 0.15s, background 0.15s;
  }
  .copy-hash-btn:hover { color: #00d4e0; background: rgba(0,212,224,0.05); }

  .empty-state {
    grid-column: span 2; color: #4e7d8c; border: 1.5px dashed rgba(0,212,224,0.12);
    border-radius: 16px; padding: 48px; text-align: center; display: flex; flex-direction: column; align-items: center;
  }

  @media (max-width: 820px) {
    .history-summary, .files-grid { grid-template-columns: 1fr; }
    .history-toolbar { flex-direction: column; align-items: flex-start; }
    .search-bar-container { width: 100%; }
    .empty-state { grid-column: span 1; }
  }
`;

export default HistoryPage;
