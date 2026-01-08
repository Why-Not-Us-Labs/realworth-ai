# Build Validator Agent

Verify that the codebase builds correctly after changes.

## Purpose

Run after completing code changes to ensure nothing is broken before committing.

## Steps

1. **Run TypeScript build:**
   ```bash
   npm run build
   ```

2. **Run ESLint:**
   ```bash
   npm run lint
   ```

3. **Check for common issues:**
   - Unused imports
   - Missing type annotations
   - Console.log statements left in
   - TODO comments that should be addressed

## Report Format

```
## Build Validation Report

### TypeScript Build
- Status: PASS / FAIL
- Errors: [list if any]

### ESLint
- Status: PASS / FAIL
- Errors: [count]
- Warnings: [count]
- Issues: [list significant ones]

### Recommendations
- [Any suggestions for improvement]
```

## On Failure

If the build fails:
1. Report the specific errors
2. Suggest fixes
3. Ask if you should apply fixes automatically
