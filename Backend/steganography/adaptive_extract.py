import cv2

from steganography.image_analysis import detect_edges
from steganography.bit_utils import binary_to_text


DELIMITER = "1111111111111110"


def adaptive_extract(
    image_path,
    mask
):

    image = cv2.imread(image_path)

    edges = detect_edges(image_path)

    binary_data = ""

    rows, cols, _ = image.shape

    for i in range(rows):

        for j in range(cols):

            if mask[i][j] == 1:

                if edges[i][j] > 0:
                    bits_to_extract = 3
                else:
                    bits_to_extract = 2

                for channel in range(3):

                    pixel = image[i][j][channel]

                    extracted_bits = format(
                        int(pixel),
                        "08b"
                    )[
                        -bits_to_extract:
                    ]

                    binary_data += extracted_bits

    delimiter_index = binary_data.find(
        DELIMITER
    )

    binary_data = binary_data[:delimiter_index]

    extracted_payload = binary_to_text(
        binary_data
    )

    return extracted_payload
