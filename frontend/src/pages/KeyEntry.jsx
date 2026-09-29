import React, { useState } from 'react';
import BoundForm from "../components/BoundForm.jsx";
import api, { getToken, setToken, clearToken} from "../api.js";
import {Link, useNavigate} from "react-router-dom";



const KeyEntry = () => {

  const [API_Key, setAPI_Key] = useState('')
  const [errorMSG, setErrorMSG] = useState('')
  const [hasToken, setHasToken] = useState(!!getToken())
  const navigate = useNavigate()

  const submitKey = async () => {
    if (!API_Key) {
      setErrorMSG("Enter your API key")
      return
    }
    setErrorMSG('')
    try {
      const response = await api.post('/key', {API_Key});
      setToken(response.data)
      setAPI_Key('')
      navigate("/main")
    } catch (error) {
      console.error("Error submitting key", error);
      setErrorMSG(error.response?.data?.detail ?? "Could not submit key")
    }
  };

  const submitKeyFile = async () => {
    setErrorMSG('')
    try {
      const response = await api.get('/keyfile');
      setToken(response.data)
      navigate("/main")
    } catch (error) {
      console.error("Error submitting key from file", error);
      setErrorMSG(error.response?.data?.detail ?? "Could not submit key from file")
    }
  }

  const removeKey = async () => {
    try {
      await api.delete('/key');
    } catch (error) {
      console.error("Error removing key", error);
    }
    clearToken()
    setHasToken(false)
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
      <p style={{color:'red',margin:'16px 0'}}>{errorMSG}</p>
      {hasToken &&
        <div>
          <Link to ="/main" style={{ display: 'inline-block', marginTop: '16px' }}>
            Main Page
          </Link>
          <div>
            <button onClick={removeKey} style={{ marginTop: '16px' }}>Remove my stored key</button>
          </div>
        </div>
      }
    </div>
  )
}

export default KeyEntry