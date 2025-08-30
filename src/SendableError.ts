import { SENDABLE_ERROR_INSTANCE_SYMBOL } from "./Consts";
import ErrorCode from "./ErrorCode";
import { getErrorLogger } from "./Logging";
import type { ErrorResponseBody, ResponseWithError } from "./Types";
import { isSendableError } from "./Utils";

export interface LogOptions {
  message?: string;
  source?: string;
  info?: any;
}

export interface ErrorResponse extends Response {
  cause?: SendableError | Error;
}

const DEFAULT_STATUS = 500;

function hashString(str: string) {
  // Simple FNV-1a 32-bit hash
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return h >>> 0; // ensure unsigned 32-bit
}

/**
 * Transforms an error into a deterministic error identifier to enable easy log searching
 */
export const getTraceId = (error: Error): string => {
  // Generate 16 bytes from seed
  const bytes = new Array(16).fill(0).map((_, i) => {
    const h = hashString(`${error.stack}${i}`);
    return h & 0xff; // take lowest byte
  });

  // Set version (v4-like) and variant bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  // Convert bytes to UUID string
  const uuid = [...bytes]
    .map((b, i) => {
      const s = b.toString(16).padStart(2, "0");
      return [4, 6, 8, 10].includes(i) ? `-${s}` : s;
    })
    .join("");

  return uuid;
};

const DEFAULT_PROPERTIES: Partial<SendableErrorProperties<any>> = {
  code: ErrorCode.DEFAULT_CODE,
};

const resolveCode = (code?: ErrorCode | string): ErrorCode => {
  if (code instanceof ErrorCode) {
    return code;
  }

  if (typeof code === "string") {
    return new ErrorCode({ id: code, defaultMessage: code });
  }

  return ErrorCode.DEFAULT_CODE;
};

const resolvePublic = (publicOptions?: boolean | PublicOptions): PublicProperties | undefined => {
  if (publicOptions === undefined) {
    return undefined;
  }

  if (typeof publicOptions === "boolean") {
    return { enabled: publicOptions };
  }

  return {
    ...publicOptions,
    code: publicOptions?.code ? resolveCode(publicOptions.code) : undefined,
  };
};

export type SendableErrorDetails = Record<string, any>;

export interface PublicProperties {
  enabled: boolean;
  code?: ErrorCode;
  message?: string;
}

type PublicOptions = Omit<PublicProperties, "code"> & {
  code?: ErrorCode | string;
};

export type DefaultSendableErrorDetails = Record<string, never>;

export interface SendableErrorProperties<D extends SendableErrorDetails = DefaultSendableErrorDetails> {
  code: ErrorCode<D>;
  message: string;
  public?: PublicProperties;
  details?: D & Record<string, any>;
  cause?: unknown;
  status?: number;
}

export interface SendableErrorOptions<D extends SendableErrorDetails = DefaultSendableErrorDetails>
  extends Omit<SendableErrorProperties<D>, "code" | "message" | "public"> {
  code?: ErrorCode<D> | string;
  message?: string;
  public?: boolean | PublicOptions;
}

export interface SendableErrorState {
  logged: boolean;
  traceId: string;
}

export interface ToResponseBodyOptions {
  defaultPublic?: boolean | PublicProperties;
  public?: boolean | PublicProperties;
  details?: SendableErrorDetails;
}

const CONSTRUCTOR_MESSAGE = "__$$sendable-error-message__";

/**
 * An error with a known cause that is sendable
 */
export default class SendableError<D extends SendableErrorDetails = DefaultSendableErrorDetails> extends Error {
  private [SENDABLE_ERROR_INSTANCE_SYMBOL] = true;

  private properties!: SendableErrorProperties<D>;
  private state!: SendableErrorState;

  public static is(error: any): error is SendableError {
    return isSendableError(error);
  }

  public static of<D extends SendableErrorDetails>(
    error: Error,
    options?: Partial<SendableErrorOptions<D>>,
  ): SendableError<D> {
    let result: SendableError<D>;

    let resolvedOptions = options ?? {};

    if (isSendableError(error)) {
      result = error as any;
      if (resolvedOptions?.code && !resolvedOptions?.message) {
        const code = resolveCode(resolvedOptions.code);
        resolvedOptions = {
          message: code.getDefaultMessage(),
          ...resolvedOptions,
        };
      }
    } else if (error instanceof Error) {
      const copiedError = new Error(error.message);
      copiedError.stack = error.stack;
      Object.setPrototypeOf(copiedError, SendableError.prototype);
      result = copiedError as SendableError<D>;
      resolvedOptions = {
        code: ErrorCode.DEFAULT_CODE,
        message: error.message,
        cause: error.cause as Error,
        ...resolvedOptions,
      };
    } else {
      // bad input
      const sendableError = new SendableError<D>({
        ...resolvedOptions,
        message:
          typeof error === "string"
            ? error
            : // @ts-ignore
              typeof error?.message === "string"
              ? // @ts-ignore
                error.message
              : JSON.stringify(error),
      });
      Object.defineProperty(sendableError, "stack", {
        get: () => undefined,
      });
      return sendableError;
    }

    result.init(resolvedOptions);

    return result;
  }

