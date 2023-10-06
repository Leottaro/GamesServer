require("dotenv").config();
const ishttps = process.env.ISHTTPS === "true";
const dataPath = process.env.DATAPATH;
const port = process.env.PORT;
const gameList = process.env.GAMES.split(", ");
const domain = process.env.DOMAIN;

const https = require("node:https");
const fs = require("node:fs");
const express = require("express");
const bodyParser = require("body-parser");
const options = ishttps ? {
    key: fs.readFileSync("key.pem"),
    cert: fs.readFileSync("cert.pem")
} : {};
const app = express();
app.use(bodyParser.json());

// gameDataExemple will read every database file and stort their "default" data.
const gameDataExemple = {};
gameList.forEach(game => {
    const jsonData = JSON.parse(fs.readFileSync(dataPath + game + ".json", "utf8"));
    gameDataExemple[game] = jsonData["default"];
    console.log(game, JSON.stringify(gameDataExemple[game]));
});

// data sent in the form of {"userName": username, "Data": data}
// data stored in the form of {username: userData}
app.post("/:gameName/postData", (req, res) => {
    try {
        if (gameList.indexOf(req.params.gameName) == -1)
            throw new Error(`Game "${req.params.gameName}" not found`);

        const gameName = req.params.gameName;
        let jsonData = JSON.parse(fs.readFileSync(dataPath + gameName + ".json", "utf8"));
        const userName = req.body["userName"];
        const userData = req.body["Data"];

        Object.keys(userData).forEach(key => {
            if (!gameDataExemple[gameName].hasOwnProperty(key))
                throw new Error(`Wrong data format for ${JSON.stringify(gameName)}: ${JSON.stringify(req.body)}`);
        });

        if (jsonData[userName] == undefined) {
            jsonData[userName] = userData;
            console.log(`added {"${userName}": ${JSON.stringify(jsonData[userName])}} in ${dataPath + gameName + ".json"}`);
            res.status(200).json({ message: "Successfully saved your score" });
        }
        else {
            // will check the default data to block different modifiactions.
            let areEquals = true;
            Object.keys(gameDataExemple[gameName]).forEach(key => {
                if (userData[key] != jsonData[userName][key])
                    areEquals = false;
                switch (gameDataExemple[gameName][key]) {
                    case 0: // 0 : new value must be equal to the actual value (this value is a constant)
                        if (userData[key] != jsonData[userName][key])
                            throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"}, its a constant`);
                        break;
                    case -1: // -1 : new value must be inferior or equal to the actual value
                        if (userData[key] > jsonData[userName][key])
                            throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"} to a superior value`);
                        break;
                    case 1: // 1 : new value must be superior or equal to the actual value
                        if (userData[key] < jsonData[userName][key])
                            throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"} to an inferior value`);
                        break
                    default: // else we don't care about any modification to the variable
                        break;
                }
            });

            // if there is no modifications apported, we just dont do it
            if (areEquals)
                throw new Error(`tried to modify username "${userName}" in ${dataPath + gameName + ".json"} with an equal json`);

            // Once the modification is approved, we do it.
            console.log(`changed {"${userName}": ${JSON.stringify(jsonData[userName])}} to {"${userName}": ${JSON.stringify(userData)}} in ${dataPath + gameName + ".json"}`);
            jsonData[userName] = userData;
            res.status(200).json({ message: "Successfully updated your score" });
        }
        fs.writeFileSync(dataPath + gameName + ".json", JSON.stringify(jsonData, null, 2), "utf8");
    } catch (error) {
        console.log("POST ERROR: \n\t" + error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/:gameName/getData", (req, res) => {
    try {
        if (gameList.indexOf(req.params.gameName) == -1)
            throw new Error("Game not found");
        const dataFile = req.params.gameName + ".json";

        const jsonData = JSON.parse(fs.readFileSync(dataPath + dataFile, "utf8"));
        const userName = req.query.userName;
        if (userName == "*") {
            delete jsonData.default;
            res.status(200).json(jsonData);
        } else if (userName in jsonData) {
            res.status(200).json(jsonData[userName]);
        } else {
            res.status(500).json({ message: `user ${userName} has no score registered yet` });
        }
    } catch (error) {
        console.log("GET ERROR: \n" + error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({ message: "oui c'est moi" });
});

if (ishttps) {
    https.createServer(options, app).listen(port, () => {
        console.log(`Server is running at https://${domain}:${port}/`);
    });
} else {
    app.listen(port, () => {
        console.log(`Server is running at http://${domain}:${port}/`);
    });
}