from PIL import Image, ImageDraw, ImageFilter, ImageChops
from pathlib import Path
import colorsys
import math

root=Path(__file__).resolve().parents[1]
out=root/'public/art'
out.mkdir(parents=True,exist_ok=True)
mask_out=out/'masks'
mask_out.mkdir(exist_ok=True)
sheet=Image.open(root/'docs/references/chocolate-cake-progression.webp').convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS)

def masked(im, points, pedestal=False):
    mask=Image.new('L',im.size)
    ImageDraw.Draw(mask).polygon(points,fill=255)
    if pedestal:
        ImageDraw.Draw(mask).polygon(stand,fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(.65))
    im.putalpha(mask)
    return im

two=sheet.crop((512,0,1024,512))
stand=[(65,272),(74,256),(92,240),(421,240),(438,254),(447,273),(450,294),(447,314),(437,331),(420,347),(398,361),(366,372),(329,381),(328,397),(318,414),(298,427),(270,433),(241,434),(211,429),(188,420),(173,406),(168,388),(169,378),(136,370),(109,359),(88,345),(73,327),(64,307),(61,286)]
twopoints=[(83,201),(89,175),(105,158),(113,135),(139,127),(151,111),(179,107),(199,92),(226,95),(244,84),(268,88),(282,94),(305,94),(326,107),(350,106),(366,125),(391,135),(399,156),(419,177),(426,200),(426,266),(421,306),(408,331),(390,349)]+stand[4:]+[(81,273)]
two=masked(two,twopoints[:24]+[(114,349),(91,317),(83,269)],True)
source=two.copy()
background=Image.new('L',(512,512))
for x in range(512):
    for y in range(512):
        r,g,b,a=source.getpixel((x,y))
        if not a or (r>220 and g>190 and b>160):
            background.putpixel((x,y),255)
ImageDraw.floodfill(background,(0,0),128)
left,right=84,426
def smooth(values, radius=7):
    return {x:sum(values.get(k,values[x])*math.exp(-((k-x)/3.5)**2) for k in range(x-radius,x+radius+1))/sum(math.exp(-((k-x)/3.5)**2) for k in range(x-radius,x+radius+1)) for x in values}

# Trace the actual curved filling and bottom from the photograph. Each column
# is then mapped along this cylinder, never copied as a rectangular band.
seams={}
bottoms={}
for x in range(left,right+1):
    expected=238+72*max(0,1-((x-256)/173)**2)**.7
    candidates=[]
    for y in range(round(expected)-11,round(expected)+12):
        r,g,b,_=source.getpixel((x,y))
        if r>150 and g>85 and b>g*.82 and r>g*1.15:
            candidates.append((y,max(1,b-g*.75)))
    seams[x]=sum(y*w for y,w in candidates)/sum(w for _,w in candidates) if candidates else expected
seams=smooth(seams)
bottoms={x:294+69*max(0,1-((x-255)/171)**2)**.5 for x in seams}
tops={x:196+60*max(0,1-((x-256)/172)**2)**.5 for x in seams}
cake_mask=Image.new('L',(512,512))
ImageDraw.Draw(cake_mask).polygon(twopoints[:20]+[(right,bottoms[right])]+[(x,bottoms[x]) for x in range(right,left-1,-1)]+[(left,201)],fill=255)
source_cake_mask=cake_mask.copy()
ceramic_mask=Image.new('L',(512,512))
ImageDraw.Draw(ceramic_mask).polygon(stand,fill=255)
for x in range(512):
    plate_top=307-53*max(0,1-((x-256)/195)**2)**.5
    for y in range(math.ceil(plate_top)):
        ceramic_mask.putpixel((x,y),0)
# Reconstruct the hidden plate surface behind the cake. Source-photo cake
# remnants must never become part of the pedestal or its contact outline.
plate=Image.new('RGBA',(512,512))
plate_alpha=Image.new('L',(2048,2048))
ImageDraw.Draw(plate_alpha).ellipse((61*4,252*4,451*4,377*4),fill=255)
plate_alpha=plate_alpha.resize((512,512),Image.Resampling.BOX)
for x in range(512):
    for y in range(252,378):
        if plate_alpha.getpixel((x,y)):
            depth=(y-252)/125
            shade=3*(x-256)/195
            plate.putpixel((x,y),(round(253-17*depth-shade),round(239-35*depth-shade),round(216-51*depth-shade),plate_alpha.getpixel((x,y))))
