import shutil
import struct
import subprocess

import cv2


EMBEDDED_MEDIA_MAGIC = b"MHXMEDIA"


import os
import wave

def create_stego_video_from_frames(frames, output_path, fps=60):
    if not frames:
        raise ValueError("No frames provided to create video")
        
    first_frame = frames[0]
    height, width, _ = first_frame.shape
    
    use_mp4_rename = output_path.lower().endswith(".mp4")
    if use_mp4_rename:
        # Write to a temp AVI file using lossless FFV1
        temp_path = output_path.replace(".mp4", "_temp.avi")
    else:
        temp_path = output_path
        
    fourcc = cv2.VideoWriter_fourcc(*"FFV1")
    writer = cv2.VideoWriter(temp_path, fourcc, fps, (width, height))
    
    if not writer.isOpened():
        raise ValueError("Unable to create stego video writer")
        
    for frame in frames:
        # Duplicate each unique frame to convert 30 FPS content to 60 FPS video
        writer.write(frame)
        writer.write(frame)
        
    writer.release()
    
    if use_mp4_rename:
        if os.path.exists(output_path):
            os.remove(output_path)
        os.rename(temp_path, output_path)
        
    written_frames = len(frames) * 2
    return {
        "duration": written_frames / float(fps),
        "frames": written_frames,
        "fps": fps,
    }

def repeat_wav_to_duration(audio_path, target_duration, output_path):
    with wave.open(audio_path, "rb") as wav_in:
        params = wav_in.getparams()
        frames = wav_in.readframes(params.nframes)
        
    target_nframes = int(round(target_duration * params.framerate))
    
    if target_nframes > params.nframes:
        repeat_count = (target_nframes + params.nframes - 1) // params.nframes
        repeated_frames = frames * repeat_count
        # Trim to exact target frames
        bytes_per_frame = params.sampwidth * params.nchannels
        repeated_frames = repeated_frames[:target_nframes * bytes_per_frame]
    else:
        repeated_frames = frames
        target_nframes = params.nframes
        
    with wave.open(output_path, "wb") as wav_out:
        wav_out.setparams(params)
        wav_out.setnframes(target_nframes)
        wav_out.writeframes(repeated_frames)


def extract_first_frame(video_path, output_path):
    video = cv2.VideoCapture(video_path)

    if not video.isOpened():
        raise ValueError("Invalid stego video")

    success, frame = video.read()
    video.release()

    if not success:
        raise ValueError("Unable to read stego video frame")

    cv2.imwrite(output_path, frame)

    return output_path


def mux_audio_into_video(video_path, audio_path, output_path):
    if shutil.which("ffmpeg") is None:
        _append_audio_to_video(video_path, audio_path, output_path)
        return output_path

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-i",
            audio_path,
            "-c:v",
            "copy",
            "-c:a",
            "pcm_s16le",
            "-shortest",
            output_path,
        ],
        check=True,
        capture_output=True,
    )

    return output_path


def embed_media_into_video(video_path, image_path, audio_path, output_path):
    with open(video_path, "rb") as video_file:
        video_data = video_file.read()

    with open(image_path, "rb") as image_file:
        image_data = image_file.read()

    with open(audio_path, "rb") as audio_file:
        audio_data = audio_file.read()

    with open(output_path, "wb") as output_file:
        output_file.write(video_data)
        output_file.write(image_data)
        output_file.write(audio_data)
        output_file.write(EMBEDDED_MEDIA_MAGIC)
        output_file.write(struct.pack(">QQ", len(image_data), len(audio_data)))

    return output_path


def extract_media_from_video(video_path, image_output_path, audio_output_path):
    footer_size = len(EMBEDDED_MEDIA_MAGIC) + 16

    with open(video_path, "rb") as video_file:
        video_file.seek(0, 2)
        file_size = video_file.tell()

        if file_size < footer_size:
            return False

        video_file.seek(file_size - footer_size)
        footer = video_file.read(footer_size)

        magic = footer[:len(EMBEDDED_MEDIA_MAGIC)]
        if magic != EMBEDDED_MEDIA_MAGIC:
            return False

        image_size, audio_size = struct.unpack(">QQ", footer[len(EMBEDDED_MEDIA_MAGIC):])
        data_start = file_size - footer_size - image_size - audio_size

        if data_start < 0:
            raise ValueError("Embedded video recovery data is incomplete")

        video_file.seek(data_start)
        image_data = video_file.read(image_size)
        audio_data = video_file.read(audio_size)

    with open(image_output_path, "wb") as image_file:
        image_file.write(image_data)

    with open(audio_output_path, "wb") as audio_file:
        audio_file.write(audio_data)

    return True


def extract_audio_from_video(video_path, output_path):
    if _extract_appended_audio(video_path, output_path):
        return output_path

    _ensure_ffmpeg()

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            video_path,
            "-vn",
            "-acodec",
            "pcm_s16le",
            output_path,
        ],
        check=True,
        capture_output=True,
    )

    return output_path


def _ensure_ffmpeg():
    if shutil.which("ffmpeg") is None:
        raise ValueError("This video does not contain embedded recovery audio")


def _append_audio_to_video(video_path, audio_path, output_path):
    with open(video_path, "rb") as video_file:
        video_data = video_file.read()

    with open(audio_path, "rb") as audio_file:
        audio_data = audio_file.read()

    with open(output_path, "wb") as output_file:
        output_file.write(video_data)
        output_file.write(audio_data)
        output_file.write(EMBEDDED_MEDIA_MAGIC)
        output_file.write(struct.pack(">Q", len(audio_data)))


def _extract_appended_audio(video_path, output_path):
    footer_size = len(EMBEDDED_MEDIA_MAGIC) + 8

    with open(video_path, "rb") as video_file:
        video_file.seek(0, 2)
        file_size = video_file.tell()

        if file_size < footer_size:
            return False

        video_file.seek(file_size - footer_size)
        footer = video_file.read(footer_size)

        magic = footer[:len(EMBEDDED_MEDIA_MAGIC)]
        if magic != EMBEDDED_MEDIA_MAGIC:
            return False

        audio_size = struct.unpack(">Q", footer[len(EMBEDDED_MEDIA_MAGIC):])[0]
        audio_start = file_size - footer_size - audio_size

        if audio_start < 0:
            raise ValueError("Embedded video audio is incomplete")

        video_file.seek(audio_start)
        audio_data = video_file.read(audio_size)

    with open(output_path, "wb") as audio_file:
        audio_file.write(audio_data)

    return True
