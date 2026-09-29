import uvicorn
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import requests
from geopy.geocoders import Nominatim

class Feature(BaseModel):
    name: str
    value: float
    weight: float
    scale: float
    unit: str

class Preferences(BaseModel):
    temp: Feature
    humidity: Feature
    cloudcover: Feature
    precip: Feature

class PreferenceData(BaseModel):
    temp: float
    humidity: float
    cloudcover: float
    precip: float
    tempWeight: float
    humidityWeight: float
    cloudWeight: float
    precipWeight: float

class Location(BaseModel):
    settlement: str
    country: str

class Result(BaseModel):
    settlement: str
    lat: float
    lng: float
    temp: float
    humidity: float
    cloudcover: float
    precip: float

class StaticWeekData(BaseModel):
    lat: float
    lng: float
    settlement: str

app = FastAPI()

origins = [
    "http://localhost:5173"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROXIES = {
    "http": "http://127.0.0.1:8080",
    "https": "http://127.0.0.1:8080",
}



# weather features the user can prioritise when finding a walk
preferences = {
    "temp": {
        "name": "Temperature",
        "value": 20,  # user's chosen preferred value
        "weight": 0.25,  # user's chosen importance of the feature
        "scale": 20.0,  # constant value to normalise feature error calculations
        "unit": "°C"
    },
    "humidity": {
        "name": "Humidity",
        "value": 40,
        "weight": 0.25,
        "scale": 100.0,
        "unit": "%"
    },
    "cloudcover": {
        "name": "Cloud Cover",
        "value": 50,
        "weight": 0.25,
        "scale": 100.0,
        "unit": "%"
    },
    "precip": {
        "name": "Precipitation",
        "value": 0,
        "weight": 0.25,
        "scale": 5.0,
        "unit": "mm"
    }
}

settings = {
    "unit_system": "uk",
    "algorithm_steps": 3,  # number of steps taken in walk-finder algorithm
    "algorithm_distance": 0.1  # distance of potential locations from initial location in walk-finder algorithm
}

API_Key = ''


@app.get("/preferences", response_model=Preferences)
def Get_Preferences():
    return preferences

# menu to allow user to view and alter feature values and weightings
@app.post("/preferences")
def Set_Preferences(preferenceData: PreferenceData):

    preferences["temp"]["value"] = preferenceData.temp
    preferences["humidity"]["value"] = preferenceData.humidity
    preferences["cloudcover"]["value"] = preferenceData.cloudcover
    preferences["precip"]["value"] = preferenceData.precip
    preferences["temp"]["weight"] = preferenceData.tempWeight
    preferences["humidity"]["weight"] = preferenceData.humidityWeight
    preferences["cloudcover"]["weight"] = preferenceData.cloudWeight
    preferences["precip"]["weight"] = preferenceData.precipWeight


'''
@app.get("/location", response_model=Location)
def Get_Location():
    return { settlement: "hereford" , country: "uk" }
'''

# find the best location for a walk given the user's location and weather preferences
@app.post("/location", response_model=Result)
def Find_Walk(location: Location):

    # get weather data for user's current location
    response = Request(location.settlement, location.country)

    '''
    if response.status_code != 200:
        # print error message and return to main menu if response was not successfully processed
        print()
        input(response.text)
        print()
        return
    '''

    # convert returned data to dict
    data = response.json()

    # direction last selected
    prev = None

    for _ in range(settings["algorithm_steps"]):
        # apply one step of algorithm, replacing previous data and direction with that of new location
        data, prev = Check_Potentials(data, prev)

    # get name of settlement at location in final response output
    geolocator = Nominatim(user_agent="settlement_selector")
    result = geolocator.reverse((data["latitude"], data["longitude"]), exactly_one=True)
    if result and "address" in result.raw:
        address = result.raw["address"]
        settlement = (
                address.get("city")
                or address.get("town")
                or address.get("village")
                or address.get("hamlet")
                or location.settlement
        )

    day_data = data["days"][0]
    return {
        "settlement": settlement,
        "lat": data["latitude"],
        "lng": data["longitude"],
        "temp": day_data.get("temp") or 0.0,
        "humidity": day_data.get("humidity") or 0.0,
        "cloudcover": day_data.get("cloudcover") or 0.0,
        "precip": day_data.get("precip") or 0.0
    }





@app.post("/week", response_model=List[Result])
def Fetch_Week(staticData: StaticWeekData ):

    lat = staticData.lat
    lng = staticData.lng
    settlement = staticData.settlement

    history = Request(lat, lng, "last3days").json()
    forecast = Request(lat, lng, "next3days").json()

    week = []

    for i in range(4):
        week.append(history["days"][i])

    for i in range(3):
        week.append(forecast["days"][i+1])


    week_data = []

    for i in range(7):
        week_data.append({
            "settlement": settlement,
            "lat": lat,
            "lng": lng,
            "temp": week[i].get("temp") or 0.0,
            "humidity": week[i].get("humidity") or 0.0,
            "cloudcover": week[i].get("cloudcover") or 0.0,
            "precip": week[i].get("precip") or 0.0
        })

    return week_data

    '''
    if response.status_code != 200:
        # print error message and return to main menu if response was not successfully processed
        print()
        input(response.text)
        print()
        return
    '''


class KeyModel(BaseModel):
    API_Key: str

@app.post("/key", response_model=bool)
def Save_Key(key: KeyModel):

    global API_Key
    API_Key = key.API_Key

    test = Request("London","UK")

    if test.status_code == 200:
        return True

    API_Key = ''
    return False

'''
@app.get("/key", response_model=str)
def Get_Key():
    return API_Key
'''

@app.get("/keyfile", response_model=bool)
def Get_Keyfile():

    global API_Key
    with open("../API_Key.txt") as f:
        API_Key =  f.read().strip()

    test = Request("London", "UK")

    if test.status_code == 200:
        return True

    API_Key = ''
    return False


# requests relevant data from API, using either settlement/country names or lat/lng values
def Request(town_or_lat, country_or_lng, period = "today"):
    # convert list of non-zero weighted features to string for use in request url
    str_elements = "temp,humidity,cloudcover,precip"
    units = settings["unit_system"]
    location = str(town_or_lat) + "," + str(country_or_lng)

    '''
    if town_or_lat:
        location = str(town_or_lat) + "," + str(country_or_lng)
    else:
        return
    '''

    # request data at given location, for today's date, for relevant features
    return requests.get(
        f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/{location}/{period}?key={API_Key}&unitGroup={units}&include=current&elements={str_elements}&options=usev2forecast",
        proxies = PROXIES,
        verify = False  # [Required for local proxies intercepting HTTPS traffic
    )


# a single step of the walk-finder algorithm
def Check_Potentials(base, prev=None):
    # if initial location was best at last step, just return initial location
    if prev == "base":
        return base, "base"

    lat = base["latitude"]
    lng = base["longitude"]

    # initialise list of weather data for potential locations with that of initial location
    potentials = [(base, "base")]

    dist = settings["algorithm_distance"]

    # append data for locations in four cardinal directions from initial location
    if prev != "south":  # do not check the direction of the previous step's initial location
        potentials.append((Request(lat + dist, lng).json(), "north"))
    if prev != "north":
        potentials.append((Request(lat - dist, lng).json(), "south"))
    if prev != "west":
        potentials.append((Request(lat, lng + dist).json(), "east"))
    if prev != "east":
        potentials.append((Request(lat, lng - dist).json(), "west"))

    # index of best location in `potentials`, initialised as that of initial location
    best = 0
    # the current best cost value, initialised as that of initial location
    best_cost = Cost(potentials[0][0])

    # get index and cost of best location
    for i in (range(1, len(potentials))):
        cost = Cost(potentials[i][0])
        if cost < best_cost:
            best_cost = cost
            best = i

    return potentials[best]


def Cost(data):
    cost = 0

    elements = ["temp", "humidity", "cloudcover", "precip"]

    for elem in elements:
        # the data for the location currently being considered
        elem_data = preferences[elem]
        # fetch value safely; fall back to 0.0 if missing or None
        val = data["days"][0].get(elem) or 0.0
        # sum of weighted, normalised error values for all considered features
        cost += elem_data["weight"] * abs(val - elem_data["value"]) / elem_data["scale"]

    return cost


MAP_ELEMENTS = {"temp", "cloudcover", "precipcomposite"}

@app.get("/tiles/{element}/{z}/{x}/{y}")
def Get_Tile(element: str, z: int, x: int, y: int, time: str = "latest"):
    # whitelist elements so the path can't be used to hit arbitrary API routes
    if element not in MAP_ELEMENTS:
        raise HTTPException(status_code=400, detail="Unknown map element")
    if not API_Key:
        raise HTTPException(status_code=400, detail="API key is required")

    upstream = requests.get(
        f"https://maps.visualcrossing.com/VisualCrossingWebServices/rest/api/v1/map/tile/{element}/{z}/{x}/{y}.webp",
        params={"api_key": API_Key, "time": time, "options": "usev2forecast"},
        proxies = PROXIES,
        verify = False
    )

    if upstream.status_code != 200:
        raise HTTPException(status_code=upstream.status_code, detail="Tile request failed")

    return Reponse(
        content=upstream.content,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=600"}   # avoid re-fetching tiles on every pan
    )



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)