# Changesets Workflow Summary

## Overview

This repository uses [Changesets](https://github.com/changesets/changesets) for managing versions and releases in the monorepo. Changesets provide a simple, maintainable way to version and publish packages.

## Quick Reference

### Adding a Changeset

After making changes to any package:

```bash
yarn changeset
```

This creates a changeset file in `.changeset/` describing what changed.

### Publishing

Changesets work in two stages:

1. **Version**: Updates package.json versions and creates/updates CHANGELOG.md

   ```bash
   yarn changeset:version
   ```

2. **Publish**: Publishes to npm
   ```bash
   yarn changeset:publish
   ```

## Automated Workflow

The GitHub Actions workflows handle this automatically:

1. **On PR**: CI runs tests and checks for changeset files
2. **On Merge to Main**: Release workflow runs:
   - Creates a version PR if changesets exist
   - When that PR is merged, publishes to npm

## Configuration

- **Config**: `.changeset/config.json`
- **Access**: `restricted` (private packages)
- **Base Branch**: `main`
- **Update Strategy**: `patch` for internal dependencies

## Version Strategy

- **Patch**: Bug fixes (0.1.0 → 0.1.1)
- **Minor**: New features (0.1.0 → 0.2.0)
- **Major**: Breaking changes (0.1.0 → 1.0.0)

Changesets automatically:

- Detects dependent packages
- Updates them appropriately
- Generates changelogs
- Coordinates versions

## Benefits

✓ Explicit version control  
✓ Automatic changelog generation  
✓ Dependent package coordination  
✓ Release candidate PRs  
✓ Monorepo-friendly  
✓ Works with private packages
