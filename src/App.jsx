import React, { useState, useEffect } from 'react';
import { 
  Upload, FileText, AlertTriangle, CheckCircle, 
  ChevronRight, Shield, Activity, LogOut, User, Lock, Clock, File, Download
} from 'lucide-react';
import myLogo from 'C:/Users/anees/Downloads/legal-ai-system/legal-ai-system/legal-ai-app/public/logo.png';
// --- COMPONENTS ---

// 1. LOGIN SCREEN
const LoginScreen = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/auth/login' : '/auth/signup';
    const payload = { email, password, full_name: "Demo User" };

    try {
      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (data.user) {
        onLogin(data.user);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } catch (err) {
      setError('Connection error. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3">
          <img src={myLogo} alt="Logo" className="h-10 w-auto object-contain" />
          <span className="font-bold text-xl tracking-tight" style={{ color: '#fbfcfe' }}>CogDoc</span>
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-slate-400 text-center mb-8">
          CogDoc Offline Intelligence
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-white text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. DASHBOARD GAUGE
const RiskGauge = ({ score, level }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - ((score || 0) / 100) * circumference;
  
  const getColor = (s) => {
    if (s > 50) return 'text-red-500';
    if (s > 20) return 'text-orange-500';
    return 'text-green-500';
  };

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg className="w-48 h-48 transform -rotate-90">
        <circle
          cx="96" cy="96" r={radius}
          stroke="currentColor" strokeWidth="8" fill="transparent"
          className="text-slate-700"
        />
        <circle
          cx="96" cy="96" r={radius}
          stroke="currentColor" strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`transition-all duration-1000 ease-out ${getColor(score)}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-4xl font-bold ${getColor(score)}`}>{score || 0}</span>
        <span className="text-slate-400 text-sm uppercase tracking-wider mt-1">{level || "Low"}</span>
      </div>
    </div>
  );
};

// 3. MAIN APP
const App = () => {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // Robust history fetching
  const fetchHistory = async (userId = user?.id) => {
    if (!userId) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:8000/history/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch history');
      
      const data = await res.json();
      if (data.documents) {
        setHistory(data.documents);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  // Fetch history specifically when user changes/logs in
  useEffect(() => {
    if (user?.id) {
      fetchHistory(user.id);
    }
  }, [user]);

  const handleLogout = () => {
    setUser(null);
    setResult(null);
    setFile(null);
    setHistory([]);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (user && user.id) {
      formData.append('user_id', user.id);
    }

    try {
      const response = await fetch('http://127.0.0.1:8000/analyze', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Analysis failed");
      }
      const data = await response.json();
      setResult(data);
      // Refresh history with current user ID
      fetchHistory(user?.id);
    } catch (error) {
      console.error("Analysis failed:", error);
      alert(`Error: ${error.message || "Failed to connect to backend"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    setDownloading(true);
    try {
      const response = await fetch('http://127.0.0.1:8000/generate_pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `LexGuard_Report_${result.fileName || 'Contract'}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert("Failed to generate PDF. Check backend logs.");
      }
    } catch (error) {
      console.error("PDF Download Error:", error);
    } finally {
      setDownloading(false);
    }
  };

  // Load a report from history
  const loadFromHistory = (doc) => {
    if (doc.details) {
      setResult(doc.details);
    }
  };

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30 flex flex-col">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
  <img src={myLogo} alt="Logo" className="h-10 w-auto object-contain" />
  <span className="font-bold text-xl tracking-tight text-white">CogDoc</span>
</div>
          
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <Lock className="w-3 h-3" />
              <span>Secure Session</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-white">{user.email}</div>
                <div className="text-xs text-slate-400">Authenticated</div>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full px-4 py-8 gap-8">
        
        {/* SIDEBAR (HISTORY)
        <aside className="w-64 hidden lg:block shrink-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sticky top-24">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-3 h-3" /> Recent Activity
            </h3>
            
            <div className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-4">No history yet</p>
              ) : (
                history.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => loadFromHistory(doc)}
                    className="w-full text-left p-3 rounded-xl hover:bg-slate-800 transition-colors group border border-transparent hover:border-slate-700"
                  >
                    <div className="flex items-center gap-3 mb-1">
                      <File className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                        {doc.filename}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pl-7">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        doc.risk_level === 'High' ? 'bg-red-500/20 text-red-400' :
                        doc.risk_level === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        {doc.risk_level || 'Low'} Risk
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {new Date(doc.upload_date).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside> */}

        {/* MAIN CONTENT */}
        <main className="flex-1">
          {!result ? (
            // UPLOAD VIEW
            <div className="max-w-2xl mx-auto mt-10 text-center">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Contract Intelligence
              </h1>
              <p className="text-slate-400 mb-10 text-lg">
                Upload a legal document to detect risks, contradictions, and loopholes instantly.
              </p>

              <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl p-12 hover:border-blue-500 transition-colors group cursor-pointer relative overflow-hidden">
                <input 
                  type="file" 
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-4 relative z-0">
                  <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-white">
                      {file ? file.name : "Drop your PDF, Word, or Text file here"}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      {file ? "Ready to analyze" : "or click to browse files"}
                    </p>
                  </div>
                </div>
              </div>

              {file && (
                <button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="mt-8 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 mx-auto disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Activity className="w-5 h-5 animate-spin" />
                      Analyzing Document...
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5" />
                      Start Analysis
                    </>
                  )}
                </button>
              )}
            </div>
          ) : (
            // DASHBOARD VIEW
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <div className="flex items-center justify-between mb-6">
                <button 
                  onClick={() => setResult(null)}
                  className="flex items-center text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 mr-1" />
                  Back to Upload
                </button>

                {/* DOWNLOAD PDF REPORT BUTTON */}
                <button 
                  onClick={handleDownloadPDF}
                  disabled={downloading}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
                >
                  {downloading ? <Activity className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? "Generating..." : "Download Report"}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: METRICS */}
                <div className="space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Risk Assessment</h3>
                    <div className="flex justify-center py-4">
                      <RiskGauge score={result.riskScore} level={result.riskLevel} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-800">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{result.flaggedClauses || 0}</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Flagged Clauses</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white">{result.contradictions?.length || 0}</div>
                        <div className="text-xs text-slate-500 uppercase mt-1">Contradictions</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-900/50 to-slate-900 border border-blue-500/20 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <Activity className="w-6 h-6 text-blue-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-white mb-1">XAI Reasoning Active</h3>
                        <p className="text-sm text-blue-200/70 leading-relaxed">
                          The Mistral-7B model has analyzed this document using secure offline inference. 
                          Data has been synced to your secure vault.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: CLAUSES */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    {/* Removed Consistency Check Button */}
                    {/*
                    <div className="border-b border-slate-800 p-4 flex items-center gap-4">
                      <button className="text-blue-400 font-medium border-b-2 border-blue-400 pb-4 -mb-4 px-2">Risk Analysis</button>
                    </div> */}
                    <div className="border-b border-slate-800 p-4 flex justify-center items-center">
                      <h2 className="text-lg font-semibold text-slate-200 tracking-wide">Risk Analysis and Contradictions</h2>
                      </div>
                    
                    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                      {result.results.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                            item.risk === 'High' ? 'bg-red-500/5 border-red-500/20 hover:border-red-500/30' :
                            item.risk === 'Medium' ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500/30' :
                            'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${
                              item.risk === 'High' ? 'bg-red-500/20 text-red-400' :
                              item.risk === 'Medium' ? 'bg-orange-500/20 text-orange-400' :
                              'bg-green-500/20 text-green-400'
                            }`}>
                              {item.risk} Risk
                            </span>
                            <span className="text-xs text-slate-500">Clause {idx + 1}</span>
                          </div>
                          <p className="text-slate-300 text-sm leading-relaxed mb-3 font-mono">
                            "{item.text}"
                          </p>
                          <div className="flex items-start gap-2 text-xs text-slate-400 bg-slate-950/30 p-2 rounded">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                            <span>AI Analysis: {item.reason}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;