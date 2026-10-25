How to use WhatsApp Group Chats for Free
The official Meta WhatsApp Business API does not allow bots inside regular group chats. However, you have two 100% free options:
1. Open-Source WhatsApp Web Client (@whiskeysockets/baileys or whatsapp-web.js): Free and open-source. You scan a QR code from your terminal using WhatsApp's "Linked Devices" feature. Your script acts like WhatsApp Web, reads every group message in real time, and replies with links.
2. WhatsApp .txt Chat Export + Discord/Telegram Mirror (Recommended Safety Net): Let users drop a WhatsApp Export Chat .txt file to backfill 1,000+ past messages instantly, and optionally connect a free Telegram/Discord bot so judges can test live group messages without needing your personal WhatsApp open.
# PRD: CampusNest — Group Chat to Interactive Housing Map (Track 3)

## 1. Problem Statement
Students rely on chaotic WhatsApp housing groups for subleases, lease takeovers, and roommate searches. Finding a match requires manually searching keywords ("male", "veg", "$800") and scrolling through hundreds of unstructured messages.

## 2. Solution Overview
An AI Group Chat Assistant that listens to WhatsApp housing groups, extracts structured listing data via an LLM into a self-cleaning database, and serves a mobile-first Map UI where students filter listings by rent, gender, diet, and amenities—and can also query the bot directly inside the group chat.

## 3. System Architecture & Free Open-Source Stack
- **Chat Ingestion:** `@whiskeysockets/baileys` (Open-source WhatsApp Web socket client) + WhatsApp `.txt` export parser for historical backfill.
- **LLM Extraction:** Groq API (Free tier running `llama-3.3-70b-versatile`) or Google Gemini Flash (Free tier) using **Structured Outputs / JSON Schema**.
- **Geocoding:** OpenStreetMap Nominatim API (Free) or Mapbox Geocoding (Free tier) to convert apartment names/addresses near campus into `lat/lng`.
- **Database:** Supabase (Free hosted PostgreSQL).
- **Frontend UI:** Next.js / React + Tailwind CSS + **Leaflet.js / OpenStreetMap** (100% free map rendering, no billing card required) hosted on Vercel.

## 4. Core Pipeline & Functional Requirements

### Step 1: Group Chat Listener & Backfill
- Listen to incoming group messages via `Baileys` (`messages.upsert` event).
- Ignore short chatter (< 30 chars) or non-housing messages.
- Support `.txt` WhatsApp chat export upload to parse the last 60 days of history in bulk.

### Step 2: LLM Structured JSON Extraction
Pass each candidate message to the LLM with strict JSON schema enforcement. Unmentioned fields **must** default to `null` (and are ignored during filtering, not counted as `false`):

```json
{
  "is_housing_post": true,
  "listing_type": "sublease | lease_transfer | roommate_needed | looking_for_place",
  "rent_monthly": 750,
  "utilities_included": null,
  "gender_preference": "male | female | mixed | null",
  "dietary_preference": "veg | non_veg | vegan | null",
  "location_text": "University Trails, 5 min from campus",
  "move_in_date": "2026-05-15",
  "move_out_date": "2026-08-15",
  "private_room": true,
  "private_bath": false,
  "amenities": {
    "pool": true,
    "gym": true,
    "study_room": null,
    "in_unit_laundry": true,
    "parking": null,
    "furnished": true
  },
  "contact_phone": "15551234567",
  "summary": "1B in 4B2B at University Trails, male veg preferred"
}
- Filter Rule: Only store posts where is_housing_post == true and listing_type != "looking_for_place".
Step 3: Dynamic Database, Deduplication & 2-Month Auto-Expiry
- Simple Deduplication: Generate a key from (sender_phone, normalized_location_text, rent_monthly). On conflict, UPSERT and update posted_at to the latest timestamp so reposts in the group update the existing pin instead of creating duplicates.
- 2-Month TTL (Auto-Delete):
- On ingestion, discard messages with posted_at < NOW() - INTERVAL '60 days'.
- Run a daily query (or filter at read time): DELETE FROM listings WHERE posted_at < NOW() - INTERVAL '60 days'.
Step 4: Mobile-First Map UI & Group Chat Bot Reply
- Interactive Map: Pins clustered by apartment complex showing $rent badges.
- Filter Bar (Mobile Drawer):
- Max Rent slider (e.g., <= $900)
- Gender (Male, Female, Any) — Note: null in DB only shows when user toggles "Include unspecified"
- Diet (Veg only, Any)
- Listing Type (Sublease, Lease Takeover, Roommate)
- Amenity Chips (Pool, Gym, Study Room, Furnished, Private Bath) — filters only where field is true.
- Pin Detail Card: Shows extracted summary, collapsible original WhatsApp message, date posted, and a "Message on WhatsApp" button (https://wa.me/<phone>?text=Hi, saw your housing post...).
- In-Chat Trigger: Students can text @CampusNest male veg under $800 with gym in the group; the bot replies with the top 3 matches + a pre-filtered map link (?gender=male&diet=veg&maxRent=800&gym=true).
5. Out of Scope (Hackathon Guardrails)
- In-app messaging or payments (handoff directly to WhatsApp via wa.me deep links).
- Scraping photos/videos from WhatsApp (text extraction + street/complex coordinates only for MVP speed).