import sys
from pydub import AudioSegment
import numpy as np
import scipy.io.wavfile as wavfile
import io

new_sample_rate = 44100  # 44.1 kHz
new_bit_depth = 16  # 16-bit

def change_wav_properties(input_bytes, output_file, new_sample_rate, new_bit_depth):
    # Load the original WAV file
    audio = AudioSegment.from_file(io.BytesIO(input_bytes), format="mp3")

    # Change the sample rate
    audio = audio.set_frame_rate(new_sample_rate)

    # Change the bit depth
    if new_bit_depth == 8:
        audio = audio.set_sample_width(1)
    elif new_bit_depth == 16:
        audio = audio.set_sample_width(2)
    elif new_bit_depth == 24:
        audio = audio.set_sample_width(3)
    elif new_bit_depth == 32:
        audio = audio.set_sample_width(4)
    else:
        raise ValueError("Unsupported bit depth. Use 8, 16, 24, or 32.")

    # Export the modified audio to a new file
    audio.export(output_file, format="wav")

    print(f'Combined WAV file has been written to {output_file}')

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('Usage: python convert_audio.py <output_filename> <input_filename>')
        sys.exit(1)
    
    output_filename = sys.argv[1]
    input_file = sys.argv[2]
    
    with open(input_file, 'rb') as fd:
        wav_data = fd.read()

    change_wav_properties(wav_data, output_filename, new_sample_rate, new_bit_depth)