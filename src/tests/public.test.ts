import SendableError from "../SendableError";

it("1. public responses as expected", () => {
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

it("2. public by default works as expected", () => {
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

it("public message", () => {
  const error = new SendableError({
    code: "test/private-code",
    message: "This is a private error",
    public: {
      enabled: true,
      message: "This is a public error",
      code: "test/public-code",
    },
  });

  expect(SendableError.of(error).toResponse()).toMatchObject({
    code: "test/public-code",
    message: "This is a public error",
  });
});
