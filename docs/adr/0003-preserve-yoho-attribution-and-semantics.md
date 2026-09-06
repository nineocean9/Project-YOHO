# ADR-0003: Preserve YOHO Algorithm Attribution and Semantics

- Status: Accepted
- Date: 2026-09-06

## Context

Project-YOHO derives its algorithm layer from `lhaippp/YOHO` and the associated paper. The portfolio contribution is engineering and productization, not invention of the YOHO method or eUNet.

## Decision

- Retain the upstream MIT license and copyright when source is imported.
- Cite the paper and upstream repository in repository and packaged notices.
- Preserve one-image-one-network, clinician ROI/sampling, geometry-based synthesis, reverse ROI and edge-enhanced segmentation semantics unless a separately named algorithm mode is introduced.
- Label paper metrics as paper-reported values.
- Publish local metrics only when backed by a reproducible evaluation manifest.
- Treat medical dataset rights separately from source-code licensing.

## Consequences

- Resume and documentation claims remain accurate.
- Algorithm modifications require explicit naming and validation.
- M0 must create a source manifest before copying upstream files into the new project.
