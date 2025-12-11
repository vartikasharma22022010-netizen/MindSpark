import React from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function Premium(){
    const token = localStorage.getItem("token");

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
                    alert("Payment success. Premium will activate soon.");
                    // optionally call verify endpoint if implemented on server
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        }catch(e){
            alert(e.response?.data?.error || e.message);
        }
    };

    return (
        <div className="container">
            <h2>Go Premium</h2>
            <p>Unlimited chats, PDF uploads, saved convos and more.</p>
            <div style={{maxWidth:600}}>
                <button className="btn" onClick={subscribe}>Upgrade to Premium</button>
            </div>
        </div>
    );
}
