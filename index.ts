import { ObjectId, Collection, Db, MongoClient } from "mongodb";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

import { Server, Socket } from "socket.io";
import { createServerSocket } from "simple-socket";
import * as fs from "fs";

const client = new MongoClient();
let db: Db;
let users: Collection;

client.connect().then((res) => {
  db = res.db("securpicks");
  users = db.collection("open-nfc-users");
});

const server: Server = createServerSocket("securpicks.com", "4002", {
  passphrase: process.env.socket,
});

const onConnection = (socket: Socket) => {
  console.log(`New connection ${socket.id}`);

  socket.on("token:update", async (data, response) => {
    console.log("============");
    console.log("============");
    console.log("============");
    console.log("============");
    console.log("token:update");
    data = JSON.parse(data);
    console.log(data);

    const responseData = { token: {}, ok: false, reason: "" };

    const found = await users.findOne({ _id: new ObjectId(data.userId) });

    const tokenFound = found.tokens.find((element) => element.id == data.id);
    if (!tokenFound) {
      response(responseData);
      return;
    }
    console.log("token found");

    console.log("tokenfound class", tokenFound.class);
    console.log("data class", data.class);

    if (tokenFound.class != data.class) {
      responseData.reason = "Provider does not match";
      response(responseData);
      console.log("Provider does not match");
      return;
    }

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

  socket.on("user:signup", async (data, response) => {
    //
  });

  socket.on("user:login", async (data, response) => {
    const responseData = { class: "", userId: "", tokens: [], ok: false, reason: "", session: "" };
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
    responseData.class = found.class;
    console.log(responseData);

    response(responseData);
  });
};

server.on("connection", onConnection);
