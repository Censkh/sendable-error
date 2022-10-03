# 0.1.0

## Breaking Changes

- remove builder API
- strip API back to basics -- complex features will come back over time
- remove visibility/scoped value API for now
- `messages` -> `message`
- remove builder properties from `SendableError`. If you want to edit an error use `SendableError.of(oldError, { message: "..." })`
- remove uuid dependency

# 0.0.x

## Features

- `ErrorCode.get` to easily grab an error code from errors
- update types
- `toResponse()`
- export `getTraceId()`
