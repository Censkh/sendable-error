import type SendableError from "./SendableError";
import type { DefaultSendableErrorDetails, SendableErrorDetails } from "./SendableError";
import { isSendableError } from "./Utils";

export interface ErrorCodeProperties {
  id: string;
  defaultMessage: string;
  status?: number;
}

export default class ErrorCode<D extends SendableErrorDetails = DefaultSendableErrorDetails> {
  static DEFAULT_CODE = new ErrorCode({
    id: "misc/internal-error",
    defaultMessage: "An internal error occurred",
  });

  readonly prefix: string;

  //readonly options: ErrorOptions;

  constructor(private readonly properties: ErrorCodeProperties /*options?: ErrorOptions*/) {
    const parts = properties.id.split("/");
    if (parts.length !== 2) {
      console.error(
        `[sendable-error] Invalid error code '${properties.id}' provided, must be of form 'prefix/descriptive-name'`,
      );
    }
    this.prefix = properties.id.split("/")[0];
  }

  getDefaultMessage(): string | undefined {
    return this.properties.defaultMessage;
  }

  getId(): string {
    return this.properties.id;
  }

  /**
   * Does this error have this code?
   */
  is(error: any): error is SendableError {
    if (isSendableError(error)) {
      return error.getCode().getId() === this.getId();
    }

    return false;
  }

  /**
   * Extends an existing error code
   */
  private extend(properties: ErrorCodeProperties) {
    /*const mixedOptions = {
      ...this.options,
      ...options,
    };*/
    const code = new ErrorCode(properties /*mixedOptions*/);
    if (code.prefix !== this.prefix) {
      console.error("[sendable-error] Extension doesn't share same prefix, this doesn't seem right", {
        originalPrefix: this.prefix,
        newPrefix: code.prefix,
      });
    }
    return code;
  }

  static get(error: Error): ErrorCode {
    return isSendableError(error) ? error.getCode() : ErrorCode.DEFAULT_CODE;
  }

  getStatus(): number | undefined {
    return this.properties.status;
  }

  toString() {
    return this.getId();
  }
}
