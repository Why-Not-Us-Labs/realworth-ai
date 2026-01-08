# /typecheck

Run TypeScript type checking on the codebase.

## Command

```bash
npm run build
```

Or if you want faster type-only checking:

```bash
npx tsc --noEmit
```

## What to Report

1. Total number of errors (if any)
2. List each error with:
   - File path and line number
   - Error message
   - Suggested fix
3. If clean, confirm "No type errors found"

## Auto-fix

If there are simple type errors, offer to fix them automatically.
