import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SchoolDataProvider } from './contexts/SchoolDataContext';
import AppRoutes from './routes/AppRoutes';

// Tidak perlu import BrowserRouter di sini lagi

function App() {
  return (
    <Provider store={store}>
      <AuthProvider>
        <ThemeProvider>
          {/* Provider data akan membungkus semua rute/halaman */}
          <SchoolDataProvider>
            {/* Langsung render AppRoutes tanpa BrowserRouter tambahan */}
            <AppRoutes />
          </SchoolDataProvider>
        </ThemeProvider>
      </AuthProvider>
    </Provider>
  );
}

export default App;