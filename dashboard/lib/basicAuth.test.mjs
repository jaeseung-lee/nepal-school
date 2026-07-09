import assert from "node:assert/strict";
import test from "node:test";

import { decodeBasicAuthHeader, isBasicAuthValid } from "./basicAuth.mjs";

const TEST_USER = "test-admin";
const TEST_PASSWORD = "example-password-123!";

function basicHeader(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

test("decodes a Basic Authorization header", () => {
  assert.deepEqual(decodeBasicAuthHeader(basicHeader(TEST_USER, TEST_PASSWORD)), {
    username: TEST_USER,
    password: TEST_PASSWORD,
  });
});

test("keeps colons after the username as part of the password", () => {
  assert.deepEqual(decodeBasicAuthHeader(basicHeader("admin", "one:two")), {
    username: "admin",
    password: "one:two",
  });
});

test("rejects missing, malformed, and wrong credentials", () => {
  assert.equal(isBasicAuthValid(null, TEST_USER, TEST_PASSWORD), false);
  assert.equal(isBasicAuthValid("Bearer token", TEST_USER, TEST_PASSWORD), false);
  assert.equal(isBasicAuthValid("Basic not-base64", TEST_USER, TEST_PASSWORD), false);
  assert.equal(isBasicAuthValid(basicHeader(TEST_USER, "wrong"), TEST_USER, TEST_PASSWORD), false);
  assert.equal(isBasicAuthValid(basicHeader("other", TEST_PASSWORD), TEST_USER, TEST_PASSWORD), false);
});

test("accepts the configured username and password", () => {
  assert.equal(isBasicAuthValid(basicHeader(TEST_USER, TEST_PASSWORD), TEST_USER, TEST_PASSWORD), true);
});
