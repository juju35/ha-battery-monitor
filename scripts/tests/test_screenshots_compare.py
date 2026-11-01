"""The screenshots script keeps a file only when its decoded pixels are the same, on every channel and every frame."""

from __future__ import annotations

import importlib.util
import os
import shutil
import struct
import subprocess
import sys
import types
import zlib
from pathlib import Path

import pytest

if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
    # The comparator decodes through ffmpeg: CI installs it, so a missing ffmpeg there is an error, not a skip.
    if os.environ.get("CI"):
        pytest.fail("ffmpeg and ffprobe are required", pytrace=False)
    pytest.skip("ffmpeg and ffprobe are required", allow_module_level=True)

# The script imports Playwright at load time; the comparator does not use it.
sys.modules.setdefault("playwright", types.ModuleType("playwright"))
_sync_api = types.ModuleType("playwright.sync_api")
_sync_api.sync_playwright = None
sys.modules.setdefault("playwright.sync_api", _sync_api)
_spec = importlib.util.spec_from_file_location("screenshots", Path(__file__).parents[1] / "screenshots.py")
screenshots = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(screenshots)

SIZE = (8, 6)


def png(path, rgba, *, level=9, color_type=6):
    """A PNG filled with one colour: RGBA (type 6) or RGB (type 2), compressed at `level`."""
    width, height = SIZE
    pixel = bytes(rgba if color_type == 6 else rgba[:3])
    raw = b"".join(b"\0" + pixel * width for _ in range(height))

    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data))

    header = struct.pack(">IIBBBBB", width, height, 8, color_type, 0, 0, 0)
    Path(path).write_bytes(
        b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, level)) + chunk(b"IEND", b"")
    )


def gif(path, frames):
    """A GIF from a list of frames, each one colour, except an optional (x, y, colour) pixel."""
    width, height = SIZE
    raw = b""
    for colour, dot in frames:
        frame = bytearray(bytes(colour) * width * height)
        if dot:
            x, y, c = dot
            frame[(y * width + x) * 3 : (y * width + x) * 3 + 3] = bytes(c)
        raw += frame
    source = ["-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", "10", "-i", "-"]
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", *source, "-pix_fmt", "rgb8", str(path)],
        input=raw,
        check=True,
    )


def keep(tmp_path, old, new):
    """Run the comparator on copies: True when the fresh file replaced the one already there."""
    dest, fresh = tmp_path / f"dest{Path(old).suffix}", tmp_path / f".new{Path(new).suffix}"
    shutil.copy(old, dest)
    shutil.copy(new, fresh)
    rewritten = screenshots.keep_if_same(fresh, dest)
    assert not fresh.exists()
    assert dest.read_bytes() == Path(new if rewritten else old).read_bytes()
    return rewritten


RED, BLUE = (255, 0, 0, 255), (0, 0, 255, 255)


def test_opaque_png_of_another_colour_is_rewritten(tmp_path):
    """Opaque captures share their alpha channel: a comparison of the alpha alone would keep the old colour."""
    png(tmp_path / "red.png", RED)
    png(tmp_path / "blue.png", BLUE)
    old, new = screenshots.pixels(tmp_path / "red.png"), screenshots.pixels(tmp_path / "blue.png")
    assert old[1][3::4] == new[1][3::4]  # same alpha everywhere
    assert keep(tmp_path, tmp_path / "red.png", tmp_path / "blue.png")


@pytest.mark.parametrize("channel", [0, 1, 2])
def test_one_channel_of_one_pixel_is_enough(tmp_path, channel):
    """A difference of 1/255 on one colour channel is a change."""
    png(tmp_path / "a.png", (100, 100, 100, 255))
    other = [100, 100, 100, 255]
    other[channel] += 1
    png(tmp_path / "b.png", tuple(other))
    assert keep(tmp_path, tmp_path / "a.png", tmp_path / "b.png")


def test_same_pixels_encoded_differently_are_kept(tmp_path):
    """Another compression level, or RGB instead of RGBA, gives other bytes but the same pixels: no rewrite."""
    png(tmp_path / "a.png", RED, level=9)
    png(tmp_path / "b.png", RED, level=0)
    png(tmp_path / "c.png", RED, color_type=2)
    assert (tmp_path / "a.png").read_bytes() != (tmp_path / "b.png").read_bytes()
    assert not keep(tmp_path, tmp_path / "a.png", tmp_path / "b.png")
    assert not keep(tmp_path, tmp_path / "a.png", tmp_path / "c.png")


def test_gif_frames_are_all_compared(tmp_path):
    """Every frame counts: one pixel of the second frame, or one more frame, is a change; the same frames are not."""
    base = [(RED[:3], None), (BLUE[:3], None)]
    gif(tmp_path / "a.gif", base)
    gif(tmp_path / "same.gif", base)
    gif(tmp_path / "dot.gif", [base[0], (BLUE[:3], (3, 2, (255, 255, 255)))])
    gif(tmp_path / "longer.gif", [*base, base[1]])
    assert not keep(tmp_path, tmp_path / "a.gif", tmp_path / "same.gif")
    assert keep(tmp_path, tmp_path / "a.gif", tmp_path / "dot.gif")
    assert keep(tmp_path, tmp_path / "a.gif", tmp_path / "longer.gif")


def test_unreadable_file_is_replaced(tmp_path):
    """A file already there that cannot be decoded is replaced by the fresh capture."""
    (tmp_path / "broken.png").write_bytes(b"not a png")
    png(tmp_path / "red.png", RED)
    assert keep(tmp_path, tmp_path / "broken.png", tmp_path / "red.png")
