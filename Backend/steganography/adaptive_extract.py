import cv2

from steganography.bit_utils import (
    huffman_decompress_text,
    read_length_prefixed_binary,
)


BITS_PER_CHANNEL = 3


def adaptive_extract(
    image_path,
    mask
):

    image = cv2.imread(image_path)

    binary_data = ""

    rows, cols, _ = image.shape

    for i in range(rows):

        for j in range(cols):

            if mask[i][j] == 1:

                for channel in range(3):

                    pixel = image[i][j][channel]

                    extracted_bits = format(
                        int(pixel),
                        "08b"
                    )[
                        -BITS_PER_CHANNEL:
                    ]

                    binary_data += extracted_bits

    compressed_payload = read_length_prefixed_binary(binary_data)

    extracted_payload = huffman_decompress_text(
        compressed_payload
    )

    return extracted_payload
