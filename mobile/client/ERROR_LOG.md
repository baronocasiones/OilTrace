# OilTrace Mobile — Error Log

> **Purpose**: Record every significant error, bug, or gotcha encountered during development — and exactly how it was fixed — so it never wastes time twice.
>
> **How to add an entry**:
> 1. Copy the template below.
> 2. Fill in all fields while the context is fresh.
> 3. Add the entry at the **top** of the log (newest first).

---

## Template (copy for each new error)

```markdown
### ERR-XXX — [Short Error Title]

**Date**: YYYY-MM-DD  
**Feature**: F-XXX or "Bootstrap"  
**Severity**: Low | Medium | High | Blocker  
**Environment**: iOS Simulator | Android Emulator | Physical Device | All

#### Error
Paste the exact error message or describe the unexpected behavior.

#### Root Cause
What actually caused it?

#### Fix
Exact steps or code change that resolved it.

#### Prevention
What should be done differently in the future to avoid this?
```

---

## Error Log

<!-- Newest entries go at the top -->

### ERR-002 — FlashList Missing estimatedItemSize

**Date**: 2026-07-02  
**Feature**: F-004  
**Severity**: High  
**Environment**: All

#### Error
Red screen crash or runtime error indicating that `FlashList requires estimatedItemSize to be set`. 

#### Root Cause
When migrating from `FlatList` to `@shopify/flash-list` for performance, the `estimatedItemSize` prop is strictly required for its internal recycling engine to function, but it was omitted.

#### Fix
Added `estimatedItemSize={120}` (or an appropriate height estimate) to the `<FlashList />` component.

#### Prevention
When implementing `FlashList` as mandated by the `react-native-best-practices` skill, always include `estimatedItemSize` alongside `data` and `renderItem`.

---

### ERR-001 — Expo Metro Bundler Resolution Errors / Phantom Errors

**Date**: 2026-07-02  
**Feature**: All  
**Severity**: Blocker  
**Environment**: All

#### Error
`npx expo start` throws resolution errors ("module not found") for new files, or the app cannot start, despite the codebase being perfectly correct and `tsc --noEmit` passing.

#### Root Cause
The `npx expo start` packager was running in an old, renamed, or deleted directory (e.g. `frontend/client` instead of `mobile/client`). The bundler was blind to the new folder structure and couldn't resolve newly created files or modules.

#### Fix
1. Killed the stale `npx expo start` terminal process.
2. Navigated to the correct project root (`cd mobile/client`).
3. Started the packager with a cleared cache: `npx expo start --clear`.

#### Prevention
Whenever renaming root directories or performing major structural refactoring, immediately terminate and restart the Metro bundler in the new path.
