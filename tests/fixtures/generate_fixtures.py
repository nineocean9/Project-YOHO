#!/usr/bin/env python3
"""Generate deterministic, non-medical fixtures using only the standard library."""

from __future__ import annotations

import json
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "generated"
WIDTH = 64
HEIGHT = 48


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    body = kind + payload
    return struct.pack(">I", len(payload)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_rgb_png(path: Path) -> None:
    rows = []
    for y in range(HEIGHT):
        row = bytearray([0])
        for x in range(WIDTH):
            checker = ((x // 8) + (y // 8)) % 2
            inside = (x - 32) ** 2 + (y - 24) ** 2 <= 12**2
            if inside:
                pixel = (224, 78, 92)
            elif checker:
                pixel = (42, 122, 140)
            else:
                pixel = (226, 239, 232)
            row.extend(pixel)
        rows.append(bytes(row))
    payload = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 2, 0, 0, 0))
    png += png_chunk(b"IDAT", zlib.compress(payload, level=9))
    png += png_chunk(b"IEND", b"")
    path.write_bytes(png)


def write_mask_png(path: Path) -> None:
    rows = []
    for y in range(HEIGHT):
        row = bytearray([0])
        for x in range(WIDTH):
            row.append(255 if (x - 32) ** 2 + (y - 24) ** 2 <= 12**2 else 0)
        rows.append(bytes(row))
    payload = b"".join(rows)
    png = b"\x89PNG\r\n\x1a\n"
    png += png_chunk(b"IHDR", struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 0, 0, 0, 0))
    png += png_chunk(b"IDAT", zlib.compress(payload, level=9))
    png += png_chunk(b"IEND", b"")
    path.write_bytes(png)


def write_metadata(path: Path) -> None:
    metadata = {
        "fixtureVersion": "1.0",
        "synthetic": True,
        "patient": {
            "id": "pat_00000000-0000-7000-8000-000000000001",
            "displayCode": "SYNTHETIC-PATIENT-001",
            "displayName": "Synthetic Example",
        },
        "examination": {
            "id": "exam_00000000-0000-7000-8000-000000000001",
            "patientId": "pat_00000000-0000-7000-8000-000000000001",
            "performedAt": "2026-01-01T00:00:00Z",
        },
        "image": {
            "id": "img_00000000-0000-7000-8000-000000000001",
            "examinationId": "exam_00000000-0000-7000-8000-000000000001",
            "file": "synthetic-geometric-rgb.png",
            "roiMask": "synthetic-geometric-mask.png",
            "width": WIDTH,
            "height": HEIGHT,
            "mediaType": "image/png",
        },
        "expectedBehavior": {
            "roiIsClosed": True,
            "reverseRoi": False,
            "foregroundCenter": [32, 24],
            "backgroundCorner": [0, 0],
        },
    }
    # Write bytes explicitly so Windows does not translate LF to CRLF. The
    # repository enforces LF, and fixture hashes must survive a fresh checkout.
    path.write_bytes((json.dumps(metadata, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    write_rgb_png(OUTPUT / "synthetic-geometric-rgb.png")
    write_mask_png(OUTPUT / "synthetic-geometric-mask.png")
    write_metadata(OUTPUT / "synthetic-case.json")


if __name__ == "__main__":
    main()
