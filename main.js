import express from "express";
import dotenv from "dotenv";
import { join } from "path";
import { Low, JSONFile } from "lowdb";
import fetch from "node-fetch";

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

app.get("/api/route/search/:route", async(req,res)=>{
    await db.read()
    res.status(200).send(db.data.route.filter(e=>{return e.route == req.params.route}))
})

app.get("/api/route/data/update", async (req, res) => {
  const routes = await getLatestRoute();
  res.status(200).send(routes);
});

async function getLatestRoute() {
  const res = {};
  const res_data = {};
  const data = {};
  let allData = [];
  res.KMB = await fetch("https://data.etabus.gov.hk/v1/transport/kmb/route/");
  res.NWFB = await fetch(
    "https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/NWFB"
  );
  res.CTB = await fetch(
    "https://rt.data.gov.hk/v1/transport/citybus-nwfb/route/CTB"
  );

  await db.read();
  await db.data.company_list.forEachAsync(async (company) => {
    res_data[company] = await res[company].json();
    data[company] = res_data[company].data;
    if (company == "KMB") {
      data[company].forEach((element,index) => {
        data[company][index] = Object.assign({"co":company},element)
      });
    }
    allData = allData.concat(data[company]);
    console.log(allData)
  });

  db.data.route = allData;
  await db.write();
  return allData;
}

Array.prototype.forEachAsync = async function (fn) {
  for (let t of this) {
    await fn(t);
  }
};

app.listen(PORT, () => {
  console.log(`Express server is listening on http://localhost:${PORT}`);
});
