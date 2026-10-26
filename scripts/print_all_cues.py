import json

with open('src/episodes/crushing-walls/data/narrationCues.json', 'r', encoding='utf-8') as f:
    cues = json.load(f)

print(f"Total duration frames: {cues.get('durationFrames')}")
for line_id, line_data in cues['lines'].items():
    words = [w['word'] for w in line_data['words']]
    text = " ".join(words)
    print(f"\n[{line_id}] Frames {line_data['startFrame']} -> {line_data['endFrame']} (words: {len(words)})")
    print(f"  Text: {text}")
    print(f"  Key words:")
    for w in line_data['words']:
        print(f"    {w['word']}: {w['startFrame']}")
