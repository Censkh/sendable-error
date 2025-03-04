export type Severity = "debug" | "info" | "warn" | "error";

export interface ResponseWithError {
  status: ((statusCode: number) => this) | number;

  send(data: any): void;

  cause?: Error;
  headersSent: boolean;
}

/*export interface ErrorOptions {
  statusCode?: number,
  severity?: Severity,
  displayName?: string,
}*/

export interface ErrorResponseBody {
  code: string;
  message: string;
  traceId: string;
  details: any;
}
