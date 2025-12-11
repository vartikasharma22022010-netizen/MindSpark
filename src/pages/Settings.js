async function subscribe() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("Login first!");

    const planId = "plan_XXXXX"; // your Razorpay plan ID

    const res = await fetch(`${backendURL}/create-subscription`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, planId })
    });

    const data = await res.json();

    const options = {
        key: "rzp_test_1234", // Replace with your Razorpay Key ID
        subscription_id: data.subscriptionId,
        name: "Mindspark Premium",
        description: "Unlimited AI access + saved chats",
        handler: function (response) {
            alert("Payment initiated! Your premium will activate shortly.");
        },
        theme: { color: "#5A4FCF" }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
}
