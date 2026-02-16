# Chat Feature Fixes TODO

## Tasks:
1. [x] Add confirmation modal for delete conversation in Chats.tsx
2. [x] Badge for unread messages - already implemented in code
3. [x] Last message in header dropdown - already implemented in code
4. [x] Avatar with initials - already implemented in both files

## Notes:
- ✅ ChatHeaderButton.tsx already has delete confirmation modal
- ✅ Chats.tsx now has delete confirmation modal added
- ✅ Avatar initials are already implemented in both files
- ⚠️ is_seen issue: Backend issue - messages are being created with is_seen=true. 
  - The sendMessage function in supabase.ts correctly sets is_seen=false
  - But there's a logic issue: unread_count increments for ALL messages (including admin's own messages)
  - Need to check for database triggers or other code that's setting is_seen=true
  - This is causing the badge and header dropdown to not work properly
