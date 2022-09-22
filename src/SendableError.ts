import {v5 as uuid}                           from "uuid";
import ErrorCode                              from "./ErrorCode";
import {ErrorResponseBody, ResponseWithError} from "./Types";
import {ERROR_CODE_MISC_INTERNAL_ERROR}       from "./DefaultCodes";
import {getErrorLogger}                       from "./Logging";

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

const DEFAULT_PROPERTIES: SendableErrorProperties<any> = {
  code: ERROR_CODE_MISC_INTERNAL_ERROR,
};

export type SendableErrorDetails = Record<string, any>;

export interface SendableErrorProperties<D extends SendableErrorDetails = {}> {
  code: ErrorCode,
  message?: string,
  //options?: ErrorOptions,
  details?: D & Record<string, any>,
  cause?: Error
}

export interface SendableErrorState {
  logged: boolean,
  traceId: string,
}

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
      result = error as SendableError<D>;
    }

    result.init(properties);

    return result;
  }

  constructor(properties?: SendableErrorProperties<D>) {
    super("__");

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
  }

  getCause(): Error | undefined {
    return this.properties.cause;
  }

  getCode(): ErrorCode {
    return this.properties.code || ERROR_CODE_MISC_INTERNAL_ERROR;
  };

  getMessage(): string {
    return this.properties.message || this.getCode().getDefaultMessage() ||  "An unknown error occurred";
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
      message: this.getMessage(),
      traceId: this.state.traceId,
      details: this.properties.details || {},
    };
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
  };

  /**
   * Log out info on error
   */
  log(source: string, message?: string, info?: any) {
    this.state.logged = true;
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
  };

}

Object.defineProperty(SendableError, "name", {
  value: "SendableError",
});
