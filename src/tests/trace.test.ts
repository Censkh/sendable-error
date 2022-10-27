import test                             from "ava";
import SendableError                    from "../SendableError";
import {ERROR_CODE_MISC_INTERNAL_ERROR} from "../DefaultCodes";

test("trace ID is consistent", (t) => {

  const createError = (cause?: Error) => {
    return new SendableError({
      message: "hi",
      cause  : cause,
      code   : ERROR_CODE_MISC_INTERNAL_ERROR,
    });
  };

  t.is(createError().getTraceId(), "be262903-f3a2-d8a9-0134-8c871e1afbf0");
  t.is(createError().getTraceId(), "7bf53926-3b5c-2f91-b9e5-b779f0f19e0f");
});
