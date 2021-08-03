import express from "express";
import dotenv from "dotenv";
import { join } from "path";
import { Low, JSONFile } from "lowdb";
import fetch from "node-fetch";
import getLatestRoute from "./function/getLatestRoute.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT;
const adapter = new JSONFile("./db.json");
const db = new Low(adapter);

await db.read();
!db.data
  ? (db.data = {
      company_list: ["KMB", "NWFB", "CTB"],
      route: [],
    })
  : null;
await db.write();

app.use("/", express.static("public"));

app.get(
  [
    "/api/route/eta/:route/:stopIndex",
    "/api/route/eta/:route/:stopIndex/:inbound",
  ],
  async (req, res) => {
    await db.read();

    const company = [
      ...new Set(
        db.data.route
          .filter((e) => {
            return e.route == req.params.route;
          })
          .map((e) => {
            return e.co;
          })
      ),
    ];
    let direction = req.params.inbound ? "inbound" : "outbound";

    let eta = [];

    if (Array.prototype.includes.call(company, "KMB")) {
      let resJSONData = (
        await (
          await fetch(
            `https://data.etabus.gov.hk/v1/transport/kmb/route-stop/${
              req.params.route
            }/${direction}/${1}`
          )
        ).json()
      ).data;

      if (resJSONData[req.params.stopIndex]) {
        let stopId = resJSONData[req.params.stopIndex].stop;

        const service_type = [
          ...new Set(
            db.data.route
              .filter((e) => {
                return e.route == req.params.route;
              })
              .map((e) => {
                return e.service_type;
              })
              .filter((e) => {
                return typeof e == "string";
              })
          ),
        ];

        await service_type.forEachAsync(async (e_type) => {
          let res2 = await fetch(
            `https://data.etabus.gov.hk/v1/transport/kmb/stop/${stopId}`
          );
          let resJSON = await res2.json();
          let name_tc = resJSON.data.name_tc;

          let res3 = await fetch(
            `https://data.etabus.gov.hk/v1/transport/kmb/eta/${stopId}/${req.params.route}/${e_type}`
          );
          resJSON = await res3.json();
          let resJSONData = resJSON.data;
          resJSONData.forEach((element) => {
            element.stop_name = name_tc;
          });
          eta = eta.concat(resJSONData);
        });
      }
    }
    direction = direction == "outbound" ? "inbound" : "outbound";
    if (Array.prototype.includes.call(company, "NWFB")) {
      let res7 = await fetch(
        `https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/NWFB/${req.params.route}/${direction}`
      );
      let resJSON = await res7.json();
      let resJSONData = resJSON.data;
      if (resJSONData[req.params.stopIndex]) {
        let stopId = resJSONData[req.params.stopIndex].stop;

        let res8 = await fetch(
          `https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${stopId}`
        );
        resJSON = await res8.json();
        let name_tc = resJSON.data.name_tc;

        let res9 = await fetch(
          `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/NWFB/${stopId}/${req.params.route}`
        );
        resJSON = await res9.json();
        resJSON.data.forEach((e) => {
          e.stop_name = name_tc;
        });

        eta = eta.concat(resJSON.data);
      }
    }
    if (Array.prototype.includes.call(company, "CTB")) {
      let res4 = await fetch(
        `https://rt.data.gov.hk/v1/transport/citybus-nwfb/route-stop/CTB/${req.params.route}/${direction}`
      );
      let resJSON = await res4.json();
      let resJSONData = resJSON.data;
      if (resJSONData[req.params.stopIndex]) {
        let stopId = resJSONData[req.params.stopIndex].stop;

        let res5 = await fetch(
          `https://rt.data.gov.hk/v1/transport/citybus-nwfb/stop/${stopId}`
        );
        resJSON = await res5.json();
        let name_tc = resJSON.data.name_tc;

        let res6 = await fetch(
          `https://rt.data.gov.hk/v1/transport/citybus-nwfb/eta/CTB/${stopId}/${req.params.route}`
        );
        resJSON = await res6.json();
        resJSON.data.forEach((e) => {
          e.stop_name = name_tc;
        });

        eta = eta.concat(resJSON.data);
      }
    }

    res.status(200).send(eta);
  }
);

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
