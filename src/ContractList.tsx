// import { z } from "zod";
// import { api, schemas } from "./packages/SpaceTradersAPI";
import { Button, Card, CardActions, CardContent, CardHeader, Typography } from "@mui/material";
import { useContracts } from "./Api";

// type Contract = z.infer<typeof schemas.Contract>;

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

function ContractCard() {
  const { data } = useContracts();
  const contract = data?.data[0];
  if (!contract) { return <Card></Card> }
  return <Card>
      <CardHeader title={`${contract.type}: Deliver to ${contract.terms.deliver?.[0].destinationSymbol}`} subheader={contract.id} />
      <CardContent>
        <Typography>
          {contract.terms.deliver?.map((term) => `${term.tradeSymbol}: ${term.unitsFulfilled}/${term.unitsRequired}`)}
        </Typography>
      </CardContent>
    <CardActions>
      <Button>
        {/*onClick={() => acceptContract(bearerToken, contract.id)}*/}
        Accept
      </Button>
    </CardActions>
    </Card>
}

export default ContractCard;
