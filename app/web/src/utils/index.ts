import { v4 as uuid } from "uuid";

export function getURL(path: string): string {
  const baseURL = "http://localhost:3030";
  return `${baseURL}${path}`;
}
