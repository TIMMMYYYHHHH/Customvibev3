"""Copy approved artwork unchanged and extract exact unkerned print-font advances."""
import json, struct, shutil
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=root/'output/handy-at-home/v2'
target=root/'public/assets/handy/v1'
target.mkdir(parents=True,exist_ok=True)
designs=json.loads((source/'fields.json').read_text())['designs']
for d in designs:
    shutil.copyfile(source/d['image'],target/(d['id']+'.png'))
    d['image']='/assets/handy/v1/'+d['id']+'.png'
(root/'src/designs/handy-catalogue.mjs').write_text('// Approved 1254 px artwork coordinates. Edition 1 is immutable for existing orders.\nexport const handyDesigns='+json.dumps(designs,ensure_ascii=False,indent=2)+';\n')
b=(root/'public/assets/fonts/PatrickHand-Regular.ttf').read_bytes()
u16=lambda p:struct.unpack_from('>H',b,p)[0]
i16=lambda p:struct.unpack_from('>h',b,p)[0]
u32=lambda p:struct.unpack_from('>I',b,p)[0]
tables={b[p:p+4].decode():u32(p+8) for p in range(12,12+16*u16(4),16)}
units=u16(tables['head']+18); nmetrics=u16(tables['hhea']+34)
cmap=tables['cmap']; offsets=[cmap+u32(p+4) for p in range(cmap+4,cmap+4+8*u16(cmap+2),8) if u16(p) in [0,3]]
sub=next(p for p in offsets if u16(p)==4); seg=u16(sub+6)//2
ends=sub+14;starts=ends+2*seg+2;deltas=starts+2*seg;ranges=deltas+2*seg
widths={}
for j in range(seg):
    for cp in range(u16(starts+2*j),u16(ends+2*j)+1):
        if cp==65535:continue
        offset=u16(ranges+2*j)
        glyph=u16(ranges+2*j+offset+2*(cp-u16(starts+2*j))) if offset else cp
        if offset and not glyph:continue
        glyph=(glyph+i16(deltas+2*j))%65536
        if glyph:widths[str(cp)]=u16(tables['hmtx']+4*min(glyph,nmetrics-1))
(root/'src/designs/handy-font-metrics.mjs').write_text('// Generated from the licensed PatrickHand-Regular.ttf by scripts/prepare-handy-assets.py.\nexport const unitsPerEm='+str(units)+';\nexport const advances='+json.dumps(widths,separators=(',',':'))+';\n')
print('Copied',len(designs),'unchanged artwork masters; extracted',len(widths),'glyph advances.')
