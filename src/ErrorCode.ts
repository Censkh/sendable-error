import SendableError, {isSendableError, SendableErrorDetails} from "./SendableError";
//import {ErrorOptions}                   from "./Types";
import {CODE_MISC_INTERNAL_ERROR}       from "./DefaultCodes";

export interface ErrorCodeOptions {

}

export default class ErrorCode<D extends SendableErrorDetails = {}> {

  readonly prefix: string;
  readonly id: string;
  readonly defaultMessage: string;
  //readonly options: ErrorOptions;

  constructor(id: string, defaultMessage?: string, /*options?: ErrorOptions*/) {
    const parts = id.split("/");
    if (parts.length !== 2) {
      console.error(`[sendable-error] Invalid error code '${id}' provided, must be of form 'prefix/descriptive-name'`);
    }
    this.prefix         = id.split("/")[0];
    this.id             = id;
    this.defaultMessage = defaultMessage || "An unknown error occurred";
    //this.options        = options || {};
  }

  /**
   * Does this error have this code?
   */
  is(error: any): error is SendableError {
    if (isSendableError(error)) {
      return error.getCode().id === this.id;
    }

    return false;
  }

  /**
   * Extends an existing error code
   */
  private extend(id: string, defaultMessage = undefined, options = {}) {
    /*const mixedOptions = {
      ...this.options,
      ...options,
    };*/
    const code         = new ErrorCode(id, defaultMessage || this.defaultMessage, /*mixedOptions*/);
    if (code.prefix !== this.prefix) {
      console.error("[sendable-error] Extension doesn't share same prefix, this doesn't seem right", {
        originalPrefix: this.prefix,
        newPrefix     : code.prefix,
      });
    }
    return code;
  }

  static get(error: Error): ErrorCode {
    return isSendableError(error) ? error.getCode() : CODE_MISC_INTERNAL_ERROR;
  }

}
