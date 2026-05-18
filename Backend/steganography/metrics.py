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

    with wave.open(original_audio, 'rb') as orig:
        orig_frames = orig.readframes(orig.getnframes())
        orig_samples = np.frombuffer(orig_frames, dtype=np.int16)

    with wave.open(stego_audio, 'rb') as steg:
        steg_frames = steg.readframes(steg.getnframes())
        steg_samples = np.frombuffer(steg_frames, dtype=np.int16)

    min_len = min(len(orig_samples), len(steg_samples))
    orig_samples = orig_samples[:min_len].astype(np.float64)
    steg_samples = steg_samples[:min_len].astype(np.float64)

    mse = np.mean((orig_samples - steg_samples) ** 2)

    signal_power = np.mean(orig_samples ** 2)
    if mse > 0:
        snr = 10 * np.log10(signal_power / mse)
    else:
        snr = float('inf')

    correlation = np.corrcoef(orig_samples, steg_samples)[0, 1]

    max_val = np.iinfo(np.int16).max
    if mse > 0:
        psnr = 20 * np.log10(max_val / np.sqrt(mse))
    else:
        psnr = float('inf')

    return {
        "SNR": snr,
        "PSNR": psnr,
        "MSE": mse,
        "Correlation": correlation
    }