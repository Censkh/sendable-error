import { SENDABLE_ERROR_INSTANCE_SYMBOL } from "./Consts";
import type SendableError from "./SendableError";

export const isSendableError = (error: Error): error is SendableError => {
  return Boolean(error && (error as any)[SENDABLE_ERROR_INSTANCE_SYMBOL]);
};
