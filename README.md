# PWF-Interface
Web app to give an interactable interface to the Pleasant Walk Finder.


## Requirements
- 


## Initial Setup

### 1. Worker
Navigate to `Worker/`
```bash
cd worker
```
Create .dev.vars with your shared secret (any string you choose):
```bash
Set-Content -Path .dev.vars -Value "PROXY_TOKEN=dev-secret"
```

### 2. Backend:
Navigate to `Backend/`
```bash
cd backend
```
Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Frontend:
Navigate to `Frotend/`
```bash
cd frontend/
```
Install dependencies
```bash
npm install
```

### 4. Key file (optional)

Create API_Key.txt at the base directory, containing just your Visual Crossing key.


## To Run

### 1. Worker
```bash
cd worker
npx wrangler dev
```
Wait for `Ready on http://localhost:8787`

### 2. Backend:
```bash
cd backend
$env:VC_PROXY_URL = "http://localhost:8787"
$env:VC_PROXY_TOKEN = "dev-secret"
python main.py
```
Use the same string you put in `.dev.vars`

### 3. Frontend:
```bash
cd frontend
npm run dev
```

Open the URL it prints (e.g. http://localhost:5173)
