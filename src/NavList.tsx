import { Card, CardContent, CardHeader, Typography } from "@mui/material";
import { useLocations, useMyAgent } from "./Api";
import { getSystemSymbol } from "./Util";
import StarMap from "./StarMap";

function NavCard(props: any) {
  const { navloc } = props;
  return (
    <Card>
      <CardHeader title={`${navloc.symbol} (${navloc.type})`} />
      <CardContent>
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
      </CardContent>
    </Card>
  );
}

function NavList() {
  const { agent } = useMyAgent();
  const homeSystem = getSystemSymbol(agent.headquarters);

  const { data } = useLocations(homeSystem);
  const navLocations = data || [];

  return (
    <div>
      <Typography variant="h2">Star Map!</Typography>
      <StarMap />
      {navLocations.map((navloc) => (
        <NavCard navloc={navloc} />
      ))}
    </div>
  );
}

export default NavList;
