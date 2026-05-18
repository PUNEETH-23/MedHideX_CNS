import { useRef, useState } from "react";
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
          ? <span style={{ color: "#00d4e0", fontWeight: 600 }}>{fileName}</span>
          : <>
              <span style={{ fontSize: 22, opacity: 0.4 }}>Upload</span>
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
  const [audioFile, setAudioFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const sampleRateRef = useRef(44100);

  const startRecording = async () => {
    try {
      setRecordError("");
      recordingChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      sampleRateRef.current = audioContext.sampleRate;
      processor.onaudioprocess = event => {
        recordingChunksRef.current.push(
          new Float32Array(event.inputBuffer.getChannelData(0))
        );
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      streamRef.current = stream;
      audioContextRef.current = audioContext;
      processorRef.current = processor;
      sourceRef.current = source;
      setRecording(true);
    } catch (err) {
      console.log(err);
      setRecordError("Microphone access failed.");
    }
  };

  const stopRecording = async () => {
    if (processorRef.current) processorRef.current.disconnect();
    if (sourceRef.current) sourceRef.current.disconnect();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close();
    }

    const wavBlob = encodeWav(recordingChunksRef.current, sampleRateRef.current);
    const recordedFile = new File([wavBlob], `recorded_audio_${Date.now()}.wav`, {
      type: "audio/wav",
    });

    setAudioFile(recordedFile);
    setRecording(false);
  };

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
      embedForm.append("audio", audioFile);
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
        <div style={{ marginBottom: 32 }}>
          <div style={badge}>Encrypt & Embed</div>
          <h1 className="med-h1">Secure <span>Payload</span> Embedding</h1>
          <p className="med-subhead">
            Encrypts your document, hides it inside a cover image, uses MP3 or recorded audio as the carrier, and returns one MP4 stego video.
          </p>
        </div>

        <div className="med-card">
          <StepLabel n={1} text="Upload Medical Document" />
          <UploadSlot
            label="Medical Document (PDF, DICOM, etc.)"
            onChange={e => setDocumentFile(e.target.files[0])}
            fileName={documentFile?.name}
          />

          <StepLabel n={2} text="Upload Cover Image" />
          <UploadSlot
            label="Cover Image"
            accept="image/*"
            onChange={e => setImageFile(e.target.files[0])}
            fileName={imageFile?.name}
          />

          <StepLabel n={3} text="Upload Carrier Audio" />
          <UploadSlot
            label="Carrier Audio (MP3 or WAV)"
            accept="audio/wav,audio/mpeg,.wav,.mp3"
            onChange={e => setAudioFile(e.target.files[0])}
            fileName={audioFile?.name}
          />
          <div style={{ display: "flex", gap: 10, marginTop: -8, marginBottom: 20 }}>
            <button
              type="button"
              className="med-download"
              onClick={recording ? stopRecording : startRecording}
              style={{ cursor: "pointer" }}
            >
              {recording ? "Stop Recording" : "Record Audio"}
            </button>
          </div>
          {recordError && <div className="med-error">{recordError}</div>}

          <div className="med-divider" />

          <button
            className="med-btn"
            onClick={handleSubmit}
            disabled={loading || !documentFile || !imageFile || !audioFile}
            style={{ opacity: (!documentFile || !imageFile || !audioFile) ? 0.5 : 1 }}
          >
            {loading
              ? <><span>Processing</span><span className="med-spinner" /></>
              : "Encrypt & Embed"
            }
          </button>

          {error && <div className="med-error">{error}</div>}

          {result && (
            <div className="med-result">
              <p className="med-result-title">Embedding Successful</p>
              <div className="med-result-row">
                <span>Embedded Bits</span>
                <span>{result.embedded_bits}</span>
              </div>
              <div className="med-result-row">
                <span>Audio Mask Bits</span>
                <span>{result.audio_mask_bits}</span>
              </div>
              <div className="med-result-row">
                <span>Video Duration</span>
                <span>{result.video_duration}s</span>
              </div>
              <div className="med-result-row">
                <span>Embedding Time</span>
                <span>{result.embedding_time}</span>
              </div>
              <div style={{ marginTop: 8 }}>
                <a className="med-download" href={API.fileUrl(result.stego_video)} download>
                  Download Stego Video
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

function encodeWav(chunks, sampleRate) {
  const sampleCount = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + sampleCount * 2);
  const view = new DataView(buffer);
  let offset = 0;

  writeString(view, offset, "RIFF"); offset += 4;
  view.setUint32(offset, 36 + sampleCount * 2, true); offset += 4;
  writeString(view, offset, "WAVE"); offset += 4;
  writeString(view, offset, "fmt "); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * 2, true); offset += 4;
  view.setUint16(offset, 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString(view, offset, "data"); offset += 4;
  view.setUint32(offset, sampleCount * 2, true); offset += 4;

  chunks.forEach(chunk => {
    chunk.forEach(sample => {
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
      offset += 2;
    });
  });

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view, offset, value) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i));
  }
}
