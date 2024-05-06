export function getSystemSymbol(navSymbol: string) {
  if (!navSymbol.length) {
    return "";
  }
  const [sector, system] = navSymbol.split("-");
  return `${sector}-${system}`;
}
