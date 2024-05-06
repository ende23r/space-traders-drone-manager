import { Paper, Typography } from "@mui/material";
import { useLocations, useMyAgent } from "./Api";
import { getSystemSymbol } from "./Util";

function NavCard(props: any) {
  const { navloc } = props;
  return (
    <Paper>
      <div>
        {navloc.symbol} ({navloc.type})
      </div>
      <div>
        X: {navloc.x}, Y: {navloc.y}
      </div>
      <div>Modifiers: {navloc.modifiers}</div>
      <div>
        Orbitals: {navloc.orbitals.map((orb: any) => orb.symbol).join(", ")}
      </div>
      <div>
        Traits: {navloc.traits.map((trait: any) => trait.symbol).join(", ")}
      </div>
    </Paper>
  );
}

function NavList() {
  const { data: agentData } = useMyAgent();
  const homeSystem = getSystemSymbol(agentData?.data?.headquarters || "");

  const { data } = useLocations(homeSystem);
  const navLocations = data || [];

  return (
    <div>
      <Typography variant="h2">Waypoints List!</Typography>
      {navLocations.map((navloc) => (
        <NavCard navloc={navloc} />
      ))}
    </div>
  );
}

export default NavList;
