import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Search, Send, FileText, User, ChevronRight } from 'lucide-react';

// Centralized configuration for all DynamoDB metrics to handle formatting and charting
const METRICS_CONFIG = [
  { key: 'A1C', label: 'Hemoglobin A1C (%)', color: '#0ea5e9', domain: ['auto', 'auto'], format: v => `${v} %` },
  { key: 'BMI', label: 'Body Mass Index', color: '#8b5cf6', domain: ['auto', 'auto'], format: v => v },
  { key: 'Diabetes_012', label: 'Diabetes Status (0-2)', color: '#ef4444', domain: [0, 2], format: v => v === 0 ? 'Normal (0)' : v === 1 ? 'Pre (1)' : 'Diabetic (2)' },
  { key: 'HighBP', label: 'High Blood Pressure', color: '#f43f5e', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'HighChol', label: 'High Cholesterol', color: '#f59e0b', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'CholCheck', label: 'Cholesterol Checked', color: '#10b981', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'Smoker', label: 'Smoker History', color: '#64748b', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'Stroke', label: 'History of Stroke', color: '#dc2626', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'HeartDiseaseorAttack', label: 'Heart Disease/Attack', color: '#be123c', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'PhysActivity', label: 'Physical Activity', color: '#14b8a6', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'Fruits', label: 'Daily Fruits', color: '#84cc16', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'Veggies', label: 'Daily Veggies', color: '#22c55e', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'HvyAlcoholConsump', label: 'Heavy Alcohol Consump.', color: '#d946ef', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'AnyHealthcare', label: 'Has Healthcare Coverage', color: '#06b6d4', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'NoDocbcCost', label: 'Avoided Doc due to Cost', color: '#f97316', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' },
  { key: 'GenHlth', label: 'General Health Score (1-5)', color: '#3b82f6', domain: [0, 6], format: v => `${v} / 5` },
  { key: 'MentHlth', label: 'Poor Mental Health Days', color: '#6366f1', domain: [0, 30], format: v => `${v} days` },
  { key: 'PhysHlth', label: 'Poor Physical Health Days', color: '#8b5cf6', domain: [0, 30], format: v => `${v} days` },
  { key: 'DiffWalk', label: 'Difficulty Walking', color: '#94a3b8', domain: [-0.5, 1.5], format: v => v === 1 ? 'Yes' : 'No' }
];

// Your Live AWS API Gateway Endpoint URL
const API_URL = "https://0mmoi8h9l3.execute-api.us-east-2.amazonaws.com/";

export default function App() {
  const [activePatientId, setActivePatientId] = useState("");
  const [patientData, setPatientData] = useState(null);
  const [allPatients, setAllPatients] = useState([]);
  const [selectedMetric, setSelectedMetric] = useState("A1C"); 
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // 1. Fetch live data from AWS DynamoDB on initial load
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_patients' })
        });
        
        const data = await response.json();
        
        // Sort alphabetically to keep the dropdown organized
        data.sort((a, b) => a.PatientID.localeCompare(b.PatientID));
        
        setAllPatients(data);
        if (data.length > 0) {
          setActivePatientId(data[0].PatientID);
          setPatientData(data[0]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching from AWS DynamoDB:", error);
        setIsLoading(false);
      }
    };
    
    fetchPatients();
  }, []);

  // Update active patient context when the dropdown changes
  useEffect(() => {
    if (!allPatients.length || !activePatientId) return;
    
    const data = allPatients.find(p => p.PatientID === activePatientId);
    setPatientData(data);
    setSelectedMetric("A1C"); 
    setMessages([{ 
        role: 'ai', 
        text: `Hello! I have loaded the full clinical profile for Patient ${data.PatientID}. Their latest A1C is ${data.Visits[data.Visits.length - 1].A1C} and General Health Score is ${data.Visits[data.Visits.length - 1].GenHlth}/5. What would you like to research today?` 
    }]);
  }, [activePatientId, allPatients]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userQuery = chatInput;
    const newMessages = [...messages, { role: 'user', text: userQuery }];
    setMessages(newMessages);
    setChatInput("");
    setIsTyping(true);

    try {
      // 2. Ask the AWS Bedrock Knowledge Base
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'chat', 
          patient_id: patientData.PatientID,
          query: userQuery 
        })
      });
      
      const data = await response.json();
      setMessages([...newMessages, { role: 'ai', text: data.reply || data.error || "Received an empty response." }]);
    } catch (error) {
      console.error("Error asking AWS Bedrock:", error);
      setMessages([...newMessages, { role: 'ai', text: "Sorry, I had trouble connecting to the AWS Knowledge Base. Please check your network connection." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Show a loading screen while pulling data from AWS
  if (isLoading || !patientData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 text-blue-500 animate-spin" />
          <p className="text-xl font-bold text-slate-700 animate-pulse">Connecting to AWS DynamoDB...</p>
        </div>
      </div>
    );
  }

  const latestVisit = patientData.Visits[patientData.Visits.length - 1];
  const activeMetricConfig = METRICS_CONFIG.find(m => m.key === selectedMetric);

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 font-sans text-slate-800">
      
      {/* Header */}
      <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl">
            <Activity className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">TrustMed <span className="font-light text-slate-500">Navigator</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
          <User className="text-slate-400 h-5 w-5" />
          <select 
            className="border-none bg-slate-100 rounded-lg p-2 font-semibold text-slate-700 outline-none cursor-pointer hover:bg-slate-200 transition-colors"
            value={activePatientId}
            onChange={(e) => setActivePatientId(e.target.value)}
          >
            {allPatients.map(p => (
              <option key={p.PatientID} value={p.PatientID}>{p.PatientID} - {p.Clinical_Scenario}</option>
            ))}
          </select>
        </div>
      </header>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Data Table & Chart (Spans 7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Current Metrics Table (Scrollable) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Comprehensive Clinical Metrics
              </h2>
              <p className="text-sm text-slate-500 mt-1">Select any row below to view the patient's historical trend.</p>
            </div>
            
            {/* Scrollable Table Body Container */}
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="p-4 font-semibold">Metric</th>
                    <th className="p-4 font-semibold">Latest Value</th>
                    <th className="p-4 font-semibold">Date Recorded</th>
                    <th className="p-4 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {METRICS_CONFIG.map((metric) => {
                    const isSelected = selectedMetric === metric.key;
                    const val = latestVisit[metric.key];
                    // Skip rendering if data is somehow missing
                    if (val === undefined) return null; 

                    return (
                      <tr 
                        key={metric.key}
                        onClick={() => setSelectedMetric(metric.key)}
                        className={`cursor-pointer transition-colors group ${isSelected ? "bg-blue-50/50 border-l-4 border-blue-500" : "hover:bg-slate-50 border-l-4 border-transparent"}`}
                      >
                        <td className="p-4 font-medium text-slate-700">{metric.label}</td>
                        <td className="p-4 font-bold text-slate-800">
                          <span className={
                            isSelected ? "text-blue-600" : 
                            (metric.key === 'A1C' && val >= 6.4 ? 'text-red-600' : '')
                          }>
                            {metric.format(val)}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-400">{latestVisit.Date}</td>
                        <td className="p-4 text-right">
                          <ChevronRight className={`h-5 w-5 transition-transform ${isSelected ? "text-blue-500 translate-x-1" : "text-slate-300 group-hover:text-slate-400"}`} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Historical Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 min-h-[300px]">
            <h3 className="text-md font-bold mb-6 text-slate-800 flex items-center gap-2">
               Historical Trend: <span style={{ color: activeMetricConfig.color }}>{activeMetricConfig.label}</span>
            </h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={patientData.Visits} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="Date" tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} dy={10} />
                  <YAxis domain={activeMetricConfig.domain} tick={{fill: '#94a3b8', fontSize: 12}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [activeMetricConfig.format(value), activeMetricConfig.label]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={selectedMetric} 
                    stroke={activeMetricConfig.color} 
                    strokeWidth={4} 
                    dot={{r: 5, strokeWidth: 2, fill: '#fff', stroke: activeMetricConfig.color}} 
                    activeDot={{r: 7}}
                    animationDuration={500}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: RAG Chatbot (Spans 5 columns) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-[750px] overflow-hidden">
          
          <div className="bg-slate-800 p-5 shrink-0">
            <h2 className="font-bold text-white flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-blue-400" />
              Clinical Research Assistant
            </h2>
            <p className="text-sm text-slate-300 mt-1">Grounded in Knowledge Base</p>
          </div>

          {/* Chat Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto bg-slate-50/50 flex flex-col gap-5">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-600/20' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-bl-none p-4 shadow-sm text-sm italic flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={`Ask about ${activePatientId}'s ${activeMetricConfig.label}...`}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                disabled={!chatInput.trim() || isTyping}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white p-3 rounded-xl transition-colors shadow-sm"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}