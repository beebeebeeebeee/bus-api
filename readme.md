# MIX KMB and NWFB api
- If db.json have no route list data/ update route list data

    ````/api/route/data/update````

- Search db for a route

    ````/api/route/search/:route````

- Search for a route stop list

    ````/api/route-stop/search/:route/:inbound (optional)````

- Search eta for a route

    ````/api/route/eta/:route/:stopIndex/:inbound (optional)````

    if no inbound param is outbound