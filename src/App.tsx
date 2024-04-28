import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import GameContextProvider from './GameContextProvider';
import ShipList from './ShipList';
import NavList from './NavList';
import { Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import ShipyardList from './ShipyardList';

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
  return (
    <>
    <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)}>
      <Tab label="System Waypoints" />
      <Tab label="Shipyards" />
    </Tabs>
    <CustomTabPanel value={tabIndex} index={0}>
      <NavList />
    </CustomTabPanel>
    <CustomTabPanel value={tabIndex} index={1}>
      <ShipyardList />
    </CustomTabPanel>
    </>
  )
}

function App() {
  return (
    <GameContextProvider>
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
          <Grid xs={6}>Details and Actions</Grid>
        </Grid>
      </div>
    </GameContextProvider>
  )
}

export default App
