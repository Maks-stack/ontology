# shade_uml.py
import re, sys, pathlib
from collections import deque

PKG = re.compile(r'package\s+([A-Za-z_][\w\.]*)\s*#([0-9A-Fa-f]{6})\s*\{', re.M)
CLS = re.compile(r'^\s*class\s+(".*?"|\w+)(?:\s*#([0-9A-Fa-f]{6}))?(?:\s+extends\s+(".*?"|\w+))?', re.M)

def hex2rgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
def rgb2hex(c): return "#%02x%02x%02x" % c
def shade(hexcol, frac):  # frac<0 darken, >0 lighten
    r,g,b = hex2rgb(hexcol)
    if frac>=0: r,g,b = [int(x+(255-x)*frac) for x in (r,g,b)]
    else:       r,g,b = [int(x*(1+frac))       for x in (r,g,b)]
    r=max(0,min(255,r)); g=max(0,min(255,g)); b=max(0,min(255,b))
    return rgb2hex((r,g,b))

def find_block(text, start_idx):
    i = start_idx; depth = 0
    while i < len(text):
        if text[i] == '{': depth += 1
        elif text[i] == '}':
            depth -= 1
            if depth == 0: return i+1
        i += 1
    return i

def apply(text, dark_factor=-0.05, light_step=0.12):
    out = []; last = 0
    for m in PKG.finditer(text):
        pkg_name, pkg_color = m.group(1), "#"+m.group(2)
        block_start = m.end()
        block_end = find_block(text, block_start-1)
        block = text[m.start():block_end]

        # parse classes inside this package block
        classes = []
        edges = {}
        for cm in CLS.finditer(block):
            cls = cm.group(1).strip('"')
            color = cm.group(2)
            parent = cm.group(3).strip('"') if cm.group(3) else None
            classes.append((cm.start(), cm.end(), cls, color, parent))
            if parent:
                edges.setdefault(parent, []).append(cls)

        # determine colors
        parent_col = shade(pkg_color, dark_factor)
        colors = {}
        parents = set(edges.keys())
        q = deque()
        for p in parents:
            colors.setdefault(p, parent_col)
            q.append((p, 0))
        while q:
            cur, depth = q.popleft()
            for ch in edges.get(cur, []):
                if ch not in colors:
                    colors[ch] = shade(colors[cur], light_step)
                    q.append((ch, depth+1))

        # rewrite block with injected colors (only if none set)
        new_block = []
        b_last = 0
        for s,e,cls,color,parent in classes:
            new_block.append(block[b_last:s])
            line = block[s:e]
            if cls in colors and not color:
                # insert " #HEX" after class name token
                line = re.sub(r'^(\s*class\s+(".*?"|\w+))', r'\1 ' + colors[cls], line)
            new_block.append(line)
            b_last = e
        new_block.append(block[b_last:])

        out.append(text[last:m.start()])
        out.append(''.join(new_block))
        last = block_end
    out.append(text[last:])
    return ''.join(out)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: python shade_uml.py input.puml output.puml")
        sys.exit(1)
    src = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
    dst = apply(src, dark_factor=-0.05, light_step=0.12)
    pathlib.Path(sys.argv[2]).write_text(dst, encoding="utf-8")
