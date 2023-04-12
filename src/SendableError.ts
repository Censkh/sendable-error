import ErrorCode                              from "./ErrorCode";
import {ErrorResponseBody, ResponseWithError} from "./Types";
import {ERROR_CODE_MISC_INTERNAL_ERROR}       from "./DefaultCodes";
import {getErrorLogger}                       from "./Logging";
import crypto                                 from "crypto";

/*export const DEFAULT_ERROR_OPTIONS: Required<ErrorOptions> = {
  statusCode : 500,
  severity   : "warn",
  displayName: "Error",
};*/

const byteToHex: string[] = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).substr(1));
}

function stringify(arr: any, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase(); // Consistency check for valid UUID.  If this throws, it's likely due to one
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
  return stringify(crypto.createHash("sha1").update(Buffer.from(errorString)).digest());
};


export const isSendableError = (error: Error): error is SendableError => {
  return error instanceof SendableError;
};

const DEFAULT_PROPERTIES: SendableErrorProperties<any> = {
  code: ERROR_CODE_MISC_INTERNAL_ERROR,
};

export type SendableErrorDetails = Record<string, any>;

export interface SendableErrorProperties<D extends SendableErrorDetails = {}> {
  code?: ErrorCode,
  message?: string,
  publicMessage?: string,
  details?: D & Record<string, any>,
  cause?: Error
}

export interface SendableErrorState {
  logged: boolean,
  traceId: string,
}

const CONSTRUCTOR_MESSAGE = "__$$sendable-error-message__";

/**
 * An error with a known cause that is sendable
 */
export default class SendableError<D extends SendableErrorDetails = {}> extends Error {

  private properties!: SendableErrorProperties<D>;
  private state!: SendableErrorState;

  public static is(error: Error): error is SendableError {
    return isSendableError(error);
  }

  public static of<D extends SendableErrorDetails>(error: Error, properties?: Partial<SendableErrorProperties<D>>): SendableError<D> {
    let result: SendableError<D>;

    if (error instanceof SendableError) {
      result = error;
    } else {
      Object.setPrototypeOf(error, SendableError.prototype);
      result     = error as SendableError<D>;
      properties = {
        code         : ERROR_CODE_MISC_INTERNAL_ERROR,
        message      : error.message,
        publicMessage: ERROR_CODE_MISC_INTERNAL_ERROR.getDefaultMessage(),
        ...properties,
      };
    }

    result.init(properties);

    return result;
  }

  constructor(properties?: SendableErrorProperties<D>) {
    super(CONSTRUCTOR_MESSAGE);

    this.init(properties);
  }

  private overrideProperty(name: string, getter: () => any) {
    const boundGetter = getter.bind(this);
    Object.defineProperty(this, name, {
      value: boundGetter(),
    });
  }

  private init(properties?: Partial<SendableErrorProperties<D>>) {
    if (!this.properties) {
      this.properties = {...DEFAULT_PROPERTIES, ...properties};
    } else {
      Object.assign(this.properties, properties);
    }

    this.state = {
      logged : false,
      traceId: getTraceId(this),
    };

    this.overrideProperty("code", this.getCode);
    this.overrideProperty("message", this.getMessage);
    this.overrideProperty("cause", this.getCause);
    this.overrideProperty("stack", this.getStack);
  }

  getStack(): string | undefined {
    return this.stack?.replace(CONSTRUCTOR_MESSAGE, this.getMessage());
  }

  getCause(): Error | undefined {
    return this.properties.cause;
  }

  getCode(): ErrorCode {
    return this.properties.code || ERROR_CODE_MISC_INTERNAL_ERROR;
  }

  getMessage(): string {
    return this.properties.message || this.getCode().getDefaultMessage() || "An unknown error occurred";
  }

  getPublicMessage(): string {
    return this.properties.publicMessage || this.getMessage();
  }

  /*get computedOptions(): Required<ErrorOptions> {
    return {
      ...DEFAULT_ERROR_OPTIONS,
      ...this.getCode().options,
      ...this.__properties.options,
    };
  }*/

  toResponse(): ErrorResponseBody {
    return {
      code   : this.getCode().getId(),
      message: this.getPublicMessage(),
      traceId: this.state.traceId,
      details: this.properties.details || {},
    };
  }

  getDetails(): SendableErrorDetails | undefined {
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
        res.status(500);
      }
      res.send(this.toResponse());
    }
    return this;
  }

  /**
   * Log out info on error
   */
  log(source: string, message?: string, info?: any) {
    this.state.logged   = true;
    /**const computedOptions = {
      ...this.computedOptions,
      ...(options || {}),
    };**/
    const traceId       = this.getTraceId();
    const loggedMessage = message || this.getMessage();

    const providedInfo   = Object.assign({}, this.properties.details, info);
    const errorInfo: any = {
      traceId: traceId,
      code   : this.getCode().getId(),
    };

    const computedInfo = Object.assign({}, errorInfo, providedInfo);

    getErrorLogger()({
      //options     : computedOptions,
      source      : source,
      message     : loggedMessage,
      error       : this,
      info        : computedInfo,
      errorInfo   : errorInfo,
      providedInfo: providedInfo,
    });

    return this;
  }

}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
