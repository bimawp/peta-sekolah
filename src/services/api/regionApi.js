// Dummy API untuk sekolah
const schoolApi = {
  fetchSchools: async () => {
    return [
      { id: 1, name: 'SD 1', level: 'SD' },
      { id: 2, name: 'SMP 1', level: 'SMP' },
    ];
  },
};

export default schoolApi;
