import { ValidationErrorResponse } from '@app/contracts';
import { ApiError } from './http-client';

/** One server-side problem with a request: `path` names the field (`email`, `items.0.name`). */
export interface ApiIssue {
  path: string;
  message: string;
}

// 400 from the validation pipe and field conflicts such as 409 on registration share this part.
const IssuesBody = ValidationErrorResponse.pick({ issues: true });

/**
 * Narrows a hook or mutation error to an HTTP error answered by the api, optionally with one
 * status. Network failures and aborted requests are not `ApiError`.
 */
export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
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
