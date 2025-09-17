/** @type {import('tailwindcss').Config} */
module.exports = {
  // Baris 'content' ini PENTING.
  // Ini memberitahu Tailwind untuk memindai semua file .js dan .jsx di dalam folder src.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Di sini Anda bisa menambahkan warna, font, atau tema kustom
      // yang akan berlaku di seluruh aplikasi.
      // Contoh:
      // colors: {
      //   'primary': '#00529B',
      //   'secondary': '#FFC107',
      // }
    },
  },
  plugins: [],
}