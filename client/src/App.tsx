import React from 'react';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import BirdSightings from './components/BirdSightings';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BirdSightings />
    </ThemeProvider>
  );
};

export default App;
