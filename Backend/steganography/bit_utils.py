import heapq
from itertools import count


MAGIC_BITS = "0100100001011000"
LENGTH_PREFIX_BITS = 32


def text_to_binary(text):
    data = text.encode("utf-8")

    return ''.join(
        format(byte, '08b')
        for byte in data
    )


def binary_to_text(binary):
    data = bytearray()

    for i in range(0, len(binary), 8):
        byte = binary[i:i+8]

        if len(byte) < 8:
            break

        data.append(int(byte, 2))

    return data.decode("utf-8")


def huffman_compress_text(text):
    data = text.encode("utf-8")

    if not data:
        return MAGIC_BITS + _int_to_bits(0, 32) + _int_to_bits(0, 16)

    frequencies = {}
    for byte in data:
        frequencies[byte] = frequencies.get(byte, 0) + 1

    codes = _build_codes(frequencies)

    header = [
        MAGIC_BITS,
        _int_to_bits(len(data), 32),
        _int_to_bits(len(frequencies), 16),
    ]

    for byte, frequency in sorted(frequencies.items()):
        header.append(_int_to_bits(byte, 8))
        header.append(_int_to_bits(frequency, 32))

    encoded_data = ''.join(codes[byte] for byte in data)

    return ''.join(header) + encoded_data


def huffman_decompress_text(binary):
    cursor = 0

    magic = binary[cursor:cursor + len(MAGIC_BITS)]
    if magic != MAGIC_BITS:
        raise ValueError("Invalid compressed payload")
    cursor += len(MAGIC_BITS)

    original_size, cursor = _read_int(binary, cursor, 32)
    unique_count, cursor = _read_int(binary, cursor, 16)

    frequencies = {}
    for _ in range(unique_count):
        byte, cursor = _read_int(binary, cursor, 8)
        frequency, cursor = _read_int(binary, cursor, 32)
        frequencies[byte] = frequency

    if original_size == 0:
        return ""

    root = _build_tree(frequencies)

    if isinstance(root, int):
        return bytes([root] * original_size).decode("utf-8")

    decoded = bytearray()
    node = root

    while cursor < len(binary) and len(decoded) < original_size:
        bit = binary[cursor]
        cursor += 1

        node = node[0] if bit == "0" else node[1]

        if isinstance(node, int):
            decoded.append(node)
            node = root

    if len(decoded) != original_size:
        raise ValueError("Compressed payload is incomplete")

    return bytes(decoded).decode("utf-8")


def add_length_prefix(binary):
    return _int_to_bits(len(binary), LENGTH_PREFIX_BITS) + binary


def read_length_prefixed_binary(binary):
    payload_length, cursor = _read_int(binary, 0, LENGTH_PREFIX_BITS)
    end = cursor + payload_length

    if len(binary) < end:
        raise ValueError("Embedded payload is incomplete")

    return binary[cursor:end]


def _build_codes(frequencies):
    root = _build_tree(frequencies)
    codes = {}

    def visit(node, prefix):
        if isinstance(node, int):
            codes[node] = prefix or "0"
            return

        visit(node[0], prefix + "0")
        visit(node[1], prefix + "1")

    visit(root, "")
    return codes


def _build_tree(frequencies):
    order = count()
    heap = [
        (frequency, byte, next(order), byte)
        for byte, frequency in sorted(frequencies.items())
    ]
    heapq.heapify(heap)

    while len(heap) > 1:
        left_frequency, left_min, _, left = heapq.heappop(heap)
        right_frequency, right_min, _, right = heapq.heappop(heap)
        node = (left, right)
        heapq.heappush(
            heap,
            (
                left_frequency + right_frequency,
                min(left_min, right_min),
                next(order),
                node,
            )
        )

    return heap[0][3]


def _int_to_bits(value, width):
    return format(value, f"0{width}b")


def _read_int(binary, cursor, width):
    end = cursor + width

    if len(binary) < end:
        raise ValueError("Compressed payload header is incomplete")

    return int(binary[cursor:end], 2), end
