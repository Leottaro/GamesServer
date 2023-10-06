require("dotenv").config();
const ishttps = process.env.ISHTTPS === "true" ? "https" : "http";
const port = process.env.PORT;
const gameList = process.env.GAMES.split(", ");
const domain = process.env.DOMAIN;

async function getJSON(url) {
    try {
        const params = {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        };
        const jsonData = await fetch(url, params).then(rep => rep.json()).then(json => { return json });
        return jsonData;
    } catch (error) {
        return { Error: error };
    }
}

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
gameList.forEach(game => {
    getJSON(`${ishttps}://${domain}:${port}/${game}/getData?userName=*`).then(json => {
        console.log(game + " : " + JSON.stringify(json));
    });
});