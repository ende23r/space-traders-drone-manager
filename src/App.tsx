import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import GameContextProvider, { ContractContext } from './GameContextProvider';
import ShipList from './ShipList';
import NavList from './NavList';
import { Box, Tab, Tabs } from '@mui/material';
import { useContext, useState } from 'react';
import ShipyardList from './ShipyardList';
import ContractCard from './ContractList';
import TradeScreen from './TradeScreen';

import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

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

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      toast(error.toString());
    },
    onSuccess: (_data, query) => {
      toast(`Successfully fetched query for key ${query.queryKey.slice(1)}`);
    }
  })
});

function App() {
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
        <QueryClientProvider client={queryClient}>
        <GameContextProvider>
          <div>
            <Grid container spacing={1}>
              <Grid xs={12} md={6}>
                <div>
                  <ShipList />
                </div>
              </Grid>
              <Grid xs={12} md={6}>
                <InfoTabs />
              </Grid>
            </Grid>
          </div>
        </GameContextProvider>
    </QueryClientProvider>
  </>
  )
}

export default App
