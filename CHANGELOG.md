# 0.9.0

- make the trace ID generator better again

# 0.8.0

- make the trace ID generation simpler to reduce bundle size

# 0.7.2

- add `cause` to responses returned by `toResponse`

# 0.7.0

- rename `toResponse` to `toResponseBody`
- add `toResponse` that returns a `Response` object
- add `logIfUnlogged` to `SendableError`

# 0.6.0

- fix `publicByDefault` behavior

# 0.5.0

- allow public to override message & code

# 0.4.1

## Fixes

- fix `SendableError.of(String)` throwing an error

# 0.4.0

## Breaking Changes

- `SendableError.of()` no longer mutates the original error

## Features

- add `status` to `ErrorCode`

# 0.3.2

- add `toString()` for `ErrorCode`

# 0.3.1

## Fixes

- don't try to override unconfigurable properties

# 0.3.0

## Changes

- general cleanup
- `SendableError.toResponse({public: boolean})`

# 0.2.6

## Fixes

- don't throw on bad input

# 0.2.5

## Changes

- `toResponse()` can be passed extra details

# 0.2.3

## Fixes

- fix ESM build by untangling some circular dependencies
- add support for `getTraceId` in environments without `crypto`

# 0.2.0

## Breaking Changes

- add `public` property and obfuscate by default

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