erase=Image.new('L',(512,512))
for x in range(74,438):
    edge=max(0,1-((x-255)/171)**2)**.5
    boundary=294+69*edge+8+12*(min(1,abs(x-255)/171)**4)
    ImageDraw.Draw(erase).line((x,0,x,boundary),fill=255)
erase=erase.filter(ImageFilter.GaussianBlur(1.2))
ceramic_photo=source.copy()
ceramic_photo.putalpha(ImageChops.multiply(ImageChops.multiply(source.getchannel('A'),ceramic_mask),Image.eval(erase,lambda a:255-a)))
ceramic=plate
ceramic.alpha_composite(ceramic_photo)

def sample(x,y):
    y=max(0,min(510.99,y)); lo=int(y); f=y-lo
    a=source.getpixel((x,lo)); b=source.getpixel((x,lo+1))
    return tuple(a[i]*(1-f)+b[i]*f for i in range(3))

def cylinder(layers,offset):
    # The top keeps its photographic fondant/frosting contour. Only that matte
    # is cleaned; side and bottom alpha come exclusively from analytic geometry.
    top_image=Image.new('RGBA',(512,512))
    top_pixels=top_image.load()
    for x in range(left,right+1):
        for y in range(max(0,offset),math.ceil(tops[x]+offset)+4):
            sy=y-offset
            if sy<0 or not source_cake_mask.getpixel((x,min(511,int(sy)))): continue
            rgb=sample(x,sy)
            if background.getpixel((x,int(sy)))==128: continue
            top_pixels[x,y]=tuple(round(c) for c in rgb)+(source.getpixel((x,int(sy)))[3],)
    top_image.putalpha(top_image.getchannel('A').filter(ImageFilter.MinFilter(3)))

    ss=8
    side_mask=Image.new('L',(512*ss,512*ss))
    xs=[left+.5+i/ss for i in range((right-left)*ss+1)]
    def front_top(x):
        return 196+60*max(0,1-((x-256.5)/172)**2)**.5+offset
    def front_bottom(x):
        return 294+69*max(0,1-((x-255.5)/171)**2)**.5
    outline=[(x*ss,front_top(x)*ss) for x in xs]+[(x*ss,front_bottom(x)*ss) for x in reversed(xs)]
    ImageDraw.Draw(side_mask).polygon(outline,fill=255)
    side_mask=side_mask.resize((512,512),Image.Resampling.BOX)
    side=Image.new('RGBA',(512,512)); pixels=side.load()
    filling_alpha=Image.new('L',(512,512))
    for x in range(left,right+1):
        start=tops[x]+offset; bottom=bottoms[x]; height=bottom-start
        texture_x=round(256+(x-256)*.72)
        for y in range(max(0,math.floor(start)-2),min(512,math.ceil(bottom)+11)):
            coverage=side_mask.getpixel((x,y))
            if not coverage: continue
            phase=max(0,min(.99999,(y-start)/height))*layers
            band=min(layers-1,int(phase)); u=phase-band
            lo,hi=(tops[texture_x]+2,seams[texture_x]-6) if band%2==0 else (seams[texture_x]+7,seams[texture_x]+50)
            rgb=sample(texture_x,lo+(hi-lo)*u)
            filling_weight=0
            for k in range(1,layers):
                distance=y-(start+height*k/layers)
                weight=max(0,min(1,(7-abs(distance))/3))
                if weight:
                    filling_weight=max(filling_weight,weight)
                    filling=sample(texture_x,seams[texture_x]+distance)
                    rgb=tuple(rgb[i]*(1-weight)+filling[i]*weight for i in range(3))
            contact=max(0,min(1,(y-(bottom-2))/2))
            rgb=tuple(c*(1-.22*contact) for c in rgb)
            pixels[x,y]=tuple(round(c) for c in rgb)+(coverage,)
            filling_alpha.putpixel((x,y),round(coverage*filling_weight))
    frosting_alpha=ImageChops.multiply(top_image.getchannel('A'),Image.eval(side_mask,lambda a:255-a))
    frosting_texture=Image.new('RGBA',(512,512))
    filling_texture=Image.new('RGBA',(512,512))
    accent_texture=Image.new('RGBA',(512,512))
    for x in range(512):
        for y in range(512):
            for texture,rgba,alpha in [(frosting_texture,top_image,frosting_alpha),(filling_texture,side,filling_alpha)]:
                opacity=alpha.getpixel((x,y))
                if opacity:
                    r,g,b,_=rgba.getpixel((x,y))
                    light=round(255*(.82+.18*max(r,g,b)/255))
                    texture.putpixel((x,y),(light,light,light,opacity))
                    if texture is frosting_texture and r>160 and g>100 and b>120 and r>g*1.25 and b>g*.9:
                        accent_texture.putpixel((x,y),(light,light,light,opacity))
    side_mask.save(mask_out/f'side-{layers}.png',optimize=True)
    frosting_texture.save(mask_out/f'frosting-{layers}.png',optimize=True)
    filling_texture.save(mask_out/f'filling-{layers}.png',optimize=True)
    accent_texture.save(mask_out/f'accents-{layers}.png',optimize=True)
    top_image.alpha_composite(side)
    return top_image,top_image.getchannel('A')

