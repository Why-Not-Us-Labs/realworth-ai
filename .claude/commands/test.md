# /test

Run tests on the codebase.

## Command

If Jest/Vitest is configured:
```bash
npm run test
```

If no test framework, verify with build:
```bash
npm run build
```

## What to Report

1. Total tests run
2. Passed / Failed / Skipped counts
3. For failures:
   - Test name and file
   - Expected vs actual
   - Stack trace snippet
4. Coverage summary (if available)

## Run Specific Tests

```bash
npm run test -- --testPathPattern="<pattern>"
npm run test -- -t "<test name>"
```

## Note

RealWorth.ai currently uses build verification as primary testing.
Consider adding Jest/Vitest for unit tests in the future.
