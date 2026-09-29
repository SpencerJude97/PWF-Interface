import React, { useState, useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import api from "../api.js";
import BoundForm from '../components/BoundForm.jsx';
import L from "leaflet"
import Slider from "@mui/material/Slider";
import Box from "@mui/material/Box";

const WalkFinder = () => {
  const [result, setResult] = useState("");

  const findLocation = async () => {
    if (!town) {
      setErrorMSG("Must enter a town/city")
        return
    }
    setErrorMSG('')
    try {
      const response = await api.post('/location', { settlement: town, country: country });
      setResult(response.data);
    } catch (error) {
      console.error("Error finding location", error);
    }
  };

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapElement, setMapElement] = useState("temp")

  function getISOTimestampFromVariable(x) {
    if (x === undefined || x === null) return "latest";
    const targetDate = new Date();
    // Shift the date based on variable (3 = today)
    targetDate.setUTCDate(targetDate.getUTCDate() + (x - 3));
    // Visual Crossing accepts standard ISO-8601 strings, e.g., "YYYY-MM-THH:mm"
    return targetDate.toISOString().split('.')[0]; // YYYY-MM-DDTHH:mm:ss
  }

  useEffect(() => {
    if (result && mapContainerRef.current) {
      if (!mapInstanceRef.current) {
        const apiKey = API_Key;
        const element = mapElement;
        const time = getISOTimestampFromVariable(dates.indexOf(date) !== -1 ? dates.indexOf(date) : 3);
        const tilesUrlTemplate =
          "https://maps.visualcrossing.com/VisualCrossingWebServices/rest/api/v1/map/" +
          "tile/" + element + "/{z}/{x}/{y}.webp?apikey=" + apiKey + "&time=" + time + "&options=usev2forecast";

        const map = L.map(mapContainerRef.current).setView([result.lat, result.lng], 10);
        const marker = L.marker([result.lat, result.lng]).addTo(map);
        marker.bindPopup(result.settlement).openPopup();



        // 1. Base Map (Street Map)
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);

        // 2. Weather Overlay
        weatherLayerRef.current = L.tileLayer(tilesUrlTemplate, {
          attribution: "Weather data © Visual Crossing",
          tileSize: 256,
          maxZoom: 14,
          opacity: 0.6 // Makes radar semi-transparent so streets/names are visible
      });

        mapInstanceRef.current = map;
      }
    }

    const map = mapInstanceRef.current
    const weatherLayer = weatherLayerRef.current;

    if (mapWeather) {
      map.addLayer(weatherLayer);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [result?.settlement]); // [Only runs when settlement location changes

  const [mapWeather , setMapWeather] = useState(false);
  const weatherLayerRef = useRef(null);
  const [date, setDate] = useState('')
  const [API_Key, setAPI_Key] = useState('')

  const handleMapWeatherChange = () => {

    const map = mapInstanceRef.current
    const weatherLayer = weatherLayerRef.current;

    if (mapWeather) {
      map.removeLayer(weatherLayer);
    }
    else {
      map.addLayer(weatherLayer);
    }

    setMapWeather(!mapWeather);
  }

  useEffect(() => {
    if (weatherLayerRef.current && API_Key) {
      const index = dates.indexOf(date);
      const time = getISOTimestampFromVariable(index !== -1 ? index : 3);
      const element = mapElement;

      const newUrl = `https://maps.visualcrossing.com/VisualCrossingWebServices/rest/api/v1/map/tile/${element}/{z}/{x}/{y}.webp?apikey=${API_Key}&time=${time}`;

      weatherLayerRef.current.setUrl(newUrl);
    }
  }, [date, API_Key, mapElement]);



  const [town, setTown] = useState('');
  const [country, setCountry] = useState('');

  const [errorMSG, setErrorMSG] = useState('')


  const fetchGeo = () => {
    if (!navigator.geolocation) {
      setErrorMSG("Geolocation is not supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(success, error)         // method used to get position
  };

  const success = (position) => {
    setErrorMSG('')
    setTown(String(position.coords.latitude.toFixed(3)))
    setCountry(String(position.coords.longitude.toFixed(3)))
  }

  const error = () => {
    alert("Sorry, no position available.");
  };

  const [useCoord , setUseCoord] = useState(false);

  const handleUseCoordChange = () => {

    if (useCoord) {
      setTownPlaceholder("Enter town/city")
      setCountryPlaceholder("Enter country")
    }
    else {
      setTownPlaceholder("Enter latitude")
      setCountryPlaceholder("Enter longitude")
    }

    setUseCoord(!useCoord);
  }

  const [townPlaceholder, setTownPlaceholder] = useState("Enter town/city")
  const [countryPlaceholder, setCountryPlaceholder] = useState("Enter country")

  const fetchKey = async () => {
    try {
      const response = await api.get('/key');
      setAPI_Key(response.data);
    } catch (error) {
      console.error("Error fetching key", error);
    }
  }

  useEffect(() => {
    fetchKey();
  }, []);


  const [weekData, setWeekData] = useState('')

  const fetchWeekData = async () => {
    try {
      const response = await api.post('/week', {lat: result.lat, lng: result.lng, settlement: result.settlement});
      setWeekData(response.data);
      setDate("Today")
    } catch (error) {
      console.error("Error fetching data for week", error);
    }
  }

  const dates = ['3 days ago', '2 days ago', 'Yesterday', 'Today', 'Tomorrow', '2 days from now', '3 days from now'];

  const [selectedDayData, setSelectedDayData] = useState(null);

  const handleDateChange = (event, newValue) => {
    setDate(dates[newValue]);
    if (weekData && weekData[newValue]) {
      setSelectedDayData(weekData[newValue]); // Updates text without triggering map reset
    }
  };

  const handleMapElementChange = (e) => {
    setMapElement(e.target.value);
  }



  return (
    <div>
        {result && <div>
      <h2 style={{marginTop:'50px'}}>Potential walk location:</h2>
      <h3 style={{marginBottom:-10}}>{result.settlement}</h3>
      <ul style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <li>Temperature: {(selectedDayData || result).temp}°C</li>
        <li>Humidity: {(selectedDayData || result).humidity}%</li>
        <li>Cloud Cover: {(selectedDayData || result).cloudcover}%</li>
        <li>Precipitation: {(selectedDayData || result).precip}mm</li>
      </ul> </div>}
        {!result && <div>
            <h3 style={{marginTop:'50px',marginBottom:'30px'}}>Enter a location to begin.</h3>
        </div>}
      <BoundForm
        value={town}
        onChange={(e) => setTown(e.target.value)}
        onSubmit={findLocation}
        placeholder={townPlaceholder}/>
      <BoundForm
        value={country}
        onChange={(e) => setCountry(e.target.value)}
        onSubmit={findLocation}
        placeholder={countryPlaceholder}/>
      <button onClick={findLocation}>Find walk</button>
      <p style={{color:'red',margin:'16px 0'}}>{errorMSG}</p>
      <label>Use coordinates:
        <input
          type="checkbox"
          checked={useCoord}
          onChange={handleUseCoordChange}
        />
      </label>
      {useCoord &&
        <div>
          <button onClick={fetchGeo}>
            get location
          </button>
        </div>}
      <div>
        <Link to ="/preferences" style={{
          display: 'inline-block',
          marginTop: '16px'
        }}>
          Preferences
        </Link>
      </div>
      {result &&
        <div
          ref={mapContainerRef} style={{ height: "400px", width: "100%" }}>
        </div>
      }
      {result && <div>
        Show

        <select name="pets" id="pet-select" onChange={handleMapElementChange}>
          <option value="temp">Temperature</option>
          <option value="cloudcover">Cloud Cover</option>
          <option value="precipcomposite">Precipitation</option>
        </select>

        <label>
          <input
            type="checkbox"
            checked={mapWeather}
            onChange={handleMapWeatherChange}
          />
        </label></div>
      }
      {result && !weekData &&
        <button onClick={fetchWeekData}>
          Get data for week
        </button>
      }
      {weekData &&
        <Box sx={{ width: 300, mx: 'auto' }}>
        <Slider
          defaultValue={3}
          step={1}
          min={0}
          max={6}
          onChange={handleDateChange}
        />
      </Box>
      }
      <p>{date}</p>
    </div>
  );
};

export default WalkFinder;