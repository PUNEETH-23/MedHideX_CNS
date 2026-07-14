import cv2


BITS_PER_CHANNEL = 3
MASK_USAGE_RATIO = 0.5


def estimate_capacity(image_path):

    image = cv2.imread(image_path)

    rows, cols, channels = image.shape

    total_bits = int(rows * cols * channels * BITS_PER_CHANNEL * MASK_USAGE_RATIO)

    total_bytes = total_bits // 8

    return {
        "bits": total_bits,
        "bytes": total_bytes
    }
