import numpy as np

def divide_into_chunks(bit_string, num_chunks):
    """
    Deterministically divides a bit string into `num_chunks` chunks of nearly equal size.
    """
    L = len(bit_string)
    N = num_chunks
    base_size = L // N
    remainder = L % N
    
    chunks = []
    start = 0
    for i in range(N):
        size = base_size + (1 if i < remainder else 0)
        chunks.append(bit_string[start:start+size])
        start += size
    return chunks

def embed_bits_in_frame(image, mask, binary_payload, lsb_bits, coords=None):
    """
    Vectorized embedding of a binary payload string into the image channels where mask is 1.
    Uses `lsb_bits` bits per channel. Returns the new image and number of bits embedded.
    Optional `coords` tuple of (y_coords, x_coords) can be passed to avoid repeated np.where calls.
    """
    stego_image = image.copy()
    if coords is not None:
        y_coords, x_coords = coords
    else:
        y_coords, x_coords = np.where(mask == 1)
        
    payload_len = len(binary_payload)
    needed_slots = (payload_len + lsb_bits - 1) // lsb_bits
    total_slots = len(y_coords) * 3
    num_to_embed = min(needed_slots, total_slots)
    
    if num_to_embed == 0:
        return stego_image, 0
        
    # Only slice and modify the required number of pixels
    num_pixels_to_modify = (num_to_embed + 2) // 3
    y_sub = y_coords[:num_pixels_to_modify]
    x_sub = x_coords[:num_pixels_to_modify]
    
    flat_vals = stego_image[y_sub, x_sub, :]
    flat_vals_1d = flat_vals.flatten()
    
    pad_len = num_to_embed * lsb_bits
    padded_payload = binary_payload[:pad_len].ljust(pad_len, '0')
    
    payload_bytes = np.frombuffer(padded_payload.encode('ascii'), dtype=np.uint8) - 48
    payload_bits = payload_bytes.reshape(num_to_embed, lsb_bits)
    
    powers = 2 ** np.arange(lsb_bits - 1, -1, -1, dtype=np.uint8)
    values_to_embed = np.sum(payload_bits * powers, axis=1).astype(np.uint8)
    
    clear_mask = np.uint8(256 - (1 << lsb_bits))
    flat_vals_1d[:num_to_embed] = (flat_vals_1d[:num_to_embed] & clear_mask) | values_to_embed
    
    flat_vals = flat_vals_1d.reshape(-1, 3)
    stego_image[y_sub, x_sub, :] = flat_vals
    
    return stego_image, num_to_embed * lsb_bits

def extract_bits_from_frame(image, mask, bit_count, lsb_bits, coords=None):
    """
    Vectorized extraction of exactly `bit_count` bits from the image channels where mask is 1.
    Uses `lsb_bits` bits per channel. Returns the extracted bit string.
    Optional `coords` tuple of (y_coords, x_coords) can be passed to avoid repeated np.where calls.
    """
    if coords is not None:
        y_coords, x_coords = coords
    else:
        y_coords, x_coords = np.where(mask == 1)
        
    needed_slots = (bit_count + lsb_bits - 1) // lsb_bits
    total_slots = len(y_coords) * 3
    num_to_extract = min(needed_slots, total_slots)
    if num_to_extract == 0:
        return ""
        
    # Only slice and read the required number of pixels
    num_pixels_to_read = (num_to_extract + 2) // 3
    y_sub = y_coords[:num_pixels_to_read]
    x_sub = x_coords[:num_pixels_to_read]
    
    flat_vals = image[y_sub, x_sub, :]
    flat_vals_1d = flat_vals.flatten()
    
    vals = flat_vals_1d[:num_to_extract]
    lsb_values = vals & np.uint8((1 << lsb_bits) - 1)
    
    shifts = np.arange(lsb_bits - 1, -1, -1, dtype=np.uint8)
    bits = (lsb_values[:, None] >> shifts) & 1
    
    bits_char = (bits + 48).astype(np.uint8)
    extracted_str = bits_char.tobytes().decode('ascii')
    return extracted_str[:bit_count]
