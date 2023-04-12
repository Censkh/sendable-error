import test                             from "ava";
import SendableError, {isSendableError} from "../SendableError";
import ErrorCode                        from "../ErrorCode";

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
    const sendable = SendableError.of(error);
    t.is(sendable.getMessage(), "A bug");
    //t.is(sendable.getPublicMessage(), "An internal error occurred");
    t.deepEqual(sendable.toResponse(), {
      code   : "misc/internal-error",
      details: {},
      message: "A bug",
      traceId: sendable.getTraceId(),
    });
  }
});
