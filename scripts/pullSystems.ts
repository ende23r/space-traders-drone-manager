import { writeFileSync } from "node:fs";

async function pullPage(page = 1) {
  const query = `?page=${page}&limit=20`;
  const response = await fetch(
    `https://api.spacetraders.io/v2/systems${query}`,
  );
  return await response.json();
}

let systems: any[] = [];
async function pullSystems(page = 1) {
  const result = await pullPage(page);
  systems = systems.concat(
    result.data.map((system: any) => {
      system.waypointSymbols = system.waypoints.map(
        (waypoint: any) => waypoint.symbol,
      );
      system.waypoints = undefined;
      return system;
    }),
  );
  console.log(`Fetched ${systems.length} / ${result.meta.total}`);

  if (systems.length < result.meta.total) {
    setTimeout(() => pullSystems(page + 1), 500);
  } else {
    const fileData = `export const systemList = ${JSON.stringify(systems)}`;
    writeFileSync("src/systemListGenerated.ts", fileData);
  }
}

pullSystems();
