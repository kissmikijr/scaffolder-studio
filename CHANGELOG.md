# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Migrated to Changesets for version management and releases
- Configured all packages as private npm packages with restricted access
- Updated GitHub Actions workflows to use Changesets
- Updated all plugin package.json files to use `"access": "restricted"` for private npm publication

### Added

- Changesets configuration and workflows
- GitHub Actions workflow for continuous integration with changesets
- Release workflow for automated versioning and publishing
- `.npmrc` configuration file
- `.npmignore` for excluding unnecessary files from npm packages
- Documentation for changesets workflow (RELEASE.md, SETUP_NPM_PUBLISHING.md)
- Changesets scripts: `yarn changeset`, `yarn changeset:version`, `yarn changeset:publish`
