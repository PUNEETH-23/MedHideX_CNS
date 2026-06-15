# MedHideX+ Supabase Authentication & Role-Based PKI Migration Guide

This document lists all the files modified, created, and deleted during the refactoring of MedHideX+ to support Supabase Authentication and a secure Public Key Infrastructure (PKI) for Doctor-Patient document sharing.

---

## Changed Files

### 1. Cryptography & Utilities

- **[NEW] [key_management.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/crypto/key_management.py)**
  - Implemented password-based key derivation using PBKDF2 (`hashlib.pbkdf2_hmac` with 100,000 iterations and a 16-byte random salt) to generate a 256-bit AES key.
  - Implemented `encrypt_private_key` and `decrypt_private_key` using AES-256-CBC with padding.

- **[MODIFY] [rsa_util.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/crypto/rsa_util.py)**
  - Added signature generation (`sign_hash`) and signature verification (`verify_signature`) using PKCS#1 v1.5 from `pycryptodome` (PKCS1_v1_5 and SHA-256 hash wrapper).

---

### 2. Backend Routes

- **[MODIFY] [app.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/app.py)**
  - Registered the new `profile_routes` router.

- **[NEW] [profile_routes.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/routes/profile_routes.py)**
  - Created `/register_profile` to handle RSA key pair generation, password-based private key encryption, and user document storage on MongoDB registration.
  - Created `/patients` to return a list of registered patients for Doctor selection.

- **[MODIFY] [crypto_routes.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/routes/crypto_routes.py)**
  - Refactored `/encrypt` to receive the target `patient_id` and Doctor's `password`. It fetches the patient's public key, encrypts a random AES key, decrypts the Doctor's private key with their password, signs the report's SHA-256 hash, and packages the payload.
  - Refactored `/decrypt` to receive the `payload` and Patient's `password`. It decrypts the Patient's private key with their password, recovers the AES key, decrypts the report, fetches the Doctor's public key, and verifies the digital signature and document integrity.

- **[MODIFY] [stego_routes.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/routes/stego_routes.py)**
  - Updated `/embed` and `/extract` database logging to store both `doctor_id` and `patient_id` extracted from steganography payloads.

- **[MODIFY] [metrics_routes.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/routes/metrics_routes.py)**
  - Updated database logger to check calling user's role and write metrics action to `doctor_id` or `patient_id` fields appropriately.

- **[MODIFY] [report_routes.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/routes/report_routes.py)**
  - Updated `/reports` endpoint to query MongoDB matching the caller's role (fetching files/reports where they are the Doctor or Patient).
  - Enriched returning records with counterpart details (name, email) optimized using a dictionary cache.

- **[MODIFY] [test_e2e.py](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Backend/test_e2e.py)**
  - Updated the integration tests to mock doctor/patient profiles, generate respective test RSA key pairs, and execute the complete pipeline including SHA-256 signing/verification and private key decryption.

---

### 3. Frontend Components

- **[MODIFY] [RegisterPage.jsx](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Frontend/MedHideX/src/pages/RegisterPage.jsx)**
  - Switched input to Email Address. Added text input for **Full Name** and select dropdown for **Role** ("doctor" or "patient").
  - On submit, calls Supabase signup, and then calls `/register_profile` on the backend to initialize keys and store user profile details in MongoDB.

- **[MODIFY] [EncryptPage.jsx](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Frontend/MedHideX/src/pages/EncryptPage.jsx)**
  - Fetches the patient directory from `/patients` and presents a searchable Patient selection dropdown.
  - Adds a password field ("Unlock Key Password") for the doctor to unlock their private key.
  - Updates the `/encrypt` call to pass `patient_id` and `password`.

- **[MODIFY] [ExtractPage.jsx](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Frontend/MedHideX/src/pages/ExtractPage.jsx)**
  - Adds a password field ("Unlock Key Password") for the patient to unlock their private key.
  - Updates `/decrypt` call to pass `password`.
  - Displays the Doctor Digital Signature status ("Signature Authentic" vs "Invalid Signature") alongside the integrity check status.

- **[MODIFY] [HistoryPage.jsx](file:///c:/Users/Puneeth%20Kumar/OneDrive/Desktop/CNS/Project/Frontend/MedHideX/src/pages/HistoryPage.jsx)**
  - Updated history card meta display to render doctor/patient counterpart info (e.g. `Patient: Jane Doe (jane@patient.com)` or `Doctor: Dr. Smith (smith@doctor.com)`).

---

## MongoDB Schema Updates

### 1. `users` collection:
```json
{
  "_id": "ObjectId",
  "supabase_user_id": "UUID string",
  "role": "doctor" or "patient",
  "name": "Full Name string",
  "email": "Email Address string",
  "public_key": "RSA Public Key PEM string",
  "encrypted_private_key": {
    "salt": "Base64 PBKDF2 Salt string",
    "iv": "Base64 AES IV string",
    "ciphertext": "Base64 Encrypted Private Key PEM string"
  },
  "created_at": "ISODate"
}
```

### 2. `files` collection:
```json
{
  "_id": "ObjectId",
  "doctor_id": "Doctor Supabase UUID string",
  "patient_id": "Patient Supabase UUID string",
  "encrypted_file": {
    "iv": "Base64 AES IV string",
    "ciphertext": "Base64 ciphertext string"
  },
  "encrypted_aes_key": "Base64 Encrypted AES key string",
  "signature": "Base64 Doctor Signature string",
  "sha256": "SHA-256 hex hash string of raw report",
  "original_filename": "Filename string",
  "created_at": "ISODate"
}
```

### 3. `reports` collection:
```json
{
  "_id": "ObjectId",
  "doctor_id": "Doctor Supabase UUID string",
  "patient_id": "Patient Supabase UUID string",
  "action": "encryption" or "decryption" or "embedding" or "extraction" or "metrics",
  "timestamp": "ISODate"
}
```

---

## Setup & Run Instructions

### 1. Backend Setup
1. Change into `Backend` directory.
2. Activate venv:
   - PowerShell: `.\venv\Scripts\Activate.ps1`
3. Run the E2E test script to verify that local PKI and pipeline operations pass:
   ```powershell
   python test_e2e.py
   ```
4. Start FastAPI server:
   ```powershell
   uvicorn app:app --reload
   ```

### 2. Frontend Setup
1. Create a `.env` file inside `Frontend/MedHideX/` with the following configuration:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_BASE_URL=http://127.0.0.1:8000
   ```
2. Change into `Frontend/MedHideX` and start the React dev server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser.
