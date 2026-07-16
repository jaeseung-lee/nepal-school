import assert from "node:assert/strict";
import test from "node:test";
import { salesMessages, stageLabels } from "@/lib/sales/i18n";

test("Japanese and Korean sales dictionaries contain identical keys", () => {
  assert.deepEqual(Object.keys(salesMessages.ja).sort(), Object.keys(salesMessages.ko).sort());
  assert.deepEqual(Object.keys(stageLabels.ja).sort(), Object.keys(stageLabels.ko).sort());
});
