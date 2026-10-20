#!/usr/bin/env python3
"""Prepare the Anna world's photographs from an unchanged PNG source folder.

Requires Pillow with WebP support. Example:
    python3 scripts/import-anna-photos.py --source /path/to/photos \
        --output public/anna-world/photos --manifest /tmp/anna-photo-manifest.json
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from pathlib import Path
import re

from PIL import Image, ImageChops, ImageCms, ImageOps


def natural_key(path: Path) -> list[object]:
    return [int(part) if part.isdigit() else part.lower()
            for part in re.split(r"(\d+)", path.name)]


def image_id(path: Path) -> str:
    return path.stem.lower().replace("_", "-")


def to_srgb(source: Image.Image) -> Image.Image:
    """Apply stored orientation and honor an embedded color profile, if present."""
    oriented = ImageOps.exif_transpose(source)
    profile = oriented.info.get("icc_profile")
    if profile:
        rgb = ImageCms.profileToProfile(
            oriented,
            ImageCms.ImageCmsProfile(BytesIO(profile)),
            ImageCms.createProfile("sRGB"),
            outputMode="RGB",
        )
    else:
        # The supplied screenshots carry the PNG sRGB chunk, rather than ICC.
        rgb = oriented.convert("RGB")
    rgb.info.clear()
    return rgb


def trim_blank_outer_rows(image: Image.Image) -> Image.Image:
    """Remove only outer rows whose every RGB channel is at most 8.

    Keep two blank rows beside the content as a conservative safety margin.
    Horizontal bounds and every nonblank row stay intact.
    """
    red, green, blue = image.split()
    brightest_channel = ImageChops.lighter(ImageChops.lighter(red, green), blue)
    visible = brightest_channel.point([0] * 9 + [255] * 247)
    bounds = visible.getbbox()
    if bounds is None:
        return image
    top = max(0, bounds[1] - 2)
    bottom = min(image.height, bounds[3] + 2)
    return image.crop((0, top, image.width, bottom))


def save_webp(image: Image.Image, path: Path, quality: int) -> None:
    temporary = path.with_suffix(".webp.tmp")
    image.save(temporary, format="WEBP", quality=quality, method=6)
    temporary.replace(path)


def import_photo(source: Path, output: Path) -> dict[str, object]:
    ident = image_id(source)
    full_path = output / f"{ident}.webp"
    thumbnail_path = output / "thumbs" / f"{ident}.webp"
    with Image.open(source) as original:
        full = trim_blank_outer_rows(to_srgb(original))
    full.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
    full.info.clear()
    save_webp(full, full_path, quality=88)
    thumbnail = full.copy()
    thumbnail.thumbnail((480, 480), Image.Resampling.LANCZOS)
    thumbnail.info.clear()
    save_webp(thumbnail, thumbnail_path, quality=78)

    # Decode the written assets so a successful import also checks WebP output.
    for path, expected, limit in (
        (full_path, full.size, 1600),
        (thumbnail_path, thumbnail.size, 480),
    ):
        with Image.open(path) as decoded:
            decoded.load()
            if decoded.size != expected or max(decoded.size) > limit:
                raise RuntimeError(f"Unexpected image dimensions: {path}")
            if any(key in decoded.info for key in ("exif", "icc_profile", "xmp")):
                raise RuntimeError(f"Metadata was retained: {path}")

    return {
        "id": ident,
        "src": f"./photos/{ident}.webp",
        "thumbnail": f"./photos/thumbs/{ident}.webp",
        "width": full.width,
        "height": full.height,
        "sourceName": source.name,
        # PNG creation dates describe screenshots, not relationship events.
        "date": "",
        "caption": "",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path,
                        help="Folder of original PNG screenshots (read only)")
    parser.add_argument("--output", required=True, type=Path,
                        help="Destination for full WebPs and thumbs/")
    parser.add_argument("--manifest", type=Path,
                        help="JSON manifest destination; defaults to OUTPUT/manifest.json")
    parser.add_argument("--workers", type=int, default=4,
                        help="Concurrent image conversions (default: 4)")
    args = parser.parse_args()
    source = args.source.expanduser().resolve()
    output = args.output.expanduser().resolve()
    if not source.is_dir():
        parser.error(f"Source folder does not exist: {source}")
    if output == source or source in output.parents:
        parser.error("Choose an output folder outside the source folder")
    if not 1 <= args.workers <= 16:
        parser.error("--workers must be between 1 and 16")
    sources = sorted((path for path in source.iterdir()
                      if path.is_file() and path.suffix.lower() == ".png"),
                     key=natural_key)
    if not sources:
        parser.error("Source folder contains no PNG images")
    identifiers = [image_id(path) for path in sources]
    if len(set(identifiers)) != len(identifiers):
        parser.error("Source filenames produce duplicate image IDs")
    output.mkdir(parents=True, exist_ok=True)
    (output / "thumbs").mkdir(exist_ok=True)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        manifest = list(pool.map(lambda path: import_photo(path, output), sources))
    manifest_path = args.manifest or output / "manifest.json"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    original_bytes = sum(path.stat().st_size for path in sources)
    optimized_bytes = sum((output / f"{ident}.webp").stat().st_size
                          + (output / "thumbs" / f"{ident}.webp").stat().st_size
                          for ident in identifiers)
    print(f"Imported and decoded {len(manifest)} full images + {len(manifest)} thumbnails")
    print(f"Original PNG bytes: {original_bytes:,}")
    print(f"Optimized WebP bytes (full + thumbnail): {optimized_bytes:,}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
