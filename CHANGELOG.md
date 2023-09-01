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
