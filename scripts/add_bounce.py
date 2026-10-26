with open("scripts/blender_simforge_cw.py", "r", encoding="utf-8") as f:
    code = f.read()

target = '''def ease_in_out(t):
    return 0.5 * (1.0 - math.cos(math.pi * t))'''

replacement = '''def ease_in_out(t):
    return 0.5 * (1.0 - math.cos(math.pi * t))

def ease_out_bounce(t):
    n1 = 7.5625
    d1 = 2.75
    if t < 1 / d1:
        return n1 * t * t
    elif t < 2 / d1:
        t -= 1.5 / d1
        return n1 * t * t + 0.75
    elif t < 2.5 / d1:
        t -= 2.25 / d1
        return n1 * t * t + 0.9375
    else:
        t -= 2.625 / d1
        return n1 * t * t + 0.984375'''

if target in code:
    code = code.replace(target, replacement)
    with open("scripts/blender_simforge_cw.py", "w", encoding="utf-8") as f:
        f.write(code)
    print("Added ease_out_bounce successfully.")
else:
    print("Could not find target!")
