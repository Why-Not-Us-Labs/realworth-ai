# Friend Request Flow: Search → Request → Accept

*Internal documentation explaining how the social/friends system works.*

---

## Overview

Users can:
1. Search for other users by name or @username
2. Send friend requests
3. Accept/decline incoming requests
4. View friends' public appraisals

---

## Database Schema

```sql
CREATE TABLE friendships (
  id UUID PRIMARY KEY,
  requester_id UUID REFERENCES users(id),  -- Who sent the request
  addressee_id UUID REFERENCES users(id),  -- Who received it
  status TEXT,  -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## User Searches for a Friend

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User types in search box (Friends page, Search tab)  │
│    - Can search by name or @username                        │
│    - Debounced input (waits for typing to stop)             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE: dbService.searchUsers(query)                    │
│                                                             │
│    SELECT * FROM users                                      │
│    WHERE name ILIKE '%query%'                               │
│       OR username ILIKE '%query%'                           │
│    LIMIT 20                                                 │
│                                                             │
│    Returns: [{ id, name, picture, username }]               │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. UI: Shows search results with "Add Friend" buttons       │
│    - Checks existing friendship status for each result      │
│    - Shows appropriate button state                         │
└─────────────────────────────────────────────────────────────┘
```

---

## User Sends Friend Request

```
┌─────────────────────────────────────────────────────────────┐
│ 1. UI: User clicks "Add Friend" button                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. SERVICE: dbService.sendFriendRequest(myId, theirId)      │
│                                                             │
│    INSERT INTO friendships (                                │
│      requester_id: myId,                                    │
│      addressee_id: theirId,                                 │
│      status: 'pending'                                      │
│    )                                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. UI: Button changes to "Pending" (disabled)               │
│    - Other user will see request in their Requests tab      │
└─────────────────────────────────────────────────────────────┘
```

---

## User Receives Friend Request

```
┌─────────────────────────────────────────────────────────────┐
│ 1. POLLING: BottomTabNav checks for pending requests        │
│    - Every 30 seconds                                       │
│    - dbService.getPendingRequests(userId)                   │
│    - Shows badge count on Friends tab                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. UI: User opens Friends page → Requests tab               │
│    - Shows list of pending requests with Accept/Decline     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SERVICE: dbService.respondToFriendRequest(id, response)  │
│                                                             │
│    UPDATE friendships                                       │
│    SET status = 'accepted' (or 'declined')                  │
│    WHERE id = friendshipId                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RESULT:                                                  │
│    - If accepted: Both users now see each other as friends  │
│    - If declined: Request disappears, can be re-sent later  │
└─────────────────────────────────────────────────────────────┘
```

---

## Friendship States

```
                    sendFriendRequest()
        ┌──────────────────────────────────────┐
        │                                      ▼
    [none] ────────────────────────────► [pending]
        ▲                                      │
        │                                      │ respondToFriendRequest()
        │                                      │
        │    declined                          ▼
        └─────────────────────────────── [accepted] or [declined]
                                               │
                                               │ removeFriend()
                                               ▼
                                            [none]
```

---

## Getting Friends List

```
┌─────────────────────────────────────────────────────────────┐
│ SERVICE: dbService.getFriends(userId)                       │
│                                                             │
│ SELECT * FROM friendships                                   │
│ WHERE status = 'accepted'                                   │
│   AND (requester_id = userId OR addressee_id = userId)      │
│                                                             │
│ Then extracts "the other person" from each relationship     │
│ Returns: [{ id, name, picture, username }]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Checking Friendship Status

```
┌─────────────────────────────────────────────────────────────┐
│ SERVICE: dbService.getFriendshipStatus(myId, theirId)       │
│                                                             │
│ SELECT * FROM friendships                                   │
│ WHERE (requester = me AND addressee = them)                 │
│    OR (requester = them AND addressee = me)                 │
│                                                             │
│ Returns: {                                                  │
│   status: 'pending' | 'accepted' | 'declined' | null,       │
│   friendshipId: 'uuid',                                     │
│   isRequester: boolean (did I send the request?)            │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## UI Button States

| Status | isRequester | Button Shows |
|--------|-------------|--------------|
| `null` | - | "Add Friend" |
| `pending` | `true` | "Pending" (disabled) |
| `pending` | `false` | "Accept" / "Decline" |
| `accepted` | - | "Friends" or "Remove" |
| `declined` | - | "Add Friend" (can retry) |

---

## Key Files

| File | Purpose |
|------|---------|
| `app/friends/page.tsx` | Friends page with 3 tabs |
| `services/dbService.ts` | Friend-related database operations |
| `components/BottomTabNav.tsx` | Badge polling for pending requests |

---

## Database Functions Used

| Function | Purpose |
|----------|---------|
| `searchUsers(query)` | Find users by name/@username |
| `sendFriendRequest(from, to)` | Create pending friendship |
| `respondToFriendRequest(id, response)` | Accept or decline |
| `getFriendshipStatus(me, them)` | Check relationship |
| `getPendingRequests(userId)` | Incoming requests |
| `getSentRequests(userId)` | Outgoing requests |
| `getFriends(userId)` | Accepted friends list |
| `cancelFriendRequest(id)` | Cancel outgoing request |
| `removeFriend(id)` | Delete friendship |

---

*Last updated: January 2026*
