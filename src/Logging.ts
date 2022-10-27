import SendableError from "./SendableError";

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

export const defaultErrorLogger: ErrorLogger = ({source, message, error, info}) => {
  console.error(source || `SendableError`, message, info, error.stack);
};

let currentLogger = defaultErrorLogger;

export const setErrorLogger = (logger: ErrorLogger): void => {
  currentLogger = logger;
};

export const getErrorLogger = (): ErrorLogger => {
  return currentLogger;
};
