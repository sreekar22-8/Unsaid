---
name: Vite Supabase environment variables
description: Runtime setup for exposing Supabase's browser-safe configuration to the Unsaid Vite app.
---

Use VITE-prefixed Supabase variables for browser auth, and restart the web workflow after changing them so Vite injects the new values into the client bundle.

**Why:** Vite reads client environment variables when the dev server starts; changing workspace values without a restart can leave the app reporting missing configuration.

**How to apply:** Keep the project URL and publishable key in workspace environment configuration, never in source code, and verify the restarted `/login` route before debugging Supabase client code.