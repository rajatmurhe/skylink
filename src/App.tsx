import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './ui/layout/Header';
import { Footer } from './ui/layout/Footer';
import { Home } from './pages/Home';
const MissionControl = lazy(() => import('./pages/MissionControl').then(m => ({ default: m.MissionControl })));
const Compare = lazy(() => import('./pages/Compare').then(m => ({ default: m.Compare })));
const Builder = lazy(() => import('./pages/Builder').then(m => ({ default: m.Builder })));
const Benchmark = lazy(() => import('./pages/Benchmark').then(m => ({ default: m.Benchmark })));
const AILab = lazy(() => import('./pages/AILab').then(m => ({ default: m.AILab })));
const FlightLab = lazy(() => import('./pages/FlightLab').then(m => ({ default: m.FlightLab })));
const Airframe = lazy(() => import('./pages/Airframe').then(m => ({ default: m.Airframe })));
const Submission = lazy(() => import('./pages/Submission').then(m => ({ default: m.Submission })));
const Learn = lazy(() => import('./pages/Learn').then(m => ({ default: m.Learn })));


export const App: React.FC = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">
          <Suspense fallback={<div className="p-12 text-center text-slate-400" role="status">Loading workspace…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/mission-control" element={<MissionControl />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/builder" element={<Builder />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="/ai-lab" element={<AILab />} />
            <Route path="/flight-lab" element={<FlightLab />} />
            <Route path="/airframe" element={<Airframe />} />
            <Route path="/submission" element={<Submission />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
