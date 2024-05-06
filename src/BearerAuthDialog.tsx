import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
} from "@mui/material";
import { useState } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useMyAgent } from "./Api";

// API for requests with a BODY: function [alias](body: BodyParam, config?: ZodiosRequestOptions): Promise<Response>;

async function generateBearerToken(playerSymbol: string, faction = "COSMIC") {
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      symbol: playerSymbol,
      faction,
    }),
  };
  const response = await fetch(
    "https://api.spacetraders.io/v2/register",
    options,
  );
  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

function BearerAuthDialog(props: {
  manuallyOpen: boolean;
  setManuallyOpen: (a: boolean) => void;
}) {
  const { manuallyOpen, setManuallyOpen } = props;
  const { data: agentData } = useMyAgent();
  const defaultAgentSymbol = agentData.data.symbol;
  const [bearerToken, setBearerToken] = useLocalStorage("bearerToken", "");
  const [agentSymbol, setAgentSymbol] = useState("");
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
            onClick={() => setBearerToken(bearerToken)}
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
          <Button
            variant="contained"
            onClick={async () => {
              const data = await generateBearerToken(agentSymbol);
              const { token } = data.data;
              setBearerToken(token);
            }}
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
