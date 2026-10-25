import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import {
  extractChatTextFromZip,
  filterCandidateMessages,
  isHousingCandidate,
  parseWhatsAppExport,
  parseWhatsAppExportFile,
  parseWhatsAppText,
} from "@/lib/whatsapp/parser";

const NOW = new Date("2026-10-25T12:00:00.000Z");

const IOS_EXPORT = `[10/20/2026, 10:30:15 AM] Maya: Subleasing my private room at University House Tempe for $780/month starting Nov 15. Female veg preferred. Text 602-555-0101.
[10/20/2026, 10:31:00 AM] Arjun: lol
[10/21/2026, 11:00:00 AM] Liam: Anyone selling football tickets for the ASU game this weekend? Let me know.
[10/22/2026, 9:15:00 AM] Priya: Lease takeover at Vista del Sol starting Jan 1. $1,025/month, private bath, female unit. Contact +1 (480) 555-0199.
[8/01/2026, 9:00:00 AM] Old Post: Sublease available at Gateway at Tempe for $600 per month with pool.
This is a continuation of the previous message.`;

const ANDROID_EXPORT = `10/22/2026, 9:15 PM - Priya: Lease takeover at Vista del Sol starting Jan 1. $1,025/month, private bath, female unit. Contact +1 (480) 555-0199.
10/22/2026, 9:16 PM - Sam: <Media omitted>
10/23/2026, 8:00 AM - Diego: Roommate needed at Paseo on University, $725 per month with utilities included. Male preferred, gym and parking.`;

describe("WhatsApp text parsing", () => {
  it("parses iOS bracket timestamps, senders, and multi-line messages", () => {
    const messages = parseWhatsAppText(IOS_EXPORT);
    expect(messages).toHaveLength(5);
    expect(messages[0].senderName).toBe("Maya");
    expect(messages[0].timestamp.toISOString()).toBe("2026-10-20T10:30:15.000Z");
    expect(messages[0].text).toContain("$780/month");
    expect(messages[3].text).toContain("555-0199");
    expect(messages[4].text).toContain("This is a continuation");
  });

  it("parses Android dash timestamps and 24-hour/PM times", () => {
    const messages = parseWhatsAppText(ANDROID_EXPORT);
    expect(messages).toHaveLength(3);
    expect(messages[0].timestamp.toISOString()).toBe("2026-10-22T21:15:00.000Z");
    expect(messages[2].senderName).toBe("Diego");
    expect(messages[2].text).toContain("Paseo on University");
  });

  it("filters out short, old, and non-housing messages", () => {
    const parsed = parseWhatsAppExport(IOS_EXPORT, { now: NOW });
    expect(parsed.candidates).toHaveLength(2);
    expect(parsed.candidates[0].senderName).toBe("Maya");
    expect(parsed.candidates[1].senderName).toBe("Priya");
    expect(parsed.skippedOld).toBe(1);
    expect(parsed.skippedShort).toBe(1);
    expect(parsed.skippedNonHousing).toBe(1);
  });

  it("applies the 30-character minimum and housing keyword rules directly", () => {
    expect(isHousingCandidate("Short $500")).toBe(true);
    expect(isHousingCandidate("Anyone selling football tickets")).toBe(false);
    const { candidates } = filterCandidateMessages(
      [
        { id: 1, timestamp: NOW, senderName: "A", text: "Too short $500" },
        {
          id: 2,
          timestamp: NOW,
          senderName: "B",
          text: "Room available near campus starting January for $700.",
        },
      ],
      { now: NOW }
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].senderName).toBe("B");
  });
});

describe("WhatsApp .zip exports", () => {
  it("unpacks .txt chat files from a zip archive", async () => {
    const zip = new JSZip();
    zip.file("WhatsApp Chat with ASU Housing.txt", IOS_EXPORT);
    const buffer = await zip.generateAsync({ type: "uint8array" });

    const text = await extractChatTextFromZip(buffer);
    expect(text).toContain("University House Tempe");

    const parsed = await parseWhatsAppExportFile("WhatsApp Chat.zip", buffer, { now: NOW });
    expect(parsed.candidates).toHaveLength(2);
    expect(parsed.messages).toHaveLength(5);
  });

  it("parses a plain .txt export by file name", async () => {
    const buffer = new TextEncoder().encode(ANDROID_EXPORT);
    const parsed = await parseWhatsAppExportFile("chat.txt", buffer, { now: NOW });
    expect(parsed.candidates).toHaveLength(2);
  });

  it("rejects zips without a .txt export", async () => {
    const zip = new JSZip();
    zip.file("photo.jpg", "not a chat");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    await expect(extractChatTextFromZip(buffer)).rejects.toThrow(/No \.txt/);
  });
});
