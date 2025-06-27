export function isPlainObject(value: any): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value.constructor === Object || Object.getPrototypeOf(value) === null)
  );
}
