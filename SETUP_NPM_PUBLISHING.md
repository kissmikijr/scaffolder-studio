# Quick Setup Guide: npm Publishing with Changesets

## One-Time Setup

### 1. Create npm Access Token

1. Visit https://www.npmjs.com/settings/[your-username]/access-tokens
2. Click "Generate New Token" → "Automation"
3. Copy the token (starts with `npm_...`)

### 2. Add GitHub Secret

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `NPM_TOKEN`
5. Value: paste your npm token
6. Click "Add secret"

## Publishing Workflow with Changesets

### Step 1: Add a Changeset

When you make changes to any package:

```bash
yarn changeset
```

Follow the prompts:

- Select which packages changed
- Choose version bump (patch/minor/major)
- Write a summary of changes

### Step 2: Push to GitHub

```bash
git add .changeset/
git commit -m "Add changeset"
git push origin your-branch
```

### Step 3: Merge to Main

When you merge to `main`, the release workflow will:

1. Create a PR with version bumps and changelogs
2. After merging that PR, publish to npm

### Publishing Locally (Testing)

```bash
# Version packages
yarn changeset:version

# Build everything
yarn build:all

# Publish to npm (requires authentication)
yarn changeset:publish
```

## Example Workflow

```bash
# 1. Make changes to a package
cd plugins/scaffolder-studio
# ... make changes ...

# 2. Add a changeset
yarn changeset
# Choose: @kissmiklosjr/plugin-scaffolder-studio
# Version: patch
# Summary: "Fix scaffolder-studio bug"

# 3. Commit and push
git add .
git commit -m "Fix scaffolder-studio bug"
git push origin main

# 4. After merge, a version PR is created
# 5. Merge that PR to publish to npm
```

## Check Published Packages

Visit: https://www.npmjs.com/~kissmikijr

All packages are **private** and require authentication.
