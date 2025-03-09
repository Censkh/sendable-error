import ErrorCode from "../ErrorCode";
import { setErrorLogger } from "../Logging";
import SendableError from "../SendableError";
import { isSendableError } from "../Utils";

setErrorLogger((options) => {});

it("getting codes works", async () => {
  const code = new ErrorCode({
    id: "test/error-code",
    defaultMessage: "Test error code",
  });

  const root = new SendableError({
    message: "A bug",
    code: code,
  });

  try {
    throw root;
  } catch (error: any) {
    expect(ErrorCode.get(error)).toBe(code);
    expect(isSendableError(error)).toBe(true);
  }

  {
    const error = new Error("A bug");
    expect(isSendableError(error)).toBe(false);

    const sendable = SendableError.of(error);
    expect(sendable.getMessage()).toBe("A bug");
    expect(sendable.toResponseBody()).toEqual({
      code: "misc/internal-error",
      details: {},
      message: "An internal error occurred",
      traceId: sendable.getTraceId(),
    });
    expect(await sendable.toResponse().json()).toEqual({
      code: "misc/internal-error",
      details: {},
      message: "An internal error occurred",
      traceId: sendable.getTraceId(),
    });

    expect(SendableError.of(error, { public: true }).toResponseBody()).toEqual({
      code: "misc/internal-error",
      details: {},
      message: "A bug",
      traceId: sendable.getTraceId(),
    });

    const code = new ErrorCode({
      id: "test/error-code",
      defaultMessage: "Test error code",
    });
    expect(SendableError.of(error, { public: true, code: code }).toResponseBody()).toEqual({
      code: "test/error-code",
      details: {},
      message: "A bug",
      traceId: sendable.getTraceId(),
    });

    expect(sendable.toResponseBody()).toEqual(SendableError.of(sendable).toResponseBody());
  }
});

it("bad input", () => {
  {
    const sendable = SendableError.of("bad data" as any);
    expect(sendable.message).toBe("bad data");
    expect(sendable.stack).toBeUndefined();
  }

  {
    const sendable = SendableError.of(12123123 as any);
    expect(sendable.message).toBe("12123123");
    expect(sendable.stack).toBeUndefined();
  }

  {
    const input = { hello: "world" };
    const sendable = SendableError.of(input as any);
    expect(sendable.message).toBe(JSON.stringify(input));
    expect(sendable.stack).toBeUndefined();
  }

  {
    const input = { message: "bad data" };
    const sendable = SendableError.of(input as any);
    expect(sendable.message).toBe("bad data");
    expect(sendable.stack).toBeUndefined();
  }

  {
    const sendable = new SendableError({
      cause: 123123 as any,
    });

    sendable.log("Source");
    expect(sendable.message).toBe("An internal error occurred");
  }
});

it("public errors", () => {
  {
    const sendable = new SendableError({
      message: "A bug",
      code: "test/error-code",
    });

    expect(sendable.toResponseBody()).toMatchObject({
      code: "misc/internal-error",
      details: {},
    });

    expect(sendable.toResponseBody({ public: true })).toMatchObject({
      code: "test/error-code",
      details: {},
    });

    const publicSendable = SendableError.of(sendable, { public: true });

    expect(publicSendable.toResponseBody()).toMatchObject({
      code: "test/error-code",
      details: {},
    });

    expect(publicSendable.toResponseBody({ public: false })).toMatchObject({
      code: "misc/internal-error",
      details: {},
    });

    // still public
    expect(SendableError.of(publicSendable).toResponseBody()).toMatchObject({
      code: "test/error-code",
      details: {},
    });
  }
});

it("overriding unconfigurable properties", () => {
  const meanError = new Error("I have unconfigurable properties");
  Object.defineProperty(meanError, "message", {
    value: "I'm mean",
    configurable: false,
  });
  Object.defineProperty(meanError, "code", {
    value: "VERY_MEAN",
    configurable: false,
  });

  const sendable = SendableError.of(meanError);

  expect(sendable.toResponseBody()).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });
  expect(sendable.message).toBe("I'm mean");
  expect((sendable as any).code).toBe(ErrorCode.DEFAULT_CODE);
  expect(sendable.getMessage()).toBe("I'm mean");
  expect(sendable.toResponseBody({ public: true })).toMatchObject({
    code: "misc/internal-error",
    message: "I'm mean",
  });
});

it("sendables get all relevant properties", () => {
  const cause = new Error("Cause");

  // @ts-ignore
  const error = new Error("Test", {
    cause,
  });
  const sendable = SendableError.of(error);
  expect(sendable.stack).toBe(error.stack);
  expect(sendable.message).toBe(error.message);
  // @ts-ignore
  expect(sendable.getCause()).toBe(error.cause);

  expect(Object.getPrototypeOf(sendable)).toBe(SendableError.prototype);
  expect(Object.getPrototypeOf(error)).toBe(Error.prototype);

  const sendable2 = SendableError.of(sendable);
  expect(sendable2.stack).toBe(sendable.stack);
  expect(sendable2.message).toBe(sendable.message);
  expect(sendable2.getTraceId()).toBe(sendable.getTraceId());
  expect(sendable2.getCause()).toBe(sendable.getCause());

  expect(Object.getPrototypeOf(sendable2)).toBe(SendableError.prototype);
  expect(Object.getPrototypeOf(sendable)).toBe(SendableError.prototype);
  expect(Object.getPrototypeOf(error)).toBe(Error.prototype);
});

it("handle bad data", () => {
  SendableError.of("Bad input");
});
