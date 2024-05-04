import { z } from "zod";
import { schemas } from "./packages/SpaceTradersAPI";
import { Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material";
import { useAcceptContractMutation, useContracts, useMyAgent, useMyShips, useNegotiateContractMutation } from "./Api";

type Contract = z.infer<typeof schemas.Contract>;

/*
async function acceptContract(bearerToken: string, contractId: string) {
  const options = {
    headers: {
      Authorization: `Bearer ${bearerToken}`
    },
    params: {
      contractId
    }
  };
  const result = api["accept-contract"](undefined, options);
  return result;
}
*/

const noContractSymbol = "NO_CONTRACT";
const nullContract: Contract = {
  type: "PROCUREMENT",
  id: noContractSymbol,
  factionSymbol: "",
  terms: {
    deadline: "",
    payment: {
      onAccepted: 0,
      onFulfilled: 0,
    },
  },
  expiration: "",
  accepted: true,
  fulfilled: true,
}

function ContractCard() {
  const { data } = useContracts();
  const contract: Contract = data?.data[0] || nullContract;

  const {data: agentData} = useMyAgent();
  const {data: shipData} = useMyShips();
  const shipList = shipData.data;
  const shipAtHQ = shipList.find((ship) => ship.nav.waypointSymbol === agentData?.data.headquarters && ship.nav.status === "DOCKED");

  const {mutate: triggerAcceptContract} = useAcceptContractMutation(contract.id);
  const {mutate: triggerNegotiateContract} = useNegotiateContractMutation();
  return <Card>
      <CardHeader title={`${contract.type}: Deliver to ${contract.terms.deliver?.[0].destinationSymbol}`} subheader={contract.id} />
      <CardContent>
        <Typography>
          {contract.terms.deliver?.map((term) => `${term.tradeSymbol}: ${term.unitsFulfilled}/${term.unitsRequired}`)}
        </Typography>
      <Typography>Deadline to accept: {contract.deadlineToAccept}</Typography>
      </CardContent>
    <CardActions>
      <Button
        onClick={() => triggerAcceptContract()}
        disabled={contract.id === noContractSymbol || contract.accepted}
        >
        Accept
      </Button>
      <Button
        onClick={() => triggerNegotiateContract({shipSymbol: shipAtHQ?.symbol || ""})}
        disabled={!shipAtHQ}
        >
        Negotiate New Contract
      </Button>
    </CardActions>
    </Card>
}

export default ContractCard;
