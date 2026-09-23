#!/usr/bin/env python3
"""Create a low-transfer Franka model variant for the public Pages demo."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


def build_variant(source: Path, output: Path) -> None:
    panda_xml = (source / "panda.xml").read_text(encoding="utf-8")
    start = panda_xml.index("    <!-- Visual meshes -->")
    finger_mesh = '    <mesh file="finger_0.obj"/>'
    finger_start = panda_xml.index(finger_mesh, start)
    finger_end = panda_xml.index('    <mesh file="finger_1.obj"/>', start)
    finger_line_start = panda_xml.rfind("\n", start, finger_start) + 1
    kept_mesh_end = panda_xml.index("\n", finger_start) + 1
    visual_block_end = panda_xml.index("\n", finger_end) + 1
    kept_mesh = panda_xml[finger_line_start:kept_mesh_end]
    panda_xml = panda_xml[:start] + kept_mesh + panda_xml[visual_block_end:]
    panda_xml = re.sub(
        r'^\s*<geom\b(?=[^>]*\bclass="visual")[^>]*/>\s*$',
        "",
        panda_xml,
        flags=re.MULTILINE,
    )
    panda_xml, replacements = re.subn(
        r'(<default class="collision">\s*<geom type="mesh" group=")3("/>)',
        r"\g<1>2\g<2>",
        panda_xml,
        count=1,
    )
    if replacements != 1:
        raise ValueError("Could not enable the collision meshes as visible geometry")

    output.mkdir(parents=True, exist_ok=True)
    (output / "panda_pages.xml").write_text(panda_xml, encoding="utf-8")

    scene_xml = (source / "scene.xml").read_text(encoding="utf-8")
    if '<include file="panda.xml"/>' not in scene_xml:
        raise ValueError("Expected the upstream scene to include panda.xml")
    scene_xml = scene_xml.replace(
        '<include file="panda.xml"/>',
        '<include file="panda_pages.xml"/>',
        1,
    )
    (output / "scene_pages.xml").write_text(scene_xml, encoding="utf-8")


def set_pages_default(site_config: Path) -> None:
    text = site_config.read_text(encoding="utf-8")
    old = "globalThis.PLAY_MODEL = 'local_model/franka_emika_panda/scene.xml';"
    new = "globalThis.PLAY_MODEL = 'local_model/franka_emika_panda/scene_pages.xml';"
    if old not in text:
        raise ValueError("Could not find the Pages default Franka model setting")
    site_config.write_text(text.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--site-config", type=Path, required=True)
    args = parser.parse_args()
    build_variant(args.source, args.output)
    set_pages_default(args.site_config)
    print("Built light Franka Pages model using collision meshes only.")


if __name__ == "__main__":
    main()
