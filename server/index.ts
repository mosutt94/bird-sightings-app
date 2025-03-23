import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const EBIRD_API_KEY = process.env.EBIRD_API_KEY;
const EBIRD_BASE_URL = 'https://api.ebird.org/v2';

// Helper function to get coordinates from location name
async function getCoordinates(location: string): Promise<{ lat: number; lng: number }> {
  try {
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
    );
    if (response.data && response.data[0]) {
      return {
        lat: parseFloat(response.data[0].lat),
        lng: parseFloat(response.data[0].lon)
      };
    }
    throw new Error('Location not found');
  } catch (error) {
    throw new Error('Failed to get coordinates');
  }
}

// Get nearby observations
app.get('/api/observations', async (req, res) => {
  try {
    const { location, radius = '20', days = '30', species } = req.query;
    
    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const coordinates = await getCoordinates(location as string);
    if (!coordinates) {
      return res.status(400).json({ error: 'Invalid location' });
    }

    const params = {
      lat: coordinates.lat,
      lng: coordinates.lng,
      dist: radius,
      back: days
    };

    // Use the correct endpoint format for species filtering
    const endpoint = species 
      ? `${EBIRD_BASE_URL}/data/obs/geo/recent/${species}`
      : `${EBIRD_BASE_URL}/data/obs/geo/recent`;
    
    console.log('Making eBird API request:', endpoint);
    
    const response = await axios.get(endpoint, {
      params,
      headers: {
        'X-eBirdApiToken': EBIRD_API_KEY
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.error('Invalid response format:', response.data);
      return res.status(500).json({ error: 'Invalid response from eBird API' });
    }

    // Get unique checklist IDs
    const checklistIds = [...new Set(response.data.map((obs: any) => obs.subId))];
    console.log(`Found ${checklistIds.length} unique checklists`);

    // Fetch checklist details for each unique checklist
    const checklistDetails = new Map();
    for (const checklistId of checklistIds) {
      try {
        const checklistResponse = await axios.get(
          `${EBIRD_BASE_URL}/product/checklist/view/${checklistId}`,
          {
            headers: {
              'X-eBirdApiToken': EBIRD_API_KEY
            }
          }
        );
        // Only log the user information
        console.log(`Checklist ${checklistId} user:`, {
          userDisplayName: checklistResponse.data.userDisplayName
        });
        checklistDetails.set(checklistId, checklistResponse.data);
      } catch (error) {
        console.error(`Error fetching checklist ${checklistId}:`, error);
      }
    }

    const transformedObservations = response.data.map((obs: any) => {
      const checklistDetail = checklistDetails.get(obs.subId);
      return {
        speciesCode: obs.speciesCode,
        speciesName: obs.comName,
        scientificName: obs.sciName,
        locationName: obs.locName,
        observationDate: obs.obsDt,
        observationCount: obs.howMany || 1,
        lat: obs.lat,
        lng: obs.lng,
        checklistId: obs.subId,
        checklistUrl: `https://ebird.org/checklist/${obs.subId}`,
        observerName: checklistDetail?.userDisplayName || 'Anonymous',
        checklistDate: obs.obsDt
      };
    });

    console.log(`Returning ${transformedObservations.length} observations`);
    res.json(transformedObservations);
  } catch (error: any) {
    console.error('Error fetching observations:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch observations',
      details: error.response?.data?.error || error.message
    });
  }
});

// Get species list
app.get('/api/species', async (req, res) => {
  try {
    const { region } = req.query;
    const response = await axios.get(`${EBIRD_BASE_URL}/ref/taxonomy/ebird`, {
      headers: {
        'X-eBirdApiToken': EBIRD_API_KEY
      },
      params: {
        region: region || 'US'
      }
    });

    // The response is a string of comma-separated values
    const lines = response.data.split('\n');
    const species = lines
      .filter((line: string) => line.trim()) // Remove empty lines
      .map((line: string) => {
        const [scientificName, commonName, code, type] = line.split(',');
        // Only include species (not subspecies or other types)
        if (type === 'species') {
          return {
            code: code || scientificName.split(' ').map((word: string) => word[0]).join('').toLowerCase(),
            comName: commonName || scientificName,
            sciName: scientificName
          };
        }
        return null;
      })
      .filter((species: { code: string; comName: string; sciName: string } | null): species is { code: string; comName: string; sciName: string } => 
        species !== null && Boolean(species.code) && Boolean(species.comName) && Boolean(species.sciName)
      );

    res.json(species);
  } catch (error: any) {
    console.error('Error fetching species list:', error);
    res.status(500).json({ 
      error: error.response?.data?.error || 'Failed to fetch species list',
      details: error.message
    });
  }
});

// Get location suggestions
app.get('/api/suggestions', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const response = await axios.get(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query as string)}&limit=5`
    );
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching location suggestions:', error);
    res.status(500).json({ 
      error: error.response?.data?.error || 'Failed to fetch location suggestions',
      details: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 