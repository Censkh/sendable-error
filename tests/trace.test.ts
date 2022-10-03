import test          from "ava";
import SendableError , {getTraceId} from "../src/SendableError";
import ErrorCode from "../src/ErrorCode";
import {ERROR_CODE_MISC_INTERNAL_ERROR} from "../src/DefaultCodes";

test("trace ID is consistent", (t) => {

  const createError = (cause?: Error) => {
    return new SendableError({
      message: "hi",
      cause: cause,
      code: ERROR_CODE_MISC_INTERNAL_ERROR,
    });
  }

  t.is(createError().getTraceId(), "eb39b6dd-0b87-f659-38d2-4be7274c9d2e");
  t.is(createError().getTraceId(), "180d01db-13bb-9476-8c25-255db253b9f5");
});
