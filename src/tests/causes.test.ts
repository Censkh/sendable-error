import test                             from "ava";
import SendableError                    from "../SendableError";
import ErrorCode                        from "../ErrorCode";
import {ERROR_CODE_MISC_INTERNAL_ERROR} from "../DefaultCodes";

test("cause is added", (t) => {
  const root = new SendableError({
    message: "A bug",
    code   : ERROR_CODE_MISC_INTERNAL_ERROR,
  });

  const UPDATE_USER_ERROR_CODE = new ErrorCode({
    id            : "user/update-failed",
    defaultMessage: "Update failed",
  });

  const wrapped = new SendableError({
    message: "Couldn't update user",
    code   : UPDATE_USER_ERROR_CODE,
    cause  : root,
  });

  t.is(wrapped.getCause()?.message, "A bug");
});
