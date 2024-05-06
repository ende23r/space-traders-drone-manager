import { useState, useEffect } from "react";

function getStorageValue(key: string, defaultValue: string) {
  return localStorage.getItem(key) || defaultValue;
}

export function useLocalStorage(
  key: string,
  defaultValue: string,
): [string, (s: string) => void] {
  const [value, setValue] = useState(() => {
    return getStorageValue(key, defaultValue);
  });

  useEffect(() => {
    // storing input name
    localStorage.setItem(key, value);
  }, [key, value]);

  return [value, setValue];
}
