app.get('/api/observations', async (req, res) => {
  try {
    const { lat, lng, radius, days, species } = req.query;
    const location = await geocodeLocation(lat as string, lng as string);

    const response = await axios.get(`${EBIRD_API_BASE_URL}/data/obs/geo/recent`, {
      params: {
        lat: location.lat,
        lng: location.lng,
        dist: radius,
        back: days,
        ...(species && { speciesCode: species }),
        key: EBIRD_API_KEY,
        maxResults: 100
      }
    });

    // Create a map to store the most recent observation for each location
    const locationMap = new Map<string, any>();

    // Process each observation
    response.data.forEach((obs: any) => {
      // Create a unique key for the location (rounded to 4 decimal places for grouping nearby points)
      const locationKey = `${obs.lat.toFixed(4)},${obs.lng.toFixed(4)}`;
      
      // Get the existing observation for this location
      const existingObs = locationMap.get(locationKey);
      
      // If no existing observation or this one is more recent, update the map
      if (!existingObs || new Date(obs.obsDt) > new Date(existingObs.obsDt)) {
        locationMap.set(locationKey, obs);
      }
    });

    // Convert the map values to an array of observations
    const observations = Array.from(locationMap.values()).map((obs: any) => ({
      species: obs.comName,
      scientificName: obs.sciName,
      count: obs.howMany,
      date: obs.obsDt,
      location: {
        lat: obs.lat,
        lng: obs.lng
      },
      checklistUrl: `https://ebird.org/checklist/${obs.subId}`,
      observerName: obs.userDisplayName || 'Anonymous',
      checklistDate: obs.obsDt
    }));

    res.json(observations);
  } catch (error) {
    console.error('Error fetching observations:', error);
    res.status(500).json({ error: 'Failed to fetch observations' });
  }
}); 