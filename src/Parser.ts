import {SendableErrorBuilder} from "./Builder";

export type ErrorParserFunction = (error: Error, builder: SendableErrorBuilder) => void;

export type ErrorParser = {
  id: string;
  parse: ErrorParserFunction;
};

const parsers: ErrorParser[] = [];

export const addErrorParser = (parser: ErrorParser) => {
  parsers.push(parser);
};

export const getErrorParsers = () => {
  return parsers;
};
