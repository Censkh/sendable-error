# [sendable-error](https://github.com/Censkh/sendable-error/) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Censkh/style-composer/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/sendable-error.svg?style=flat)](https://www.npmjs.com/package/sendable-error)

Composable errors to simplify creating useful failure responses for APIs

`SendableErrors` provide built-in support for:
- An easy to use builder interface to construct errors
- A unified way to send your errors as a JSON response
- Error codes to easily identify error types on the client side
- Public and private messages & details so your APIs don't leak technical information yet retaining verbose logging
- Trace IDs allow you to identify specific errors and allows user's to point you in the right direction when they encounter a bug
- A customizable logger interface


```js
import { SendableError } from "sendable-error";

try {
  throw new SendableError({
    status: 400,
    code: "validation/missing-required",
    message: "Missing required field 'id'",
    public: true,
    details: {
      field: "id"
    }
  })
} catch (error) {
  return SendableError.of(error).toResponse();
}
```

Response with status code `400`:

```json
{
  "code": "validation/missing-required",
  "message": "Missing required field 'id'",
  "traceId": "8ab9c56a-90d1-5e71-b67a-d6b725837802",
  "details": {
    "field": "id"
  }
}
```

## Getting Started

```bash
npm i sendable-error
```

### Throwing Errors

Creating a new error from scratch:

```js
 throw new SendableError({
  code: CODE_MISSING_REQUIRED,
  message: "Missing required field 'id'",
  public: true,
  details: {
    field: "id",
  },
});
```

Or provide a cause for the error:

```js
throw new SendableError({
  code: CODE_DATABASE_ERROR,
  cause: error,
});
```

Or even transform an error from elsewhere into a `SendableError`:

```js
throw SendableError.of(error, {
  code: CODE_DATABASE_ERROR
});
```

### Sending Errors

#### Express

```js
app.use((error, req, res, next) => {
  SendableError.of(error).send(res);
});
```

#### WinterTC Compatible

```typescript
export const handler = async (request: Request) => {
  try {
    // do something that might throw
  } catch (error) {
    return SendableError.of(error).toResponse();
  }
}
```

#### Others

```typescript
try {
  // do something that might throw
} catch (error) {
  const responseBody = SendableError.of(error).toResponseBody();
  /* send responseBody */
}
```
