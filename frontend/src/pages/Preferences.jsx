import React, { useState, useEffect } from 'react';
import api from "../api.js";
import BoundForm from '../components/BoundForm.jsx';
import Box from '@mui/material/Box';
import Slider from '@mui/material/Slider';


const Preferences = () => {


  const [preferences, setPreferences] = useState({});

  const [errorMSG, setErrorMSG] = useState('')

  const updatePreferences = async () => {
    setWeightLock(false);
    if (tempWeight + humidityWeight + cloudWeight + precipWeight === 0) {
      setTempWeight(preferences.temp.weight)
      setHumidityWeight(preferences.humidity.weight)
      setCloudWeight(preferences.cloudcover.weight)
      setPrecipWeight(preferences.precip.weight)
      setErrorMSG("Weights cannot all be zero")
      return
    }
    try {
      setErrorMSG('')
      const [newTemp, newHumidity, newCloud, newPrecip] = normaliseWeights(tempWeight, humidityWeight, cloudWeight, precipWeight)
      await api.post('/preferences', {
        temp: temp,
        humidity: humidity,
        cloudcover: cloudcover,
        precip: precip,
        tempWeight: newTemp,
        humidityWeight: newHumidity,
        precipWeight: newPrecip,
        cloudWeight: newCloud
      });
      fetchPreferences()
    } catch (error) {
      console.error("Error updating preferences", error);
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/preferences');
      setPreferences(response.data);
    } catch (error) {
      console.error("Error fetching preferences", error);
    }
  };


  useEffect(() => {
    fetchPreferences();
  }, []);

  useEffect(() => {
  if (preferences?.temp?.value !== undefined
   && preferences?.humidity?.value !== undefined
   && preferences?.cloudcover?.value !== undefined
   && preferences?.precip?.value !== undefined
   && preferences?.temp?.weight !== undefined
   && preferences?.humidity?.weight !== undefined
   && preferences?.cloudcover?.weight !== undefined
   && preferences?.precip?.weight !== undefined) {
    setTemp(preferences.temp.value);
    setHumidity(preferences.humidity.value);
    setCloudcover(preferences.cloudcover.value);
    setPrecip(preferences.precip.value);
    setTempWeight(preferences.temp.weight);
    setHumidityWeight(preferences.humidity.weight);
    setCloudWeight(preferences.cloudcover.weight);
    setPrecipWeight(preferences.precip.weight);
  }
}, [preferences]);


  const [tempWeight, setTempWeight] = useState(0.25);
  const [humidityWeight, setHumidityWeight] = useState(0.25);
  const [cloudWeight, setCloudWeight] = useState(0.25)
  const [precipWeight, setPrecipWeight] = useState(0.25)

  const round2 = (num) => Number(Number(num).toFixed(2));

  const handleTempWeightChange = (event, newValue) => {
    if (!weightLock) {

      newValue = Math.min(newValue, round2((tempWeight + precipWeight)))

      if (precipWeight > 0 || newValue < tempWeight){
        setPrecipWeight(Math.max(round2(precipWeight + (tempWeight - newValue)), 0));
        setTempWeight(newValue);
      }
    }
    else {
      setTempWeight(newValue);
    }
  };

  const handleHumidityWeightChange = (event, newValue) => {
    if (!weightLock) {

      newValue = Math.min(newValue, round2((humidityWeight + precipWeight)))

      if (precipWeight > 0 || newValue < humidityWeight){
        setPrecipWeight(Math.max(round2(precipWeight + (humidityWeight - newValue)), 0));
        setHumidityWeight(newValue);
      }
    }
    else {
      setHumidityWeight(newValue);
    }
  };

  const handleCloudWeightChange = (event, newValue) => {
    if (!weightLock) {

      newValue = Math.min(newValue, round2((cloudWeight + precipWeight)))

      if (precipWeight > 0 || newValue < cloudWeight){
        setPrecipWeight(Math.max(round2(precipWeight + (cloudWeight - newValue)), 0));
        setCloudWeight(newValue);
      }
    }
    else {
      setCloudWeight(newValue);
    }
  };

  const handlePrecipWeightChange = (event, newValue) => {
    if (weightLock) {
      setPrecipWeight(newValue)
    }
  };


  const [temp, setTemp] = useState(20);
  const [humidity, setHumidity] = useState(40);
  const [cloudcover, setCloudcover] = useState(50);
  const [precip, setPrecip] = useState(0);


  const [weightLock , setWeightLock] = useState(false);

  const handleWeightLockChange = () => {
    setWeightLock(!weightLock);
    if (tempWeight + humidityWeight + cloudWeight + precipWeight === 0) {
      setTempWeight(0.25)
      setHumidityWeight(0.25)
      setCloudWeight(0.25)
      setPrecipWeight(0.25)
    }
    else if (weightLock) {

      const [newTemp, newHumidity, newCloud, newPrecip] = normaliseWeights(tempWeight, humidityWeight, cloudWeight, precipWeight)

      setTempWeight(newTemp);
      setHumidityWeight(newHumidity);
      setCloudWeight(newCloud);
      setPrecipWeight(newPrecip);
    }
  };

  function normaliseWeights(w1, w2, w3, w4) {

    const total = w1 + w2 + w3 + w4;

    const new1 = round2(w1 / total);
    const new2 = round2(w2 / total);
    const new3 = round2(w3 / total);
    const new4 = round2(1 - (new1 + new2 + new3));

    return[new1, new2, new3, new4]
  }


  return (
    <div>
      <h2 style={{marginTop:'50px'}}>Preferences:</h2>
      <p>Temperature: {preferences?.temp?.value}°C, Weighting: {preferences?.temp?.weight}</p>
      <p>Humidity: {preferences?.humidity?.value}%, Weighting: {preferences?.humidity?.weight}</p>
      <p>Cloud Cover: {preferences?.cloudcover?.value}%, Weighting: {preferences?.cloudcover?.weight}</p>
      <p>Precipitation: {preferences?.precip?.value}mm, Weighting: {preferences?.precip?.weight}</p>
      <BoundForm
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onSubmit={updatePreferences}
        placeholder={"Enter a desired temperature"}/>
      <BoundForm
        value={humidity}
        onChange={(e) => setHumidity(e.target.value)}
        onSubmit={updatePreferences}
        placeholder={"Enter a desired humidity"}/>
      <BoundForm
        value={cloudcover}
        onChange={(e) => setCloudcover(e.target.value)}
        onSubmit={updatePreferences}
        placeholder={"Enter a desired cloud cover amount"}/>
      <BoundForm
        value={precip}
        onChange={(e) => setPrecip(e.target.value)}
        onSubmit={updatePreferences}
        placeholder={"Enter a desired precipitation amount"}/>
      <button onClick={updatePreferences}>Submit preferences</button>
      <Box sx={{ width: 300, mx: 'auto' }}>
        <Slider
          min={0}
          max={1.0}
          step={0.01}
          value={tempWeight}
          aria-label="Default"
          valueLabelDisplay="auto"
          onChange={handleTempWeightChange}
        />
      </Box>
      <Box sx={{ width: 300, mx: 'auto' }}>
        <Slider
          min={0}
          max={1.0}
          step={0.01}
          value={humidityWeight}
          aria-label="Default"
          valueLabelDisplay="auto"
          onChange={handleHumidityWeightChange}/>
      </Box>
      <Box sx={{ width: 300, mx: 'auto' }}>
        <Slider
          min={0}
          max={1.0}
          step={0.01}
          value={cloudWeight}
          aria-label="Default"
          valueLabelDisplay="auto"
          onChange={handleCloudWeightChange}/>
      </Box>
      <Box sx={{ width: 300, mx: 'auto' }}>
        <Slider
          min={0}
          max={1.0}
          step={0.01}
          value={precipWeight}
          aria-label="Default"
          valueLabelDisplay="auto"
          onChange={handlePrecipWeightChange}/>
      </Box>
      <label>Unlock sliders:
        <input
          type="checkbox"
          checked={weightLock}
          onChange={handleWeightLockChange}
        />
      </label>
      <p style={{color:'red',margin:'16px 0'}}>{errorMSG}</p>
    </div>
  );
};

export default Preferences;