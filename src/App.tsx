import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import GameContextProvider, { ContractContext } from './GameContextProvider';
import ShipList from './ShipList';
import NavList from './NavList';
import { Alert, Box, Tab, Tabs } from '@mui/material';
import { useContext, useState } from 'react';
import ShipyardList from './ShipyardList';
import ContractCard from './ContractList';
import TradeScreen from './TradeScreen';

export type AlertData = {
  severity: "success" | "info" | "warning" | "error" | "closed"
  message?: string
}

const defaultAlert: AlertData = {
  severity: "closed"
} as const;

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
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function InfoTabs() {
  const [tabIndex, setTabIndex] = useState(0);
  const contract = useContext(ContractContext);
  return (
    <>
    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
<Tab label="Contracts" />
<Tab label="System Waypoints" />
      <Tab label="Shipyards" />
      <Tab label="Markets" />
    </Tabs>
<CustomTabPanel value={tabIndex} index={0}>
      <ContractCard contract={contract} />
    </CustomTabPanel>
<CustomTabPanel value={tabIndex} index={1}>
      <NavList />
    </CustomTabPanel>
    <CustomTabPanel value={tabIndex} index={2}>
      <ShipyardList />
    </CustomTabPanel>
    <CustomTabPanel value={tabIndex} index={3}>
      <TradeScreen />
    </CustomTabPanel>
    </>
  )
}

function App() {
  const [alertData, setAlertData] = useState<AlertData>(defaultAlert);
  return (
    <>
      <div>
        {alertData.severity !== "closed" ? <Alert severity={alertData.severity}>{alertData.message}</Alert> : null}
      </div>
    <GameContextProvider updateAlert={setAlertData}>
      <div>
        <Grid container spacing={1}>
          <Grid xs={6}>
            <div>
              <ShipList />
            </div>
          </Grid>
          <Grid xs={6}>
            <InfoTabs />
          </Grid>
        </Grid>
      </div>
    </GameContextProvider>
  </>
  )
}

export default App
