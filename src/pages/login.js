import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Login(){
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const nav = useNavigate();

    const submit = async () => {
        try{
            const { data } = await axios.post(`${API}/login`, { email, password: pw });
            if (data.token){
                localStorage.setItem("token", data.token);
                nav("/chat");
            } else {
                alert(data.error || data.message || "Login failed");
            }
        }catch(e){
            alert(e.response?.data?.error || e.message);
        }
    };

    return (
        <div className="container">
            <h2>Login to Mindspark</h2>
            <div style={{maxWidth:420}}>
                <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                <input placeholder="Password" type="password" value={pw} onChange={e=>setPw(e.target.value)} />
                <div style={{display:'flex', gap:8, marginTop:8}}>
                    <button className="btn" onClick={submit}>Login</button>
                    <Link to="/register"><button className="btn-ghost">Register</button></Link>
                </div>
            </div>
        </div>
    );
}
