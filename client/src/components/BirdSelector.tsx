import React, { useState, useEffect } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import axios from 'axios';
import { debounce } from 'lodash';

interface BirdSpecies {
  code: string;
  comName: string;
  sciName: string;
}

interface BirdSelectorProps {
  selectedBirds: string[];
  onBirdSelect: (birds: string[]) => void;
}

const BirdSelector: React.FC<BirdSelectorProps> = ({ selectedBirds, onBirdSelect }) => {
  const [species, setSpecies] = useState<BirdSpecies[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = React.useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSpecies([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get('http://localhost:3001/api/species', {
          params: {
            region: 'US',
            query: query
          }
        });
        
        if (!Array.isArray(response.data)) {
          throw new Error('Invalid response format from server');
        }

        setSpecies(response.data);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching bird species:', error);
        setError(error.response?.data?.error || 'Failed to load bird species. Please try again later.');
      } finally {
        setLoading(false);
      }
    }, 300),
    [setSpecies, setLoading, setError]
  );

  // Initial load of common species
  useEffect(() => {
    debouncedSearch('');
  }, [debouncedSearch]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    debouncedSearch(query);
  };

  const handleChange = (_: any, value: BirdSpecies[]) => {
    onBirdSelect(value.map(bird => bird.code));
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      <Typography gutterBottom>Select Bird Species</Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Autocomplete
        multiple
        options={species}
        getOptionLabel={(option) => `${option.comName} (${option.sciName})`}
        loading={loading}
        onChange={handleChange}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              label={option.comName}
              {...getTagProps({ index })}
              key={option.code}
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            placeholder="Search for birds..."
            fullWidth
            error={!!error}
            helperText={error}
            onChange={handleInputChange}
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};

export default BirdSelector; 