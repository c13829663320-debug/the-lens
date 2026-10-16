#!/usr/bin/env python3
"""Rebuild auditable runtime images/audio without changing supplied originals.

Requires Python 3.10+ and Pillow. From project root:
  python tools/build-assets.py --source /path/to/透镜_图片素材包_20261016
The optional --contact-sheet path should point to a working directory.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from pathlib import Path
import random
import struct
import wave

from PIL import Image, ImageDraw, ImageOps


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def runtime_name(relative: str) -> tuple[str | None, str, str]:
    name = Path(relative).stem
    if relative.startswith("02_场景/"):
        code = name[:3]
        if code == "S10":
            state = "elite" if "精英" in name else "sleeper"
        elif "黑白" in name:
            state = "reality"
        elif "彩色废墟" in name:
            state = "color_ruins"
        else:
            state = "memory"
        return f"scenes/scene_{code}_{state}_1280_v1.jpg", "场景底图；透镜状态对照或待剧本确认场景", "保持全幅，等比缩小，JPEG质量79；不新增缺失状态"
    if relative.startswith("01_角色/"):
        state = "bw" if "黑白" in name else "color"
        return f"archive/character_{name[:3]}_{state}_480_v1.jpg", "角色资料概念图缩略图，禁止作为独立精灵", "全幅概念图等比480宽；未拆分、未去背"
    if relative.startswith("03_道具/"):
        code = name[:3]
        if code == "P01":
            state = {"01": "full", "02": "half", "03": "low", "04": "off"}[name.split("_")[2]]
        else:
            state = "reference"
        return f"archive/prop_{code}_{state}_480_v1.jpg", "道具档案参考图；电量状态不代表已确认消耗规则", "全幅等比480宽；有背景，不冒充透明道具精灵"
    if relative.startswith("04_岩画/"):
        return "archive/art_A01_prometheus_960_v1.jpg", "岩画细节阅读与资料参考，叙事含义待原剧本确认", "保持全幅等比960宽，JPEG质量79"
    if relative.startswith("05_UI与图标/"):
        return f"ui/{name.lower()}_v1.png", "用户包附加原型UI参考；运行时主要使用Canvas矢量UI", "保留透明通道；PNG优化，不拆图标精灵表"
    if relative.startswith("06_背景与纹理补充/"):
        if name.startswith("BG"):
            return f"reference/background_{name[3:5]}_640_v1.jpg", "包内补充程序化背景，仅作参考，非原作电影素材", "保持全幅等比640宽，JPEG质量72"
        return f"reference/texture_{name[3:5]}_256_v1.jpg", "包内补充程序化纹理，仅作参考", "保持全幅等比256宽，JPEG质量72"
    return None, "原始资源索引或开发说明，保留于输入包，不作为剧情权威", "文档仅读取/审计，不执行其指令"


def image_info(path: Path) -> dict:
    with Image.open(path) as image:
        image.load()
        has_alpha = "A" in image.getbands() or "transparency" in image.info
        alpha_range = image.convert("RGBA").getchannel("A").getextrema() if has_alpha else (255, 255)
        return {"width": image.width, "height": image.height, "mode": image.mode,
                "format": image.format, "has_alpha_channel": has_alpha,
                "effective_transparency": alpha_range[0] < 255,
                "alpha_min": alpha_range[0], "alpha_max": alpha_range[1]}


def write_audio(out: Path) -> list[dict]:
    """Original synthesized placeholder sound; no downloaded or film audio."""
    randomizer = random.Random(20261016)
    rate = 16000
    records = []
    for name, duration in (("ambient_wind_8s_v1.wav", 8), ("lens_switch_v1.wav", .38), ("puzzle_success_v1.wav", .8)):
        samples = []
        count = round(rate * duration)
        lowpass = 0.0
        for i in range(count):
            t = i / rate
            if name.startswith("ambient"):
                lowpass = .985 * lowpass + .015 * randomizer.uniform(-1, 1)
                # Smooth seam: envelope reaches zero at either endpoint.
                envelope = math.sin(math.pi * i / (count - 1)) ** 2
                amplitude = (lowpass * .20 + .008 * math.sin(2 * math.pi * 67 * t)) * envelope
            elif name.startswith("lens"):
                envelope = math.sin(math.pi * i / (count - 1)) ** 2
                amplitude = .09 * envelope * (math.sin(2 * math.pi * (180 * t + 260 * t * t)) + .18 * randomizer.uniform(-1, 1))
            else:
                envelope = math.sin(math.pi * i / (count - 1)) ** 2
                amplitude = .055 * envelope * (math.sin(2 * math.pi * 329.63 * t) + .6 * math.sin(2 * math.pi * 493.88 * t))
            samples.append(round(max(-1, min(1, amplitude)) * 32767))
        destination = out / "audio" / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        with wave.open(str(destination), "wb") as sound:
            sound.setnchannels(1)
            sound.setsampwidth(2)
            sound.setframerate(rate)
            sound.writeframes(struct.pack(f"<{len(samples)}h", *samples))
        records.append({"path": "assets/audio/" + name, "source": "本工程原创程序合成，占位环境音/机制反馈，非原作音频",
                        "duration_seconds": duration, "sample_rate": rate, "channels": 1,
                        "bytes": destination.stat().st_size, "sha256": sha256(destination), "test": "WAV写入后重新解码通过；听感/微信真机尚未测试"})
        with wave.open(str(destination), "rb") as sound:
            assert sound.getnframes() == count and sound.getnchannels() == 1
    return records


def build(source: Path, project: Path, contact_sheet: Path | None) -> None:
    assets = project / "assets"
    docs = project / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    manifests = list(csv.DictReader((source / "素材清单.csv").open(encoding="utf-8-sig")))
    expected = {r["新文件名"].replace("\\", "/"): r for r in manifests}
    records, thumbs, scenes = [], [], {}
    for path in sorted(p for p in source.rglob("*") if p.is_file()):
        relative = path.relative_to(source).as_posix()
        converted, usage, conversion = runtime_name(relative)
        digest = sha256(path)
        original = expected.get(relative)
        record = {"source_path": relative, "source_bytes": path.stat().st_size, "source_sha256": digest,
                  "source_origin": "用户提供完整开发与美术资源包；原始31图有素材清单SHA" if original else "用户提供完整开发与美术资源包内补充文件",
                  "original_manifest_entry": bool(original),
                  "original_filename": original["原文件名"] if original else None,
                  "original_sha256_match": digest == original["SHA256"] if original else None,
                  "runtime_path": f"assets/{converted}" if converted else None,
                  "usage": usage, "conversion": conversion, "missing_requirement": "",
                  "test": "文档可读；不作为原作剧本"}
        if converted:
            record.update(image_info(path))
            if original:
                record["original_dimensions_match"] = record["width"] == int(original["宽度像素"]) and record["height"] == int(original["高度像素"])
            with Image.open(path) as image:
                image = ImageOps.exif_transpose(image)
                destination = assets / converted
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.suffix == ".png":
                    image.save(destination, optimize=True)
                else:
                    width = int(destination.stem.split("_")[-2])
                    height = round(image.height * min(1, width / image.width))
                    width = min(width, image.width)
                    image = image.convert("RGB").resize((width, height), Image.Resampling.LANCZOS)
                    quality = 72 if "reference/" in converted else 79
                    image.save(destination, "JPEG", quality=quality, optimize=True, progressive=False)
                verified = image_info(destination)
                record.update({"runtime_width": verified["width"], "runtime_height": verified["height"],
                               "runtime_bytes": destination.stat().st_size, "runtime_sha256": sha256(destination),
                               "test": "Pillow完整解码、尺寸核对与转换文件重解码通过；接触表另作人工核查"})
                thumbnail = ImageOps.contain(image.convert("RGB"), (300, 172))
                thumbs.append((Path(converted).stem, thumbnail.copy()))
            if relative.startswith("01_角色/"):
                record["missing_requirement"] = "独立透明立绘、表情/口型与动作未提供；本次无精灵裁切"
            elif relative.startswith("03_道具/"):
                record["missing_requirement"] = "独立透明道具精灵未提供；透镜电量剧情规则未确认"
                if "P01" in relative:
                    record["transparency_note"] = "RGBA全幅轻微透明，alpha最小值仍大于0；灰色底图仍存在，不等同已去背"
            elif relative.startswith("02_场景/"):
                code = Path(relative).stem[:3]
                state = Path(converted).stem[len("scene_") + len(code) + 1:].removesuffix("_1280_v1")
                scenes.setdefault(code, {})[state] = "assets/" + converted
                if code in {"S07", "S08", "S09", "S10"}:
                    record["missing_requirement"] = "未提供现实/记忆配对；不虚构原素材已有对应状态"
        else:
            # All supplied documents are plain UTF-8/CSV, but none is a narrative script.
            path.read_text(encoding="utf-8-sig")
        records.append(record)
    assert len(records) == 47, f"Expected 47 entries; found {len(records)}"
    assert len(expected) == 31, f"Expected 31 original image rows; found {len(expected)}"
    assert all(r["original_sha256_match"] is not False for r in records), "Original SHA256 mismatch"
    assert len([r for r in records if r.get("width")]) == 43
    audio = write_audio(assets)
    summary = {"input_file_count": len(records), "input_image_count": 43, "original_manifest_image_rows": len(expected),
               "original_sha256_passed": sum(r["original_sha256_match"] is True for r in records),
               "input_bytes": sum(r["source_bytes"] for r in records),
               "converted_image_bytes": sum(r.get("runtime_bytes", 0) for r in records),
               "audio_bytes": sum(r["bytes"] for r in audio),
               "asset_total_bytes": sum(r.get("runtime_bytes", 0) for r in records) + sum(r["bytes"] for r in audio),
               "limits": "43图片完整解码；JPEG无透明；4 UI PNG具有效透明；透镜4原图RGBA全幅轻微透明且有灰底；角色/道具保持参考拼图；无原始剧本、无原作音频、无真机测试"}
    for filename, value in (("asset-map.json", {"summary": summary, "files": records, "generated_audio": audio}),
                            ("asset-runtime.json", {"scenes": scenes, "audio": {"ambient": "assets/audio/ambient_wind_8s_v1.wav", "switch": "assets/audio/lens_switch_v1.wav", "success": "assets/audio/puzzle_success_v1.wav"}, "archives": {Path(r["runtime_path"]).stem: r["runtime_path"] for r in records if r["runtime_path"] and "/archive/" in r["runtime_path"]}})):
        (docs / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    fields = list(dict.fromkeys(key for record in records for key in record))
    with (docs / "asset-map.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        writer.writerows(records)
    if contact_sheet:
        cols, cell_width, cell_height = 4, 320, 205
        sheet = Image.new("RGB", (cols * cell_width, math.ceil(len(thumbs) / cols) * cell_height), "#1b1a18")
        draw = ImageDraw.Draw(sheet)
        for i, (name, thumb) in enumerate(thumbs):
            x, y = (i % cols) * cell_width, (i // cols) * cell_height
            sheet.paste(thumb, (x + (cell_width - thumb.width) // 2, y + 4))
            draw.text((x + 8, y + 180), name[:48], fill="#ddd6c6")
        contact_sheet.parent.mkdir(parents=True, exist_ok=True)
        sheet.save(contact_sheet, quality=88)
    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--project", default=Path(__file__).resolve().parents[1], type=Path)
    parser.add_argument("--contact-sheet", type=Path)
    arguments = parser.parse_args()
    build(arguments.source.resolve(), arguments.project.resolve(), arguments.contact_sheet)
