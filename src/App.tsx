import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import './styles/toast.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { UserProvider } from './components/UserContext';
import GenreContext from './components/GenreContext';
import AppRoutes from './AppRoutes';
import NavigationPage from './components/NavigationPage';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';

const App = () => {
    const [genre, setGenre] = React.useState("");

    return (
        <Router>
            <UserProvider>
                <GenreContext.Provider value={{ genre, setGenre }}>
                    <div className="app-container">
                        <NavigationPage />
                        <ToastContainer
                            position="top-center"
                            autoClose={3000}
                            hideProgressBar={false}
                            newestOnTop
                            closeOnClick
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            pauseOnHover
                            theme="light"
                            limit={3}
                        />
                        <Suspense fallback={<LoadingSpinner fullScreen variant="bootstrap" />}>
                            <AppRoutes />
                        </Suspense>
                        <Footer />
                    </div>
                </GenreContext.Provider>
            </UserProvider>
        </Router>
    );
};

export default App;
