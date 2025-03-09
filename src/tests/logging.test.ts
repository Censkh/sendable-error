import { setErrorLogger } from "../Logging";
import SendableError from "../SendableError";

it("logging", () => {
  const error = new SendableError({
    message: "A bug",
    code: "test/error-code",
  });

  setErrorLogger((options) => {
    const { message, error, info } = options;
    expect(message).toBe("A bug");
  });

  error.log();
});
