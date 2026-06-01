#!/usr/bin/env python3
"""Prepare a one-column score paste from an XLSX roster and score JSON."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}


@dataclass
class StudentRow:
    row: int
    student_id: str
    name: str


def col_to_index(col: str) -> int:
    value = 0
    for char in col.strip().upper():
        if not ("A" <= char <= "Z"):
            raise ValueError(f"invalid column: {col}")
        value = value * 26 + ord(char) - ord("A") + 1
    return value


def split_cell_ref(ref: str) -> tuple[str, int]:
    match = re.match(r"^([A-Z]+)(\d+)$", ref.upper())
    if not match:
        raise ValueError(f"invalid cell reference: {ref}")
    return match.group(1), int(match.group(2))


def normalize_id(value: Any) -> str:
    text = str(value or "").strip()
    if text.endswith(".0") and text[:-2].isdigit():
        text = text[:-2]
    return re.sub(r"\s+", "", text).upper()


def normalize_name(value: Any) -> str:
    return re.sub(r"\s+", "", str(value or "").strip())


def format_score(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        text = value.strip()
        return "" if text.lower() in {"", "null", "none", "blank"} else text
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def load_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        raw = zf.read("xl/sharedStrings.xml")
    except KeyError:
        return []
    root = ET.fromstring(raw)
    strings: list[str] = []
    for item in root.findall("main:si", NS):
        strings.append("".join(t.text or "" for t in item.findall(".//main:t", NS)))
    return strings


def get_sheet_path(zf: zipfile.ZipFile, requested_name: str | None) -> str:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_targets = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pkgrel:Relationship", NS)
    }
    sheets = workbook.find("main:sheets", NS)
    if sheets is None:
        raise RuntimeError("workbook has no sheets")

    chosen = None
    available: list[str] = []
    for sheet in sheets.findall("main:sheet", NS):
        name = sheet.attrib.get("name", "")
        available.append(name)
        if requested_name is None or name == requested_name:
            chosen = sheet
            break
    if chosen is None:
        raise RuntimeError(f"sheet not found: {requested_name!r}; available: {available}")

    rid = chosen.attrib[f"{{{NS['rel']}}}id"]
    target = rel_targets[rid].replace("\\", "/")
    if target.startswith("/"):
        target = target.lstrip("/")
    elif not target.startswith("xl/"):
        target = "xl/" + target
    return target


def cell_text(cell: ET.Element, shared_strings: list[str]) -> str:
    cell_type = cell.attrib.get("t")
    if cell_type == "inlineStr":
        return "".join(t.text or "" for t in cell.findall(".//main:t", NS)).strip()
    value = cell.find("main:v", NS)
    if value is None or value.text is None:
        return ""
    raw = value.text
    if cell_type == "s":
        try:
            return shared_strings[int(raw)].strip()
        except (ValueError, IndexError):
            return ""
    return raw.strip()


def load_sheet_cells(xlsx_path: Path, sheet_name: str | None) -> dict[tuple[int, int], str]:
    with zipfile.ZipFile(xlsx_path) as zf:
        shared_strings = load_shared_strings(zf)
        sheet_path = get_sheet_path(zf, sheet_name)
        root = ET.fromstring(zf.read(sheet_path))
    cells: dict[tuple[int, int], str] = {}
    for cell in root.findall(".//main:c", NS):
        ref = cell.attrib.get("r")
        if not ref:
            continue
        col, row = split_cell_ref(ref)
        cells[(row, col_to_index(col))] = cell_text(cell, shared_strings)
    return cells


def load_roster(
    xlsx_path: Path,
    sheet_name: str | None,
    start_row: int,
    id_col: str,
    name_col: str,
    end_row: int | None,
) -> list[StudentRow]:
    cells = load_sheet_cells(xlsx_path, sheet_name)
    id_idx = col_to_index(id_col)
    name_idx = col_to_index(name_col)
    max_row = end_row or max((row for row, _ in cells), default=start_row - 1)
    roster: list[StudentRow] = []
    for row in range(start_row, max_row + 1):
        sid = str(cells.get((row, id_idx), "")).strip()
        name = str(cells.get((row, name_idx), "")).strip()
        if sid or name:
            roster.append(StudentRow(row=row, student_id=sid, name=name))
    return roster


def load_scores(path: Path) -> tuple[dict[str, str], dict[str, str], list[tuple[str, str]]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    id_scores: dict[str, str] = {}
    name_scores: dict[str, str] = {}
    labels: list[tuple[str, str]] = []

    def add_record(record: Any, fallback_key: str | None = None) -> None:
        if isinstance(record, dict):
            raw_id = record.get("id", record.get("student_id", record.get("学号", fallback_key)))
            raw_name = record.get("name", record.get("姓名", ""))
            score = format_score(record.get("score", record.get("分数", record.get("value"))))
        else:
            raw_id = fallback_key
            raw_name = ""
            score = format_score(record)
        if score == "":
            return
        key_id = normalize_id(raw_id)
        key_name = normalize_name(raw_name)
        label = str(raw_id or raw_name or fallback_key or "")
        if key_id:
            id_scores[key_id] = score
            labels.append((key_id, label))
        elif key_name:
            name_scores[key_name] = score
            labels.append((key_name, label))

    if isinstance(data, list):
        for item in data:
            add_record(item)
    elif isinstance(data, dict):
        for key, value in data.items():
            add_record(value, str(key))
    else:
        raise RuntimeError("scores JSON must be a list or object")
    return id_scores, name_scores, labels


def copy_to_clipboard(text: str) -> None:
    subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            "$text = [Console]::In.ReadToEnd(); Set-Clipboard -Value $text",
        ],
        input=text,
        text=True,
        check=True,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument("--scores", required=True, type=Path)
    parser.add_argument("--sheet", help="Worksheet name. Defaults to the first sheet.")
    parser.add_argument("--start-row", type=int, default=3)
    parser.add_argument("--end-row", type=int)
    parser.add_argument("--id-col", default="A")
    parser.add_argument("--name-col", default="B")
    parser.add_argument("--copy", action="store_true", help="Copy paste column to Windows clipboard.")
    parser.add_argument("--no-text", action="store_true", help="Print only the summary, not the paste text.")
    args = parser.parse_args()

    roster = load_roster(args.xlsx, args.sheet, args.start_row, args.id_col, args.name_col, args.end_row)
    id_scores, name_scores, score_labels = load_scores(args.scores)

    lines: list[str] = []
    matched: set[str] = set()
    blanks: list[StudentRow] = []
    total = 0.0
    nonempty = 0

    for student in roster:
        id_key = normalize_id(student.student_id)
        name_key = normalize_name(student.name)
        score = ""
        if id_key and id_key in id_scores:
            score = id_scores[id_key]
            matched.add(id_key)
        elif name_key and name_key in name_scores:
            score = name_scores[name_key]
            matched.add(name_key)
        lines.append(score)
        if score:
            nonempty += 1
            try:
                total += float(score)
            except ValueError:
                pass
        else:
            blanks.append(student)

    unmatched = []
    for key, label in score_labels:
        if key and key not in matched:
            unmatched.append(label)

    paste_text = "\n".join(lines)
    if args.copy:
        copy_to_clipboard(paste_text)

    total_display = int(total) if total.is_integer() else total
    print(f"rows: {len(roster)}")
    print(f"nonempty: {nonempty}")
    print(f"blank_count: {len(blanks)}")
    print(f"sum: {total_display}")
    if args.copy:
        print("clipboard: copied")
    if blanks:
        print("blank_students:")
        for student in blanks:
            print(f"  row {student.row}: {student.student_id} {student.name}".rstrip())
    if unmatched:
        print("unmatched_scores:")
        for label in unmatched:
            print(f"  {label}")
    if not args.no_text:
        print("--- paste text ---")
        print(paste_text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
