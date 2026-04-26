export type ApiState<TData> =
  | { phase: 'idle' }
  | { phase: 'loading'; progress: number }  // 0–100
  | { phase: 'success'; data: TData; latencyMs: number }
  | { phase: 'error';   message: string; code: string };
 
// Utility: extract TData from ApiState<TData>
// infer in conditional extracts the type parameter from the union
type ExtractApiData<S> = S extends ApiState<infer T> ? T : never;
