def text_to_binary(text):

    return ''.join(
        format(ord(char), '08b')
        for char in text
    )


def binary_to_text(binary):

    chars = []

    for i in range(0, len(binary), 8):

        byte = binary[i:i+8]

        chars.append(chr(int(byte, 2)))

    return ''.join(chars)