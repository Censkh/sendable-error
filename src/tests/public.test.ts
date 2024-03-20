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

test("public by default works as expected", () => {
  const publicError = new SendableError({
    code: "public/error",
    message: "This is a public error",
    public: true,
  });

  expect(SendableError.of(publicError).toResponse()).toMatchObject({
    code: "public/error",
    message: "This is a public error",
  });

  expect(SendableError.of(publicError).toResponse({ public: false })).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });

  const nonPublicError = new SendableError({
    code: "non-public/error",
    message: "This is a non-public error",
  });

  expect(
    SendableError.of(nonPublicError, {
      publicByDefault: true,
    }).toResponse(),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });

  const error = new Error("A bug");
  expect(
    SendableError.of(error, {
      publicByDefault: true,
    }).toResponse(),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "A bug",
  });

  expect(
    SendableError.of(error, {
      publicByDefault: false,
    }).toResponse(),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });

  expect(
    SendableError.of("hello" as any, {
      publicByDefault: true,
    }).toResponse(),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "hello",
  });

  expect(
    SendableError.of({ message: "hello" } as any, {
      publicByDefault: true,
    }).toResponse(),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "hello",
  });
});
