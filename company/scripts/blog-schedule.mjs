import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const policyPath = path.join(scriptDirectory, "..", "content", "blog", "automation-policy.json");

export function getTokyoDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function resolveBlogSchedule(date, policy = JSON.parse(fs.readFileSync(policyPath, "utf8"))) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("--date는 YYYY-MM-DD 형식이어야 합니다.");
  const weekday = new Date(`${date}T12:00:00+09:00`).getUTCDay();
  const scheduled = policy.schedule[String(weekday)];
  if (!scheduled) return { scheduled: false, date, timezone: policy.timezone, reason: "월·수·금 실행일이 아닙니다." };
  return {
    scheduled: true,
    date,
    timezone: policy.timezone,
    startTime: policy.startTime,
    maxOpenAutomationPrs: policy.maxOpenAutomationPrs,
    branchPrefix: `${policy.branchPrefix}${date}-${scheduled.locale}-`,
    ...scheduled,
  };
}

function readArgument(name) {
  const prefixed = `${name}=`;
  const argument = process.argv.slice(2).find((value) => value.startsWith(prefixed));
  return argument?.slice(prefixed.length);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const date = readArgument("--date") ?? getTokyoDate();
    const result = resolveBlogSchedule(date);
    console.log(JSON.stringify({ mode: process.argv.includes("--dry-run") ? "dry-run" : "scheduled", ...result }, null, 2));
    if (!result.scheduled) process.exitCode = 2;
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
