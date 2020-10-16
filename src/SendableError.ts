import {v5 as uuid}                                                             from "uuid";
import ErrorCode                                                                from "./ErrorCode";
import {ErrorOptions, ErrorResponseBody, ResponseWithError, Scope, ScopedValue} from "./Types";
import {CODE_MISC_INTERNAL_ERROR}                                               from "./DefaultCodes";
import {getErrorLogger}                                                         from "./Logger";
import {ErrorParserFunction}                                                    from "./Parser";
import {SendableErrorBuilder, SendableErrorBuilderBase}                         from "./Builder";

export const DEFAULT_ERROR_OPTIONS: Required<ErrorOptions> = {
  statusCode : 500,
  severity   : "warn",
  displayName: "Error",
};


export const getErrorName = (error: Error): string => {
  if (error instanceof SendableError) {
    const code = error.getCode();
    return code.options.displayName || "Error";
  }
  return error.constructor.name;
};

const scopeValues: Scope[] = ["private", "public"];

/**
 * Transforms an error into a deterministic error identifier to enable easy log searching
 */
export const getTraceId = (error: Error): string => {
  const errorString = error.stack || error.toString();
  return uuid(errorString, uuid.URL);
};

export const computedScopedValue = <T>(scope: Scope, values: Array<ScopedValue<T> | null | undefined>, defaultValue?: T): T | undefined => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      if (typeof value === "object") {
        if (Object.keys(value).some(key => scopeValues.includes(key as any))) {
          const scopedValue = (value as any)[scope];
          if (scopedValue !== undefined) {
            return scopedValue;
          } else {
            continue;
          }
        }
      }
      return value as T;
    }
  }

  return defaultValue;
};

export const isSendableError = (error: Error): error is SendableError => {
  return error instanceof SendableError;
};

const DEFAULT_DETAILS = {};

/**
 * An error with a known cause that is sendable
 */
export default class SendableError extends Error implements SendableErrorBuilderBase {

  private _code: ErrorCode | null               = null;
  private _defaultCode!: ErrorCode;
  private _messages: ScopedValue<string> | null = null;
  private _traceId!: string;

  private _options: ErrorOptions | null = null;
  private _details: ScopedValue<Object> = DEFAULT_DETAILS;

  private _logged = false;

  public static of(codeOrError: ErrorCode | Error, parser?: ErrorParserFunction) {
    const builder = new SendableErrorBuilder();

    if (parser) {
      if (codeOrError instanceof Error && !isSendableError(codeOrError)) {
        parser(codeOrError, builder);
      }
    }

    return builder.build(codeOrError);
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
    return computedScopedValue<string>(scope, [this._messages, this.getCode().defaultMessage, {
      public : CODE_MISC_INTERNAL_ERROR.defaultMessage as string,
      private: this.message,
    }])!;
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

  toResponse(): ErrorResponseBody {
    const traceId = this._traceId;

    return {
      code   : this.getCode().id,
      message: this.getMessage("public"),
      traceId: traceId,
      details: computedScopedValue("public", [this._details, DEFAULT_DETAILS]),
    };
  }

  getTraceId(): string {
    return this._traceId;
  }

  /**
   * Sends the error (if a response wasn't already sent).

   * If the error severity is ERROR and the error hasn't been logged until send() is called
   * this function will log the error to make sure no severe errors are not logged.
   */
  send(res: ResponseWithError): this {
    const {statusCode} = this.computedOptions;

    // Make sure errors aren't swallowed
    if (!this._logged) {
      this.log("ErrorUtils::send");
    }

    res.cause = this;

    if (!res.headersSent) {
      if (typeof res.status === "function") {
        res.status(statusCode);
      }
      res.send(this.toResponse());
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
      ...computedScopedValue("private", [this._details, DEFAULT_DETAILS]),
      ...(info || {}),
    };

    if (info.originalMessage === loggedMessage) {
      delete info.originalMessage;
    }

    getErrorLogger()(computedOptions, source, loggedMessage, this, info);

    return this;
  };

}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
