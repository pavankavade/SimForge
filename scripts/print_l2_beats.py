import json

with open('src/episodes/crushing-walls/data/narrationCues.json') as f:
    cues = json.load(f)

words = {}
for line_id, l in cues['lines'].items():
    for item in l['words']:
        clean_w = item['word'].lower().strip(".,!?:;\"'-")
        words[(line_id, clean_w)] = item['startFrame']

def w(lid, word):
    k = (lid, word.lower())
    if k not in words:
        # find partial
        for (l, wd), val in words.items():
            if l == lid and word.lower() in wd:
                return val
    return words.get(k, -1)

beats = {
    'rogue1Grab': w('l2a', 'immediately'),
    'parkour': w('l2a', 'parkour'),
    'escape': w('l2a', 'escape'),
    'ventIn': w('l2a', 'through'),
    'roof': w('l2a', 'vent'),
    'reopen2': w('l2b', 'replace') - 6,
    'platesIn': w('l2b', 'replace'),
    'grease': w('l2b', 'grease'),
    'platesInEnd': w('l2b', 'steel') + 6,
    'chimney': w('l2b', 'hide'),
    'bootDemo': w('l2b', 'boot'),
    'hatch': w('l2b', 'vent'),
    'rogue2Grab': w('l2c', 'even') - 4,
    'climb2': w('l2c', 'climbs'),
    'atVent2': w('l2c', 'ceiling'),
    'punt': w('l2c', 'punts'),
    'land2': w('l2c', 'punts') + 10,
    'slam3': w('l2c', 'floor'),
    'reopen3': w('l2c', 'floor') + 20,
}
for k, v in sorted(beats.items(), key=lambda x: x[1]):
    print(f'{k}: {v}')
