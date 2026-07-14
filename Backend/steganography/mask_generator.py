import cv2
import numpy as np


def generate_binary_mask(image_path):

    image = cv2.imread(image_path)

    height, width, _ = image.shape

    mask = np.random.randint(
        0,
        2,
        size=(height, width),
        dtype=np.uint8
    )

    return mask


def save_mask_png(mask, output_path):
    mask = np.asarray(mask, dtype=np.uint8)
    mask_image = (mask * 255).astype(np.uint8)
    cv2.imwrite(output_path, mask_image)


def load_mask_png(mask_path):
    mask_image = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

    if mask_image is None:
        raise ValueError("Invalid mask image")

    return (mask_image > 127).astype(np.uint8)
