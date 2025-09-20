/**
 * Mengambil dan memproses data wilayah (kecamatan dan desa) dari file GeoJSON
 * yang ada di folder /public/data. Ini untuk mengisi pilihan filter.
 */
export const getRegionData = async () => {
  try {
    const kecamatanResponse = await fetch('/data/kecamatan.geojson');
    const desaResponse = await fetch('/data/desa.geojson');

    if (!kecamatanResponse.ok || !desaResponse.ok) {
      throw new Error('Gagal memuat file GeoJSON wilayah');
    }

    const kecamatanData = await kecamatanResponse.json();
    const desaData = await desaResponse.json();

    // Ubah data GeoJSON menjadi format yang bisa dipakai oleh react-select
    const kecamatanOptions = kecamatanData.features.map(feature => ({
      value: feature.properties.KECAMATAN,
      label: feature.properties.KECAMATAN,
    }));

    const desaOptions = {};
    desaData.features.forEach(feature => {
      const kecamatan = feature.properties.KECAMATAN;
      const desa = feature.properties.DESA;
      if (!desaOptions[kecamatan]) {
        desaOptions[kecamatan] = [];
      }
      desaOptions[kecamatan].push({ value: desa, label: desa });
    });

    return { kecamatanOptions, desaOptions };

  } catch (error) {
    console.error("Error fetching region data:", error);
    return { kecamatanOptions: [], desaOptions: {} };
  }
};