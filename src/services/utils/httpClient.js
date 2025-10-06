// src/services/utils/httpClient.js
import axios from 'axios';
import { applyInterceptors } from './interceptors';

const http = axios.create({
  withCredentials: false,
  timeout: 20000,
});

// Tambah dukungan AbortController supaya navigasi cepat membatalkan request lama
export function cancellableGet(url, config = {}) {
  const controller = new AbortController();
  const sourceConfig = { ...config, signal: controller.signal };
  const promise = http.get(url, sourceConfig);
  return { promise, cancel: () => controller.abort() };
}

applyInterceptors(http);

export default http;
