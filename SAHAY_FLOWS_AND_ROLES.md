# 🇮🇳 Sahay (सहाय) — Platform Flows, Roles & Real-World Scenarios

Welcome to the comprehensive documentation of the **Sahay** platform lifecycle, roles, and system workflows. This guide illustrates how Citizens, Municipal Officers, NGOs, Elected Representatives, and CSR Corporate sponsors collaborate through a unified, AI-driven civic intelligence loop.

---

## 🗺️ Sahay Lifecycle Flow

The diagram below details how a civic issue progresses from citizen reporting to intelligent AI clustering, official resolution, and citizen verification.

```mermaid
graph TD
    %% Citizen Actions
    A["👤 Citizen Reports Issue (Voice/Image/GPS)"] --> B{"🤖 AI Intake Engines"}
    
    %% AI Pipeline
    subgraph "8 Core AI Services"
        B -->|Voice-to-Text| B1["Voice Engine"]
        B -->|Category & Severity| B2["NLU Engine"]
        B -->|Visual Verification| B3["Vision Engine"]
        B -->|Geospatial & Semantic Grouping| B4["Clustering Engine"]
        B -->|Civic Priority Calculation| B5["Priority Engine"]
    end

    %% Routing Decisions
    B4 --> C{"Is Duplicate of Active Incident?"}
    C -->|Yes| D["🔗 Merge into existing 'Civic Incident'<br>(Increment support count & priority)"]
    C -->|No| E["🆕 Create New 'Civic Incident' & Generate Ticket"]
    
    %% Stakeholder Action Flows
    E --> F{"Issue Type"}
    D --> F
    
    %% Standard Path vs Petitions
    F -->|Local Maintenance (e.g. Pothole, Trash)| G["✅ Routed to Ward Municipal Officer Dashboard"]
    F -->|Critical/Constituency Demands| H["📋 Escalated to Citizen Petition / Demand Lifecycle"]
    F -->|Whistleblower / Corruption| I["🔒 Integrity Pipeline (Super Admin Direct Route)"]
    F -->|SOS / Immediate Danger| J["🚨 Direct Emergency SOS to Law Enforcement"]

    %% Municipal Resolution
    G --> K["👨‍🔧 Municipal Officer assigns Work Order"]
    K --> L["🏗️ Work Underway"]
    L --> M["📸 Officer Uploads Proof of Resolution"]
    
    %% Verification Loop
    M --> N{"🤖 Verification Engine"}
    N -->|Checks Proximity & Image Alignment| O{"Confidence Score Check"}
    O -->|High Confidence| P["🔷 Notify Reporter to Confirm / Close Ticket"]
    O -->|Low/Suspicious| Q["⚠️ Send back to Sub-Admin Moderation Queue"]
    
    %% NGO and CSR paths
    H --> R["⭐ Elected Rep Endorsement Dashboard"]
    H --> S["🟢 NGO Adoption & Volunteer Campaign Dashboard"]
    S --> T["🏢 Corporate CSR Budget Match"]
```

---

## 👥 Sahay Role Matrix

| Icon | Role | Verification Badge | System Access | Primary Responsibilities |
| :---: | :--- | :--- | :--- | :--- |
| **👤** | **Unverified Citizen** | None | Mobile App | Browse map, view city scores, report basic issues. |
| **🔷** | **Verified Citizen** | Grey Check | Mobile App | Create reports, vote on community demands, verify completed resolutions. |
| **⭐** | **Civic Leader** | Gold Star | Mobile App | Earned through civic contributions. Can create local "Civic Circles" and host cleanup missions. |
| **🟢** | **NGO / Society / RWA** | Green Tick | Web Dashboard | Create volunteer campaigns, adopt civic projects, host cleanup events. |
| **🏢** | **Company / CSR Sponsor** | Green Tick | Web Dashboard | View high-priority demands, allocate CSR funds to match civic projects. |
| **✅** | **Municipal Officer** | Blue Tick | Web Dashboard | Manage ward dashboard, assign work order status, upload resolution proof. |
| **✅** | **Elected Representative** | Blue Tick | Web Dashboard | Endorse citizen petitions, track constituency health analytics, advance demands. |
| **👮** | **Police / Law Enforcement** | Blue Tick | Web Dashboard / SOS | Act on safety-critical SOS alerts dispatched by citizens. |
| **👑** | **Super Admin** | Gold Crown | Web Admin Panel | User/NGO verification approval, whistleblower moderation, audit log reviews. |

