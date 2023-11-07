import SendableError                    from "../SendableError";
import ErrorCode                        from "../ErrorCode";
import {isSendableError}                from "../Utils";

test("cause is added", () => {
  const root = new SendableError({
    message: "A bug",
    code   : ErrorCode.DEFAULT_CODE,
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

  expect(wrapped.getCause()?.message).toBe("A bug");
  expect(isSendableError(wrapped)).toBe(true);
});
