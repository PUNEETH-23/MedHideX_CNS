import shutil
import subprocess
import wave

import cv2
import numpy as np


LENGTH_PREFIX_BITS = 32
AUDIO_BITS_PER_BYTE = 2


def prepare_audio_carrier(audio_path, content_type, output_path):
    if content_type in {"audio/wav", "audio/wave", "audio/x-wav"}:
        return audio_path

    if content_type in {"audio/mpeg", "audio/mp3"}:
        if shutil.which("ffmpeg") is None:
            _build_wav_from_file_bytes(audio_path, output_path)
            return output_path

        _convert_mp3_to_wav(audio_path, output_path)
        return output_path

    raise ValueError("Invalid audio format. Upload WAV or MP3.")


def embed_mask_png_in_wav(mask_png_path, audio_path, output_path):
    with open(mask_png_path, "rb") as mask_file:
        mask_data = mask_file.read()

    payload_bits = _bytes_to_bits(mask_data)
    binary_payload = _int_to_bits(len(payload_bits), LENGTH_PREFIX_BITS) + payload_bits

    with wave.open(audio_path, "rb") as source_audio:
        params = source_audio.getparams()
        frames = bytearray(source_audio.readframes(source_audio.getnframes()))

    required_audio_bytes = _required_audio_bytes(len(binary_payload))

    if required_audio_bytes > len(frames):
        frames = _repeat_frames(frames, required_audio_bytes)

    for index in range(0, len(binary_payload), AUDIO_BITS_PER_BYTE):
        chunk = binary_payload[index:index + AUDIO_BITS_PER_BYTE].ljust(
            AUDIO_BITS_PER_BYTE,
            "0",
        )
        frame_index = index // AUDIO_BITS_PER_BYTE
        frames[frame_index] = (
            frames[frame_index] & (0xFF << AUDIO_BITS_PER_BYTE)
        ) | int(chunk, 2)

    with wave.open(output_path, "wb") as stego_audio:
        stego_audio.setparams(params)
        stego_audio.writeframes(bytes(frames))

    duration = len(frames) / float(params.framerate * params.nchannels * params.sampwidth)

    return {
        "embedded_bits": len(binary_payload),
        "duration": duration,
    }


def extract_mask_from_wav(audio_path):
    with wave.open(audio_path, "rb") as stego_audio:
        frames = bytearray(stego_audio.readframes(stego_audio.getnframes()))

    length_bytes = _required_audio_bytes(LENGTH_PREFIX_BITS)
    length_bits = _extract_bits(frames[:length_bytes], LENGTH_PREFIX_BITS)
    payload_length = int(length_bits, 2)
    payload_start = length_bytes
    payload_end = payload_start + _required_audio_bytes(payload_length)

    if payload_end > len(frames):
        raise ValueError("Embedded mask is incomplete")

    payload_bits = _extract_bits(frames[payload_start:payload_end], payload_length)
    mask_data = _bits_to_bytes(payload_bits)

    mask_image = cv2.imdecode(
        np.frombuffer(mask_data, dtype=np.uint8),
        cv2.IMREAD_GRAYSCALE,
    )

    if mask_image is None:
        raise ValueError("Invalid embedded mask image")

    return (mask_image > 127).astype(np.uint8)


def get_wav_duration(audio_path):
    with wave.open(audio_path, "rb") as audio:
        return audio.getnframes() / float(audio.getframerate())


def _convert_mp3_to_wav(audio_path, output_path):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            audio_path,
            "-acodec",
            "pcm_s16le",
            output_path,
        ],
        check=True,
        capture_output=True,
    )


def _build_wav_from_file_bytes(audio_path, output_path):
    with open(audio_path, "rb") as audio_file:
        audio_data = audio_file.read()

    if not audio_data:
        raise ValueError("Audio file has no sample data")

    with wave.open(output_path, "wb") as carrier_audio:
        carrier_audio.setnchannels(1)
        carrier_audio.setsampwidth(1)
        carrier_audio.setframerate(44100)
        carrier_audio.writeframes(audio_data)


def _duration_from_params(params):
    return params.nframes / float(params.framerate)


def _bytes_to_bits(data):
    return ''.join(format(byte, "08b") for byte in data)


def _bits_to_bytes(bits):
    data = bytearray()

    for index in range(0, len(bits), 8):
        byte = bits[index:index + 8]

        if len(byte) < 8:
            break

        data.append(int(byte, 2))

    return bytes(data)


def _int_to_bits(value, width):
    return format(value, f"0{width}b")


def _required_audio_bytes(bit_count):
    return (bit_count + AUDIO_BITS_PER_BYTE - 1) // AUDIO_BITS_PER_BYTE


def _repeat_frames(frames, required_size):
    if not frames:
        raise ValueError("Audio file has no sample data")

    repeat_count = (required_size + len(frames) - 1) // len(frames)
    return bytearray(frames * repeat_count)


def _extract_bits(frames, bit_count):
    bits = ''.join(
        format(byte & ((1 << AUDIO_BITS_PER_BYTE) - 1), f"0{AUDIO_BITS_PER_BYTE}b")
        for byte in frames
    )

    return bits[:bit_count]
