require("dotenv").config();
const ishttps = process.env.ISHTTPS === "true";
const dataPath = process.env.DATAPATH;
const port = process.env.PORT;
const gameList = process.env.GAMES.split(",");
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
gameList.forEach(function (game) {
    const jsonData = JSON.parse(fs.readFileSync(dataPath + game + ".json", "utf8"));
    gameDataExemple[game] = jsonData["default"];
    console.log(game, JSON.stringify(gameDataExemple[game]));
});

// data sent in the form of {"userName": username, "data": userData}
// data stored in the form of {username: userData}
app.post("/:gameName/postData", (req, res) => {
    try {
        const gameName = req.params.gameName;
        const userName = req.body["userName"];
        const userData = req.body["data"];

        // Check if the userName is "default"
        if (userName == "default") {
            throw new Error(`tried to modify default database value for ${JSON.stringify(gameName)}: ${JSON.stringify(req.body)}`);
        }

        // Check if the gameName table exists
        if (!gameList.includes(req.params.gameName)) {
            throw new Error(`Game "${req.params.gameName}" not found`);
        }

        // Check if the data recieved is in the right form
        for (const key in userData) {
            if (!gameDataExemple[gameName].hasOwnProperty(key)) {
                throw new Error(`Wrong data format for ${JSON.stringify(gameName)}: ${JSON.stringify(req.body)}`);
            }
        }

        let jsonData = JSON.parse(fs.readFileSync(dataPath + gameName + ".json", "utf8"));

        // if the userName is not it the database, create it
        if (jsonData[userName] == undefined) {
            jsonData[userName] = userData;
            console.log(`added {"${userName}": ${JSON.stringify(jsonData[userName])}} in ${dataPath + gameName + ".json"}`);
            res.status(200).json({ message: "Successfully saved your score" });
            fs.writeFileSync(dataPath + gameName + ".json", JSON.stringify(jsonData, null, 2), "utf8");
            return;
        }

        // check the default data to block different modifiactions.
        let areEquals = true;
        for (const key in gameDataExemple[gameName]) {
            if (userData[key] != jsonData[userName][key])
                areEquals = false;
            switch (gameDataExemple[gameName][key]) {
                case 0:
                    // new value must be equal to the actual value (this value is a user's constant)
                    if (userData[key] != jsonData[userName][key]) {
                        throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"}, it's a users constant`);
                    }
                    break;
                case -1:
                    // new value must be inferior or equal to the actual value
                    if (userData[key] > jsonData[userName][key]) {
                        throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"} to a superior value`);
                    }
                    break;
                case 1:
                    // new value must be superior or equal to the actual value
                    if (userData[key] < jsonData[userName][key]) {
                        throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"} to an inferior value`);
                    }
                    break
                case null:
                    // we don't care about any modification to the variable
                    break;
                default:
                    // new value must be equal to the default value
                    if (userData[key] != jsonData["default"][key]) {
                        throw new Error(`cannot modify ${userName}.${key} in ${dataPath + gameName + ".json"}, it's a users constant`);
                    }
                    break;
            }
        }

        // if there is no modifications apported, we just dont do it
        if (areEquals)
            throw new Error(`tried to modify username "${userName}" in ${dataPath + gameName + ".json"} with an equal json`);

        // Once the modification is approved, we do it.
        console.log(`changed "${userName}" data ${JSON.stringify(jsonData[userName])} to ${JSON.stringify(userData)} in ${dataPath + gameName + ".json"}`);
        jsonData[userName] = userData;
        res.status(200).json({ message: "Successfully updated your score" });

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