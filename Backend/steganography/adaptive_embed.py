import cv2

from steganography.mask_generator import generate_binary_mask
from steganography.bit_utils import add_length_prefix, huffman_compress_text


BITS_PER_CHANNEL = 3


def adaptive_embed(
    image_path,
    payload,
    output_path
):

    image = cv2.imread(image_path)

    mask = generate_binary_mask(image_path)

    compressed_payload = huffman_compress_text(payload)
    binary_payload = add_length_prefix(compressed_payload)

    data_index = 0

    rows, cols, _ = image.shape

    for i in range(rows):

        for j in range(cols):

            if mask[i][j] == 1:

                for channel in range(3):

                    if data_index >= len(binary_payload):
                        break

                    bits = binary_payload[
                        data_index:
                        data_index + BITS_PER_CHANNEL
                    ]

                    bits = bits.ljust(
                        BITS_PER_CHANNEL,
                        '0'
                    )

                    pixel = image[i][j][channel]

                    pixel = (
                        pixel >> BITS_PER_CHANNEL
                    ) << BITS_PER_CHANNEL

                    pixel |= int(bits, 2)

                    image[i][j][channel] = pixel

                    data_index += BITS_PER_CHANNEL

    if data_index < len(binary_payload):
        raise ValueError("Payload exceeds image capacity")

    cv2.imwrite(output_path, image)

    return {
        "embedded_bits": data_index,
        "compressed_bits": len(compressed_payload),
        "mask": mask.tolist()
    }
