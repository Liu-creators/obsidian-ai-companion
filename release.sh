#!/bin/bash

# Exit on error
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if version argument is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a version number (e.g., ./release.sh 1.0.1)${NC}"
    exit 1
fi

NEW_VERSION=$1

# 1. Update version in package.json (which triggers version-bump.mjs to update manifest.json and versions.json)
echo -e "${BLUE}Updating version to ${NEW_VERSION}...${NC}"
npm version $NEW_VERSION --no-git-tag-version

# 2. Build the plugin
echo -e "${BLUE}Building plugin...${NC}"
npm run build

# 3. Create zip file
echo -e "${BLUE}Creating zip archive...${NC}"
zip -r context-pilot.zip main.js manifest.json styles.css

# 4. Git operations
echo -e "${BLUE}Committing changes...${NC}"
git add package.json manifest.json versions.json
if ! git diff --cached --quiet; then
    git commit -m "chore: release ${NEW_VERSION}"
else
    echo -e "${BLUE}No changes to commit, skipping commit step...${NC}"
fi


# 5. Create git tag
echo -e "${BLUE}Creating git tag...${NC}"
git tag ${NEW_VERSION}

echo -e "${GREEN}Release ${NEW_VERSION} prepared successfully!${NC}"
echo -e "Next steps:"
echo -e "1. Push changes: git push && git push --tags"
echo -e "2. Create a new release on GitHub"
echo -e "3. Upload the following files to the release:"
echo -e "   - main.js"
echo -e "   - manifest.json"
echo -e "   - styles.css"
echo -e "   - context-pilot.zip"

