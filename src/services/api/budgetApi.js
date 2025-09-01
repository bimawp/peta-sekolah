// Dummy API untuk budget
const budgetApi = {
  fetchBudgets: async () => {
    return [
      { id: 1, name: 'Anggaran 1', amount: 1000 },
      { id: 2, name: 'Anggaran 2', amount: 2000 },
    ];
  },
};

export default budgetApi;
