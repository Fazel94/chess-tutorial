/**
 * Parse a UCI move string into its components.
 * @param {string} uci - e.g. "e2e4", "e7e8q"
 * @returns {{ from: string, to: string, promotion: string | undefined }}
 */
export function parseUci(uci) {
  return {
    from:      uci.slice(0, 2),
    to:        uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}
