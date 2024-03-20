import type SendableError from "./SendableError";

export type ErrorLogger = (options: ErrorLoggerOptions) => void;

export interface ErrorLoggerOptions {
  //options: Required<ErrorOptions>;
  source: string;
  message: string;
  error: SendableError;
  info: any;
  errorInfo: any;
  providedInfo: any;
}

export const defaultErrorLogger: ErrorLogger = (options) => {
  const { source, message, error, info } = options;

  const stackLines = error.stack?.split("\n").slice(1).join("\n");
  console.error(`${source || "SendableError"} - ${message} ${JSON.stringify(info || {})}${stackLines ? `\n${stackLines}` : ""}`);

  const cause = error.cause;
  if (cause && cause instanceof Error) {
    defaultErrorLogger({
      ...options,
      source,
      message: `Caused by: ${cause.message}`,
      error: cause as SendableError,
      errorInfo: {},
    });
  }
};

let currentLogger = defaultErrorLogger;

export const setErrorLogger = (logger: ErrorLogger): void => {
  currentLogger = logger;
};

export const getErrorLogger = (): ErrorLogger => {
  return currentLogger;
};
