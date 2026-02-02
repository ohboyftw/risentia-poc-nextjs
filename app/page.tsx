'use client';

import { useRef, useEffect } from 'react';
import { useChatStore } from '@/hooks/use-chat-store';
import { MODEL_CONFIGS } from '@/types';
import ReactMarkdown from 'react-markdown';

export default function ChatPage() {
  const {
    messages,
    patientProfile,
    pipelineSteps,
    isPipelineRunning,
    trials,
    totalCost,
    isLoading,
    sendMessage,
    reset,
    mode,
    setMode,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = inputRef.current;
    if (input && input.value.trim()) {
      sendMessage(input.value.trim());
      input.value = '';
    }
  };

  const quickActions = [
    { label: 'Sample Patient', msg: '58yo female with metastatic NSCLC adenocarcinoma. EGFR L858R positive, PD-L1 TPS 45%. Prior carboplatin/pemetrexed. ECOG 1.' },
    { label: 'Find Trials', msg: 'find trials' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Risentia <span className="text-teal-600">Trial Matching</span>
            </h1>
            <p className="text-xs text-gray-500">LangGraph JS SDK • Multi-Model Orchestration</p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'local' | 'remote')}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="local">Local Mode</option>
              <option value="remote">Remote (SDK)</option>
            </select>
            <button onClick={reset} className="text-sm text-gray-600 hover:text-gray-900">
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Column */}
        <div className="lg:col-span-2 flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🧬</div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Trial Matching</h2>
                <p className="text-gray-600 mb-4">Describe a patient to find relevant clinical trials.</p>
                <p className="text-sm text-gray-500 italic">
                  "55yo male with stage IIIB NSCLC, EGFR positive, ECOG 1"
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 p-4 rounded-lg ${msg.role === 'user' ? 'bg-teal-50' : 'bg-gray-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${msg.role === 'user' ? 'bg-teal-600' : 'bg-gray-400'}`}>
                  {msg.role === 'user' ? 'U' : 'R'}
                </div>
                <div className="flex-1 prose prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {/* Pipeline Visualization */}
            {isPipelineRunning && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">⚡ Pipeline Execution</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {pipelineSteps.map((step) => {
                    const cfg = MODEL_CONFIGS[step.model];
                    return (
                      <div
                        key={step.name}
                        className={`p-2 rounded text-center text-xs border ${
                          step.status === 'complete' ? 'border-green-300 bg-green-50' :
                          step.status === 'running' ? 'border-teal-400 bg-teal-50' :
                          'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="font-medium truncate">{step.name.split(' ')[0]}</div>
                        <div
                          className="inline-block px-1 rounded text-white mt-1"
                          style={{ backgroundColor: cfg.color, fontSize: '10px' }}
                        >
                          {cfg.name.split(' ')[0]}
                        </div>
                        {step.status === 'running' && <div className="animate-pulse mt-1">...</div>}
                        {step.status === 'complete' && <div className="text-green-600 mt-1">✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Trial Results */}
            {trials.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900">📋 Matching Trials ({trials.length})</h3>
                {trials.map((trial) => (
                  <div key={trial.nctId} className="border rounded-lg p-4 bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-mono text-sm text-teal-700">{trial.nctId}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-xs text-white ${trial.status === 'RECRUITING' ? 'bg-green-500' : 'bg-gray-400'}`}>
                          {trial.status}
                        </span>
                      </div>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${trial.matchScore >= 0.85 ? 'bg-green-500' : trial.matchScore >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'}`}>
                        {Math.round(trial.matchScore * 100)}%
                      </div>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-2">{trial.title}</h4>
                    <div className="text-sm text-gray-600 mb-2">{trial.phase} • {trial.sponsor}</div>
                    <div className="space-y-1">
                      {trial.matchReasons.slice(0, 3).map((r, i) => (
                        <div key={i} className="text-sm text-green-700">{r}</div>
                      ))}
                      {trial.concerns.map((c, i) => (
                        <div key={i} className="text-sm text-amber-700">{c}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 bg-gray-50 border-t flex gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => sendMessage(action.msg)}
                disabled={isLoading}
                className="px-3 py-1 text-sm bg-white border rounded-full hover:bg-gray-50 disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Describe the patient..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
              >
                {isLoading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient Profile */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="bg-teal-600 px-4 py-3">
              <h3 className="font-semibold text-white">Patient Profile</h3>
            </div>
            <div className="p-4 space-y-3 text-sm">
              {patientProfile.age && <div><span className="text-gray-500">Age:</span> <span className="font-medium">{patientProfile.age}</span></div>}
              {patientProfile.sex && <div><span className="text-gray-500">Sex:</span> <span className="font-medium">{patientProfile.sex}</span></div>}
              {patientProfile.cancerType && <div><span className="text-gray-500">Diagnosis:</span> <span className="font-medium">{patientProfile.cancerType}</span></div>}
              {patientProfile.stage && <div><span className="text-gray-500">Stage:</span> <span className="font-medium">{patientProfile.stage}</span></div>}
              {Object.keys(patientProfile.biomarkers).length > 0 && (
                <div>
                  <span className="text-gray-500">Biomarkers:</span>
                  <div className="mt-1">
                    {Object.entries(patientProfile.biomarkers).map(([k, v]) => (
                      <span key={k} className="inline-block mr-2 px-2 py-0.5 bg-teal-100 text-teal-800 rounded text-xs">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {patientProfile.ecog !== undefined && <div><span className="text-gray-500">ECOG:</span> <span className="font-medium">{patientProfile.ecog}</span></div>}
              {patientProfile.priorTreatments.length > 0 && (
                <div><span className="text-gray-500">Prior Tx:</span> <span className="font-medium">{patientProfile.priorTreatments.join(', ')}</span></div>
              )}
              {!patientProfile.age && !patientProfile.cancerType && (
                <p className="text-gray-400 italic">No data yet</p>
              )}
            </div>
          </div>

          {/* Cost */}
          {totalCost > 0 && (
            <div className="bg-white rounded-xl border shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-2">💰 Pipeline Cost</h3>
              <div className="text-2xl font-bold text-green-600">${totalCost.toFixed(4)}</div>
              <p className="text-xs text-gray-500 mt-1">60% savings vs all-Claude</p>
            </div>
          )}

          {/* Architecture */}
          <div className="bg-teal-50 rounded-xl p-4">
            <h3 className="font-semibold text-teal-900 mb-2">🧠 LangGraph JS</h3>
            <ul className="text-sm text-teal-800 space-y-1">
              <li>• @langchain/langgraph</li>
              <li>• @langchain/langgraph-sdk</li>
              <li>• StateGraph with Annotations</li>
              <li>• SSE streaming</li>
              <li>• Thread-based state</li>
            </ul>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 px-6 text-center text-sm text-gray-500">
        <strong>Risentia</strong> — AI Orchestration for Life Sciences • Brussels | Dubai
      </footer>
    </div>
  );
}
