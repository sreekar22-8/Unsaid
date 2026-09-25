---
name: Imported workspace initialization
description: Non-obvious setup needed when a pnpm workspace is imported into a fresh Replit environment
---

Fresh imports can have a complete lockfile but no installed workspace dependencies, and the development PostgreSQL database can be empty even when the repository contains a Drizzle schema.

**Why:** Workflows can fail before application code runs when packages are absent, while the first database-backed request can return a generic 500 until the development schema is pushed.

**How to apply:** Restore dependencies with the frozen lockfile, then run the repository's documented development schema push before testing database-backed routes. Do not treat a successful workflow start as proof that the database is initialized.