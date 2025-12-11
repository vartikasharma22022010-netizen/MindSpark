import React, { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Chat(){
    const token = localStorage.getItem("token");
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [saved, setSaved] = useState([]);
    const [loading, setLoading] = useState(false);
    const messagesRef = useRef();

    useEffect(()=>{ fetchSaved(); }, []);

    const fetchSaved = async () => {
        try{
            const { data } = await axios.get(`${API}/chats`, { headers: { Authorization: `Bearer ${token}` }});
            setSaved(data.chats || []);
        }catch(e){ console.error(e); }
    };

    const send = async () => {
        if (!input.trim()) return;
        setLoading(true);

        const userMsg = { role: "user", content: input };
        setMessages(prev => [...prev, userMsg]);

        try{
            const { data } = await axios.post(`${API}/chat`, { message: input }, { headers: { Authorization: `Bearer ${token}` }});
            if (data.error){
                alert(data.error);
                setLoading(false);
                return;
            }
            const bot = { role: "assistant", content: data.reply || data.assistant || "No reply" };
            setMessages(prev => [...prev, bot]);
            setInput("");
            fetchSaved();
        }catch(e){
            alert(e.response?.data?.error || e.message);
        }

        setLoading(false);
    };

    // Open a saved conversation (replace messages)
    const openConvo = (convo) => {
        setMessages(convo.messages || []);
    };

    // ---------------- Razorpay one-time order flow ----------------
    const subscribe = async () => {
        try{
            const { data } = await axios.post(`${API}/create-order`, {}, { headers: { Authorization: `Bearer ${token}` }});
            if (data.error) return alert(data.error);

            const order = data.order;
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID || "<RAZORPAY_KEY_ID>",
                amount: order.amount,
                currency: order.currency || "INR",
                name: "Mindspark Premium",
                description: "One-time upgrade",
                order_id: order.id,
                handler: async function (resp) {
                    // optional: call server verify endpoint if you implement it
                    // e.g. await axios.post(`${API}/verify-payment`, { ...resp }, { headers: { Authorization: `Bearer ${token}` }});
                    alert("Payment successful. Premium will activate via webhook shortly.");
                },
                prefill: { email: "" },
                theme: { color: "#5A4FCF" }
            };

            const rzp = new window.Razorpay(options);
            rzp.on('payment.failed', function(resp){ alert("Payment failed"); console.error(resp); });
            rzp.open();

        }catch(e){
            alert(e.response?.data?.error || e.message);
        }
    };

    return (
        <div className="container chat-layout">
            <div className="chat-col">
                <div className="chat-window">
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3>Mindspark Chat</h3>
                        <div>
                            <button className="btn-ghost" onClick={subscribe}>Upgrade to Premium</button>
                        </div>
                    </div>

                    <div className="messages" ref={messagesRef}>
                        {messages.map((m, idx) => (
                            <div key={idx} className={`msg ${m.role === 'user' ? 'user' : 'bot'}`}>
                                {m.content}
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="input-row">
                            <textarea value={input} onChange={e=>setInput(e.target.value)} placeholder="Ask a question..."/>
                            <div style={{display:'flex', flexDirection:'column', gap:8}}>
                                <button className="btn" onClick={send} disabled={loading}>{loading ? '...' : 'Send'}</button>
                                <button className="btn-ghost" onClick={()=>setInput('')}>Clear</button>
                            </div>
                        </div>
                        <small className="muted">Free users: 200 chats/day</small>
                    </div>
                </div>
            </div>

            <div className="side-col">
                <div className="list">
                    <h4>Saved Conversations</h4>
                    {saved.length === 0 && <small className="muted">No saved conversations</small>}
                    <ul style={{listStyle:'none', padding:0}}>
                        {saved.map(c => (
                            <li key={c.id} style={{padding:'8px 0', borderBottom:'1px solid #f0f0f0'}}>
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                    <div>
                                        <div style={{fontSize:13}}>Convo: {c.conversationId}</div>
                                        <div style={{fontSize:11, color:'#777'}}>{new Date(c.createdAt).toLocaleString()}</div>
                                    </div>
                                    <div>
                                        <button className="btn-ghost" onClick={()=>openConvo(c)}>Open</button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{height:16}}/>
                <div className="list">
                    <h4>Actions</h4>
                    <button className="btn" onClick={()=>window.location.href='/pyq'}>UPLOAD PYQs</button>
                </div>
            </div>
        </div>
    );
}
