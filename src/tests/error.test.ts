import SendableError     from "../SendableError";
import ErrorCode         from "../ErrorCode";
import {isSendableError} from "../Utils";

test("getting codes works", () => {
  const code = new ErrorCode({
    id            : "test/error-code",
    defaultMessage: "Test error code",
  });

  const root = new SendableError({
    message: "A bug",
    code   : code,
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
    expect(sendable.toResponse()).toEqual({
      code   : "misc/internal-error",
      details: {},
      message: "An internal error occurred",
      traceId: sendable.getTraceId(),
    });

    expect(SendableError.of(error, {public: true}).toResponse()).toEqual({
      code   : "misc/internal-error",
      details: {},
      message: "A bug",
      traceId: sendable.getTraceId(),
    });

    const code = new ErrorCode({
      id            : "test/error-code",
      defaultMessage: "Test error code",
    });
    expect(SendableError.of(error, {public: true, code: code}).toResponse()).toEqual({
      code   : "test/error-code",
      details: {},
      message: "Test error code",
      traceId: sendable.getTraceId(),
    });

    expect(sendable.toResponse()).toEqual(SendableError.of(sendable).toResponse());
  }
});

test("bad input", () => {
  {
    const sendable = SendableError.of("bad data" as any);
    expect(sendable.message).toBe("bad data");
  }

  {
    const sendable = SendableError.of(12123123 as any);
    expect(sendable.message).toBe("12123123");
  }

  {
    const input    = {"hello": "world"};
    const sendable = SendableError.of(input as any);
    expect(sendable.message).toBe(JSON.stringify(input));
  }

  {
    const sendable = new SendableError({
      cause: 123123 as any,
    });
    sendable.log("Source");
    expect(sendable.message).toBe("An internal error occurred");
  }
});

test("public errors", () => {
  {
    const sendable = new SendableError({
      message: "A bug",
      code   : "test/error-code",
    });

    expect(sendable.toResponse()).toMatchObject({
      code: "misc/internal-error",
      details: {},
    });

    expect(sendable.toResponse({public: true})).toMatchObject({
      code   : "test/error-code",
      details: {},
    });

    const publicSendable = SendableError.of(sendable, {public: true});

    expect(publicSendable.toResponse()).toMatchObject({
      code   : "test/error-code",
      details: {},
    });

    expect(publicSendable.toResponse({public: false})).toMatchObject({
      code   : "misc/internal-error",
      details: {},
    });

    // still public
    expect(SendableError.of(publicSendable).toResponse()).toMatchObject({
      code   : "test/error-code",
      details: {},
    });
  }
});

test("overriding unconfigurable properties", () => {
  const meanError = new Error("I have unconfigurable properties");
  Object.defineProperty(meanError, "message", {
    value       : "I'm mean",
    configurable:  false,
  });
  Object.defineProperty(meanError, "code", {
    value       : "VERY_MEAN",
    configurable:  false,
  });

  const sendable = SendableError.of(meanError);

  expect(sendable.toResponse()).toMatchObject({
    code   : "misc/internal-error",
    message: "An internal error occurred",
  });
  expect((sendable as any).code).toBe("VERY_MEAN");
  expect(sendable.message).toBe("I'm mean");
  expect(sendable.getMessage()).toBe("I'm mean");
  expect(sendable.getMessage()).toBe("I'm mean");
  expect(sendable.toResponse({public: true})).toMatchObject({
    code   : "misc/internal-error",
    message: "I'm mean",
  });
})