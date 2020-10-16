export type Severity = "debug" | "info" | "warn" | "error";

export interface ResponseWithError {
  status: ((statusCode: number) => this) | number;

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

export type Scope = "private" | "public";

export type ScopedValue<T> = T | Partial<Record<Scope, T>>;

export interface ErrorResponseBody {
  code: string,
  message: string;
  traceId: string;
  details: any;
}
