# Publishing Backstage Plugins with Changesets

This repository uses [Changesets](https://github.com/changesets/changesets) for version management and npm publication of Backstage plugins.

## Setup

### Required Secrets

Add the following secrets to your GitHub repository:

1. **NPM_TOKEN**: Create an npm access token with "Automation" type
   - Go to https://www.npmjs.com/settings/YOUR_USERNAME/access-tokens
   - Create a new "Automation" token
   - Add it as a secret named `NPM_TOKEN` in your GitHub repository settings

### Install Changesets (Already Done)

Changesets is already configured. If you need to reinitialize:

```bash
yarn changeset
```

## Workflow

### 1. Adding Changes

When making changes that should be released:

```bash
yarn changeset
```

This interactive command will:

1. Ask which packages changed
2. Ask the type of change (patch/minor/major)
3. Create a changeset file in `.changeset/`

**Example:**

```bash
# You're fixing a bug in the scaffolder-studio
yarn changeset
# Select: @kissmiklosjr/plugin-scaffolder-studio
# Choose: patch
# Write summary: "Fix scaffolder-studio rendering bug"
```

### 2. Versioning and Publishing

The release workflow runs on push to `main`:

1. **Version Bump**: Changesets automatically creates a PR to bump versions based on your changesets
2. **Review PR**: Review the version changes and changelogs
3. **Merge PR**: Merging the PR triggers publication to npm

Alternatively, release manually:

```bash
# Update versions
yarn changeset:version

# Publish to npm
yarn changeset:publish
```

### 3. Manual Release

Trigger via GitHub Actions:

1. Go to Actions → Release
2. Click "Run workflow"
3. The workflow will version and publish packages

## Version Management

Changesets uses semantic versioning:

- **Patch** (0.1.0 → 0.1.1): Bug fixes
- **Minor** (0.1.0 → 0.2.0): New features
- **Major** (0.1.0 → 1.0.0): Breaking changes

Changesets automatically:

- Updates dependent packages
- Generates changelogs
- Coordinates versions across the monorepo

## Private Packages

All plugins are configured as **private npm packages** (`"private": true` and `"access": "restricted"` in `publishConfig`).

To consume these packages:

1. Authenticate with npm using your npm token:

   ```bash
   npm login
   ```

2. Or use `.npmrc`:
   ```
   @kissmiklosjr:registry=https://registry.npmjs.org
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

## Published Packages

The following packages are published to npm under the `@kissmiklosjr` scope:

- `@kissmiklosjr/plugin-scaffolder-studio` - Frontend plugin
- `@kissmiklosjr/plugin-scaffolder-studio-backend` - Backend plugin
- `@kissmiklosjr/plugin-scaffolder-studio-agent-node` - Node library
- `@kissmiklosjr/plugin-scaffolder-studio-common` - Shared common library
- `@kissmiklosjr/plugin-catalog-backend-module-scaffolder-studio-provider` - Catalog module
- `@kissmiklosjr/plugin-permission-backend-module-scaffolder-studio` - Permission module

## Local Development

### Testing Changes

```bash
# Build all packages
yarn build:all

# Preview what would be published
yarn changeset:version

# View the generated changes
git diff

# Clean up
git restore .
```

### Publishing Locally

```bash
# 1. Version the packages
yarn changeset:version

# 2. Build
yarn build:all

# 3. Publish (requires npm authentication)
yarn changeset:publish
```

## Troubleshooting

### Packages not publishing

- Ensure `NPM_TOKEN` secret is correctly configured
- Verify packages have the correct `publishConfig` in `package.json`
- Check that packages are built (run `yarn build:all`)

### Authentication errors

- Ensure your npm token has the correct permissions
- Verify the token hasn't expired
- Check that the registry URL is correct in `.npmrc`

### Changesets not working

- Make sure you've added a changeset with `yarn changeset`
- Check that changeset files are committed
- Verify `.changeset/config.json` exists
