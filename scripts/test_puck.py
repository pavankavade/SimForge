import os
from pathlib import Path
from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

text = "If you wire two sliding stone walls to a loot pedestal, a greedy goblin will grab the shiny coin and get pressed into a pancake."
out_dir = Path("out/gemini_samples")
out_dir.mkdir(parents=True, exist_ok=True)

# Calling gemini-3.8-flash-tts with ONLY the sentence text
print("Calling Gemini API with gemini-3.8-flash-tts...")
response = client.models.generate_content(
    model="gemini-3.8-flash-tts",
    contents=text,
    config=types.GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(
                    voice_name="Puck"
                )
            )
        )
    )
)


print("Received response!")
for i, part in enumerate(response.candidates[0].content.parts):
    if part.inline_data:
        mime = part.inline_data.mime_type
        data = part.inline_data.data
        print(f"Part {i}: audio data length = {len(data)}, mime = {mime}")
        ext = "wav" if "wav" in mime else "mp3" if "mp3" in mime else "bin"
        out_file = out_dir / f"ep3_puck_sentence1.{ext}"
        with open(out_file, "wb") as f:
            f.write(data)
        print(f"Saved to {out_file}")
    elif part.text:
        print(f"Part {i} text: {part.text}")
