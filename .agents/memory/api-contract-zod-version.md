---
name: OpenAPI integer compatibility
description: The current generated Zod setup does not expose z.int(), so API integer fields need numeric OpenAPI schemas.
---

Use `type: number` for numeric identifiers and counts in OpenAPI contracts in this workspace unless the Zod generation dependency is upgraded.

**Why:** Orval generated `z.int()` for OpenAPI `integer`, but the installed Zod runtime is the older API without `z.int()`, causing library typecheck failures after codegen.

**How to apply:** If the schema toolchain changes, re-evaluate this constraint before introducing `integer` fields again.