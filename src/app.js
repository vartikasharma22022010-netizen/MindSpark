import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Chat from "./pages/Chat";
import PYQ from "./pages/PYQ";
import Premium from "./pages/Premium";

function App() {

    // check login
    const isLoggedIn = () => {
        return localStorage.getItem("token") ? true : false;
    };

    return (
        <Router>
            {isLoggedIn() && <Navbar />}

            <Routes>

                {/* Default route */}
                <Route path="/" element={<Navigate to="/chat" />} />

                {/* Auth pages */}
                <Route path="/login" element={isLoggedIn() ? <Navigate to="/chat" /> : <Login />} />
                <Route path="/register" element={isLoggedIn() ? <Navigate to="/chat" /> : <Register />} />

                {/* Protected pages */}
                <Route
                    path="/chat"
                    element={isLoggedIn() ? <Chat /> : <Navigate to="/login" />}
                />

                <Route
                    path="/pyq"
                    element={isLoggedIn() ? <PYQ /> : <Navigate to="/login" />}
                />

                <Route
                    path="/premium"
                    element={isLoggedIn() ? <Premium /> : <Navigate to="/login" />}
                />

                {/* 404 */}
                <Route path="*" element={<h2 style={{ textAlign: "center" }}>Page Not Found</h2>} />

            </Routes>
        </Router>
    );
}

export default App;
