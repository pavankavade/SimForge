import json

with open('src/episodes/crushing-walls/data/narrationCues.json', 'r') as f:
    cues = json.load(f)

for line_id, data in cues['lines'].items():
    if line_id in ['l4a', 'l4b', 'l4c', 'l5a', 'l5b', 'l5c', 'end']:
        print(f"\n{line_id}: start={data.get('start')}, end={data.get('end')}")
        words = data.get('words', [])
        print("First 3 words:", words[:3])
        for w in words:
            word_str = str(w)
            print(f"  {w}")
