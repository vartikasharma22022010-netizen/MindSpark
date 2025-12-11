import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function PYQ(){
    const token = localStorage.getItem("token");
    const [file, setFile] = useState(null);
    const [text, setText] = useState("");

    const upload = async () => {
        if (!file) return alert("Choose a file");
        const form = new FormData();
        form.append('file', file);
        const { data } = await axios.post(`${API}/upload`, form, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }});
        setText(data.text || "No text");
        alert("File processed. You can ask questions in chat about this text (copy-paste).");
    };

    return (
        <div className="container">
            <h2>PYQs (Upload)</h2>
            <div style={{maxWidth:720}}>
                <input type="file" onChange={e=>setFile(e.target.files[0])} />
                <button className="btn" onClick={upload}>Upload & Extract</button>

                {text && (
                    <div style={{marginTop:12, background:'#fff', padding:12, borderRadius:8}}>
                        <h4>Extracted Text</h4>
                        <div style={{whiteSpace:'pre-wrap', maxHeight:300, overflow:'auto'}}>{text}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
