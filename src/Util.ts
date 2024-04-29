export function getSystemSymbol(navSymbol: string) {
  const [sector, system] = navSymbol.split("-");
  return `${sector}-${system}`;
}
