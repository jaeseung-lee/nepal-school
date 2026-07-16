import assert from "node:assert/strict";
import test from "node:test";
import {
  buildListHref,
  clampPage,
  pageRange,
  paginationItems,
  parseCompanyListParams,
  parseJobListParams,
  parseListView,
  parsePage,
  resultRange,
  SALES_LIST_PAGE_SIZE,
  totalPages,
} from "@/lib/sales/listing";

test("list pagination normalizes invalid pages and returns a 25-row range", () => {
  assert.equal(SALES_LIST_PAGE_SIZE, 25);
  assert.equal(parsePage(undefined), 1);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-2"), 1);
  assert.equal(parsePage("abc"), 1);
  assert.equal(parsePage("3"), 3);
  assert.deepEqual(pageRange(3), { from: 50, to: 74 });
  assert.equal(totalPages(51), 3);
  assert.equal(clampPage(9, 51), 3);
  assert.deepEqual(resultRange(3, 51), { from: 51, to: 51 });
});

test("list parsers keep supported filters and discard invalid values", () => {
  const jobs = parseJobListParams(new URLSearchParams("q=care&status=broken&employment=FULL_TIME&grade=A&page=2"));
  assert.deepEqual({ q: jobs.q, status: jobs.status, employment: jobs.employment, grade: jobs.grade, page: jobs.page }, { q: "care", status: "all", employment: "FULL_TIME", grade: "A", page: 2 });
  const companies = parseCompanyListParams(new URLSearchParams("stage=meeting&contact=invalid&owner=not-a-uuid"));
  assert.deepEqual({ stage: companies.stage, contact: companies.contact, owner: companies.owner }, { stage: "meeting", contact: "all", owner: "all" });
});

test("pagination links preserve active filters, omit defaults, and show bounded page numbers", () => {
  assert.equal(buildListHref("/sales/jobs", { q: "介護", status: "active", grade: "all" }, 4), "/sales/jobs?q=%E4%BB%8B%E8%AD%B7&status=active&page=4");
  assert.equal(buildListHref("/sales/jobs", { status: "all" }, 1), "/sales/jobs");
  assert.deepEqual(paginationItems(5, 10), [1, "ellipsis-start", 3, 4, 5, 6, 7, "ellipsis-end", 10]);
  assert.equal(parseListView("cards"), "cards");
  assert.equal(parseListView("unexpected"), "table");
});
