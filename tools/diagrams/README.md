# Architecture diagrams

The diagram on each project card (`images/arch/arch-<project>.webp`, and the
stacked phone version `arch-<project>-m.webp`) is generated from `specs.js`.

To change one: edit its entry in `specs.js`, then

```
cd tools/diagrams
npm i playwright @fontsource/plus-jakarta-sans @fontsource/dm-mono
mkdir -p out && node render.js out            # or: node render.js out atlas
python3 -c "from PIL import Image;import glob,os;[Image.open(f).save('../../images/arch/'+os.path.basename(f)[:-4]+'.webp','WEBP',quality=88,method=6) for f in glob.glob('out/*.png')]"
```

Every label in `specs.js` comes from the project's own write-up on the site.
Keep it that way: no claim in a diagram that the card text doesn't make.
