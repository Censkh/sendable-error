import {Scope, ScopedValue} from "./Types";

const SCOPE_VALUES: Scope[] = ["private", "public"];

export const computedScopedValue = <T>(scope: Scope, values: Array<ScopedValue<T> | null | undefined>, defaultValue?: T): T | undefined => {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      if (isScoped(value)) {
        const scopedValue = (value as any)[scope];
        if (scopedValue !== undefined) {
          return scopedValue;
        } else {
          continue;
        }
      }
      return value as T;
    }
  }

  return defaultValue;
};

export const getScopedValues = <T>(value: ScopedValue<T>): T[] => {
  return isScoped(value) ? Object.values(value) : [value as any];
};

const isScoped = <T>(value: ScopedValue<T>): value is Partial<Record<Scope, any>> => {
  return value !== null && typeof value === "object" && Object.keys(value).some(key => SCOPE_VALUES.includes(key as any));
};
