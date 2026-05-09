import cv2

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