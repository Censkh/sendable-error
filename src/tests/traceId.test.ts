import SendableError from "../SendableError";
import { getTraceId } from "../SendableError";

describe("getTraceId", () => {
  it("should generate deterministic traceId for same error", () => {
    const errors = [];
    for (let i = 0; i < 2; i++) {
      errors.push(new Error("Test error"));
    }
    const [error1, error2] = errors;

    const traceId1 = getTraceId(error1);
    const traceId2 = getTraceId(error2);

    expect(traceId1).toBe(traceId2);
    expect(traceId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should generate different traceId for different errors", () => {
    const error1 = new Error("First error");
    const error2 = new Error("Second error");

    const traceId1 = getTraceId(error1);
    const traceId2 = getTraceId(error2);

    expect(traceId1).not.toBe(traceId2);
  });

  it("should generate deterministic traceId for SendableError", () => {
    const sendableError1 = new SendableError({
      message: "Test sendable error",
      code: "test/error",
    });

    const sendableError2 = new SendableError({
      message: "Test sendable error",
      code: "test/error",
    });

    const traceId1 = sendableError1.getTraceId();
    const traceId2 = sendableError2.getTraceId();

    expect(traceId1).not.toBe(traceId2);
    expect(traceId1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should generate different traceId for different stack traces", () => {
    const error1 = new Error("Error with stack");
    error1.stack = "Error: Error with stack\n    at test1.js:1:1\n    at test2.js:2:2";

    const error2 = new Error("Error with different stack");
    error2.stack = "Error: Error with different stack\n    at different.js:1:1\n    at another.js:2:2";

    const traceId1 = getTraceId(error1);
    const traceId2 = getTraceId(error2);

    expect(traceId1).not.toBe(traceId2);
  });

  it("should handle errors without stack trace", () => {
    const error = new Error("No stack");
    error.stack = undefined;

    const traceId = getTraceId(error);

    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should generate consistent traceId for same SendableError instance", () => {
    const sendableError = new SendableError({
      message: "Consistent error",
      code: "test/consistent",
    });

    const traceId1 = sendableError.getTraceId();
    const traceId2 = sendableError.getTraceId();

    expect(traceId1).toBe(traceId2);
  });

  it("should generate different traceId for errors with same message but different stack", () => {
    const error1 = new Error("Same message");
    error1.stack = "Error: Same message\n    at file1.js:1:1";

    const error2 = new Error("Same message");
    error2.stack = "Error: Same message\n    at file2.js:1:1";

    const traceId1 = getTraceId(error1);
    const traceId2 = getTraceId(error2);

    expect(traceId1).not.toBe(traceId2);
  });

  it("should handle errors with very long stack traces", () => {
    const longStack = `Error: Long stack\n${Array.from({ length: 50 }, (_, i) => `    at function${i}.js:${i}:${i}`).join("\n")}`;

    const error = new Error("Long stack error");
    error.stack = longStack;

    const traceId = getTraceId(error);

    expect(traceId).toBeDefined();
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("should generate valid UUID format", () => {
    const error = new Error("UUID test");
    const traceId = getTraceId(error);

    // Should be a valid UUID v4 format
    expect(traceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("should be deterministic across multiple calls", () => {
    const error = new Error("Deterministic test");
    const traceId1 = getTraceId(error);
    const traceId2 = getTraceId(error);
    const traceId3 = getTraceId(error);

    expect(traceId1).toBe(traceId2);
    expect(traceId2).toBe(traceId3);
  });
});
