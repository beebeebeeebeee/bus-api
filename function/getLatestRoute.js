import fetch from "node-fetch";

export default async function getLatestRoute() {
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
      data[company].forEach((element, index) => {
        data[company][index] = Object.assign({ co: company }, element);
      });
    }
    allData = allData.concat(data[company]);
    console.log(allData);
  });

  db.data.route = allData;
  await db.write();
  return allData;
}
