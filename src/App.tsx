import Grid from "@mui/material/Unstable_Grid2"; // Grid version 2

import ShipList from "./ShipList";
import NavList from "./NavList";
import {
  Box,
  Button,
  Tab,
  Tabs,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Typography,
  Tooltip,
} from "@mui/material";
import { createContext, useEffect, useState } from "react";
import ShipyardList from "./ShipyardList";
import ContractCard from "./ContractList";
import TradeScreen from "./TradeScreen";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { globalQueryClient, useLocations, useMyAgent } from "./Api";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { getSystemSymbol } from "./Util";
import BearerAuthDialog from "./BearerAuthDialog";
import { processUpdatesLoop } from "./Scheduler";

export const DateContext = createContext(new Date());

// Kick off game loop
processUpdatesLoop();

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function InfoTabs() {
  const { agent } = useMyAgent();
  const systemSymbol = getSystemSymbol(agent.headquarters);

  const [tabIndex, setTabIndex] = useState(0);
  return (
    <>
      <Tabs
        variant="scrollable"
        scrollButtons="auto"
        value={tabIndex}
        onChange={(_, v) => setTabIndex(v)}
      >
        <Tab label="Contracts" />
        <Tab label="System Waypoints" />
        <Tab label="Shipyards" />
        <Tab label="Markets" />
      </Tabs>
      <CustomTabPanel value={tabIndex} index={0}>
        <ContractCard />
      </CustomTabPanel>
      <CustomTabPanel value={tabIndex} index={1}>
        <NavList />
      </CustomTabPanel>
      <CustomTabPanel value={tabIndex} index={2}>
        <ShipyardList systemSymbol={systemSymbol} />
      </CustomTabPanel>
      <CustomTabPanel value={tabIndex} index={3}>
        <TradeScreen />
      </CustomTabPanel>
    </>
  );
}

function AgentCard() {
  const { agent: myAgent } = useMyAgent();
  if (!myAgent.symbol) {
    return (
      <Card variant="outlined">
        <CardHeader title={"No Agent Selected"} />
        <CardContent>
          Create a new agent or register an existing bearer token.
        </CardContent>
      </Card>
    );
  }
  return (
    <Card variant="outlined">
      <CardHeader
        title={`Agent ${myAgent.symbol}`}
        subheader={`Money: ${myAgent.credits}`}
      />
      <CardContent>
        <Typography>Headquarters:{myAgent.headquarters}</Typography>
        <Typography>Starting Faction:{myAgent.startingFaction}</Typography>
        <Typography>Number of Ships:{myAgent.shipCount}</Typography>
      </CardContent>
      <CardActions></CardActions>
    </Card>
  );
}

function DateContextWrapper(props: { children: any }) {
  const [date, setDate] = useState<Date>(new Date());
  useEffect(() => {
    // Can use clearInterval to turn this off
    setInterval(() => {
      setDate(new Date());
    }, 500);
  }, []);
  return (
    <DateContext.Provider value={date}>{props.children}</DateContext.Provider>
  );
}

function StarBox({ star }: { star: any }) {
  return (
    <Tooltip title={star.symbol} followCursor={true}>
      <Box
        sx={{
          position: "absolute",
          top: star.x / 2 + 400,
          left: star.y / 2 + 400,
          width: 8,
          height: 8,
          background: "white",
        }}
      />
    </Tooltip>
  );
}

function StarMap() {
  const { agent } = useMyAgent();
  const systemSymbol = getSystemSymbol(agent.headquarters || "");
  const { data: stars } = useLocations(systemSymbol);
  // To represent a grid that goes from approx -800 to 800, we divide all positions by 2.
  return (
    <Box
      sx={{
        width: 800,
        height: 800,
        "flex-shrink": 0,
        background: "black",
        position: "relative",
      }}
    >
      {stars?.map((star) => <StarBox star={star} />)}
    </Box>
  );
}

function App() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <QueryClientProvider client={globalQueryClient}>
        <DateContextWrapper>
          <BearerAuthDialog
            manuallyOpen={authDialogOpen}
            setManuallyOpen={(open) => setAuthDialogOpen(open)}
          />
          <Grid container spacing={1}>
            <StarMap />
            <Grid xs={10}>
              <AgentCard />
            </Grid>
            <Grid xs={2}>
              <Button onClick={() => setAuthDialogOpen(true)}>
                Change login
              </Button>
            </Grid>
            <Grid xs={12} md={6}>
              <div>
                <ShipList />
              </div>
            </Grid>
            <Grid xs={12} md={6}>
              <InfoTabs />
            </Grid>
          </Grid>
          <ReactQueryDevtools initialIsOpen={false} />
        </DateContextWrapper>
      </QueryClientProvider>
    </>
  );
}

export default App;
