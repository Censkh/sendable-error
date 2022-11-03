import test                             from "ava";
import SendableError, {isSendableError} from "../SendableError";
import ErrorCode                        from "../ErrorCode";
import {ERROR_CODE_MISC_INTERNAL_ERROR} from "../DefaultCodes";

test("getting codes works", (t) => {
  const code = new ErrorCode({
    id: "test/error-code",
    defaultMessage: "Test error code"
  })

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
});
