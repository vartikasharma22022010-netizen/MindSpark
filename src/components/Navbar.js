import React from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar(){
    const nav = useNavigate();
    const token = localStorage.getItem("token");

    const logout = () => {
        localStorage.removeItem("token");
        nav("/login");
    };

    return (
        <div className="navbar container">
            <div className="nav-left">
                <div className="brand">Mindspark</div>
                <Link to="/chat">Chat</Link>
                <Link to="/pyq" style={{marginLeft:12}}>PYQs</Link>
            </div>

            <div className="nav-actions">
                <Link to="/premium"><button className="btn-ghost">Go Premium</button></Link>
                {token ? <button className="btn" onClick={logout}>Logout</button> : <Link to="/login"><button className="btn">Login</button></Link>}
            </div>
        </div>
    );
}
