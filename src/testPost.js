require("dotenv").config();
const ishttps = process.env.ISHTTPS === "true" ? "https" : "http";
const port = process.env.PORT;
const gameList = process.env.GAMES.split(",");
const domain = process.env.DOMAIN;

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
data = { userName: "test", class: "", data: { score: -1 } };
postJSON(`${ishttps}://${domain}:${port}/${gameList[0]}/postData`, data).then(result => {
    console.log(result);
});