---

## 🚀 The Ultimate End-to-End Flow: Aryan's Story, Youth Gamification & Revenue Streams

This section follows **one single detailed timeline** demonstrating how a broken road is spotted, uploaded, funded, resolved, and verified, integrating all stakeholders, gamified reward payouts, and the platform's revenue mechanics.

```
 [1. Spotted & Reported] ---> [2. AI Merging & Scoring] ---> [3. Rep Endorsement & SaaS Dispatch]
          |                                                               |
          v                                                               v
 [6. Final Verification] <--- [5. NGO Campaign & CSR Funding] <--- [4. Youth Mission Signups]
```

### Stage 1: Discovery & Gamified Reporting (Aryan's Flow)
*   **The Actor:** **Aryan**, an 18-year-old college student in Bhopal (Ward 12).
*   **Youth Attraction Feature (Why Aryan uses Sahay):** 
    *   **AR-Civic Camera:** Aryan opens the Sahay App. Instead of boring forms, he uses an AR-overlay camera that highlights nearby "Zone Hotspots" and ongoing community quests.
    *   **Snapchat-style Snippets:** He records a 10-second voice-assisted clip: *"यहाँ वार्ड 12 की मेन रोड टूट गई है, काफी बड़ा गड्ढा है और गाड़ियाँ फिसल रही हैं।"* (The main road of Ward 12 is broken, there is a large pothole and vehicles are slipping.)
    *   **Insta-Civic Social Sharing:** The app generates a customized, dynamic graphic card ("Aryan is safeguarding Ward 12 🛡️") that he can share directly to Instagram or WhatsApp stories with a single tap, attracting his friends to join his "Civic Circle."
*   **Rewards & Incentives:** Upon submitting, Aryan immediately sees a pending transaction of **+10 Civic Coins** (which unlock once the issue is resolved) and earns **+5 XP** towards leveling up to a "Civic Champion" rank.

### Stage 2: AI Intake, Clustering, & Priority Scoring
*   **The System Actions:** 
    *   **Voice & NLU Engines:** The Python FastAPI microservice receives the audio, transcribes it, and tags it under `Category: Road Infrastructure` with a `Severity: High` rating.
    *   **Clustering Engine (PostGIS + Text Embedding):** The system notes that 3 other students in Aryan's hostel reported this same pothole. It automatically merges Aryan's report under **Incident #2045**, preventing ticket duplication.
    *   **Priority Score Calculation:** The Priority Engine recalculates the score for Incident #2045, boosting it to **9.1 / 10** due to traffic density, safety risks, and multiple citizen upvotes.

### Stage 3: Administrative SaaS Action & Representative Endorsement
*   **SaaS Licensing (Revenue Generation 1):** The Bhopal Municipal Corporation (Urban Local Body - ULB) pays a monthly **SaaS Subscription Fee** to access the Sahay Administrative Portal for advanced GIS dispatching, staff tracking, and SLA monitoring.
*   **Elected Rep Endorsement:** **Corporator Sunita Patel** sees that Incident #2045 has bypassed the 100-vote threshold. On her tablet, she taps **Endorse Demand**, validating the constituency's request for road repairs, which automatically escalates the issue to the public work order queue.
*   **Municipal Officer Action:** **Smt. Priya Mishra** (Municipal Officer) logs into the dashboard, views the AI-analyzed work order, and dispatches a road maintenance unit. She marks the status as **In Progress** on the dashboard, triggering an automatic push notification to Aryan: *"Your report is now In Progress. Keep tracking!"*

### Stage 4: NGO & CSR Match Funding (Revenue & Capital Flow)
*   **The Issue:** The municipal crew reports that the road repair requires a substantial drainage overhaul to prevent future potholes—costing an extra **₹1,00,000**.
*   **NGO Adoption:** The verified NGO **Bhopal Green Foundation** adopts the project on their NGO Hub dashboard, naming it *"Clean & Green Ward 12 Main Road"*. They launch a volunteer campaign.
*   **Corporate CSR Match (Revenue Generation 2):** **Bharat CSR Corp** wants to direct its mandatory corporate social responsibility (CSR) budget into Ward 12. Using the Sahay Sponsor dashboard, they pledge a **1:1 funding match** for the NGO initiative.
*   **Corporate Matching Platform Fee (Revenue Generation 3):** Sahay charges a **5% platform administration fee** on all corporate CSR matching transactions for automated audit tracking, tax certification, and visual completion reports.

