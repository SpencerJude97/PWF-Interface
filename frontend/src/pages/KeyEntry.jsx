import React, { useState } from 'react';
import BoundForm from "../components/BoundForm.jsx";
import api from "../api.js";
import {Link} from "react-router-dom";



const KeyEntry = () => {

  const [API_Key, setAPI_Key] = useState('')
  const[keyValid, setKeyValid] = useState(false)

  const submitKey = async () => {
    if (!API_Key) {
      return
    }
    try {
      const response = await api.post('/key', {API_Key});
      if (response.data) {
        setKeyValid(true)
      }
      else {
        setKeyValid(false)
      }
    } catch (error) {
      console.error("Error submitting key", error);
    }
  };

  const submitKeyFile = async () => {
    try {
      const response = await api.get('/keyfile');
      if (response.data) {
        setKeyValid(true)
      }
      else {
        setKeyValid(false)
      }
    } catch (error) {
      console.error("Error submitting key from file", error);
    }
  }

  return (
    <div>
      <h2> Enter your API Key:</h2>
      <BoundForm
        value={API_Key}
        onChange={(e) => setAPI_Key(e.target.value)}
        onSubmit={submitKey}
        buttonText={"Submit"}/>
      <button onClick={submitKeyFile}>Submit key from files</button>
      {keyValid &&
        <div>
          <Link to ="/main" style={{
            display: 'inline-block',
            marginTop: '16px'
          }}>
            Main Page
          </Link>
        </div>
      }
    </div>
  )
}

export default KeyEntry