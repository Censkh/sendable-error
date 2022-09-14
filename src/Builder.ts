import ErrorCode         from "./ErrorCode";
//import {ErrorOptions}                                                 from "./Types";
import SendableError, {SendableErrorDetails, SendableErrorProperties} from "./SendableError";
import {getErrorParsers}                                              from "./Parser";

export class SendableErrorBuilder<D extends SendableErrorDetails = {}> {
  private baseError: Error | undefined;
  private properties: Partial<SendableErrorProperties<D>> = {};

  constructor(codeOrError: ErrorCode<D> | Error) {
    if (codeOrError instanceof Error) {
      this.baseError = codeOrError;
    } else {
      this.properties.code = codeOrError;
    }
  }

  code<N extends SendableErrorDetails>(code: ErrorCode<N>): SendableErrorBuilder<N> {
    this.properties.code = code;
    return this as any;
  }

  details(details: D): this {
    this.properties.details = details;
    return this;
  }

  reason(reason: Error | undefined): this {
    this.properties.reason = reason;
    return this;
  }

  message(message: string): this {
    this.properties.message = message;
    return this;
  }

  build(): SendableError<D> {
    let result: SendableError;

    if (this.baseError) {
      const error = this.baseError;

      if (error instanceof SendableError) {
        result = error;
      } else {
        for (const parser of getErrorParsers()) {
          parser.parse(error, this);
        }

        // if the message is a getter, grab it before we mess with the prototype
        Object.setPrototypeOf(error, SendableError.prototype);
        const sendable = error as SendableError;
        (sendable as any).init(this.properties);
        result = sendable;
      }
    } else {
      result     = new (SendableError as any)(this.properties);
    }

    return result;
  }

}
