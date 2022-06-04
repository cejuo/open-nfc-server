import { ObjectId, Collection, Db, MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

import { Server, Socket } from "socket.io";
import { createServerSocket } from "simple-socket";

const client = new MongoClient(
  "mongodb://localhost:27017/?readPreference=primary&appname=MongoDB%20Compass&directConnection=true&ssl=false"
);
let db: Db;
let users: Collection;

client.connect().then((res) => {
  db = res.db("open-nfc");
  users = db.collection("users");
});

const server: Server = createServerSocket("localhost", "4002", {});

const onConnection = (socket: Socket) => {
  console.log(`New connection ${socket.id}`);

  socket.on("token:update", async (data, response) => {
    console.log("============");
    console.log("============");
    console.log("============");
    console.log("============");
    console.log("token:update");
    data = JSON.parse(data);
    const responseData = { token: {}, ok: false, reason: "" };

    const found = await users.findOne({ _id: new ObjectId(data.userId) });

    const tokenFound = found.tokens.find((element) => element.id == data.id);
    if (!tokenFound) {
      response(responseData);
      return;
    }
    console.log("token found");

    if (tokenFound.count <= 0 && tokenFound.count != undefined) {
      responseData.reason = "Token count at 0";
      response(responseData);
      console.log("Token count at 0");
      return;
    }
    if (Date.now() > tokenFound.expire && tokenFound.expire != undefined) {
      responseData.reason = "Token expired";
      console.log("Token expired");
      response(responseData);
      return;
    }

    if (tokenFound.count != undefined) {
      console.log("substracting");
      tokenFound.count--;
    }

    console.log(found.tokens);

    await users.updateOne({ _id: found._id }, { $set: { tokens: found.tokens } });
    responseData.ok = true;
    responseData.token = tokenFound;
    response(responseData);
    server.emit("reload");
  });

  socket.on("user:login", async (data, response) => {
    const responseData = { userId: "", tokens: [], ok: false, reason: "", session: "" };
    let loginSession = false;
    let loginPassword = false;
    console.log(data);

    if (data.email) {
      data.email = data.email.toLowerCase();
    } else {
      response(responseData);
      return;
    }
    if (data.session) {
      loginSession = true;
    }
    if (data.password) {
      loginPassword = true;
    }
    console.log("loginPassword", loginPassword);
    console.log("loginSession", loginSession);

    const found = await users.findOne({ email: data.email });
    if (!found) {
      responseData.reason = "Wrong email or password";
      response(responseData);
      return;
    }

    var session = nanoid();
    if (loginPassword) {
      if (!(await bcrypt.compare(data.password, found.password))) {
        console.log("wrong password");
        responseData.reason = "Wrong email or password";
        response(responseData);
        return;
      }

      console.log("ok password");
      responseData.ok = true;
    } else if (loginSession) {
      console.log("data.session", data.session);
      console.log("found.session", found.session);

      responseData.ok = data.session == found.session;
    }

    await users.updateOne({ _id: found._id }, { $set: { session: session } });
    responseData.session = session;
    responseData.tokens = found.tokens;
    responseData.userId = found._id.toString();
    console.log(responseData);

    response(responseData);
  });
};

server.on("connection", onConnection);
