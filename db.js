const fs = require("fs");

function getData(){

    const jsonString = fs.readFileSync("data.json").toString();

    const data = JSON.parse(jsonString);

    return data;
    
}
function saveData(data = []){

    const jsonString = JSON.stringify(data, null, 3)
    fs.writeFileSync("data.json", jsonString);



}

function getUsers() {
    const jsonString = fs.readFileSync("users.json").toString();
    return JSON.parse(jsonString);
}

function saveUsers(users) {
    const jsonString = JSON.stringify(users, null, 3);
    fs.writeFileSync("users.json", jsonString);
}

module.exports = {getData, saveData, getUsers, saveUsers};