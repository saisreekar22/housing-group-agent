import { promises as fs } from "node:fs";
import path from "node:path";
import { getSupabaseClient } from "@/lib/db/supabase";
import type { WhatsAppGroup } from "@/lib/types";

const LOCAL_FILE = path.join(process.cwd(), ".tracked_groups.json");

type SupabaseLike = ReturnType<typeof getSupabaseClient>;

async function readLocalTrackedGroups(): Promise<string[]> {
  try {
    const contents = await fs.readFile(LOCAL_FILE, "utf8");
    const parsed = JSON.parse(contents);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string");
    }
    return [];
  } catch {
    return [];
  }
}

async function writeLocalTrackedGroups(groupIds: string[]): Promise<void> {
  try {
    await fs.writeFile(LOCAL_FILE, JSON.stringify(groupIds, null, 2), "utf8");
  } catch (error) {
    console.warn(`Unable to persist tracked groups locally: ${String(error)}`);
  }
}

export async function loadTrackedGroupIds(
  options: { client?: SupabaseLike } = {}
): Promise<string[]> {
  const client = options.client === undefined ? getSupabaseClient() : options.client;
  if (client) {
    const { data, error } = await client
      .from("tracked_groups")
      .select("group_id")
      .eq("tracked", true);
    if (!error && data) {
      return data
        .map((row) => row.group_id as string)
        .filter((value) => typeof value === "string");
    }
  }
  return readLocalTrackedGroups();
}

export async function saveTrackedGroups(
  groups: WhatsAppGroup[],
  options: { client?: SupabaseLike } = {}
): Promise<string[]> {
  const selectedIds = groups.map((group) => group.id);
  const client = options.client === undefined ? getSupabaseClient() : options.client;

  if (!client) {
    await writeLocalTrackedGroups(selectedIds);
    return selectedIds;
  }

  const { error: resetError } = await client
    .from("tracked_groups")
    .update({ tracked: false })
    .neq("group_id", "");
  if (resetError) {
    // Keep WhatsApp usable when Supabase has not been initialized yet. The
    // local file is also useful during development and offline demos.
    console.warn(`Supabase tracked_groups unavailable; using local storage: ${resetError.message}`);
    await writeLocalTrackedGroups(selectedIds);
    return selectedIds;
  }

  if (groups.length > 0) {
    const payload = groups.map((group) => ({
      group_id: group.id,
      group_name: group.subject,
      member_count: group.size,
      tracked: true,
    }));
    const { error } = await client
      .from("tracked_groups")
      .upsert(payload, { onConflict: "group_id", ignoreDuplicates: false });
    if (error) {
      console.warn(`Supabase tracked_groups unavailable; using local storage: ${error.message}`);
      await writeLocalTrackedGroups(selectedIds);
      return selectedIds;
    }
  }

  await writeLocalTrackedGroups(selectedIds);
  return selectedIds;
}
