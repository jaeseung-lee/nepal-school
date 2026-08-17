import assert from "node:assert/strict";
import test from "node:test";
import {
  activityTypeLabels,
  addressTypeLabels,
  confidenceLabels,
  contactKindLabels,
  contactReadinessLabels,
  discoveryMethodLabels,
  employmentTypeLabels,
  formatEmploymentType,
  formatOrganizationType,
  formatStatusLabel,
  organizationTypeLabels,
  priorityLabels,
  researchStatusLabels,
  roleLabels,
  salesMessages,
  scoreReasonLabels,
  signalLabels,
  stageLabels,
  statusLabels,
} from "@/lib/sales/i18n";

test("Japanese and Korean sales dictionaries contain identical keys", () => {
  assert.deepEqual(Object.keys(salesMessages.ja).sort(), Object.keys(salesMessages.ko).sort());
  for (const labels of [stageLabels, statusLabels, employmentTypeLabels, organizationTypeLabels, priorityLabels, activityTypeLabels, contactKindLabels, contactReadinessLabels, researchStatusLabels, discoveryMethodLabels, addressTypeLabels, confidenceLabels, roleLabels, signalLabels, scoreReasonLabels]) {
    assert.deepEqual(Object.keys(labels.ja).sort(), Object.keys(labels.ko).sort());
  }
});

test("sales enum formatters localize known values and preserve unknown source values", () => {
  assert.equal(formatStatusLabel("active", "ko"), "활성");
  assert.equal(formatStatusLabel("active", "ja"), "有効");
  assert.equal(formatOrganizationType("direct_employer", "ko"), "직접고용 기업");
  assert.equal(formatEmploymentType("FULL_TIME,PART_TIME", "ja"), "フルタイム、パートタイム");
  assert.equal(formatEmploymentType("FULL_TIME,PART_TIME", "ko"), "풀타임, 파트타임");
  assert.equal(formatEmploymentType("正社員", "ko"), "正社員");
  assert.equal(formatStatusLabel("future_status", "ko"), "future_status");
});
