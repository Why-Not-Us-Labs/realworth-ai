# Authentication Flow: Google/Apple OAuth → Session

*Internal documentation explaining how users sign in and stay authenticated.*

---

## Overview

RealWorth uses **Supabase Auth** with OAuth providers:
- Google OAuth (primary)
- Apple Sign In (iOS users)

No email/password - social login only.

---

## User Clicks "Sign In with Google"

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks sign-in button                           │
│    - AuthContext.signInWithProvider('google')               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE: authService.signInWithProvider('google')        │
│                                                             │
│    supabase.auth.signInWithOAuth({                          │
│      provider: 'google',                                    │
│      options: {                                             │
│        redirectTo: window.location.origin,                  │
│        queryParams: {                                       │
│          access_type: 'offline',                            │
│          prompt: 'consent'                                  │
│        }                                                    │
│      }                                                      │
│    })                                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. REDIRECT: Browser goes to Google login page              │
│    - User enters Google credentials                         │
│    - Grants permission to RealWorth                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. CALLBACK: Google redirects back to RealWorth             │
│    - URL includes auth code                                 │
│    - Supabase exchanges code for session                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SESSION: Supabase creates/updates user                   │
│                                                             │
│    If new user:                                             │
│    - Creates auth.users record                              │
│    - Triggers handle_new_user() function                    │
│    - Creates public.users profile record                    │
│                                                             │
│    Session stored in:                                       │
│    - localStorage (access_token, refresh_token)             │
│    - Supabase manages automatically                         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. AUTH STATE CHANGE: AuthContext updates                   │
│                                                             │
│    onAuthStateChange callback fires:                        │
│    - setUser(mappedUser)                                    │
│    - UI re-renders with user data                           │
└─────────────────────────────────────────────────────────────┘
```

---

## App Loads (Existing Session)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AuthProvider mounts (wraps entire app)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Check for existing session                               │
│                                                             │
│    authService.getCurrentUser()                             │
│      → supabase.auth.getSession()                           │
│                                                             │
│    If session exists and valid:                             │
│      → Map to User type, set in state                       │
│    If no session:                                           │
│      → user = null                                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Subscribe to auth changes                                │
│                                                             │
│    authService.onAuthStateChange(callback)                  │
│      → supabase.auth.onAuthStateChange()                    │
│                                                             │
│    Events: SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED           │
└─────────────────────────────────────────────────────────────┘
```

---

## Making Authenticated API Calls

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT: Get current session                              │
│                                                             │
│    const { data: { session } } = await                      │
│      supabase.auth.getSession();                            │
│                                                             │
│    const authToken = session?.access_token;                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CLIENT: Include in API request                           │
│                                                             │
│    fetch('/api/appraise', {                                 │
│      headers: {                                             │
│        'Authorization': `Bearer ${authToken}`               │
│      }                                                      │
│    })                                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVER: Validate token                                   │
│                                                             │
│    const authHeader = req.headers.get('authorization');     │
│    const token = authHeader?.replace('Bearer ', '');        │
│                                                             │
│    // Create authenticated Supabase client                  │
│    const supabase = createClient(url, anonKey, {            │
│      global: {                                              │
│        headers: { Authorization: `Bearer ${token}` }        │
│      }                                                      │
│    });                                                      │
│                                                             │
│    // Get user from token                                   │
│    const { data: { user } } = await                         │
│      supabase.auth.getUser(token);                          │
└─────────────────────────────────────────────────────────────┘
```

---

## User Signs Out

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks sign out                                 │
│    - AuthContext.signOut()                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE: authService.signOut()                           │
│    - supabase.auth.signOut()                                │
│    - Clears localStorage tokens                             │
│    - Invalidates session                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. AUTH STATE CHANGE fires                                  │
│    - setUser(null)                                          │
│    - UI shows signed-out state                              │
└─────────────────────────────────────────────────────────────┘
```

---

## New User Profile Creation

When a new user signs in, Supabase trigger creates their profile:

```sql
-- In database (handle_new_user function)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, picture)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## User Data Mapping

Different providers return different metadata:

```typescript
// Google returns:
{
  name: "John Doe",
  email: "john@gmail.com",
  avatar_url: "https://..."
}

// Apple returns:
{
  firstName: "John",
  lastName: "Doe",
  email: "privaterelay@icloud.com"
  // Note: Name only on FIRST sign-in!
}

// Our mapping handles both:
mapSupabaseUserToUser(supabaseUser) {
  const metadata = supabaseUser.user_metadata;

  let name = metadata.name || metadata.full_name;
  if (!name && metadata.firstName) {
    name = `${metadata.firstName} ${metadata.lastName}`.trim();
  }

  return {
    id: supabaseUser.id,
    name: name || email.split('@')[0],
    email: supabaseUser.email,
    picture: metadata.avatar_url || metadata.picture
  };
}
```

---

## Key Files

| File | Purpose |
|------|---------|
| `services/authService.ts` | Auth operations wrapper |
| `components/contexts/AuthContext.tsx` | React context provider |
| `lib/supabase.ts` | Supabase client setup |

---

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

---

## Row Level Security (RLS)

Database policies use `auth.uid()` to restrict access:

```sql
-- Users can only read/update their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

---

*Last updated: January 2026*
