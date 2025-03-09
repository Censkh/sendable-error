import SendableError from "../SendableError";

it("1. public responses as expected", () => {
  const publicError = new SendableError({
    code: "public/error",
    message: "This is a public error",
    public: true,
  });

  expect(SendableError.of(publicError).toResponseBody()).toMatchObject({
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

  expect(SendableError.of(publicError).toResponseBody()).toMatchObject({
    code: "public/error",
    message: "This is a public error",
  });

  expect(SendableError.of(publicError).toResponseBody({ public: false })).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });

  const nonPublicError = new SendableError({
    code: "non-public/error",
    message: "This is a non-public error",
  });

  expect(
    SendableError.of(nonPublicError).toResponseBody({
      defaultPublic: true,
    }),
  ).toMatchObject({
    code: "non-public/error",
    message: "This is a non-public error",
  });

  const error = new Error("A bug");
  expect(
    SendableError.of(error).toResponseBody({
      defaultPublic: true,
    }),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "A bug",
  });

  expect(
    SendableError.of(error).toResponseBody({
      defaultPublic: false,
    }),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });

  expect(
    SendableError.of("hello" as any).toResponseBody({
      defaultPublic: true,
    }),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "hello",
  });

  expect(
    SendableError.of({ message: "hello" } as any).toResponseBody({
      defaultPublic: true,
    }),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "hello",
  });

  expect(
    new SendableError({
      message: "Set to private",
      public: false,
    }).toResponseBody({
      defaultPublic: true,
    }),
  ).toMatchObject({
    code: "misc/internal-error",
    message: "An internal error occurred",
  });
});

it("3. public message", () => {
  const error = new SendableError({
    code: "test/private-code",
    message: "This is a private error",
    public: {
      enabled: true,
      message: "This is a public error",
      code: "test/public-code",
    },
  });

  expect(SendableError.of(error).toResponseBody()).toMatchObject({
    code: "test/public-code",
    message: "This is a public error",
  });
});

it("4. of not working", () => {
  const publicError = new SendableError({
    code: "public/error",
    message: "This is a public error",
    public: true,
  });
});
