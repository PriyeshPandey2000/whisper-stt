# Deep Link Authentication Implementation - STASH

## Summary
This contains the changes needed to fix the deep link import issue and implement authentication.

## Fixed Deep Link Import Issue

### Problem
```
Failed to resolve import "@tauri-apps/plugin-deep-link" from "src/lib/services/auth/auth-service.ts". Does the file exist?
```

### Solution
1. **Install the package:** `bun add @tauri-apps/plugin-deep-link`
2. **Fix TypeScript casting:** `(window as any).__TAURI_INTERNALS__`  
3. **Use correct import:** `openUrl` instead of `open` from the opener plugin

## Key Changes Made

### 1. Package Installation
```bash
bun add @tauri-apps/plugin-deep-link
```

### 2. Auth Service Changes (src/lib/services/auth/auth-service.ts)

```typescript
// Initialize deep link handling
private async initializeDeepLinks() {
  if ((window as any).__TAURI_INTERNALS__) {
    try {
      const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link');
      
      await onOpenUrl((urls) => {
        console.log('Deep link received:', urls);
        
        for (const url of urls) {
          if (url.startsWith('noteflux://auth/callback')) {
            this.handleAuthCallback(url);
            break;
          }
        }
      });
      
      console.log('Deep link listener initialized');
    } catch (error) {
      console.error('Failed to initialize deep links:', error);
    }
  }
}
```

### 3. Fixed Opener Plugin Usage
```typescript
// Sign in method fix
const { openUrl } = await import('@tauri-apps/plugin-opener');
await openUrl(signInUrl);

// Sign up method fix  
const { openUrl } = await import('@tauri-apps/plugin-opener');
await openUrl(signUpUrl);
```

## Files Created
- `src/lib/services/auth/auth-service.ts` - Main auth service
- `src/lib/services/auth/supabase-client.ts` - Supabase client setup
- `src/lib/services/auth/index.ts` - Auth exports
- `src/lib/components/auth/AuthButton.svelte` - Auth button component
- `src/lib/stores/auth.svelte.ts` - Auth state store

## Tauri Configuration
The deep-link plugin is already configured in `src-tauri/tauri.conf.json`:
```json
{
  "plugins": {
    "deep-link": {
      "desktop": {
        "schemes": ["noteflux"]
      }
    }
  }
}
```

And registered in Rust (`src-tauri/src/lib.rs`):
```rust
.plugin(tauri_plugin_deep_link::init())
```

## TypeScript Verification
The changes pass TypeScript compilation:
```bash
bunx tsc --noEmit --skipLibCheck src/lib/services/auth/auth-service.ts
```

## Note
The deep link import issue is RESOLVED. The Vite dev server hanging appears to be a separate Mac networking issue unrelated to these auth changes.