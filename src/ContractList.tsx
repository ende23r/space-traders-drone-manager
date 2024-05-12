import { z } from "zod";
import { schemas } from "./packages/SpaceTradersAPI";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import {
  useAcceptContractMutation,
  useContracts,
  useFulfillContractMutation,
  useMyAgent,
  useMyShips,
  useNegotiateContractMutation,
} from "./Api";

type Contract = z.infer<typeof schemas.Contract>;

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
};

function ContractCard() {
  const { data } = useContracts();
  const contract: Contract = data?.data.at(-1) || nullContract;

  const { agent } = useMyAgent();
  const { data: shipData } = useMyShips();
  const shipList = shipData?.data || [];
  const shipAtHQ = shipList.find(
    (ship) =>
      ship.nav.waypointSymbol === agent.headquarters &&
      ship.nav.status === "DOCKED",
  );

  const { mutate: triggerAcceptContract } = useAcceptContractMutation(
    contract.id,
  );
  const { mutate: triggerNegotiateContract } = useNegotiateContractMutation();
  const { mutate: triggerFulfillContract } = useFulfillContractMutation(
    contract.id,
  );

  return (
    <Card>
      <CardHeader
        title={`${contract.type}: Deliver goods to ${contract.terms.deliver?.[0].destinationSymbol}`}
        subheader={`ID: ${contract.id}`}
      />
      <CardContent>
        <Typography>Goods Requested</Typography>
        <Typography>
          {contract.terms.deliver?.map(
            (term) =>
              `${term.tradeSymbol}: ${term.unitsFulfilled}/${term.unitsRequired}`,
          )}
        </Typography>
        <Typography>
          Payment On Acceptance: {contract.terms.payment.onAccepted}{" "}
        </Typography>
        <Typography>
          On Completion: {contract.terms.payment.onFulfilled}
        </Typography>
        <Typography>
          {!contract.accepted
            ? `Deadline to accept: ${contract.deadlineToAccept}`
            : !contract.fulfilled
              ? "Accepted!"
              : "Fulfilled!"}
        </Typography>
      </CardContent>
      <CardActions>
        <Button
          onClick={() => triggerAcceptContract()}
          disabled={contract.id === noContractSymbol || contract.accepted}
        >
          Accept
        </Button>
        <Button
          disabled={
            contract.id === noContractSymbol ||
            !contract.accepted ||
            contract.fulfilled
          }
          onClick={() => triggerFulfillContract()}
        >
          Fulfill
        </Button>
        <Button
          onClick={() =>
            triggerNegotiateContract({ shipSymbol: shipAtHQ?.symbol || "" })
          }
          disabled={!shipAtHQ}
        >
          Negotiate New Contract
        </Button>
      </CardActions>
    </Card>
  );
}

export default ContractCard;
