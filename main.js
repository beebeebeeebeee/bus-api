import express from "express";
import dotenv from "dotenv";
import { Low, JSONFile } from "lowdb";
import fetch from "node-fetch";
import parseTime from "./function/parseTime.js";
import getLatestRoute from "./function/getLatestRoute.js";
import eta from "./router/eta.js"

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const adapter = new JSONFile("/db.json");
const db = new Low(adapter);

//init db.json if not exist
await db.read();
if (!db.data) {
  db.data = {
    company_list: ["KMB", "NWFB", "CTB"],
    route: [],
  }
}
await db.write();

app.use("/", express.static("public"));

app.use("/api/route/eta/", eta);

app.get("/api/route/search/:route", async (req, res) => {
  await db.read();
  res.status(200).send(
    db.data.route.filter((e) => {
      return e.route == req.params.route;
    })
  );
});

app.get("/api/route/data/update", async (req, res) => {
  const routes = await getLatestRoute();
  res.status(200).send(routes);
});

app.listen(PORT, () => {
  console.log(`Express server is listening on http://localhost:${PORT}`);
});

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};
