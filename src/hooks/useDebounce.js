// src/hooks/useDebounce.js
import { useState, useEffect } from 'react';

// Custom hook untuk menunda eksekusi (misalnya, saat pengguna mengetik atau memilih filter)
// Ini sangat berguna untuk performa agar tidak memicu render/kalkulasi ulang terus-menerus
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Set timeout untuk memperbarui nilai setelah delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Bersihkan timeout jika nilai atau delay berubah sebelum timeout selesai
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Hanya jalankan ulang efek jika value atau delay berubah

  return debouncedValue;
}