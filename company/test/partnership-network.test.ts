import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { NETWORK_INSTITUTIONS, NETWORK_REGIONS, institutionsByKind, logoPath } from "../lib/partnership-network";

test("presentation activities and partner logos are complete", () => {
  assert.equal(NETWORK_INSTITUTIONS.length, 28);
  assert.equal(new Set(NETWORK_INSTITUTIONS.map(item => item.id)).size, 28);
  assert.equal(institutionsByKind("municipality").length, 9);
  assert.equal(institutionsByKind("university").length, 12);
  assert.equal(institutionsByKind("partner").length, 7);
  for (const [status, count] of [["completed", 5], ["ongoing", 4], ["supported", 10], ["planned", 2]] as const) {
    assert.equal(NETWORK_INSTITUTIONS.filter(item => "status" in item && item.status === status).length, count);
  }
  assert.equal(institutionsByKind("university").find(item => item.id === "kimpo")?.plannedStart, "2027-03");
  assert.equal(institutionsByKind("university").find(item => item.id === "hanyeong")?.plannedStart, "2027-09");
  for (const item of NETWORK_INSTITUTIONS) assert.ok(existsSync(path.join(process.cwd(), "public", logoPath(item.id))));
});

test("all six languages describe every institution and region", () => {
  for (const locale of ["ko", "en", "ja", "ne", "vi", "lo"]) {
    const { network } = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
    for (const item of NETWORK_INSTITUTIONS) {
      assert.ok(network.institutions[item.id].name);
      assert.ok(network.institutions[item.id].description);
    }
    for (const region of NETWORK_REGIONS) assert.ok(network.regions[region.id]);
  }
  const ko = JSON.parse(readFileSync("messages/ko.json", "utf8")).network;
  assert.match(ko.institutions.yeoju.description, /라이쩌우성/);
  assert.match(ko.institutions.anseong.description, /라이쩌우성/);
  assert.equal(ko.institutions.woosuk.description, "대학원");
});
