import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Select,
  MenuItem,
} from "@mui/material";
import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMyAgent, globalQueryClient, useRegisterWithFaction } from "./Api";
import { schemas } from "./packages/SpaceTradersAPI";
import { z } from "zod";

type FactionSymbol = z.infer<typeof schemas.FactionSymbol>;
const knownFactions: FactionSymbol[] = [
  "COSMIC",
  "VOID",
  "GALACTIC",
  "QUANTUM",
  "DOMINION",
  "ASTRO",
  "CORSAIRS",
  "OBSIDIAN",
  "AEGIS",
  "UNITED",
  "SOLITARY",
  "COBALT",
  "OMEGA",
  "ECHO",
  "LORDS",
  "CULT",
  "ANCIENTS",
  "SHADOW",
  "ETHEREAL",
];

function BearerAuthDialog(props: {
  manuallyOpen: boolean;
  setManuallyOpen: (a: boolean) => void;
}) {
  const { manuallyOpen, setManuallyOpen } = props;
  const { agent, bearerToken: lastFetchedToken, status } = useMyAgent();
  const defaultAgentSymbol = agent.symbol || "";

  const [bearerToken, setBearerToken] = useLocalStorage("bearerToken", "");
  const [agentSymbol, setAgentSymbol] = useState("");
  const [faction, setFaction] = useState<FactionSymbol>("COSMIC");

  const { mutate: registerAsAgent } = useRegisterWithFaction();

  if (status === "success" && lastFetchedToken !== bearerToken) {
    window.location.reload();
  }

  return (
    <Dialog open={!bearerToken || manuallyOpen}>
      <DialogTitle>Register Agent</DialogTitle>
      <DialogContent>
        <div>
          <TextField
            id="outlined-multiline-static"
            label="Bearer Token"
            multiline
            rows={4}
            value={bearerToken}
            onChange={(e) => setBearerToken(e.target.value)}
          />
          <Button
            variant="contained"
            onClick={() => {
              setBearerToken(bearerToken);
            }}
          >
            Use Existing Bearer Token
          </Button>
        </div>
        <div>
          <TextField
            id="outlined-static"
            label="Agent Symbol (username)"
            value={agentSymbol || defaultAgentSymbol}
            onChange={(e) => {
              setAgentSymbol(e.target.value);
            }}
          />
          <Select
            label="Faction"
            value={faction}
            onChange={(event: any) => {
              setFaction(event.target.value);
            }}
          >
            {knownFactions.map((symbol) => (
              <MenuItem value={symbol}>{symbol}</MenuItem>
            ))}
          </Select>
          <Button
            variant="contained"
            onClick={() =>
              registerAsAgent({
                agentSymbol,
                faction,
                callback: setBearerToken,
              })
            }
          >
            Create New Agent
          </Button>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setManuallyOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default BearerAuthDialog;
