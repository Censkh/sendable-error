import ErrorCode                   from "./ErrorCode";
import {ErrorOptions, ScopedValue} from "./Types";
import SendableError               from "./SendableError";
import {getErrorParsers}            from "./Parser";

const DEFAULT_DETAILS = {};

export interface SendableErrorBuilderBase {
  details(details: ScopedValue<Object>): this;

  code(code: ErrorCode): this;

  options(options: ErrorOptions): this;

  defaultCode(defaultCode: ErrorCode): this;

  messages(messages: ScopedValue<string>): this;
}

export class SendableErrorBuilder implements SendableErrorBuilderBase {
  private _code: ErrorCode | null               = null;
  private _defaultCode!: ErrorCode;
  private _messages: ScopedValue<string> | null = null;
  private _options: ErrorOptions | null         = null;
  private _details: ScopedValue<Object>         = DEFAULT_DETAILS;

  code(code: ErrorCode): this {
    this._code = code;
    return this;
  }

  defaultCode(defaultCode: ErrorCode): this {
    this._defaultCode = defaultCode;
    return this;
  }

  details(details: ScopedValue<Object>): this {
    this._details = details;
    return this;
  }

  messages(messages: ScopedValue<string>): this {
    this._messages = messages;
    return this;
  }

  options(options: ErrorOptions): this {
    this._options = options;
    return this;
  }

  build(codeOrError: ErrorCode | Error): SendableError {
    let result: SendableError;

    if (codeOrError instanceof Error) {
      const error = codeOrError as Error;

      if (error instanceof SendableError) {
        result = error;
      } else {
        for (const parser of getErrorParsers()) {
          parser.func(error, this);
        }

        Object.setPrototypeOf(error, SendableError.prototype);
        const sendable = error as SendableError;
        (sendable as any).init();
        result = sendable;
      }
    } else {
      const code = codeOrError;
      result     = new (SendableError as any)(code.defaultMessage, code);
    }

    if (this._code) {
      result.code(this._code);
    }

    if (this._defaultCode) {
      result.defaultCode(this._defaultCode);
    }

    if (this._options) {
      result.options(this._options);
    }

    if (this._messages) {
      result.messages(this._messages);
    }

    if (this._details) {
      result.details(this._details);
    }

    return result;
  }

}
