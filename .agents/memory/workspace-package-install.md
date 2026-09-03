---
name: Workspace package installs
description: A pnpm workspace quirk relevant when adding dependencies to a single artifact.
---

Dependency installation helpers may default to the workspace root, which pnpm rejects unless the root install is explicitly intended. Add the dependency to the target workspace package rather than the repository root.

**Why:** A root-level dependency can silently widen the project’s dependency surface and does not make the package that needs it self-contained.

**How to apply:** For a dependency used by one artifact, use that artifact’s package scope when installing and verify its package.json and lockfile entry afterward.