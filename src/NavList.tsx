import { Paper, Typography } from "@mui/material";
import { bearerOptions, useLocations } from "./Api";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useQuery } from "@tanstack/react-query";
import { api } from "./packages/SpaceTradersAPI";
import { getSystemSymbol } from "./Util";

function NavCard(props: any) {
  const {navloc} = props
  return (<Paper>
    <div>{navloc.symbol} ({navloc.type})</div>
    <div>X: {navloc.x}, Y: {navloc.y}</div>
    <div>Modifiers: {navloc.modifiers}</div>
    <div>Orbitals: {navloc.orbitals.map((orb: any) => orb.symbol).join(", ")}</div>
    <div>Traits: {navloc.traits.map((trait: any) => trait.symbol).join(", ")}</div>
    </Paper>)
}

function NavList() {
  const [bearerToken] = useLocalStorage("bearerToken", "");
  const {data: agentData } = useQuery({
    queryKey: [bearerToken, "get-my-agent"],
    queryFn: () => api["get-my-agent"](bearerOptions(bearerToken)),
    enabled: !!bearerToken,
    retry: false
  })  
  const homeSystem = getSystemSymbol(agentData?.data?.headquarters || "");
  
  const { data } = useLocations(homeSystem);
  const navLocations = data || [];

  return <div>
    <Typography variant="h2">Waypoints List!</Typography>
    {navLocations.map((navloc) => <NavCard navloc={navloc} />)}
    </div>;
}

export default NavList;
