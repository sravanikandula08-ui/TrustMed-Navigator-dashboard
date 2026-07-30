# TrustMed Clinical Navigator Dashboard
The TrustMed Clinical Navigator Dashboard is a modern web application designed for healthcare professionals to seamlessly review patient data and consult an AI-powered clinical research assistant. The application merges real-time patient metric tracking (e.g., A1C levels, General Health Scores) with an enterprise-grade Retrieval-Augmented Generation (RAG) pipeline backed by Amazon Bedrock.

[view MedTrust Navigator dashboard](https://trust-med-navigator-dashboard-3om8h2l6p-sravani3.vercel.app/)

# Key Features
Patient Data Integration: Fetches and displays real-time patient clinical records directly from AWS DynamoDB.

AI Clinical Research Assistant: An integrated chatbot grounded in custom medical research documents (PDFs) via an Amazon Bedrock Knowledge Base.

Intelligent Prompt Formatting: Automatically structures complex AI medical responses into concise, scannable bullet points optimized for quick clinical review.

Serverless Architecture: A lightweight, highly scalable AWS backend utilizing API Gateway and Lambda.
# Architecture & Tech Stack
Frontend
React.js: Single Page Application (SPA) architecture.

Tailwind CSS: Utility-first styling for a clean, responsive medical UI.

Vercel: Automated, continuous deployment hosting.

Backend (AWS)
AWS API Gateway: Manages CORS and routes REST requests to the backend logic.

AWS Lambda (Python 3.x): A unified serverless function handling dual routing:

Route 1: Parses chatbot queries and interacts with the Bedrock Knowledge Base.

Route 2: Scans and retrieves standard patient metrics from the database.

Amazon DynamoDB: NoSQL database table (TrustMed_Patients) storing JSON-structured clinical scenarios and visit histories.

Amazon Bedrock:

Knowledge Base: Managed vector store (ID: FVL4R9DVUN) containing indexed clinical research reports (S3 data source).

Foundation Model: Anthropic Claude 3 / 4.5 Haiku via Cross-Region Inference Profiles.

# Local Development Setup
Prerequisites
Node.js (v16+)

An active AWS Account with permissions for API Gateway, Lambda, DynamoDB, and Bedrock.

Git installed locally.

1. Clone and Install
Bash
git clone https://github.com/YOUR_GITHUB_USERNAME/trustmed-navigator-dashboard.git
cd trustmed-navigator-dashboard
npm install
2. Configure Environment Variables
Create a .env file in the root directory and add your API Gateway endpoint:

Code snippet
REACT_APP_API_URL=https://your-api-gateway-id.execute-api.us-east-2.amazonaws.com/
3. Run Locally
Bash
npm start
The application will spin up at http://localhost:3000.

# AWS Backend Configuration Guide
To replicate the cloud infrastructure for this application, ensure the following AWS services are configured in us-east-2 (Ohio) or your preferred region:

DynamoDB
Create a table named TrustMed_Patients.

Ensure your mock patient JSON data is loaded into the table.

Amazon Bedrock
Create a Knowledge Base backed by an S3 bucket containing your medical research PDFs.

Sync the Data Source.

Ensure Model Access is granted for Anthropic Claude 3 Haiku in your AWS region.

AWS Lambda
Deploy a Python 3.x Lambda function containing the boto3 routing logic.

Crucial IAM Permissions: The Lambda Execution Role must have an inline policy granting:

dynamodb:Scan on the TrustMed_Patients table.

bedrock:RetrieveAndGenerate and bedrock:Retrieve on your Knowledge Base ARN.

bedrock:InvokeModel on the Anthropic Claude Foundation Model ARN.

API Gateway
Create an HTTP API (or REST API) triggering your Lambda function.

Enable CORS, allowing OPTIONS, POST, and GET methods with the * wildcard for origins (or restrict to your specific Vercel domain in production).

# Deployment
This project is configured for seamless deployment on Vercel.

Push your code to a GitHub repository.

Log in to Vercel and click Add New Project.

Import the repository.

Add your REACT_APP_API_URL to the Environment Variables section in the Vercel dashboard.

Click Deploy. Vercel will automatically build and publish the live dashboard.