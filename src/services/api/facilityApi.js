// Dummy API untuk fasilitas
const facilityApi = {
  fetchFacilities: async () => {
    return [
      { id: 1, name: 'Ruang Kelas', quantity: 10 },
      { id: 2, name: 'Laboratorium', quantity: 2 },
    ];
  },
};

export default facilityApi;