one,one_mask=cylinder(1,56)
two,cake_mask=cylinder(2,0)
three,three_mask=cylinder(3,-47)

for layers,im in [(1,one),(2,two),(3,three)]:
    composed=ceramic.copy(); composed.alpha_composite(im)
    composed.save(out/f'chocolate-{layers}.png',optimize=True)
    for flavor in ['vanilla','lemon','red-velvet']:
        recolored=im.copy()
        pix=recolored.load()
        region={1:one_mask,2:cake_mask,3:three_mask}[layers]
        # Only recolor sponge and frosting; retain the warm ceramic pedestal.
        for y in range(512):
            for x in range(512):
                r,g,b,a=pix[x,y]
                if not a or not region.getpixel((x,y)): continue
                # Pedestal begins outside the cake silhouette.
                h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
                pink = r>160 and r>g*1.3 and b>g*.9
                if flavor=='red-velvet':
                    if s < .4 and not pink: continue
                    if r < g*1.25 and not pink: continue
                    rgb=colorsys.hsv_to_rgb(.975,min(.83,s*.95),min(1,v*.94))
                    if r>150 and g>75 and b>70: rgb=(.96,.85,.72)
                else:
                    # Map the chocolate texture into sampled warm bakery colors,
                    # rather than desaturating it into grey/taupe.
                    offset={1:56,2:0,3:-47}[layers]
                    frosting=y<tops.get(x,200)+offset
                    if flavor=='vanilla':
                        channels = (234+21*v,216+35*v,188+50*v) if frosting else (184+81*v,129+129*v,45+156*v)
                    else:
                        channels = (242+13*v,220+30*v,133+54*v) if frosting else (202+65*v,151+87*v,38+108*v)
                    rgb=tuple(min(255,c)/255 for c in channels)
                    if pink: rgb=(1,.95,.82 if flavor=='lemon' else .88)
                pix[x,y]=tuple(round(c*255) for c in rgb)+(a,)
        composed=ceramic.copy(); composed.alpha_composite(recolored)
        composed.save(out/f'{flavor}-{layers}.png',optimize=True)

princess=sheet.crop((201,535,317,688))
points=[(48,5),(52,18),(60,10),(65,20),(76,5),(74,25),(82,34),(83,48),(89,57),(92,77),(87,89),(91,106),(98,119),(107,133),(105,143),(89,149),(69,150),(51,149),(31,150),(13,143),(9,133),(21,117),(25,103),(27,87),(21,78),(21,63),(26,54),(29,39),(42,27),(43,15)]
masked(princess,points).save(out/'princess.png',optimize=True)

