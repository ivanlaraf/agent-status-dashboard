# Agent Status Dashboard

A clean, generic, **open-source dashboard** for monitoring **agent status history** (Available, Busy, Offline, Disconnect).  
Built with **React** + **AWS Lambda + API Gateway** + **DynamoDB**.

Ready for call center managers and supervisors to monitor agent performance with **no vendor lock-in**.

---

## Features

-  Per-Agent Status Summary (start, end, duration, current state).
-  Agent Status Timeline with live updates and granular tracking.
-  Live sessions indicator (“Live — xh xm and counting”).
-  Clean, brand-free UI (no Nestlé, AWS, or Lovable branding).
-  API configurable via `.env`.
-  Compatible with AWS stack (Lambda, DynamoDB, API Gateway).

---

##  Project Structure

- React Webapp.
- 2 Lambda Functions(generic, no secrets).
- DynamoDB schema, API Gateway config
---

##  Setup

1. Clone the repo
2. Edit .env VITE_API_BASE_URL = YOUR AMAZON API GATEWAY HERE
3. Run locally npm run dev
5. Once you've decided go to AWS
6. In DynamoDB create a table Named AgentStates with:
    * Partition Key: AgentId (string)
    * Sort key: timestamp (String, ISO format)
7. Kinesis:
    Please enable Agent Event Streams in your connect instance
    Connect it to a Kinesis Data Stream
    Attach the  insertagentstate.py Lambda as a consumer of the stream
    Just to be clear, this lamba decodes events from Kinesis
    Map wat status Such as Routable, Offline, etc to a firnedly name [Available, offline, etc]
    Inserts record in Dynamo
8. The readagentStates Lambda exposes a Query API to fetch agent states from DynamoDB. It actually groups states, calculates duration and prepares a clean JSON response
9. API GATEWAY:
    need to create a HTTP API
    add this route GET /agent-states
    Integrate with the lambda function readAgentStates
    Enable CORS
    Deploy the API and note the invoke URL
10. Front end setup:
    Clone the repo, install dependencies with npm install, configure evironment, set your API Gateway URL, build for production with npm run build, hos the frontend on S3, Cloudfront, Vercel, or Netlify, backend always stays on Lambda, API Gateway, and Dynamo
