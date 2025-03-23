# Bird Sightings Finder

A web application that helps users find bird sightings in their area using the eBird API. Users can search for bird sightings by location, specify a search radius, and filter by specific bird species.

## Features

- Search for bird sightings by location
- Use current location
- Specify search radius (1-50 miles)
- Filter sightings by date range (up to 30 days)
- Select specific bird species to search for
- Interactive map showing sighting locations
- Detailed information about each sighting
- Location autocomplete suggestions

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bird-sightings-app
```

2. Install server dependencies:
```bash
npm install
```

3. Install client dependencies:
```bash
cd client
npm install
```

4. Create a `.env` file in the root directory with your eBird API key:
```
EBIRD_API_KEY=your_api_key_here
PORT=3001
```

## Running the Application

1. Start the server (from the root directory):
```bash
npm run dev
```

2. In a separate terminal, start the client (from the client directory):
```bash
cd client
npm start
```

The application will be available at http://localhost:3000

## Technologies Used

- Frontend:
  - React
  - TypeScript
  - Material-UI
  - Leaflet (for maps)
  - Axios

- Backend:
  - Node.js
  - Express
  - eBird API
  - OpenStreetMap API (for geocoding)

## API Endpoints

- `GET /api/observations`: Get bird sightings based on location and filters
- `GET /api/species`: Get list of bird species
- `GET /api/suggestions`: Get location suggestions based on user input

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 