flavors=Image.open(root/'docs/references/flavors-and-candles.webp').convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS)
cheese=flavors.crop((0,0,512,512))
cheese_mask=Image.new('L',(512,512))
d=ImageDraw.Draw(cheese_mask)
d.ellipse((83,134,432,268),fill=255)
d.polygon([(83,200),(432,200),(432,280),(423,310),(401,335),(371,350),(321,362),(243,365),(177,356),(123,336),(91,309),(83,276)],fill=255)
cheese.putalpha(cheese_mask.filter(ImageFilter.GaussianBlur(.65)))
# Replace the fruit-covered surface with the unobstructed baked-centre photograph.
surface=flavors.crop((234,165,307,218)).resize((346,132),Image.Resampling.BICUBIC)
surface_mask=Image.new('L',surface.size)
ImageDraw.Draw(surface_mask).ellipse((0,0,345,131),fill=255)
surface.putalpha(surface_mask.filter(ImageFilter.GaussianBlur(1)))
cheese.alpha_composite(surface,(84,134))
pedestal=ceramic.copy()
pedestal.alpha_composite(two)
stand_mask=Image.new('L',(512,512))
ImageDraw.Draw(stand_mask).polygon(stand,fill=255)
pedestal.putalpha(ImageChops.multiply(ImageChops.multiply(pedestal.getchannel('A'),stand_mask),Image.eval(cheese_mask,lambda a:255-a)))
pedestal.alpha_composite(cheese)
pedestal.save(out/'cheesecake.png',optimize=True)
cheese_frost=Image.new('L',(512,512))
cheese_frost.paste(surface_mask,(84,134))
cheese_fill=Image.new('L',(2048,2048))
cheese_xs=[84+i/8 for i in range((432-84)*8+1)]
curve=lambda x,center,depth:center+depth*max(0,1-((x-257)/174)**2)**.5
outline=[(x*4,curve(x,200,66)*4) for x in cheese_xs]+[(x*4,curve(x,259,65)*4) for x in reversed(cheese_xs)]
ImageDraw.Draw(cheese_fill).polygon(outline,fill=255)
cheese_fill=ImageChops.multiply(cheese_fill.resize((512,512),Image.Resampling.BOX),cheese_mask)
for target,alpha in [('frosting',cheese_frost),('filling',cheese_fill),('accents',Image.new('L',(512,512)))]:
    texture=Image.new('RGBA',(512,512))
    for x in range(512):
        for y in range(512):
            opacity=alpha.getpixel((x,y))
            if opacity:
                r,g,b,_=cheese.getpixel((x,y))
                light=round(255*(.82+.18*max(r,g,b)/255))
                texture.putpixel((x,y),(light,light,light,opacity))
    texture.save(mask_out/f'{target}-cheesecake.png',optimize=True)

def piece(name, source, box, points):
    im=source.crop(box)
    masked(im,points).save(out/f'{name}.png',optimize=True)

# Transparent fondant pieces prepared from the supplied bakery references.
themes=Image.open(root/'docs/references/themed-cakes.webp').convert('RGBA')
mario=themes.crop((0,0,512,512))
piece('mushroom',mario,(162,42,349,203),[(3,62),(17,34),(41,12),(77,0),(112,3),(143,20),(170,51),(183,74),(177,87),(142,94),(129,91),(125,124),(136,144),(130,155),(110,159),(80,156),(68,146),(65,130),(62,95),(30,94),(8,84)])
piece('coins',mario,(274,146,391,231),[(0,48),(9,34),(42,31),(44,10),(60,1),(85,0),(109,12),(116,29),(115,54),(104,71),(82,78),(61,78),(44,84),(20,81),(7,69)])
racing=themes.crop((512,0,1024,512))
piece('race-car',racing,(130,94,395,253),[(2,72),(11,51),(31,41),(52,40),(91,25),(126,10),(156,2),(177,0),(201,8),(222,18),(245,29),(258,42),(262,72),(251,91),(240,103),(215,106),(200,96),(174,116),(165,139),(150,156),(124,158),(108,151),(100,138),(70,145),(47,139),(30,127),(12,116),(7,99)])
piece('checkered-flag',racing,(177,18,318,150),[(34,0),(40,0),(38,10),(71,7),(100,8),(137,9),(130,34),(119,54),(112,78),(84,76),(57,82),(25,77),(8,130),(2,132)])
spain=themes.crop((1024,0,1536,512))
piece('football',spain,(173,76,340,209),[(1,62),(12,35),(30,14),(53,3),(91,0),(119,9),(144,28),(161,53),(165,80),(156,105),(137,123),(111,131),(79,132),(47,127),(22,113),(7,92)])
tennis=themes.crop((0,512,512,1024))
piece('tennis-racket',tennis,(147,39,362,213),[(0,153),(7,140),(41,111),(61,76),(67,45),(83,20),(112,5),(145,0),(175,4),(196,13),(209,26),(214,44),(208,66),(195,87),(171,105),(144,117),(111,122),(85,122),(62,133),(28,170),(11,173)])
piece('tennis-ball',tennis,(254,147,333,216),[(4,22),(16,6),(39,0),(60,5),(75,20),(78,43),(65,61),(43,68),(21,64),(5,49),(0,35)])
strawberries=flavors.crop((0,0,512,512))
piece('strawberry-fan',strawberries,(338,130,428,215),[(0,49),(8,30),(21,10),(35,0),(49,4),(60,12),(78,10),(87,18),(80,31),(83,45),(78,65),(64,77),(40,83),(19,84),(4,73)])
print('Prepared',len(list(out.glob('*.png'))),'layered reference assets')
