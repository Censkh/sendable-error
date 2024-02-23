import SendableError from "../SendableError";

test("public responses as expected", () => {
  const publicError = new SendableError({
    code: "public/error",
    message: "This is a public error",
    public: true,
  });

  expect(SendableError.of(publicError).toResponse()).toMatchObject({
    code: "public/error",
    message: "This is a public error",
  });
});
