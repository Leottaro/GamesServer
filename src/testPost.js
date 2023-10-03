require("dotenv").config();
const ishttps = process.env.ISHTTPS === "true" ? "https" : "http";
const port = process.env.PORT;
const gameList = process.env.GAMES.split(", ");

async function postJSON(url, data) {
    try {
        const params = {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        }
        const response = await fetch(url, params).then(rep => rep.json()).then(json => { return json });
        return response;
    } catch (error) {
        console.error(error);
    }
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
for (let i = 0; i < 1; i++) {
    data = { userName: "leoh", Data: { Pseudo: "caca", Score: 0 } };
    postJSON(`${ishttps}://localhost:${port}/${gameList[0]}/postData`, data).then(result => {
        console.log(result);
    });
}