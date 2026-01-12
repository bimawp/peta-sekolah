// Dummy API untuk auth
const authApi = {
  login: async (credentials) => {
    // misal return user dummy
    return { id: 1, name: 'Admin', email: credentials.email };
  },
  register: async (data) => {
    return { id: 2, ...data };
  },
};

export default authApi;
