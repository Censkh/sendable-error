import { SENDABLE_ERROR_INSTANCE_SYMBOL } from "./Consts";
import type SendableError from "./SendableError";

export const isSendableError = (error: any): error is SendableError => {
  if (!error || typeof error !== "object") {
    return false;
  }
  return Boolean(error[SENDABLE_ERROR_INSTANCE_SYMBOL]);
};
