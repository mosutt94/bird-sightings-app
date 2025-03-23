import React, { useState, useCallback } from 'react';
import {
  Container,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Autocomplete,
  Slider,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './BirdSightings.css';
import L from 'leaflet';
import axios from 'axios';
import BirdSelector from './BirdSelector';
import FeatherLogo from './FeatherLogo';
import { debounce } from 'lodash';

// Fix for default marker icon in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

interface BirdSighting {
  speciesCode: string;
  speciesName: string;
  scientificName: string;
  locationName: string;
  observationDate: string;
  observationCount: number;
  lat: number;
  lng: number;
  checklistId: string;
  checklistUrl: string;
  observerName: string;
  checklistDate: string;
}

interface Location {
  display_name: string;
  lat: string;
  lon: string;
}

// Add this new component before the BirdSightings component
const MapBounds: React.FC<{ sightings: BirdSighting[] }> = ({ sightings }) => {
  const map = useMap();

  React.useEffect(() => {
    if (sightings.length > 0) {
      const bounds = L.latLngBounds(
        sightings.map(sighting => [sighting.lat, sighting.lng])
      );
      // Add some padding to the bounds
      bounds.pad(0.1);
      map.fitBounds(bounds);
    }
  }, [sightings, map]);

  return null;
};

// Update the color constants at the top of the file
const COLORS = {
  primary: '#2E5A1C', // Hunter green
  primaryDark: '#1F3D13',
  primaryLight: '#4A7B2E',
  background: '#F8F9FA',
  text: '#2C3E50',
  cardBackground: '#FFFFFF',
  gradientStart: '#2E5A1C',
  gradientEnd: '#4A7B2E',
  buttonHover: '#1F3D13',
  cardHover: '#F8F9FA',
  pageBackground: '#F5F5DC' // Cream color
};

const BirdSightings: React.FC = () => {
  const [location, setLocation] = useState<string>('');
  const [radius, setRadius] = useState<number>(20);
  const [days, setDays] = useState<number>(30);
  const [selectedBirds, setSelectedBirds] = useState<string[]>([]);
  const [sightings, setSightings] = useState<BirdSighting[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<Location[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([40.0, -74.0]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [locationCache, setLocationCache] = useState<Record<string, Location[]>>({});
  const [birdSearchCache, setBirdSearchCache] = useState<Record<string, any[]>>({});
  const [birdSuggestions, setBirdSuggestions] = useState<{ label: string; value: string }[]>([]);

  // Debounced function to fetch location suggestions
  const fetchLocationSuggestions = useCallback(
    debounce(async (query: string) => {
      try {
        const response = await axios.get(`http://localhost:3001/api/suggestions?query=${query}`);
        setLocationSuggestions(response.data);
        // Cache the results
        setLocationCache(prev => ({
          ...prev,
          [query]: response.data
        }));
      } catch (error: any) {
        console.error('Error fetching location suggestions:', error);
        setError(error.response?.data?.error || 'Failed to fetch location suggestions');
      }
    }, 500),
    [setLocationSuggestions, setLocationCache, setError]
  );

  const handleLocationChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    setLocation(query);
    setError(null);

    if (query.length >= 3) {
      // Check cache first
      if (locationCache[query]) {
        setLocationSuggestions(locationCache[query]);
        return;
      }
      fetchLocationSuggestions(query);
    } else {
      setLocationSuggestions([]);
    }
  };

  const handleLocationSelect = (location: Location | null) => {
    if (location) {
      setLocation(location.display_name);
      const newCenter: [number, number] = [parseFloat(location.lat), parseFloat(location.lon)];
      setMapCenter(newCenter);
      setError(null);
      // Clear existing sightings when location changes
      setSightings([]);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      setError(null);
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            setMapCenter([latitude, longitude]);
            
            // Reverse geocode to get location name
            const response = await axios.get(`http://localhost:3001/api/suggestions?query=${latitude},${longitude}`);
            
            if (response.data && response.data.length > 0) {
              const locationName = response.data[0].display_name;
              setLocation(locationName);
              // Set the location suggestions to include the current location
              setLocationSuggestions([response.data[0]]);
            } else {
              // If we can't get a location name, use coordinates
              const coordString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
              setLocation(coordString);
              // Create a location suggestion with coordinates
              setLocationSuggestions([{
                display_name: coordString,
                lat: latitude.toString(),
                lon: longitude.toString()
              }]);
            }
          } catch (error) {
            console.error('Error getting location name:', error);
            setError('Got your location but failed to get location name. You can still search using coordinates.');
            // Use coordinates as fallback
            const coordString = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
            setLocation(coordString);
            // Create a location suggestion with coordinates
            setLocationSuggestions([{
              display_name: coordString,
              lat: position.coords.latitude.toString(),
              lon: position.coords.longitude.toString()
            }]);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error('Error getting current location:', error);
          setError('Failed to get current location. Please check your browser permissions.');
          setLoading(false);
        }
      );
    } else {
      setError('Geolocation is not supported by your browser');
    }
  };

  const searchBirds = async () => {
    if (!location) {
      setError('Please enter a location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Searching for birds with params:', {
        location,
        radius,
        days,
        species: selectedBirds
      });

      const response = await axios.get('http://localhost:3001/api/observations', {
        params: {
          location,
          radius,
          days,
          species: selectedBirds.length > 0 ? selectedBirds : undefined
        }
      });

      console.log('Received sightings data:', response.data);
      setSightings(response.data);
      
      if (response.data.length > 0) {
        setMapCenter([response.data[0].lat, response.data[0].lng]);
      }
    } catch (error: any) {
      console.error('Error fetching observations:', error);
      setError(error.response?.data?.error || 'Failed to fetch observations');
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect to monitor sightings state changes
  React.useEffect(() => {
    console.log('Sightings state updated:', sightings);
  }, [sightings]);

  const handleBirdSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setBirdSuggestions([]);
        return;
      }

      // Check cache first
      if (birdSearchCache[query]) {
        setBirdSuggestions(birdSearchCache[query]);
        return;
      }

      try {
        const response = await axios.get(`http://localhost:3001/api/birds/search?query=${query}`);
        const birds = response.data.map((bird: any) => ({
          label: `${bird.comName} (${bird.sciName})`,
          value: bird.speciesCode
        }));
        setBirdSuggestions(birds);
        
        // Cache the results
        setBirdSearchCache(prev => ({
          ...prev,
          [query]: birds
        }));
      } catch (error) {
        console.error('Error searching birds:', error);
        setBirdSuggestions([]);
      }
    }, 300),
    []
  );

  const handleBirdInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const query = event.target.value;
    handleBirdSearch(query);
  };

  const handleBirdSelect = (birds: string[]) => {
    setSelectedBirds(birds);
  };

  return (
    <Box sx={{ 
      backgroundColor: COLORS.pageBackground,
      minHeight: '100vh',
      width: '100%'
    }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ 
          my: { xs: 2, sm: 4, md: 6 },
          backgroundColor: COLORS.cardBackground,
          borderRadius: 2,
          boxShadow: 3,
          p: { xs: 2, sm: 3, md: 4 }
        }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            mb: { xs: 2, sm: 3, md: 4 },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: { xs: 1, sm: 2 }
          }}>
            <FeatherLogo size={40} color={COLORS.primary} />
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 800,
                color: COLORS.text,
                letterSpacing: '-0.5px',
                background: `linear-gradient(45deg, ${COLORS.gradientStart} 30%, ${COLORS.gradientEnd} 90%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textAlign: 'center',
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
              }}
            >
              WingWatch
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          
          <Grid container spacing={{ xs: 2, sm: 3 }}>
            <Grid item xs={12} md={4}>
              <Box>
                {location && (
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 2, 
                      color: COLORS.text,
                      backgroundColor: COLORS.background,
                      p: 1,
                      borderRadius: 1,
                      fontSize: { xs: '0.875rem', sm: '1rem' }
                    }}
                  >
                    Current Location: {location}
                  </Typography>
                )}
                <Autocomplete
                  options={locationSuggestions}
                  getOptionLabel={(option) => option.display_name}
                  onChange={(_, value) => handleLocationSelect(value)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search for a location"
                      variant="outlined"
                      onChange={handleLocationChange}
                      fullWidth
                      error={!!error}
                      helperText={error}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          backgroundColor: COLORS.background,
                          '&:hover': {
                            backgroundColor: COLORS.cardHover
                          }
                        }
                      }}
                    />
                  )}
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Button
                variant="contained"
                onClick={getCurrentLocation}
                fullWidth
                disabled={loading}
                sx={{
                  height: { xs: '48px', sm: '56px' },
                  borderRadius: 2,
                  backgroundColor: COLORS.primary,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': {
                    backgroundColor: COLORS.buttonHover,
                    transform: 'translateY(-1px)',
                    boxShadow: 2
                  }
                }}
              >
                Use Current Location
              </Button>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ backgroundColor: COLORS.background, p: 2, borderRadius: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 600, color: COLORS.text, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Radius (miles)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={radius}
                    onChange={(_, value) => setRadius(value as number)}
                    min={1}
                    max={50}
                    valueLabelDisplay="auto"
                    disabled={loading}
                    sx={{
                      flex: 1,
                      color: COLORS.primary,
                      '& .MuiSlider-thumb': {
                        backgroundColor: COLORS.primary,
                        '&:hover': {
                          backgroundColor: COLORS.buttonHover
                        }
                      }
                    }}
                  />
                  <TextField
                    type="number"
                    value={radius}
                    onChange={(e) => {
                      const value = Math.min(50, Math.max(1, Number(e.target.value)));
                      setRadius(value);
                    }}
                    inputProps={{ min: 1, max: 50 }}
                    size="small"
                    sx={{
                      width: '80px',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '&:hover': {
                          backgroundColor: COLORS.cardHover
                        }
                      }
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ backgroundColor: COLORS.background, p: 2, borderRadius: 2 }}>
                <Typography gutterBottom sx={{ fontWeight: 600, color: COLORS.text, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
                  Days to Look Back
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Slider
                    value={days}
                    onChange={(_, value) => setDays(value as number)}
                    min={1}
                    max={30}
                    valueLabelDisplay="auto"
                    disabled={loading}
                    sx={{
                      flex: 1,
                      color: COLORS.primary,
                      '& .MuiSlider-thumb': {
                        backgroundColor: COLORS.primary,
                        '&:hover': {
                          backgroundColor: COLORS.buttonHover
                        }
                      }
                    }}
                  />
                  <TextField
                    type="number"
                    value={days}
                    onChange={(e) => {
                      const value = Math.min(30, Math.max(1, Number(e.target.value)));
                      setDays(value);
                    }}
                    inputProps={{ min: 1, max: 30 }}
                    size="small"
                    sx={{
                      width: '80px',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '&:hover': {
                          backgroundColor: COLORS.cardHover
                        }
                      }
                    }}
                  />
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ backgroundColor: COLORS.background, p: 2, borderRadius: 2 }}>
                <BirdSelector
                  selectedBirds={selectedBirds}
                  onBirdSelect={handleBirdSelect}
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={searchBirds}
                disabled={loading}
                fullWidth
                sx={{
                  height: { xs: '48px', sm: '56px' },
                  borderRadius: 2,
                  backgroundColor: COLORS.primary,
                  color: 'white',
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  '&:hover': {
                    backgroundColor: COLORS.buttonHover,
                    transform: 'translateY(-1px)',
                    boxShadow: 2
                  }
                }}
              >
                {loading ? <CircularProgress size={24} /> : 'Search Birds'}
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ 
            mt: { xs: 2, sm: 3, md: 4 }, 
            height: { xs: '300px', sm: '400px', md: '500px' },
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: 2
          }}>
            <MapContainer
              center={mapCenter}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
              key={`${mapCenter[0]}-${mapCenter[1]}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <MapBounds sightings={sightings} />
              {(() => {
                // Group sightings by checklist
                const checklistGroups = sightings.reduce((acc, sighting) => {
                  if (!acc[sighting.checklistId]) {
                    acc[sighting.checklistId] = {
                      location: sighting.locationName,
                      lat: sighting.lat,
                      lng: sighting.lng,
                      checklistUrl: sighting.checklistUrl,
                      observerName: sighting.observerName,
                      checklistDate: sighting.checklistDate
                    };
                  }
                  return acc;
                }, {} as Record<string, {
                  location: string;
                  lat: number;
                  lng: number;
                  checklistUrl: string;
                  observerName: string;
                  checklistDate: string;
                }>);

                // Create markers for each checklist
                return Object.entries(checklistGroups).map(([checklistId, group]) => (
                  <Marker
                    key={checklistId}
                    position={[group.lat, group.lng]}
                  >
                    <Popup>
                      <div>
                        <p><strong>Location:</strong> {group.location}</p>
                        <p><strong>Observer:</strong> {group.observerName}</p>
                        <p><strong>Date:</strong> {new Date(group.checklistDate).toLocaleString()}</p>
                        <a href={group.checklistUrl} target="_blank" rel="noopener noreferrer">
                          View Full Checklist on eBird
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                ));
              })()}
            </MapContainer>
          </Box>

          <Grid container spacing={{ xs: 2, sm: 3 }} sx={{ mt: { xs: 2, sm: 3, md: 4 } }}>
            {(() => {
              return sightings.map((sighting) => (
                <Grid item xs={12} sm={6} md={4} key={sighting.checklistId}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      borderRadius: 2,
                      boxShadow: 2,
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4,
                        backgroundColor: COLORS.cardHover
                      }
                    }}
                  >
                    <CardContent>
                      <Typography 
                        variant="h6" 
                        component="h2"
                        sx={{ 
                          fontWeight: 600,
                          color: COLORS.primary,
                          mb: 1,
                          fontSize: { xs: '1rem', sm: '1.25rem' }
                        }}
                      >
                        {sighting.speciesName}
                      </Typography>
                      <Typography 
                        color="textSecondary" 
                        gutterBottom
                        sx={{ 
                          fontStyle: 'italic',
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        {sighting.scientificName}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        component="p"
                        sx={{ 
                          mb: 2,
                          lineHeight: 1.6,
                          color: COLORS.text,
                          fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}
                      >
                        <strong>Date:</strong> {new Date(sighting.observationDate).toLocaleDateString()}<br />
                        <strong>Count:</strong> {sighting.observationCount || 'Not specified'}<br />
                        <strong>Location:</strong> {sighting.locationName}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <a 
                          href={sighting.checklistUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ebird-link"
                        >
                          View on eBird →
                        </a>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ));
            })()}
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default BirdSightings; 