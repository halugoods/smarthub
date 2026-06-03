# Smart Hub — Halu Goods

Content distribution system for Dimsum Sewu.

**Flow:**
1. Telegram → Hermes → vision_analyze + CDH generation
2. Hermes POST to Smart Hub API → create 7 drafts (per cabang)
3. Scheduler auto-publishes at 14:00 WIB
4. Crew login with PIN → view task → download asset → upload to IG/TikTok → submit link
5. Admin verifies → Selesai

**Architecture:**
- Frontend: Cloudflare Pages (static SPA)
- Backend: Cloudflare Pages Functions (Workers)
- Database: Cloudflare D1 (SQLite)

**Deployment:**
- `smarthub.halugoods.com` — main app (both admin & crew)
