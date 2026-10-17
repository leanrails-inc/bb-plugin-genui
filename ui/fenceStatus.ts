/** BB ≥ 0.46 sends `status`; the early slot proposal sent `complete`. */
export type FenceStatus = "streaming" | "closed" | "unclosed";

/** The fence body is final once BB says it closed or the reply ended without closing it. */
export function fenceComplete({ status, complete }: { status?: FenceStatus; complete?: boolean }): boolean {
  return status === undefined ? complete === true : status !== "streaming";
}
