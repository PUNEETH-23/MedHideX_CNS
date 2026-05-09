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