  constructor(options?: SendableErrorOptions<D>) {
    super(CONSTRUCTOR_MESSAGE);

    this.init(options);
  }

  private overrideProperty(name: string, value: any) {
    const descriptor = Object.getOwnPropertyDescriptor(this, name);

    if (descriptor?.configurable === false) {
      try {
        // @ts-ignore
        this[name] = value;
      } catch {}
    } else {
      Object.defineProperty(this, name, {
        value: value,
        configurable: true,
      });
    }
  }

  private init(options?: Partial<SendableErrorOptions<D>>) {
    let resolvedPublic: PublicProperties | undefined;

    if (typeof options?.public !== "undefined") {
      resolvedPublic = resolvePublic(options.public);
    }

    if (!this.properties) {
      const code = resolveCode(options?.code);
      let message = options?.message;
      if (!message) {
        message = code.getDefaultMessage();
      }

      this.properties = { ...DEFAULT_PROPERTIES, ...options, public: resolvedPublic, message: message!, code };
    } else {
      Object.assign(this.properties, options);
      if (resolvedPublic !== undefined) {
        this.properties.public = resolvedPublic;
      }
    }

    this.state = {
      logged: false,
      traceId: getTraceId(this),
    };

    this.overrideProperty("code", this.getCode());
    this.overrideProperty("message", this.getMessage());
    this.overrideProperty("cause", this.getCause());
    this.overrideProperty("stack", this.getStack());

    this[SENDABLE_ERROR_INSTANCE_SYMBOL] = true;
  }

  getStack(): string | undefined {
    return this.stack?.replace(CONSTRUCTOR_MESSAGE, this.getMessage());
  }

  getCause(): unknown | undefined {
    return this.properties.cause;
  }

  getCode(): ErrorCode {
    return this.properties.code || ErrorCode.DEFAULT_CODE;
  }

  getMessage(): string {
    return this.properties.message || this.getCode().getDefaultMessage() || "An unknown error occurred";
  }

  isPublic(): boolean {
    return Boolean(this.properties.public?.enabled);
  }

  /*get computedOptions(): Required<ErrorOptions> {
    return {
      ...DEFAULT_ERROR_OPTIONS,
      ...this.getCode().options,
      ...this.__properties.options,
    };
  }*/

  toResponse(options?: ToResponseBodyOptions): ErrorResponse {
    const response: ErrorResponse = Response.json(this.toResponseBody(options), {
      status: this.getStatus(),
    });
    response.cause = this;
    return response;
  }

  toResponseBody(options?: ToResponseBodyOptions): ErrorResponseBody {
    const responsePublic =
      resolvePublic(options?.public) ?? this.properties.public ?? resolvePublic(options?.defaultPublic);
    const isPublic = responsePublic?.enabled;

    return {
      code: isPublic ? (responsePublic?.code ?? this.getCode()).getId() : ErrorCode.DEFAULT_CODE.getId(),
      message: isPublic ? responsePublic?.message ?? this.message : ErrorCode.DEFAULT_CODE.getDefaultMessage()!,
      traceId: this.state.traceId,
      details: {
        ...(isPublic && this.properties.details),
        ...options?.details,
      },
    };
  }

  getStatus(): number {
    return this.properties.status ?? this.getCode().getStatus() ?? DEFAULT_STATUS;
  }

  getDetails(): SendableErrorDetails | undefined {
    return this.properties.details;
  }

  get details(): SendableErrorDetails | undefined {
    return this.properties.details;
  }

  getTraceId(): string {
    return this.state.traceId;
  }

  /**
   * Sends the error (if a response wasn't already sent) & logs if it wasn't already logged
   */
  send(res: ResponseWithError, options?: ToResponseBodyOptions): this {
    // Make sure errors aren't swallowed
    this.logIfUnlogged();

    res.cause = this;

    if (!res.headersSent) {
      if (typeof res.status === "function") {
        res.status(this.getStatus());
      }
      res.send(this.toResponseBody(options));
    }
    return this;
  }

  logIfUnlogged(options?: LogOptions) {
    if (!this.state.logged) {
      this.log(options);
    }
  }

  /**
   * Log out info on error
   */
  log(options?: LogOptions) {
    this.state.logged = true;
    /**const computedOptions = {
     ...this.computedOptions,
     ...(options || {}),
     };**/
    const traceId = this.getTraceId();
    const loggedMessage = options?.message || this.getMessage();

    const providedInfo = Object.assign({}, this.properties.details, options?.info);
    const errorInfo: any = {
      traceId: traceId,
      code: this.getCode().getId(),
    };

    const computedInfo = Object.assign({}, errorInfo, providedInfo);

    getErrorLogger()({
      //options     : computedOptions,
      message: loggedMessage,
      error: this as any,
      info: computedInfo,
      errorInfo: errorInfo,
      providedInfo: providedInfo,
    });

    return this;
  }
}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
