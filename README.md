# MedHideX+

MedHideX+ is a privacy-preserving medical data sharing system that combines cryptography, image steganography, audio steganography, video generation, integrity verification, authentication, and user-specific activity tracking.

The sender encrypts a medical document, builds a secure payload, compresses it with Huffman coding, and embeds it inside a cover image using 3-bit LSB steganography. The generated binary mask is saved as a PNG and hidden inside user-provided or browser-recorded audio. The final output is one MP4 stego video that also carries the exact stego image and stego audio as hidden recovery data. The receiver uploads only that MP4, extracts the hidden recovery data, recovers the mask from the audio, decrypts the document, verifies the SHA-256 hash, and downloads the recovered file using its original extension.

## Features

- Modern public landing page explaining the project, workflow, features, and technology stack
- JWT-based login and registration
- Protected app pages and protected backend APIs
- User-specific activity history
- AES-256 document encryption
- RSA-2048 encryption for AES key protection
- SHA-256 integrity verification
- Huffman compression before visual embedding
- 3-bit LSB image steganography
- PNG binary mask generation
- WAV audio steganography for hiding the PNG binary mask
- MP3 or WAV carrier upload, plus browser-recorded WAV carrier audio
- Single MP4 stego video output with embedded recovery data
- Original filename/extension recovery for files such as PDFs
- Extraction status note showing that the recovered payload came from encrypted data
- PSNR and SSIM image quality metrics
- Downloadable stego video and recovered document
- MongoDB storage for users, encrypted file metadata, and workflow reports

## Project Structure

```text
Project/
|-- Backend/
|   |-- app.py
|   |-- core.py
|   |-- Requirements.txt
|   |-- Auth/
|   |   |-- auth_handler.py
|   |   `-- password_handler.py
|   |-- crypto/
|   |   |-- aes_util.py
|   |   |-- payload_builder.py
|   |   |-- rsa_util.py
|   |   `-- sha_util.py
|   |-- database/
|   |   `-- mongo.py
|   |-- routes/
|   |   |-- auth_routes.py
|   |   |-- crypto_routes.py
|   |   |-- download_routes.py
|   |   |-- health_routes.py
|   |   |-- metrics_routes.py
|   |   |-- report_routes.py
|   |   `-- stego_routes.py
|   `-- steganography/
|       |-- adaptive_embed.py
|       |-- adaptive_extract.py
|       |-- audio_mask.py
|       |-- bit_utils.py
|       |-- capacity.py
|       |-- image_analysis.py
|       |-- mask_generator.py
|       |-- metrics.py
|       `-- video_util.py
|-- Frontend/
|   `-- MedHideX/
|       |-- package.json
|       |-- vite.config.js
|       `-- src/
|           |-- api/
|           |-- components/
|           `-- pages/
|               |-- LandingPage.jsx
|               |-- LoginPage.jsx
|               |-- RegisterPage.jsx
|               |-- DashBoard.jsx
|               |-- EncryptPage.jsx
|               |-- ExtractPage.jsx
|               |-- MetricsPage.jsx
|               |-- HistoryPage.jsx
|               `-- Medshell.jsx
|-- .gitignore
`-- README.md
```

## Backend

`Backend/app.py` creates the FastAPI app, configures CORS, and registers all route modules.

Main routes:

```text
GET  /                         Health check
POST /register                 Create user account
POST /login                    Login and receive JWT token
POST /encrypt                  Encrypt document, store metadata, return payload
POST /embed                    Embed payload into image, hide mask in audio, return stego video
POST /extract                  Extract and decrypt data from one stego video
POST /decrypt                  Decrypt payload and return recovered file URL
POST /metrics                  Calculate PSNR and SSIM for images
GET  /reports                  User-specific activity history
GET  /download/{type}/{file}   Download generated files
```

Download types include:

```text
video       Generated MP4 stego video with embedded recovery data
extracted   Recovered document
```

Protected backend routes require:

```text
Authorization: Bearer <JWT_TOKEN>
```

Protected routes:

- `/encrypt`
- `/embed`
- `/extract`
- `/decrypt`
- `/metrics`
- `/reports`

## MongoDB Collections

Database name:

```text
medhidex
```

Collections:

- `users`: username and hashed password records
- `files`: encrypted file metadata, encrypted AES key, hash, payload, file size, owner username, and timestamp
- `reports`: user-specific workflow history for encryption, embedding, extraction, decryption, and metrics

The history API filters records by the authenticated user, so each user only sees their own activity.

## Frontend

The React frontend lives in `Frontend/MedHideX`.

Public pages:

- `/` - Landing page
- `/login` - Login
- `/register` - Registration

Protected pages:

- `/dashboard` - Main app dashboard
- `/encrypt` - Encrypt and embed workflow
- `/extract` - Extract and decrypt workflow
- `/metrics` - PSNR and SSIM metrics
- `/history` - User-specific usage/activity history

After login, the frontend stores the JWT in `localStorage` as:

```text
medhidex_token
```

The API helper automatically sends the token with protected requests.

## Requirements

- Python 3.10 or newer
- Node.js and npm
- MongoDB running locally on port `27017`

MongoDB URL:

```text
mongodb://localhost:27017/
```

## Run Backend

From the project root:

```powershell
cd Backend
python -m venv venv
.\venv\Scripts\activate
pip install -r Requirements.txt
uvicorn app:app --reload
```

Backend URL:

```text
http://127.0.0.1:8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

