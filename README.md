# Campus-Weather-Study-Planner
# Campus Weather & Study Planner

A lightweight Node.js web application that combines real-time city weather forecasts with study session scheduling so students can plan productive study blocks around local weather conditions.

- **Local Application URL:** [http://127.0.0.1:3000](http://127.0.0.1:3000)
- **GitHub Repository:** [https://github.com/aanyar1-tech/Campus-Weather-Study-Planner.git](https://github.com/aanyar1-tech/Campus-Weather-Study-Planner.git)
- **Demo Video:** [Watch the Walkthrough on Loom](https://www.loom.com/share/86ce7a580ae44d34a48149a953ae8120)

---

## Table of Contents
1. [Overview & Core Features](#overview--core-features)
2. [API Endpoints & Error Handling](#api-endpoints--error-handling)
3. [Project Structure](#project-structure)
4. [Local Setup & Run Instructions](#local-setup--run-instructions)
5. [Deployment Architecture & Sandbox Failover](#deployment-architecture--sandbox-failover)
6. [Load Balancer & Multi-Node Verification](#load-balancer--multi-node-verification)
7. [Credits & Acknowledgements](#credits--acknowledgements)

---

## Overview & Core Features

Students often juggle outdoor breaks, campus commutes, and deep-focus study sessions with limited time and unpredictable weather. **Campus Weather & Study Planner** pairs live weather lookups with a study planner so you can organize sessions and adapt your schedule easily.

- **Live City Weather & Study Recommendations:** Search any city to fetch current weather conditions (such as temperature and sky/weather status) alongside practical study block recommendations.
- **Study Task Management:** Create, filter, search, and sort study tasks with client-side persistence so your schedule stays intact across page refreshes.
- **Input Validation & Fallback Error Handling:** Gracefully handles blank or invalid city names, upstream weather API errors, and request timeouts with clear UI feedback and structured HTTP error responses without crashing the server.

 API Endpoints & Error Handling

| Endpoint | Method | Purpose | Behavior on Error / Edge Cases |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | Serves the frontend application UI from `public/` | Returns static HTML/CSS/JS assets |
| `/api/weather` | `GET` | Queries weather data for a requested city and returns formatted forecast + study guidance | Returns structured JSON error messages and appropriate HTTP status codes for missing/invalid cities or upstream API issues |
| `/api/health` | `GET` | Reports service health status for load balancers and monitoring | Returns an HTTP `200` health payload when the Node.js process is up |

---

## Project Structure

```text
Campus-Weather-Study-Planner/
├── docs/                 # Terminal verification screenshots (lb-loop.png, lb-headers.png)
├── public/               # Frontend HTML, CSS, and client-side JavaScript
├── server.js             # Express/Node.js backend, API routes, and error handlers
├── deploy_lb.sh          # Load balancer / reverse proxy deployment script
├── .env.example          # Environment variable template (safe for Git)
├── .gitignore            # Excludes .env, node_modules, and local logs
├── package.json          # Project metadata, scripts, and dependencies
└── README.md             # Setup, architecture, verification, and credits
