#!/usr/bin/env python3
"""Validate the M0 provenance and synthetic-fixture safety baseline."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FIXTURE_ROOT = ROOT / "tests" / "fixtures"
SOURCE_MANIFEST = ROOT / "docs" / "sources" / "yoho-source-manifest.json"
FIXTURE_MANIFEST = FIXTURE_ROOT / "manifest.json"
ALLOWED_FIXTURE_SUFFIXES = {".json", ".png"}
IGNORED_PARTS = {".git", "__pycache__"}
FORBIDDEN_SUFFIXES = {
    ".db", ".sqlite", ".sqlite3", ".dcm", ".nii", ".pth", ".pt", ".onnx", ".h5", ".hdf5", ".log"
}
FORBIDDEN_NAME_PARTS = {"patient-data", "patient_data", "eec-2022", "localstorage", "database-export"}
SECRET_PATTERNS = {
    "private key": re.compile(rb"BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY"),
    "GitHub token": re.compile(rb"gh[pousr]_[A-Za-z0-9]{20,}"),
    "AWS access key": re.compile(rb"AKIA[0-9A-Z]{16}"),
    "credential in URL": re.compile(rb"https?://[^\s/:]+:[^\s/@]+@"),
}
TEXT_SUFFIXES = {"", ".md", ".txt", ".json", ".py", ".js", ".ts", ".tsx", ".vue", ".xml", ".yml", ".yaml", ".toml", ".properties", ".html", ".css"}


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid JSON {path.relative_to(ROOT)}: {error}") from error


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_source_manifest(errors: list[str]) -> None:
    try:
        manifest = load_json(SOURCE_MANIFEST)
    except ValueError as error:
        errors.append(str(error))
        return
    if manifest.get("manifestVersion") != "1.0":
        errors.append("Source manifestVersion must be 1.0")
    migration = manifest.get("migrationSource", {})
    if migration.get("access") != "read-only":
        errors.append("Legacy migration source must remain read-only")
    if migration.get("remoteOperationsAllowed") is not False:
        errors.append("Legacy remote operations must remain disabled")
    if manifest.get("imports"):
        errors.append("M0 source manifest must not claim imported source before review")


def validate_fixtures(errors: list[str], update_hashes: bool) -> None:
    try:
        manifest = load_json(FIXTURE_MANIFEST)
    except ValueError as error:
        errors.append(str(error))
        return

    fixtures = manifest.get("fixtures")
    if not isinstance(fixtures, list) or not fixtures:
        errors.append("Fixture manifest must declare at least one fixture")
        return

    declared: set[str] = set()
    for entry in fixtures:
        relative = entry.get("path")
        if not isinstance(relative, str):
            errors.append("Every fixture requires a string path")
            continue
        path = (FIXTURE_ROOT / relative).resolve()
        try:
            path.relative_to(FIXTURE_ROOT.resolve())
        except ValueError:
            errors.append(f"Fixture escapes fixture root: {relative}")
            continue
        if relative in declared:
            errors.append(f"Duplicate fixture entry: {relative}")
        declared.add(relative)
        if not path.is_file():
            errors.append(f"Missing fixture: {relative}")
            continue
        if path.suffix.lower() not in ALLOWED_FIXTURE_SUFFIXES:
            errors.append(f"Disallowed fixture type: {relative}")
        if entry.get("sourceType") != "generated":
            errors.append(f"Fixture must be generated in M0: {relative}")
        if entry.get("reviewStatus") != "synthetic-approved":
            errors.append(f"Fixture lacks synthetic approval: {relative}")
        actual_hash = sha256(path)
        if update_hashes:
            entry["sha256"] = actual_hash
        elif entry.get("sha256") != actual_hash:
            errors.append(f"SHA-256 mismatch: {relative}")

    generated_root = FIXTURE_ROOT / "generated"
    actual = {
        path.relative_to(FIXTURE_ROOT).as_posix()
        for path in generated_root.rglob("*")
        if path.is_file() and not any(part in IGNORED_PARTS for part in path.parts)
    }
    undeclared = sorted(actual - declared)
    missing = sorted(declared - actual)
    if undeclared:
        errors.append(f"Undeclared generated fixtures: {', '.join(undeclared)}")
    if missing:
        errors.append(f"Manifest entries outside generated set: {', '.join(missing)}")

    if update_hashes and not errors:
        FIXTURE_MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def tracked_or_candidate_files() -> list[Path]:
    git_dir = ROOT / ".git"
    if git_dir.exists():
        result = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "--cached", "--others", "--exclude-standard"],
            check=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        return [ROOT / line for line in result.stdout.splitlines() if line]
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file() and not any(part in IGNORED_PARTS for part in path.relative_to(ROOT).parts)
    ]


def scan_repository(errors: list[str]) -> None:
    for path in tracked_or_candidate_files():
        relative = path.relative_to(ROOT).as_posix()
        lower = relative.lower()
        suffixes = [suffix.lower() for suffix in path.suffixes]
        if any(suffix in FORBIDDEN_SUFFIXES for suffix in suffixes):
            errors.append(f"Forbidden data/model file: {relative}")
        if any(part in lower for part in FORBIDDEN_NAME_PARTS):
            errors.append(f"Forbidden sensitive path pattern: {relative}")
        if path.suffix.lower() not in TEXT_SUFFIXES or path.stat().st_size > 2 * 1024 * 1024:
            continue
        try:
            content = path.read_bytes()
        except OSError as error:
            errors.append(f"Cannot scan {relative}: {error}")
            continue
        for label, pattern in SECRET_PATTERNS.items():
            if pattern.search(content):
                errors.append(f"Possible {label} in {relative}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--update-hashes", action="store_true", help="Write current generated fixture hashes to the manifest")
    args = parser.parse_args()

    errors: list[str] = []
    validate_source_manifest(errors)
    validate_fixtures(errors, args.update_hashes)
    scan_repository(errors)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        print(f"M0 verification failed with {len(errors)} error(s).", file=sys.stderr)
        return 1
    print("M0 verification passed: provenance structure, fixtures, hashes, prohibited files and common secrets checked.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
