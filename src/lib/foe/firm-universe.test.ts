/**
 * The universe must not lose firms.
 *
 * A monitoring system that silently drops employers from its roster fails at
 * the one thing it exists to do, and it fails invisibly — no error, no failed
 * source, just a firm that is never checked again. These tests exist because
 * exactly that happened: a substring fallback mapped every name containing
 * "man" onto Man Group.
 */

import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_WATCHLIST } from "@/lib/default-watchlist";
import { classify } from "./firm-universe";
import { canonicalFirmName } from "./fingerprint";

test("every roster firm keeps its own identity", () => {
  const seen = new Map<string, string>();

  for (const entry of DEFAULT_WATCHLIST) {
    const classified = classify(entry.name);
    const key = canonicalFirmName(classified.name);
    const previous = seen.get(key);
    assert.equal(
      previous,
      undefined,
      `"${entry.name}" and "${previous}" both classify to "${classified.name}" — one of them would be lost`,
    );
    seen.set(key, entry.name);
  }

  assert.equal(seen.size, DEFAULT_WATCHLIST.length, "every firm on the roster must reach the universe");
});

test("a firm resembling another is not absorbed by it", () => {
  // The original bug, pinned: all three contain "man".
  assert.equal(classify("Millennium Management").name, "Millennium Management");
  assert.equal(classify("Apollo Global Management").name, "Apollo Global Management");
  assert.equal(classify("Wellington Management").name, "Wellington Management");
  assert.equal(classify("Man Group").name, "Man Group");
});

test("an unknown firm keeps its own name rather than borrowing one", () => {
  const unknown = classify("Some New Boutique Advisory");
  assert.equal(unknown.name, "Some New Boutique Advisory");
  assert.deepEqual(unknown.categories, ["OTHER_FINANCE"]);
  assert.equal(unknown.tier, "TIER_3");
});

test("known firms get a real classification, not the default", () => {
  assert.deepEqual(classify("Goldman Sachs").categories, ["BULGE_BRACKET"]);
  assert.equal(classify("Goldman Sachs").tier, "TIER_1");
  assert.deepEqual(classify("Jane Street").categories, ["MARKET_MAKER", "PROPRIETARY_TRADING"]);
});
