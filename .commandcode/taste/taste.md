# Taste

- Prefers broad compatibility version ranges (e.g. `10.*`) over overly-precise pins (e.g. `10.0.*`) for plugin max-version constraints. Confidence: 0.5
- Prefers non-destructive git recovery: fix forward with new commits and re-tagged releases rather than amending or force-pushing already-published commits. Confidence: 0.5
- Prefers automated, CI-driven releases (e.g. tag-push triggers GitHub Actions to build artifacts and publish the release) over manual release steps. Confidence: 0.5
