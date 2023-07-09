import test                             from "ava";
import SendableError from "../SendableError";
import ErrorCode                        from "../ErrorCode";
import {isSendableError}                from "../Utils";

test("getting codes works", (t) => {
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
    t.is(ErrorCode.get(error), code);
    t.is(isSendableError(error), true);
  }

  {
    const error    = new Error("A bug");
    t.is(isSendableError(error), false);

    const sendable = SendableError.of(error);
    t.is(sendable.getMessage(), "A bug");
    t.deepEqual(sendable.toResponse(), {
      code   : "misc/internal-error",
      details: {},
      message: "An internal error occurred",
      traceId: sendable.getTraceId(),
    });

    t.deepEqual(SendableError.of(error, {public: true}).toResponse(), {
      code   : "misc/internal-error",
      details: {},
      message: "A bug",
      traceId: sendable.getTraceId(),
    });

    const code = new ErrorCode({
      id            : "test/error-code",
      defaultMessage: "Test error code",
    });
    t.deepEqual(SendableError.of(error, {public: true, code: code}).toResponse(), {
      code   : "test/error-code",
      details: {},
      message: "Test error code",
      traceId: sendable.getTraceId(),
    });

    t.deepEqual(sendable.toResponse(), SendableError.of(sendable).toResponse());
  }
});
