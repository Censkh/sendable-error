import {v5 as uuid}                                         from "uuid";
import ErrorCode                                            from "./ErrorCode";
import {ErrorResponseBody, ResponseWithError} from "./Types";
import {CODE_MISC_INTERNAL_ERROR}                           from "./DefaultCodes";
import {getErrorLogger}                                     from "./Logger";
import {SendableErrorBuilder}                               from "./Builder";

/*export const DEFAULT_ERROR_OPTIONS: Required<ErrorOptions> = {
  statusCode : 500,
  severity   : "warn",
  displayName: "Error",
};*/

/**
 * Transforms an error into a deterministic error identifier to enable easy log searching
 */
export const getTraceId = (error: Error): string => {
  const errorString = error.stack || error.toString();
  return uuid(errorString, uuid.URL);
};


export const isSendableError = (error: Error): error is SendableError => {
  return error instanceof SendableError;
};

const DEFAULT_PROPERTIES: SendableErrorProperties = {
  code: CODE_MISC_INTERNAL_ERROR,
};

export type SendableErrorDetails = Record<string, any>;

export interface SendableErrorProperties<D extends SendableErrorDetails = {}> {
  code: ErrorCode,
  message?: string,
  //options?: ErrorOptions,
  details?: SendableErrorDetails,
  reason?: Error
}

export interface SendableErrorState {
  logged: boolean,
  traceId: string,
}

/**
 * An error with a known cause that is sendable
 */
export default class SendableError<D extends SendableErrorDetails = {}> extends Error {

  private __properties!: SendableErrorProperties<D>;
  private __state!: SendableErrorState;

  public static is(error: Error): error is SendableError {
    return isSendableError(error);
  }

  public static of<D extends SendableErrorDetails>(codeOrError: ErrorCode<D> | Error): SendableErrorBuilder<D> {
    return new SendableErrorBuilder(codeOrError);
  }

  private constructor(properties?: SendableErrorProperties<D>) {
    super("__");

    this.init(properties);
  }

  private overrideProperty(name: string, getter: () => any) {

    Object.defineProperty(this, name, {
      value: getter(),
      get: getter.bind(this),
    });

  }

  private init(properties?: Partial<SendableErrorProperties<D>>) {
    if (!this.__properties) {
      this.__properties = {...DEFAULT_PROPERTIES, ...properties};
    } else {
      Object.assign(this.__properties, properties);
    }

    this.__state      = {
      logged : false,
      traceId: getTraceId(this),
    };

    this.overrideProperty("code", this.getCode);
    this.overrideProperty("message", this.getMessage);
    this.overrideProperty("reason", this.getReason);
  }

  getReason(): Error | undefined {
    return this.__properties.reason;
  }

  getCode(): ErrorCode {
    return this.__properties.code;
  };

  getMessage(): string {
    return this.__properties.message || this.getCode().defaultMessage;
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
      code   : this.getCode().id,
      message: this.getMessage(),
      traceId: this.__state.traceId,
      details: this.__properties.details || {},
    };
  }

  getTraceId(): string {
    return this.__state.traceId;
  }

  /**
   * Sends the error (if a response wasn't already sent) & logs if it wasn't already logged
   */
  send(res: ResponseWithError): this {
    // Make sure errors aren't swallowed
    if (!this.__state.logged) {
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
  };

  /**
   * Log out info on error
   */
  log(source: string, message?: string, info?: any) {
    this.__state.logged   = true;
    /**const computedOptions = {
      ...this.computedOptions,
      ...(options || {}),
    };**/
    const traceId         = this.getTraceId();
    const loggedMessage   = message || this.getMessage();

    const providedInfo   = Object.assign({}, this.__properties.details, info);
    const errorInfo: any = {
      traceId: traceId,
      code   : this.getCode().id,
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
  };

}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