### Stage 5: Youth Volunteers Action & Reward Payouts
*   **Youth Signups:** Aryan and 25 students see the *"Ward 12 Clean & Green Campaign"* quest on their mobile maps. Eager to level up, they sign up as volunteers.
*   **Quest Verification:** On Saturday, they clean the area, plant trees along the repaired road, and paint safety markers.
*   **Verification:** To claim rewards, volunteers scan a dynamic **Location-Bounded QR Code** generated on-site by the NGO organizer.
*   **Rewards Payout:** 
    *   Aryan receives a verified digital PDF certificate: **"Bhopal Green Warrior Certificate"** signed by the ULB and NGO (valuable for college credit).
    *   He earns **+500 XP** and **50 Civic Coins**.
    *   **Redeemable Value:** Aryan redeems his accumulated Civic Coins in the app's *Rewards Shop* for a **free coffee voucher** at a local partnered cafe (Cafe Coffee Day Bhopal) and a **15% discount coupon** on local metro passes. (Local merchants sponsor these vouchers to drive foot traffic, while Sahay charges them a tiny lead-generation fee).

### Stage 6: The Resolution Loop & Commercial API Usage
*   **Resolution:** The road work is completed. Smt. Priya Mishra uploads the resolved photo.
*   **AI Verification Engine:** The Python Vision service matches the "Resolved" photo against Aryan's "Before" photo, confirming the pothole is filled and the road is cleared.
*   **Commercial Geo-API (Revenue Generation 4):** Once verified, the road state is updated on Sahay's live GIS database. Logistics companies (like Swiggy, Zomato, and Delhivery) subscribe to **Sahay's Premium Real-Time Road Quality API** to optimize route safety and speed for their delivery executives.
*   **Closing the Loop:** Aryan receives a final prompt: *"Road looks good! Confirm repair to get your +10 Civic Coins."* He confirms. The ticket closes, the city scoring index ticks upward, and Aryan's profile displays a shiny new **"Road Guard"** badge.

---

## 🛠️ Situation Playbooks

### Situation A: Resolving Duplicate Reports
*   **The Issue:** A busy intersection has a broken traffic light. Twenty people report it within an hour.
*   **System Action:** The **Clustering Engine** handles this. It groups all reports within a 50-meter radius containing terms like "light", "traffic signal", or "crossing".
*   **User Experience:** 
    *   Reporter 1 creates the primary incident.
    *   Reporters 2-20 are shown a prompt: *"Is this the issue you are reporting?"* with the picture of the broken traffic light. They can tap *"Yes, this is the same"* to upvote it instead of filing a new report.

### Situation B: Whistleblower / Integrity Channel
*   **The Issue:** A citizen suspects a contractor of using sub-standard concrete for road construction.
*   **System Action:** In the mobile app, the citizen flags the report as **Integrity/Corruption**. 
*   **Privacy & Routing:**
    *   To prevent interference, this report bypasses local municipal ward dashboards.
    *   It is routed directly to the **Super Admin Console** overseen by state-level administrators.
    *   The reporter's personal details are fully encrypted and hidden.

### Situation C: Corporate CSR Funding Match
*   **The Issue:** An NGO wants to build a community park on a cleared trash dump site, but needs 50,000 INR.
*   **System Action:** The NGO posts this as a **Civic Initiative**.
*   **CSR Flow:** 
    *   **Corporate CSR Sponsors** log into their web dashboards and view verified civic initiatives sorted by impact.
    *   The corporation pledges a 1:1 match (e.g., matching every rupee donated by citizens).
    *   Once the funding target is hit, the funds are released, progress is tracked dynamically on the app, and the corporation receives tax deduction certificates directly through the dashboard.

### Situation D: Emergency SOS Dispatch
*   **The Issue:** A citizen encounters a hazardous live power line lying across a wet road.
*   **System Action:** The citizen hits the **SOS** button on the Sahay Mobile App.
*   **SOS Flow:**
    *   The NLU engine bypasses general queues.
    *   It pushes immediate real-time Socket.IO alerts to **Police & Disaster Management** dashboards.
    *   The system sends SMS and coordinates to the emergency responder team closest to the GPS point.
