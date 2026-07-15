# tuba_scale_generator

This webpage was vibecoded with 2.5 hour of GLM 5.2 and ~13 hours of DeepSeek V4 Pro via freebuff. 
The correct fingerings and positions were added manually.

## License

In place of a legal notice, here is a blessing:

	May you do good and not evil.

	May you find forgiveness for yourself and forgive others.

	May you share freely, never taking more than you give.

## svg to png

```sh
magick convert -density 300 og-image.svg -background "#0a0f1e" -resize 1200x630 -gravity center -extent 1200x630 -flatten -depth 8 -define png:compression-level=9 -define png:compression-filter=5 -strip output.png
```
