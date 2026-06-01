#!/usr/bin/env python3
"""Track and clean files downloaded for a single QQ homework grading session."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def default_manifest(root: Path) -> Path:
    return root / ".qq_homework_download_manifest.json"


def ensure_inside(root: Path, path: Path) -> None:
    root_resolved = root.resolve()
    path_resolved = path.resolve()
    if root_resolved != path_resolved and root_resolved not in path_resolved.parents:
        raise RuntimeError(f"refusing path outside root: {path}")


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def scan(root: Path) -> tuple[set[str], set[str]]:
    if not root.exists():
        return set(), set()
    files: set[str] = set()
    dirs: set[str] = set()
    for item in root.rglob("*"):
        if item.name == ".qq_homework_download_manifest.json":
            continue
        if item.is_file():
            files.add(rel(item, root))
        elif item.is_dir():
            dirs.add(rel(item, root))
    return files, dirs


def load_manifest(path: Path) -> dict:
    if not path.exists():
        raise RuntimeError(f"manifest not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def save_manifest(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def command_baseline(args: argparse.Namespace) -> int:
    root = Path(args.dir)
    root.mkdir(parents=True, exist_ok=True)
    manifest_path = Path(args.manifest) if args.manifest else default_manifest(root)
    ensure_inside(root, manifest_path)
    files, dirs = scan(root)
    data = {
        "root": str(root.resolve()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "baseline_files": sorted(files),
        "baseline_dirs": sorted(dirs),
    }
    save_manifest(manifest_path, data)
    print(f"baseline_files: {len(files)}")
    print(f"baseline_dirs: {len(dirs)}")
    print(f"manifest: {manifest_path}")
    return 0


def current_new(root: Path, manifest_path: Path) -> tuple[list[str], list[str], dict]:
    data = load_manifest(manifest_path)
    if str(root.resolve()) != data.get("root"):
        raise RuntimeError(f"manifest root mismatch: {data.get('root')} != {root.resolve()}")
    files, dirs = scan(root)
    baseline_files = set(data.get("baseline_files", []))
    baseline_dirs = set(data.get("baseline_dirs", []))
    return sorted(files - baseline_files), sorted(dirs - baseline_dirs), data


def command_status(args: argparse.Namespace) -> int:
    root = Path(args.dir)
    manifest_path = Path(args.manifest) if args.manifest else default_manifest(root)
    ensure_inside(root, manifest_path)
    new_files, new_dirs, _ = current_new(root, manifest_path)
    print(f"new_files: {len(new_files)}")
    for item in new_files:
        print(f"  {item}")
    print(f"new_dirs: {len(new_dirs)}")
    for item in new_dirs:
        print(f"  {item}/")
    return 0


def command_cleanup(args: argparse.Namespace) -> int:
    root = Path(args.dir)
    manifest_path = Path(args.manifest) if args.manifest else default_manifest(root)
    ensure_inside(root, manifest_path)
    new_files, new_dirs, _ = current_new(root, manifest_path)

    if not args.yes:
        print("dry_run: pass --yes to delete current-session downloads")
        print(f"would_delete_files: {len(new_files)}")
        for item in new_files:
            print(f"  {item}")
        return 2

    deleted_files = 0
    for item in new_files:
        path = root / item
        ensure_inside(root, path)
        if path.exists() and path.is_file():
            path.unlink()
            deleted_files += 1

    deleted_dirs = 0
    for item in sorted(new_dirs, key=lambda value: value.count("/"), reverse=True):
        path = root / item
        ensure_inside(root, path)
        if path.exists() and path.is_dir():
            try:
                path.rmdir()
                deleted_dirs += 1
            except OSError:
                print(f"kept_nonempty_dir: {item}")

    print(f"deleted_files: {deleted_files}")
    print(f"deleted_empty_dirs: {deleted_dirs}")
    print(f"manifest_kept: {manifest_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    def add_common(p: argparse.ArgumentParser) -> None:
        p.add_argument("--dir", default=r"D:\HW", help=r"Download directory, default D:\HW.")
        p.add_argument("--manifest", help="Manifest path. Defaults to .qq_homework_download_manifest.json in --dir.")

    baseline = sub.add_parser("baseline", help="Record files that existed before grading.")
    add_common(baseline)
    baseline.set_defaults(func=command_baseline)

    status = sub.add_parser("status", help="List files added since baseline.")
    add_common(status)
    status.set_defaults(func=command_status)

    cleanup = sub.add_parser("cleanup", help="Delete only files added since baseline.")
    add_common(cleanup)
    cleanup.add_argument("--yes", action="store_true", help="Actually delete current-session files.")
    cleanup.set_defaults(func=command_cleanup)

    args = parser.parse_args()
    try:
        return args.func(args)
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
