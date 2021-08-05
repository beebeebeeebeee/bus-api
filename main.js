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
const adapter = new JSONFile("db.json");
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

app.get(["/api/route-stop/search/:route", "/api/route-stop/search/:route/:inbound"], async (req, res) => {
  let route = req.params.route
  let direction = req.params.inbound == "inbound" ? "inbound" : "outbound";

  await db.read();

  //get this route have witch company
  const routeCompany = [
    ...new Set(
      db.data.route
        .filter((e) => {
          return e.route == route;
        })
        .map((e) => {
          return e.co;
        })
    ),
  ];

  //for kmb
  if (Array.prototype.includes.call(routeCompany, "KMB")) {
    let kmbRouteStopData = (
      await (
        await fetch(
          `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${route}/${direction}/${1}`
        )
      ).json()
    ).data;

    await kmbRouteStopData.forEachAsync(async e => {
      let kmbNameTc = (await(await fetch(
        `${process.env.KMB_API}v1/transport/kmb/stop/${e.stop}`
      )).json()).data.name_tc;

      e.name_tc = kmbNameTc
    })
    res.status(200).send(kmbRouteStopData)
  } else {
    //revert direction for nwfb and ctb
    direction = direction == "outbound" ? "inbound" : "outbound";
    //case nwfb
    if (Array.prototype.includes.call(routeCompany, "NWFB")) {
      let nwfbRouteStopData = (await (await fetch(
        `${process.env.NWFB_API}v1/transport/citybus-nwfb/route-stop/NWFB/${route}/${direction}`
      )).json()).data;

      await nwfbRouteStopData.forEachAsync(async e => {
        let nwfbNameTc = (await (await fetch(
          `${process.env.NWFB_API}v1/transport/citybus-nwfb/stop/${e.stop}`
      )).json()).data.name_tc;
  
        e.name_tc = nwfbNameTc
      })

      res.status(200).send(nwfbRouteStopData)
    }

    //case ctb
    if (Array.prototype.includes.call(routeCompany, "CTB")) {
      let ctbRouteStopData = (await (await fetch(
        `${process.env.CTB_API}v1/transport/citybus-nwfb/route-stop/CTB/${route}/${direction}`
      )).json()).data;

      await ctbRouteStopData.forEachAsync(async e => {
        let ctbNameTc = (await (await fetch(
          `${process.env.CTB_API}v1/transport/citybus-nwfb/stop/${e.stop}`
      )).json()).data.name_tc;
  
        e.name_tc = ctbNameTc
      })

      res.status(200).send(ctbRouteStopData)
    }
  }
  res.status(400).send()
});

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
