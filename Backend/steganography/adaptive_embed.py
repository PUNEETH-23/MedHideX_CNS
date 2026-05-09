import cv2

from steganography.mask_generator import generate_binary_mask
from steganography.image_analysis import detect_edges
from steganography.bit_utils import text_to_binary


DELIMITER = "1111111111111110"


def adaptive_embed(
    image_path,
    payload,
    output_path
):

    image = cv2.imread(image_path)

    mask = generate_binary_mask(image_path)

    edges = detect_edges(image_path)

    binary_payload = text_to_binary(payload)

    binary_payload += DELIMITER

    data_index = 0

    rows, cols, _ = image.shape

    for i in range(rows):

        for j in range(cols):

            if mask[i][j] == 1:

                # Adaptive embedding
                if edges[i][j] > 0:
                    bits_to_embed = 3
                else:
                    bits_to_embed = 2

                for channel in range(3):

                    if data_index >= len(binary_payload):
                        break

                    bits = binary_payload[
                        data_index:
                        data_index + bits_to_embed
                    ]

                    bits = bits.ljust(
                        bits_to_embed,
                        '0'
                    )

                    pixel = image[i][j][channel]

                    pixel = (
                        pixel >> bits_to_embed
                    ) << bits_to_embed

                    pixel |= int(bits, 2)

                    image[i][j][channel] = pixel

                    data_index += bits_to_embed

    cv2.imwrite(output_path, image)

    return {
        "embedded_bits": data_index,
        "mask": mask.tolist()
    }