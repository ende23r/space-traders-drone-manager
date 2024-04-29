import { z } from "zod";
import { api, schemas } from "./packages/SpaceTradersAPI";
import { Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material";
import { useContext } from "react";
import { BearerTokenContext } from "./GameContextProvider";

type Contract = z.infer<typeof schemas.Contract>;

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

function ContractCard(props: {contract: Contract}) {
  const bearerToken = useContext(BearerTokenContext)
  const { contract } = props;
  if (!contract) { return <Card></Card> }
  return <Card>
      <CardHeader title={`${contract.type}: Deliver to ${contract.terms.deliver?.[0].destinationSymbol}`} subheader={contract.id} />
      <CardContent>
        <Typography>
          {contract.terms.deliver?.map((term) => `${term.tradeSymbol}: ${term.unitsFulfilled}/${term.unitsRequired}`)}
        </Typography>
      </CardContent>
    <CardActions>
      <Button
        onClick={() => acceptContract(bearerToken, contract.id)}>
        Accept
      </Button>
    </CardActions>
    </Card>
}

export default ContractCard;
