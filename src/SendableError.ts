import { SENDABLE_ERROR_INSTANCE_SYMBOL } from "./Consts";
import ErrorCode from "./ErrorCode";
import { getErrorLogger } from "./Logging";
import type { EmptyObject, ErrorResponseBody, ResponseWithError } from "./Types";
import { isSendableError } from "./Utils";
import sha1 from "./vendor/sha1";

const DEFAULT_STATUS = 500;

const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr: any, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  const uuid = `${
    byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]]
  }-${byteToHex[arr[offset + 4]]}${byteToHex[arr[offset + 5]]}-${byteToHex[arr[offset + 6]]}${
    byteToHex[arr[offset + 7]]
  }-${byteToHex[arr[offset + 8]]}${byteToHex[arr[offset + 9]]}-${byteToHex[arr[offset + 10]]}${
    byteToHex[arr[offset + 11]]
  }${byteToHex[arr[offset + 12]]}${byteToHex[arr[offset + 13]]}${byteToHex[arr[offset + 14]]}${
    byteToHex[arr[offset + 15]]
  }`.toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  return uuid;
}

/**
 * Transforms an error into a deterministic error identifier to enable easy log searching
 */
export const getTraceId = (error: Error): string => {
  const errorString = error.stack || error.toString();

  // @ts-ignore
  const sha = sha1.create();
  sha.update(errorString);
  return stringify(sha.array());
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

export interface SendableErrorProperties<D extends SendableErrorDetails = EmptyObject> {
  code: ErrorCode;
  message: string;
  public?: PublicProperties;
  details?: D & Record<string, any>;
  cause?: unknown;
  status?: number;
}

export interface SendableErrorOptions<D extends SendableErrorDetails = EmptyObject>
  extends Omit<SendableErrorProperties<D>, "code" | "message" | "public"> {
  code?: ErrorCode | string;
  message?: string;
  public?: boolean | PublicOptions;
}

export interface SendableErrorState {
  logged: boolean;
  traceId: string;
}

export interface ToResponseOptions {
  public?: boolean | PublicProperties;
  details?: SendableErrorDetails;
}

const CONSTRUCTOR_MESSAGE = "__$$sendable-error-message__";

/**
 * An error with a known cause that is sendable
 */
export default class SendableError<D extends SendableErrorDetails = EmptyObject> extends Error {
  private readonly [SENDABLE_ERROR_INSTANCE_SYMBOL] = true;

  private properties!: SendableErrorProperties<D>;
  private state!: SendableErrorState;

  public static is(error: Error): error is SendableError {
    return isSendableError(error);
  }

  public static of<D extends SendableErrorDetails>(
    error: Error,
    options?: Partial<SendableErrorOptions<D>> & { publicByDefault?: boolean },
  ): SendableError<D> {
    let result: SendableError<D>;

    let resolvedOptions = options ?? {};

    if (error instanceof SendableError) {
      result = error;
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
        public: resolvedOptions.publicByDefault,
        ...resolvedOptions,
      };
    } else {
      // bad input
      const sendableError = new SendableError<D>({
        public: resolvedOptions.publicByDefault,
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
      // cannot update
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

  toResponse(options?: ToResponseOptions): ErrorResponseBody {
    const responsePublic = resolvePublic(options?.public) ?? this.properties.public;
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
  send(res: ResponseWithError): this {
    // Make sure errors aren't swallowed
    if (!this.state.logged) {
      this.log("SendableError");
    }

    res.cause = this;

    if (!res.headersSent) {
      if (typeof res.status === "function") {
        res.status(this.getStatus());
      }
      res.send(this.toResponse());
    }
    return this;
  }

  /**
   * Log out info on error
   */
  log(source: string, message?: string, info?: any) {
    this.state.logged = true;
    /**const computedOptions = {
     ...this.computedOptions,
     ...(options || {}),
     };**/
    const traceId = this.getTraceId();
    const loggedMessage = message || this.getMessage();

    const providedInfo = Object.assign({}, this.properties.details, info);
    const errorInfo: any = {
      traceId: traceId,
      code: this.getCode().getId(),
    };

    const computedInfo = Object.assign({}, errorInfo, providedInfo);

    getErrorLogger()({
      //options     : computedOptions,
      source: source,
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
