import { useCallback, useReducer } from 'react';
import type { ApiState } from '../types/api';
import { inferenceResultSchema } from '../shared/types';
import type { GatewayResponse, GatewaySuccessResponse } from '../shared/types';
 
// Actions for the reducer — exhaustive discriminated union
type ClassifyAction =
  | { type: 'UPLOAD_START' }
  | { type: 'UPLOAD_PROGRESS'; progress: number }
  | { type: 'UPLOAD_SUCCESS';  data: GatewaySuccessResponse; latencyMs: number }
  | { type: 'UPLOAD_ERROR';    message: string; code: string }
  | { type: 'RESET' };
 
function classifyReducer(
  _state: ApiState<GatewaySuccessResponse>,
  action: ClassifyAction,
): ApiState<GatewaySuccessResponse> {
  // Switch is exhaustive — TS errors if a new action type is added without handling it
  switch (action.type) {
    case 'UPLOAD_START':    return { phase: 'loading', progress: 0 };
    case 'UPLOAD_PROGRESS': return { phase: 'loading', progress: action.progress };
    case 'UPLOAD_SUCCESS':  return { phase: 'success', data: action.data, latencyMs: action.latencyMs };
    case 'UPLOAD_ERROR':    return { phase: 'error',   message: action.message, code: action.code };
    case 'RESET':           return { phase: 'idle' };
  }
}
 
export type UseClassificationReturn = {
  state:    ApiState<GatewaySuccessResponse>;
  classify: (file: File) => Promise<void>;
  reset:    () => void;
};
 
export function useClassification(
  apiBase: string = '/api',
): UseClassificationReturn {
  const [state, dispatch] = useReducer(classifyReducer, { phase: 'idle' });
 
  const classify = useCallback(async (file: File): Promise<void> => {
    dispatch({ type: 'UPLOAD_START' });
 
    const form = new FormData();
    form.append('file', file);
 
    // XHR for upload progress — fetch has no progress events
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const t0  = performance.now();
 
      xhr.upload.addEventListener('progress', (e: ProgressEvent) => {
        if (e.lengthComputable) {
          dispatch({
            type:     'UPLOAD_PROGRESS',
            progress: Math.round((e.loaded / e.total) * 100),
          });
        }
      });
 
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // unknown here: JSON.parse returns `any` — we narrow with Zod immediately
          const raw: unknown = JSON.parse(xhr.responseText);
          // Re-use the same Zod schema from NestJS shared module
          const parsed = inferenceResultSchema.safeParse(raw);
 
          if (!parsed.success) {
            dispatch({
              type:    'UPLOAD_ERROR',
              message: 'Unexpected response format from server',
              code:    'SCHEMA_MISMATCH',
            });
            resolve();
            return;
          }
 
          const result: GatewayResponse = parsed.data as GatewayResponse;
 
          if (result.status === 'success') {
            dispatch({
              type:      'UPLOAD_SUCCESS',
              data:      result as GatewaySuccessResponse,
              latencyMs: Math.round(performance.now() - t0),
            });
          } else {
            dispatch({
              type:    'UPLOAD_ERROR',
              message: result.message,
              code:    result.code,
            });
          }
        } else {
          dispatch({
            type:    'UPLOAD_ERROR',
            message: `Server error: HTTP ${xhr.status}`,
            code:    'HTTP_ERROR',
          });
        }
        resolve();
      });
 
      xhr.addEventListener('error', () => {
        dispatch({ type: 'UPLOAD_ERROR', message: 'Network error', code: 'NETWORK' });
        reject(new Error('Network error'));
      });
 
      xhr.open('POST', `${apiBase}/classify`);
      xhr.send(form);
    });
  }, [apiBase]);
 
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);
 
  return { state, classify, reset };
}
