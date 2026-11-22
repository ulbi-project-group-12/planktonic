import { ValidationErrorResponse } from '@app/contracts';
import { ApiError } from './http-client';

/** One server-side problem with a request: `path` names the field (`email`, `items.0.name`). */
export interface ApiIssue {
  path: string;
  message: string;
}

// Only the `issues` part of the contract: the validation 400 and field conflicts such as the 409
// on registration both carry it, so any status with a well-formed list is accepted.
const IssuesBody = ValidationErrorResponse.pick({ issues: true });

/**
 * Narrows a hook or mutation error to an HTTP error answered by the api. Network failures and
 * aborted requests are not `ApiError`.
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Whether the api answered with exactly this status: `hasApiStatus(error, 409)`. Returns a plain
 * boolean, so the `else` branch keeps whatever type the error already had.
 */
export function hasApiStatus(error: unknown, status: number): boolean {
  return isApiError(error) && error.status === status;
}

/**
 * The field issues the api sent with an error (`issues: [{ path, message }]`), for showing each
 * message next to its form field. Empty when the error is not an HTTP error or carries no issues:
 * show a general message then.
 */
export function getApiIssues(error: unknown): ApiIssue[] {
  if (!isApiError(error)) return [];
  const parsed = IssuesBody.safeParse(error.body);
  return parsed.success ? parsed.data.issues : [];
}
