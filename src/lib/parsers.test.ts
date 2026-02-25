import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBatteryLevel,
  parseBooleanLike,
  parseKeyValueOutput,
  parseLineList,
  parseWatchHelperOutput,
} from "./parsers";
import { formatIPhoneModel, formatWatchModel } from "./product-types";

test("parseLineList trims and filters empty lines", () => {
  assert.deepEqual(parseLineList("abc\n\n  def  \n"), ["abc", "def"]);
});

test("parseKeyValueOutput parses colon-delimited lines", () => {
  const parsed = parseKeyValueOutput(
    "DeviceClass: iPhone\nDeviceName: Kian's iPhone\nIgnoredLine\n",
  );
  assert.equal(parsed.DeviceClass, "iPhone");
  assert.equal(parsed.DeviceName, "Kian's iPhone");
  assert.equal(parsed.IgnoredLine, undefined);
});

test("parseBooleanLike normalizes true and false values", () => {
  assert.equal(parseBooleanLike("true"), true);
  assert.equal(parseBooleanLike(" TRUE  "), true);
  assert.equal(parseBooleanLike("yes"), true);
  assert.equal(parseBooleanLike("1"), true);

  assert.equal(parseBooleanLike("false"), false);
  assert.equal(parseBooleanLike(" No "), false);
  assert.equal(parseBooleanLike("0"), false);
  assert.equal(parseBooleanLike("not-bool"), undefined);
});

test("parseBatteryLevel clamps range and rejects invalid", () => {
  assert.equal(parseBatteryLevel("55"), 55);
  assert.equal(parseBatteryLevel("123"), 100);
  assert.equal(parseBatteryLevel("-2"), 0);
  assert.equal(parseBatteryLevel("abc"), undefined);
});

test("parseWatchHelperOutput parses valid watch rows", () => {
  const output = [
    "WATCH\twatch-1\tSeries 9\tWatch7,1\t83\ttrue",
    "invalid",
    "WATCH\twatch-2\tUltra\tWatch6,18\t45\tfalse",
  ].join("\n");

  const watches = parseWatchHelperOutput(output, "phone-1");
  assert.equal(watches.length, 2);
  assert.deepEqual(watches[0], {
    watchUdid: "watch-1",
    parentUdid: "phone-1",
    name: "Series 9",
    model: "Apple Watch Series 9 41mm (Watch7,1)",
    batteryLevel: 83,
    isCharging: true,
  });
  assert.equal(watches[1].model, "Apple Watch Ultra (Watch6,18)");
  assert.equal(watches[1].isCharging, false);
});

test("formatIPhoneModel maps known product types", () => {
  assert.equal(formatIPhoneModel("iPhone17,1"), "iPhone 16 Pro (iPhone17,1)");
  assert.equal(formatIPhoneModel("iPhone99,9"), "iPhone99,9");
  assert.equal(formatIPhoneModel(undefined), "Unknown Model");
});

test("formatWatchModel maps known product types", () => {
  assert.equal(
    formatWatchModel("Watch7,1"),
    "Apple Watch Series 9 41mm (Watch7,1)",
  );
  assert.equal(formatWatchModel("Watch99,9"), "Watch99,9");
  assert.equal(formatWatchModel(undefined), "Unknown Watch");
});
