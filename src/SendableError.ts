import {v5 as uuid}               from "uuid";
import ErrorCode                  from "./ErrorCode";
import {ErrorOptions, Response}   from "./ErrorTypes";
import {CODE_MISC_INTERNAL_ERROR} from "./DefaultCodes";

export const DEFAULT_ERROR_OPTIONS: Required<ErrorOptions> = {
  statusCode : 500,
  severity   : "warn",
  displayName: "Error",
};


export function getErrorName(error: Error): string {
  if (error instanceof SendableError) {
    const code = error.getCode();
    return code.options.displayName || "Error";
  }
  return error.constructor.name;
}

/**
 * Transforms an error into a deterministic error identifier to enable easy log searching
 */
export function getTraceId(error: Error): string {
  const errorString = error.stack || error.toString();
  return uuid(errorString, uuid.URL);
}

export type Logger = (options: Required<ErrorOptions>, source: string, message: string, error: SendableError, info: any) => void;

export const defaultLogger: Logger = (options, source, message, error, info) => {
  if (options.severity !== "error") {
    console[options.severity](source || `ErrorUtils::log`, message, info);
  } else {
    console.error(source || `ErrorUtils::log`, message, info);
    console.error(error);
  }
};

const logger = defaultLogger;

export type Scope = "private" | "public";

const scopeValues: Scope[] = ["private", "public"];

export type ScopedValue<T> = T | Partial<Record<Scope, T>>;

export const computedScopedValue = <T>(scope: Scope, value: ScopedValue<T> | null | undefined, defaultValue: T): T => {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  if (typeof value === "object") {
    if (Object.keys(value).some(key => scopeValues.includes(key as any))) {
      return (value as any)[scope] ?? defaultValue;
    }
  }
  return value as T;
};

const DEFAULT_DETAILS = {};

/**
 * An error with a known cause that is sendable
 */
export default class SendableError extends Error {

  private _code: ErrorCode | null               = null;
  private _defaultCode!: ErrorCode;
  private _messages: ScopedValue<string> | null = null;
  private _traceId!: string;

  private _options: ErrorOptions | null = null;
  private _details: ScopedValue<Object> = DEFAULT_DETAILS;

  private _logged = false;

  public static of(codeOrError: ErrorCode | Error) {
    if (codeOrError instanceof Error) {
      const error = codeOrError as Error;

      if (error instanceof SendableError) {
        return error;
      }

      Object.setPrototypeOf(error, SendableError.prototype);
      const sendable = error as SendableError;
      sendable.init();
      return sendable;
    }
    const code = codeOrError;
    return new SendableError(code.defaultMessage, code);
  }

  private constructor(message: string, code?: ErrorCode) {
    super(message);

    this.init();
    this._code = code || null;
  }

  private init() {
    this._code        = null;
    this._logged      = false;
    this._defaultCode = CODE_MISC_INTERNAL_ERROR;
    this._traceId     = getTraceId(this);

    Object.defineProperty(this, "code", {
      value: SendableError.prototype.code,
    });
  }

  getCode(): ErrorCode {
    return this._code || this._defaultCode;
  };

  getMessage(scope: Scope): string {
    return computedScopedValue(scope, this._messages, scope === "public" ? this.getCode().defaultMessage : this.message);
  };

  details(details: ScopedValue<Object>): this {
    this._details = details;
    return this;
  };

  code(code: ErrorCode): this {
    this._code = code;
    return this;
  };

  options(options: ErrorOptions): this {
    this._options = options;
    return this;
  }

  defaultCode(defaultCode: ErrorCode): this {
    this._defaultCode = defaultCode;
    return this;
  };

  messages(messages: ScopedValue<string>): this {
    this._messages = messages;
    return this;
  };

  get computedOptions(): Required<ErrorOptions> {
    return {
      ...DEFAULT_ERROR_OPTIONS,
      ...this.getCode().options,
      ...this._options,
    };
  }

  /**
   * Sends the error (if a response wasn't already sent).

   * If the error severity is ERROR and the error hasn't been logged until send() is called
   * this function will log the error to make sure no severe errors are not logged.
   */
  send(res: Response): this {
    const {statusCode} = this.computedOptions;
    const traceId      = this._traceId;

    // Make sure errors aren't swallowed
    if (!this._logged) {
      this.log("ErrorUtils::send");
    }

    res.cause = this;

    if (!res.headersSent) {
      res.status(statusCode).send({
        code   : this.getCode().id,
        message: this.getMessage("public"),
        traceId: traceId,
        details: computedScopedValue("public", this._details, DEFAULT_DETAILS),
      });
    }
    return this;
  };

  /**
   * Log out info on error
   */
  log(source: string, message?: string, info?: any, options?: ErrorOptions) {
    this._logged          = true;
    const computedOptions = {
      ...this.computedOptions,
      ...(options || {}),
    };
    const traceId         = this._traceId;
    const loggedMessage   = message || this.getMessage("private");
    info                  = {
      traceId        : traceId,
      code           : this.getCode().id,
      originalMessage: this.message,
      ...computedScopedValue("private", this._details, DEFAULT_DETAILS),
      ...(info || {}),
    };

    if (info.originalMessage === loggedMessage) {
      delete info.originalMessage;
    }

    logger(computedOptions, source, loggedMessage, this, info);

    return this;
  };

}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
