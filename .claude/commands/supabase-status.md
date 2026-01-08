# /supabase-status

Check Supabase project health, logs, and advisors.

## Project Info

- Project ID: `gwoahdeybyjfonoahmvv`
- Dashboard: https://supabase.com/dashboard/project/gwoahdeybyjfonoahmvv

## Commands (via MCP)

1. **Get project status:**
   Use `mcp__supabase__get_project` with id `gwoahdeybyjfonoahmvv`

2. **Check recent logs:**
   Use `mcp__supabase__get_logs` with project_id and service:
   - `api` - API gateway logs
   - `postgres` - Database logs
   - `auth` - Authentication logs
   - `storage` - Storage logs
   - `edge-function` - Edge function logs

3. **Check advisors:**
   Use `mcp__supabase__get_advisors` for security and performance recommendations

## What to Report

1. Project status (healthy/degraded)
2. Recent errors in logs (last 24h)
3. Any security advisors (especially missing RLS)
4. Any performance advisors
5. Database connection status

## Quick Health Check

```
List tables, check for any advisors, and report overall health.
```
