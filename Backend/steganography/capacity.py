import cv2


def estimate_capacity(image_path):

    image = cv2.imread(image_path)

    rows, cols, channels = image.shape

    total_bits = rows * cols * channels * 2

    total_bytes = total_bits // 8

    return {
        "bits": total_bits,
        "bytes": total_bytes
    }