## Run Frontend

From another terminal:

```powershell
cd Frontend\MedHideX
npm install
npm run dev
```

Frontend URL:

```text
http://127.0.0.1:5173
```

## Steganography Flow

Sender side:

1. The document is read as raw bytes, so text, PDFs, and other binary files can be encrypted.
2. AES-256 encrypts the document.
3. RSA-2048 encrypts the AES key.
4. SHA-256 stores an integrity hash of the original document.
5. The secure payload includes AES data, RSA data, hash, original filename, and a status note.
6. Huffman coding compresses the payload before image embedding.
7. The compressed payload is embedded into a cover image using 3 LSB bits per RGB channel.
8. The binary mask is saved as a black/white PNG.
9. The mask PNG bytes are embedded into carrier audio using audio LSB. MP3 carrier uploads are supported directly; if `ffmpeg` is unavailable, the MP3 bytes are used as the carrier pattern inside a generated WAV.
10. An MP4 video is generated for sharing. The exact stego image and stego audio are embedded inside the MP4 file so recovery does not depend on lossy video frames.

Receiver side:

1. Upload the generated MP4 stego video.
2. The hidden stego image is extracted from the MP4 file.
3. The hidden stego audio is extracted as WAV.
4. The mask is extracted from the WAV audio.
5. The payload is extracted from the image using the recovered mask.
6. Huffman decompression restores the secure payload.
7. AES/RSA decryption restores the original document bytes.
8. SHA-256 verification confirms whether the recovered document matches the original.
9. The recovered file is saved using the original extension, such as `.pdf`.

## Typical Workflow

1. Start MongoDB.
2. Start the FastAPI backend.
3. Start the React frontend.
4. Open the landing page.
5. Register a user.
6. Login.
7. Go to the dashboard.
8. Upload a medical document, cover image, and MP3/WAV carrier audio, or record carrier audio in the browser.
9. Encrypt and embed the payload.
10. Download the generated MP4 stego video.
11. Extract and decrypt by uploading only the stego video.
12. Download the recovered document with its original extension.
13. View personal usage records in Activity History.
14. Use Metrics to calculate PSNR and SSIM for image quality.

## Build Frontend

```powershell
cd Frontend\MedHideX
npm run build
```

Build output:

```text
Frontend/MedHideX/dist
```

## Security Notes

- Do not commit generated RSA keys.
- Do not commit uploaded medical documents.
- Do not commit generated stego images, stego audio, stego videos, masks, or recovered documents.
- Keep `.env` files out of Git.
- Use a stronger secret key through environment variables before production deployment.

## Format Notes

- Carrier audio can be uploaded as MP3 or WAV, or recorded in the browser as WAV.
- Generated stego image and stego audio are embedded inside the final MP4 file. Extraction requires only the MP4.
- The MP4 visual track is for convenient viewing/sharing. Recovery uses the exact hidden stego image stored inside the file, so MP4 compression does not damage decryption.
- If `ffmpeg` is installed, MP3 carrier audio can be decoded normally. Without `ffmpeg`, the backend still accepts MP3 by using its bytes as the carrier pattern inside a generated WAV.
- Huffman compression can increase very small payloads because it stores a frequency table, but it helps with larger or repetitive payloads.
- The recovered document bytes are not modified with extra text, which keeps PDFs valid. The encryption note is stored as payload metadata and shown in the extraction result.

## Generated Files

The app creates runtime files in:

- `uploads/`
- `stego/`
- `extracted/`
- `keys/`
- `Backend/uploads/`
- `Backend/stego/`
- `Backend/extracted/`
- `Backend/keys/`

These are ignored by `.gitignore`.
