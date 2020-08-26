# [sendable-error](https://github.com/Censkh/sendable-error/) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Censkh/style-composer/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/sendable-error.svg?style=flat)](https://www.npmjs.com/package/sendable-error)

Composable errors to simplify creating useful failure responses for APIs

``` npm i sendable-error ```

**Note:** this package is in early development, use with caution

`SendableErrors` provide built-in support for:
- An easy to use builder interface to construct errors
- A unified way to send your errors as a JSON response
- Error codes to easily identify error types on the client side
- Public and private messages & details so your APIs don't leak technical information yet retaining verbose logging
- Trace IDs allow you to identify specific errors and allows user's to point you in the right direction when they encounter a bug
- A customizable logger interface

## Getting Started

Creating a new error from scratch:

```js
import {SendableError, ErrorCode} from "sendable-error";

const CODE_MISSING_REQUIRED = new ErrorCode("validation/missing-required", "Missing required field", {statusCode: 400});

export const updateUser = (req, res) => {
    if (!req.body.id) {
        return SendableError.of(CODE_MISSING_REQUIRED)
            .messages("Missing required field 'id'")
            .details({
                field: "id"
            })
            .send(res);
    }
};
```

In this example if you miss the ID field from the body you shall receive a 400 status code error with the body:

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
