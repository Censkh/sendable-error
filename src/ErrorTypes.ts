export type Severity = "debug" | "info" | "warn" | "error";

export interface Response {
  status(statusCode: number): this;

  send(data: any): void;

  cause?: Error;
  headersSent: boolean;
}

declare global {
  export interface Error {
    originalStack?: string;
  }
}

export interface ErrorOptions {
  statusCode?: number,
  severity?: Severity,
  displayName?: string,
}
