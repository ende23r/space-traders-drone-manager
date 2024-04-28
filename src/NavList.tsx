import { useContext } from "react";
import { NavigationContext } from "./GameContextProvider";
import { Paper } from "@mui/material";

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
  const navLocations = useContext(NavigationContext);
  console.log({navLocations})

  return <div>
    NavList!
    {navLocations.map((navloc) => <NavCard navloc={navloc} />)}
    </div>;
}

export default NavList;
