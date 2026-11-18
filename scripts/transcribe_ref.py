from youtube_transcript_api import YouTubeTranscriptApi
import sys

try:
    transcript = YouTubeTranscriptApi.get_transcript('3kNwqcY18fg')
    print('Fetched via youtube_transcript_api:')
    for item in transcript:
        print(f"{item['start']:.1f}s: {item['text']}")
except Exception as e:
    print('youtube_transcript_api error:', e)
    try:
        from faster_whisper import WhisperModel
        print('Running faster-whisper...')
        model = WhisperModel('tiny', device='cpu', compute_type='int8')
        segments, info = model.transcribe('out/review/dr_tie_ref.mp4')
        print('Whisper transcription:')
        for s in segments:
            print(f"{s.start:.1f}s - {s.end:.1f}s: {s.text}")
    except Exception as e2:
        print('Whisper error:', e2)
