import {ErrorOptions} from "./Types";
import SendableError  from "./SendableError";

export type ErrorLogger = (options: Required<ErrorOptions>, source: string, message: string, error: SendableError, info: any) => void;

export const defaultErrorLogger: ErrorLogger = (options, source, message, error, info) => {
  if (options.severity !== "error") {
    console[options.severity](source || `ErrorUtils::log`, message, info);
  } else {
    console.error(source || `ErrorUtils::log`, message, info);
    console.error(error);
  }
};

let currentLogger = defaultErrorLogger;

export const setErrorLogger = (logger: ErrorLogger): void => {
  currentLogger = logger;
};

export const getErrorLogger = (): ErrorLogger => {
  return currentLogger;
};
