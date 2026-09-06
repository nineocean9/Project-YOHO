# Fixture Policy

This directory may contain only:

- synthetic images generated for testing;
- fully de-identified data whose re-identification risk has been reviewed; or
- data with explicit redistribution permission compatible with this repository.

Do not copy patient images, EEC-2022 data, database exports, model files trained on restricted data, localStorage snapshots, logs containing patient identifiers, or hospital configuration into this directory.

## M0 synthetic set

`generate_fixtures.py` uses only the Python standard library and deterministically creates:

- a non-medical geometric RGB PNG;
- a binary geometric ROI mask;
- obviously fictitious patient/examination/image metadata.

`manifest.json` records source type, license, purpose, SHA-256, dimensions, expected behavior and review state for every generated file. Files in `generated/` that are absent from the manifest fail verification.

Regenerate and verify with:

```bash
python tests/fixtures/generate_fixtures.py
python scripts/m0/verify.py --update-hashes
python scripts/m0/verify.py
```

Updating hashes is allowed only after reviewing an intentional generator change. M0 fixtures are protocol and storage test inputs, not evidence of clinical performance.
