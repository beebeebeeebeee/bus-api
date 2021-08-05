import express from "express";
var router = express.Router();
import fetch from "node-fetch";
import parseTime from "../function/parseTime.js";
import { Low, JSONFile } from "lowdb";
const adapter = new JSONFile("db.json");
const db = new Low(adapter);

router.get([
    "/:route/:stopIndex",
    "/:route/:stopIndex/:inbound",
], async (req, res) => {
    let direction = req.params.inbound == "inbound" ? "inbound" : "outbound";
    let stopIndex = req.params.stopIndex
    let route = req.params.route
    let eta = [];
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
                    `${process.env.KMB_API}v1/transport/kmb/route-stop/${route
                    }/${direction}/${1}`
                )
            ).json()
        ).data;

        if (kmbRouteStopData[stopIndex]) {
            let kmbStopId = kmbRouteStopData[stopIndex].stop;

            let serviceType = [
                ...new Set(
                    db.data.route
                        .filter((e) => {
                            return e.route == route;
                        })
                        .map((e) => {
                            return e.service_type;
                        })
                        .filter((e) => {
                            return typeof e == "string";
                        })
                ),
            ];

            await serviceType.forEachAsync(async (eachServiceType) => {
                let kmbNameTc = (await (await fetch(
                    `${process.env.KMB_API}v1/transport/kmb/stop/${kmbStopId}`
                )).json()).data.name_tc;

                let kmbEtaData = (await (await fetch(
                    `${process.env.KMB_API}v1/transport/kmb/eta/${kmbStopId}/${route}/${eachServiceType}`
                )).json()).data;

                kmbEtaData.forEach((e) => {
                    e.stop_name = kmbNameTc;
                });

                eta = eta.concat(kmbEtaData);
            });
        }
    }

    //revert direction for nwfb and ctb
    direction = direction == "outbound" ? "inbound" : "outbound";
    //case nwfb
    if (Array.prototype.includes.call(routeCompany, "NWFB")) {
        let nwfbRouteStopData = (await (await fetch(
            `${process.env.NWFB_API}v1/transport/citybus-nwfb/route-stop/NWFB/${route}/${direction}`
        )).json()).data;

        if (nwfbRouteStopData[stopIndex]) {
            let nwfbStopId = nwfbRouteStopData[stopIndex].stop;

            let nwfbNameTc = (await (await fetch(
                `${process.env.NWFB_API}v1/transport/citybus-nwfb/stop/${nwfbStopId}`
            )).json()).data.name_tc;

            let nwfbEtaData = (await (await fetch(
                `${process.env.NWFB_API}v1/transport/citybus-nwfb/eta/NWFB/${nwfbStopId}/${route}`
            )).json()).data;

            nwfbEtaData.forEach((e) => {
                e.stop_name = nwfbNameTc;
            });

            eta = eta.concat(nwfbEtaData);
        }
    }

    //case ctb
    if (Array.prototype.includes.call(routeCompany, "CTB")) {
        let ctbRouteStopData = (await (await fetch(
            `${process.env.CTB_API}v1/transport/citybus-nwfb/route-stop/CTB/${route}/${direction}`
        )).json()).data;

        if (ctbRouteStopData[stopIndex]) {
            let ctbStopId = ctbRouteStopData[stopIndex].stop;

            let ctbNameTc = (await (await fetch(
                `${process.env.CTB_API}v1/transport/citybus-nwfb/stop/${ctbStopId}`
            )).json()).data.name_tc;

            let ctbEtaData = (await (await fetch(
                `${process.env.CTB_API}v1/transport/citybus-nwfb/eta/CTB/${ctbStopId}/${route}`
            )).json()).data;

            ctbEtaData.forEach((e) => {
                e.stop_name = ctbNameTc;
            });

            eta = eta.concat(ctbEtaData);
        }
    }

    eta = eta.filter(e => { return e.eta != "" && e.eta != null })
    eta.sort((a, b) => {
        return new Date(a.eta) - new Date(b.eta)
    })
    let covertEtaParsed = eta.map(e => { return { co: e.co, eta: parseTime(Math.round((new Date(e.eta) - Date.now()) / 1000 / 60 * 100) / 100), rmk_tc: e.rmk_tc } }).filter(e => { return parseInt(e.eta.split(":")[0]) > 0 }).filter((v, i, a) => a.findIndex(t => (t.eta === v.eta)) === i)
    res.status(200).send({ eta: covertEtaParsed, data: eta });
})

export default router;