# MedHideX+

MedHideX+ is a privacy-preserving medical data sharing system that combines cryptography, adaptive image steganography, integrity verification, authentication, and user-specific activity tracking.

The sender encrypts a medical document, builds a secure payload, and embeds that payload inside a medical image. The receiver extracts the hidden payload from the stego image, decrypts it, verifies the SHA-256 hash, and downloads the recovered document.

## Features

- Modern public landing page explaining the project, workflow, features, and technology stack
- JWT-based login and registration
- Protected app pages and protected backend APIs
- User-specific activity history
- AES-256 document encryption
- RSA-2048 encryption for AES key protection
- SHA-256 integrity verification
- Adaptive multi-bit LSB image steganography
- PSNR and SSIM image quality metrics
- Downloadable stego image, mask file, and recovered document
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
|       |-- bit_utils.py
|       |-- capacity.py
|       |-- image_analysis.py
|       |-- mask_generator.py
|       `-- metrics.py
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
POST /embed                    Embed encrypted payload into image
POST /extract                  Extract encrypted payload from stego image
POST /decrypt                  Decrypt payload and return recovered file URL
POST /metrics                  Calculate PSNR and SSIM
GET  /reports                  User-specific activity history
GET  /download/{type}/{file}   Download generated files
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

## Typical Workflow

1. Start MongoDB.
2. Start the FastAPI backend.
3. Start the React frontend.
4. Open the landing page.
5. Register a user.
6. Login.
7. Go to the dashboard.
8. Encrypt a medical document and embed it into a cover image.
9. Download the stego image and mask file.
10. Extract and decrypt using the stego image and mask.
11. Download the recovered document.
12. View personal usage records in Activity History.
13. Use Metrics to calculate PSNR and SSIM.

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
- Do not commit generated stego images, masks, or recovered documents.
- Keep `.env` files out of Git.
- Use a stronger secret key through environment variables before production deployment.

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
