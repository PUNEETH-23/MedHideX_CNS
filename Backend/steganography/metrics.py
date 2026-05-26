import cv2
import numpy as np
import wave

from skimage.metrics import (
    peak_signal_noise_ratio,
    structural_similarity
)


def calculate_metrics(
    original_image,
    stego_image
):

    original = cv2.imread(original_image)

    stego = cv2.imread(stego_image)

    psnr = peak_signal_noise_ratio(
        original,
        stego
    )

    ssim = structural_similarity(
        original,
        stego,
        channel_axis=2
    )

    return {
        "PSNR": psnr,
        "SSIM": ssim
    }


def calculate_audio_metrics(
    original_audio,
    stego_audio
):
    original = _read_wav_samples(original_audio)
    stego = _read_wav_samples(stego_audio)

    sample_count = min(len(original), len(stego))
    if sample_count == 0:
        raise ValueError("Audio files must contain samples")

    original = original[:sample_count]
    stego = stego[:sample_count]
    difference = original - stego
    mse = float(np.mean(np.square(difference)))
    signal_power = float(np.mean(np.square(original)))
    snr = float("inf") if mse == 0 else float(10 * np.log10(signal_power / mse)) if signal_power > 0 else 0
    max_abs = max(float(np.max(np.abs(original))), float(np.max(np.abs(stego))), 1.0)
    psnr = float("inf") if mse == 0 else float(20 * np.log10(max_abs / np.sqrt(mse)))

    if np.std(original) == 0 or np.std(stego) == 0:
        correlation = 1.0 if np.array_equal(original, stego) else 0.0
    else:
        correlation = float(np.corrcoef(original, stego)[0, 1])

    return {
        "Audio_MSE": mse,
        "Audio_SNR": snr,
        "Audio_PSNR": psnr,
        "Audio_Correlation": correlation,
    }


def _read_wav_samples(audio_path):
    with wave.open(audio_path, "rb") as audio:
        channels = audio.getnchannels()
        sample_width = audio.getsampwidth()
        frames = audio.readframes(audio.getnframes())

    if sample_width == 1:
        samples = np.frombuffer(frames, dtype=np.uint8).astype(np.float64) - 128
    elif sample_width == 2:
        samples = np.frombuffer(frames, dtype=np.int16).astype(np.float64)
    elif sample_width == 4:
        samples = np.frombuffer(frames, dtype=np.int32).astype(np.float64)
    else:
        raise ValueError("Only 8-bit, 16-bit, and 32-bit WAV audio is supported")

    if channels > 1:
        samples = samples.reshape(-1, channels).mean(axis=1)

    return samples
