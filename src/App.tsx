import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import GameContextProvider from './GameContextProvider';
import ShipList from './ShipList';
import NavList from './NavList';


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
            <NavList />
          </Grid>
          <Grid xs={6}>Details and Actions</Grid>
        </Grid>
      </div>
    </GameContextProvider>
  )
}

export default App
